const pool = require('../config/db');
const { calculateLoanTotals } = require('../services/loanService');
const logAudit = require('../utils/auditLogger');

// ISSUE LOAN
exports.issueLoan = async (req, res) => {
  try {
    const { member_id, amount, interest_rate, due_date } = req.body;
    const created_by = req.user?.id;

    if (!created_by) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const loanAmount = Number(amount);
    const loanInterestRate = Number(interest_rate);

    if (!member_id || !amount || !interest_rate || !due_date) {
      return res.status(400).json({ message: 'All loan fields required' });
    }

    if (Number.isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({ message: 'Loan amount invalid' });
    }

    if (Number.isNaN(loanInterestRate) || loanInterestRate < 0) {
      return res.status(400).json({ message: 'Interest rate invalid' });
    }

    const { total_amount, remaining_balance } = calculateLoanTotals(
      loanAmount,
      loanInterestRate
    );

    const result = await pool.query(
      `INSERT INTO loans (member_id, amount, interest_rate, total_amount, remaining_balance, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        member_id,
        loanAmount,
        loanInterestRate,
        total_amount,
        remaining_balance,
        due_date,
        created_by,
      ]
    );

    const loan = result.rows[0];

    await logAudit({
      user_id: created_by,
      action: 'Issued loan',
      entity_type: 'loan',
      entity_id: loan.id,
    });

    return res.status(201).json({ message: 'Loan issued', loan });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// RECORD PAYMENT — now wrapped in a transaction
exports.recordLoanPayment = async (req, res) => {
  let client;

  try {
    const { loan_id, amount } = req.body;
    const recorded_by = req.user?.id;

    if (!recorded_by) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const paymentAmount = Number(amount);

    if (!loan_id || !amount) {
      return res.status(400).json({ message: 'Loan ID and amount required' });
    }

    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount invalid' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const loanResult = await client.query('SELECT * FROM loans WHERE id = $1', [
      loan_id,
    ]);

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    if (paymentAmount > Number(loan.remaining_balance)) {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: 'Payment exceeds remaining balance' });
    }

    const newAmountPaid = Number(loan.amount_paid || 0) + paymentAmount;
    const newBalance = Number(loan.remaining_balance) - paymentAmount;
    const status = newBalance <= 0 ? 'completed' : 'active';

    await client.query(
      `INSERT INTO loan_payments (loan_id, amount, recorded_by) VALUES ($1, $2, $3)`,
      [loan_id, paymentAmount, recorded_by]
    );

    await client.query(
      `UPDATE loans SET amount_paid = $1, remaining_balance = $2, status = $3 WHERE id = $4`,
      [newAmountPaid, newBalance, status, loan_id]
    );

    await logAudit({
      client,
      user_id: recorded_by,
      action: 'Recorded loan payment',
      entity_type: 'loan',
      entity_id: loan_id,
    });

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Payment recorded' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

// GET LOANS
exports.getLoans = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT loans.*, members.full_name
       FROM loans
       JOIN members ON loans.member_id = members.id
       ORDER BY loans.created_at DESC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET PAYMENT HISTORY FOR A LOAN (new)
exports.getLoanPayments = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT loan_payments.*, users.full_name AS recorded_by_name
       FROM loan_payments
       LEFT JOIN users ON loan_payments.recorded_by = users.id
       WHERE loan_payments.loan_id = $1
       ORDER BY loan_payments.payment_date DESC`,
      [id]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
