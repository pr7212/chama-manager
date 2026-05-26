const pool = require('../config/db');
const { calculateLoanTotals } = require('../services/loanService');
const logAudit = require('../utils/auditLogger');

// ISSUE LOAN
exports.issueLoan = async (req, res) => {
  try {
    const { member_id, amount, interest_rate, due_date } = req.body;

    const created_by = req.user?.id;

    if (!created_by) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    const loanAmount = Number(amount);
    const loanInterestRate = Number(interest_rate);

    if (!member_id || !amount || !interest_rate || !due_date) {
      return res.status(400).json({
        message: 'All loan fields required',
      });
    }

    if (Number.isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({
        message: 'Loan amount invalid',
      });
    }

    if (Number.isNaN(loanInterestRate) || loanInterestRate < 0) {
      return res.status(400).json({
        message: 'Interest rate invalid',
      });
    }

    const { total_amount, remaining_balance } = calculateLoanTotals(
      loanAmount,
      loanInterestRate
    );

    const result = await pool.query(
      `
      INSERT INTO loans (
        member_id,
        amount,
        interest_rate,
        total_amount,
        remaining_balance,
        due_date,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
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

    return res.status(201).json({
      message: 'Loan issued',
      loan,
    });
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};

// RECORD PAYMENT
exports.recordLoanPayment = async (req, res) => {
  try {
    const { loan_id, amount } = req.body;
    const recorded_by = req.user?.id;

    if (!recorded_by) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    const paymentAmount = Number(amount);

    if (!loan_id || !amount) {
      return res.status(400).json({
        message: 'Loan ID and amount required',
      });
    }

    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        message: 'Payment amount invalid',
      });
    }

    const loanResult = await pool.query(`SELECT * FROM loans WHERE id = $1`, [
      loan_id,
    ]);

    if (loanResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Loan not found',
      });
    }

    const loan = loanResult.rows[0];

    if (paymentAmount > Number(loan.remaining_balance)) {
      return res.status(400).json({
        message: 'Payment exceeds remaining balance',
      });
    }

    const newAmountPaid = Number(loan.amount_paid || 0) + paymentAmount;

    const newBalance = Number(loan.remaining_balance) - paymentAmount;

    const status = newBalance <= 0 ? 'completed' : 'active';

    await pool.query(
      `
      INSERT INTO loan_payments (
        loan_id,
        amount,
        recorded_by
      )
      VALUES ($1,$2,$3)
      `,
      [loan_id, paymentAmount, recorded_by]
    );

    await pool.query(
      `
      UPDATE loans
      SET amount_paid = $1,
          remaining_balance = $2,
          status = $3
      WHERE id = $4
      `,
      [newAmountPaid, newBalance, status, loan_id]
    );

    return res.status(200).json({
      message: 'Payment recorded',
    });
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};

// GET LOANS
exports.getLoans = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        loans.*,
        members.full_name
      FROM loans
      JOIN members ON loans.member_id = members.id
      ORDER BY loans.created_at DESC
      `
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};
