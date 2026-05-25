const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const pool = require('../config/db');

const router = express.Router();

// Assign (create) outstanding fines for a member
// Body: { member_id, fine_id, amount }
router.post('/assign', verifyToken, async (req, res) => {
  try {
    const { member_id, fine_id, amount } = req.body;

    if (!member_id || !fine_id || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Amount must be > 0' });
    }

    // Ensure fine exists
    const fineResult = await pool.query('SELECT * FROM fines WHERE id = $1', [
      fine_id,
    ]);
    if (fineResult.rows.length === 0) {
      return res.status(404).json({ message: 'Fine not found' });
    }

    // Upsert outstanding_fines row
    const existing = await pool.query(
      `
        SELECT *
        FROM outstanding_fines
        WHERE member_id = $1 AND fine_id = $2
      `,
      [member_id, fine_id]
    );

    if (existing.rows.length > 0) {
      const newOutstanding =
        Number(existing.rows[0].outstanding_amount) + amountNum;
      await pool.query(
        `
          UPDATE outstanding_fines
          SET outstanding_amount = $1, updated_at = NOW()
          WHERE member_id = $2 AND fine_id = $3
        `,
        [newOutstanding, member_id, fine_id]
      );
    } else {
      await pool.query(
        `
          INSERT INTO outstanding_fines (fine_id, member_id, outstanding_amount)
          VALUES ($1,$2,$3)
        `,
        [fine_id, member_id, amountNum]
      );
    }

    res.status(201).json({ message: 'Fine assigned' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Pay a fine (reduces outstanding)
// Body: { member_id, fine_id, amount }
router.post('/pay', verifyToken, async (req, res) => {
  try {
    const { member_id, fine_id, amount } = req.body;

    if (!member_id || !fine_id || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Amount must be > 0' });
    }

    const outstandingResult = await pool.query(
      `
        SELECT *
        FROM outstanding_fines
        WHERE member_id = $1 AND fine_id = $2
      `,
      [member_id, fine_id]
    );

    if (outstandingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Outstanding fine not found' });
    }

    const outstanding = Number(outstandingResult.rows[0].outstanding_amount);
    if (amountNum > outstanding) {
      return res
        .status(400)
        .json({ message: 'Payment exceeds outstanding fine' });
    }

    const newOutstanding = Math.max(0, outstanding - amountNum);

    await pool.query(
      `
        INSERT INTO fine_payments (fine_id, member_id, amount, payment_date, recorded_by)
        VALUES ($1,$2,$3,CURRENT_DATE,$4)
      `,
      [fine_id, member_id, amountNum, req.user.id]
    );

    if (newOutstanding === 0) {
      await pool.query(
        `DELETE FROM outstanding_fines WHERE member_id = $1 AND fine_id = $2`,
        [member_id, fine_id]
      );
    } else {
      await pool.query(
        `
          UPDATE outstanding_fines
          SET outstanding_amount = $1, updated_at = NOW()
          WHERE member_id = $2 AND fine_id = $3
        `,
        [newOutstanding, member_id, fine_id]
      );
    }

    res.status(200).json({ message: 'Fine payment recorded' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get outstanding fines for a member
router.get('/outstanding/:memberId', verifyToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    const result = await pool.query(
      `
        SELECT
          ofc.member_id,
          f.id AS fine_id,
          f.name,
          ofc.outstanding_amount,
          ofc.created_at,
          ofc.updated_at
        FROM outstanding_fines ofc
        JOIN fines f ON f.id = ofc.fine_id
        WHERE ofc.member_id = $1
        ORDER BY f.name ASC
      `,
      [memberId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
