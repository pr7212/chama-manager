const pool = require('../config/db');
const { calculateLoanTotals } = require('../services/loanService');
const logAudit = require('../utils/auditLogger');
const ledgerService = require('../services/ledgerService');

// ISSUE LOAN (with Group Isolation & Ledger integration)
exports.issueLoan = async (req, res) => {
  let client;
  try {
    const { member_id, amount, interest_rate, due_date } = req.body;
    const created_by = req.user?.id;
    const groupId = req.user?.group_id || 1;

    if (!created_by) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        data: null
      });
    }

    const loanAmount = Number(amount);
    const loanInterestRate = Number(interest_rate);

    if (!member_id || !amount || !interest_rate || !due_date) {
      return res.status(400).json({
        success: false,
        message: 'All loan fields required',
        data: null
      });
    }

    if (Number.isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Loan amount invalid',
        data: null
      });
    }

    if (Number.isNaN(loanInterestRate) || loanInterestRate < 0) {
      return res.status(400).json({
        success: false,
        message: 'Interest rate invalid',
        data: null
      });
    }

    const { total_amount, remaining_balance } = calculateLoanTotals(
      loanAmount,
      loanInterestRate
    );

    client = await pool.connect();
    await client.query('BEGIN');

    const memberResult = await client.query(
      'SELECT id FROM members WHERE id = $1 AND group_id = $2',
      [member_id, groupId]
    );

    if (memberResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Member not found',
        data: null
      });
    }

    const result = await client.query(
      `INSERT INTO loans (member_id, amount, interest_rate, total_amount, remaining_balance, due_date, created_by, group_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        member_id,
        loanAmount,
        loanInterestRate,
        total_amount,
        remaining_balance,
        due_date,
        created_by,
        groupId,
      ]
    );

    const loan = result.rows[0];

    // Ledger: Record loan disbursement (outflow / negative amount)
    await ledgerService.recordTransaction({
      client,
      groupId,
      memberId: member_id,
      amount: -loanAmount,
      type: 'loan_disbursement',
      referenceId: loan.id,
      userId: created_by
    });

    await logAudit({
      client,
      user_id: created_by,
      group_id: groupId,
      action: 'Issued loan',
      entity_type: 'loan',
      entity_id: loan.id,
    });

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Loan issued successfully',
      loan,
      data: loan
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null
    });
  } finally {
    if (client) client.release();
  }
};

// RECORD PAYMENT (with Group Isolation & Ledger integration)
exports.recordLoanPayment = async (req, res) => {
  let client;

  try {
    const { loan_id, amount } = req.body;
    const recorded_by = req.user?.id;
    const groupId = req.user?.group_id || 1;

    if (!recorded_by) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        data: null
      });
    }

    const paymentAmount = Number(amount);

    if (!loan_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Loan ID and amount required',
        data: null
      });
    }

    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount invalid',
        data: null
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const loanResult = await client.query('SELECT * FROM loans WHERE id = $1 AND group_id = $2', [
      loan_id,
      groupId,
    ]);

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
        data: null
      });
    }

    const loan = loanResult.rows[0];

    if (paymentAmount > Number(loan.remaining_balance)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Payment exceeds remaining balance',
        data: null
      });
    }

    const newAmountPaid = Number(loan.amount_paid || 0) + paymentAmount;
    const newBalance = Number(loan.remaining_balance) - paymentAmount;
    const status = newBalance <= 0 ? 'completed' : 'active';

    const lpResult = await client.query(
      `INSERT INTO loan_payments (loan_id, amount, recorded_by, group_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [loan_id, paymentAmount, recorded_by, groupId]
    );
    const paymentId = lpResult.rows[0].id;

    // Ledger: Record loan repayment (inflow / positive amount)
    await ledgerService.recordTransaction({
      client,
      groupId,
      memberId: loan.member_id,
      amount: paymentAmount,
      type: 'loan_repayment',
      referenceId: paymentId,
      userId: recorded_by
    });

    await client.query(
      `UPDATE loans SET amount_paid = $1, remaining_balance = $2, status = $3 WHERE id = $4 AND group_id = $5`,
      [newAmountPaid, newBalance, status, loan_id, groupId]
    );

    await logAudit({
      client,
      user_id: recorded_by,
      group_id: groupId,
      action: 'Recorded loan payment',
      entity_type: 'loan',
      entity_id: loan_id,
    });

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { loan_id, amount: paymentAmount, remaining_balance: newBalance }
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null
    });
  } finally {
    if (client) client.release();
  }
};

// GET LOANS (with Group Isolation)
exports.getLoans = async (req, res) => {
  try {
    const groupId = req.user?.group_id || 1;
    const result = await pool.query(
      `SELECT loans.*, members.full_name
       FROM loans
       JOIN members
         ON loans.member_id = members.id
         AND loans.group_id = members.group_id
       WHERE loans.group_id = $1
       ORDER BY loans.created_at DESC`,
      [groupId]
    );
    return res.status(200).json({
      success: true,
      message: 'Loans retrieved successfully',
      data: result.rows,
      // Fallback direct array support
      loans: result.rows
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null
    });
  }
};

// GET PAYMENT HISTORY FOR A LOAN (with Group Isolation)
exports.getLoanPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = req.user?.group_id || 1;

    const result = await pool.query(
      `SELECT loan_payments.*, users.full_name AS recorded_by_name
       FROM loan_payments
       LEFT JOIN users ON loan_payments.recorded_by = users.id
       WHERE loan_payments.loan_id = $1 AND loan_payments.group_id = $2
       ORDER BY loan_payments.payment_date DESC`,
      [id, groupId]
    );

    return res.status(200).json({
      success: true,
      message: 'Loan payments retrieved successfully',
      data: result.rows,
      payments: result.rows
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null
    });
  }
};
