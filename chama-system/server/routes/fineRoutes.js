const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const pool = require('../config/db');

const router = express.Router();

/**
 * Assign fine to member (create or update outstanding)
 */
router.post('/assign', verifyToken, async (req, res) => {
  try {
    const { member_id, fine_id, amount } = req.body;

    if (!member_id || !fine_id || amount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const amountNum = Number(amount);

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // verify fine exists
    const fineResult = await pool.query('SELECT id FROM fines WHERE id = $1', [
      fine_id,
    ]);

    if (fineResult.rows.length === 0) {
      return res.status(404).json({ message: 'Fine not found' });
    }

    const existing = await pool.query(
      `
      SELECT id, outstanding_amount
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
        INSERT INTO outstanding_fines (member_id, fine_id, outstanding_amount)
        VALUES ($1, $2, $3)
        `,
        [member_id, fine_id, amountNum]
      );
    }

    return res.status(201).json({ message: 'Fine assigned successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Pay fine (reduce outstanding balance)
 */
router.post('/pay', verifyToken, async (req, res) => {
  try {
    const { member_id, fine_id, amount } = req.body;

    if (!member_id || !fine_id || amount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const amountNum = Number(amount);

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const outstandingResult = await pool.query(
      `
      SELECT outstanding_amount
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
      return res.status(400).json({
        message: 'Payment exceeds outstanding balance',
      });
    }

    const newOutstanding = outstanding - amountNum;

    await pool.query(
      `
      INSERT INTO fine_payments (fine_id, member_id, amount, payment_date, recorded_by)
      VALUES ($1, $2, $3, CURRENT_DATE, $4)
      `,
      [fine_id, member_id, amountNum, req.user.id]
    );

    if (newOutstanding <= 0) {
      await pool.query(
        `
        DELETE FROM outstanding_fines
        WHERE member_id = $1 AND fine_id = $2
        `,
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

    return res.status(200).json({ message: 'Fine payment recorded' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get outstanding fines for a member
 */
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

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
