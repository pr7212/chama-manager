const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const pool = require('../config/db');
const ledgerService = require('../services/ledgerService');
const logAudit = require('../utils/auditLogger');

const router = express.Router();

function getGroupId(req) {
  return req.user?.group_id || 1;
}

/**
 * Create a fine type (admin only)
 */
router.post('/', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const groupId = getGroupId(req);
    const { name, amount } = req.body;

    if (!name || amount === undefined) {
      return res.status(400).json({ message: 'Name and amount are required' });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const result = await pool.query(
      `INSERT INTO fines (name, amount, group_id) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), amountNum, groupId]
    );

    return res
      .status(201)
      .json({ message: 'Fine type created', fine: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get all fine types
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const groupId = getGroupId(req);
    const result = await pool.query(
      `SELECT * FROM fines WHERE is_active = TRUE AND group_id = $1 ORDER BY name ASC`,
      [groupId]
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Assign fine to member (admin only)
 */
router.post(
  '/assign',
  verifyToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const groupId = getGroupId(req);
      const { member_id, fine_id, amount } = req.body;

      if (!member_id || !fine_id || amount === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return res
          .status(400)
          .json({ message: 'Amount must be greater than 0' });
      }

      const memberResult = await pool.query(
        `SELECT id FROM members WHERE id = $1 AND group_id = $2`,
        [member_id, groupId]
      );

      if (memberResult.rows.length === 0) {
        return res.status(404).json({ message: 'Member not found' });
      }

      const fineResult = await pool.query(
        `SELECT id FROM fines WHERE id = $1 AND is_active = TRUE AND group_id = $2`,
        [fine_id, groupId]
      );

      if (fineResult.rows.length === 0) {
        return res.status(404).json({ message: 'Fine not found or inactive' });
      }

      const existing = await pool.query(
        `SELECT id, outstanding_amount FROM outstanding_fines
         WHERE member_id = $1 AND fine_id = $2 AND group_id = $3`,
        [member_id, fine_id, groupId]
      );

      if (existing.rows.length > 0) {
        const newOutstanding =
          Number(existing.rows[0].outstanding_amount) + amountNum;
        await pool.query(
          `UPDATE outstanding_fines SET outstanding_amount = $1, updated_at = NOW()
           WHERE member_id = $2 AND fine_id = $3 AND group_id = $4`,
          [newOutstanding, member_id, fine_id, groupId]
        );
      } else {
        await pool.query(
          `INSERT INTO outstanding_fines (member_id, fine_id, outstanding_amount, group_id)
           VALUES ($1, $2, $3, $4)`,
          [member_id, fine_id, amountNum, groupId]
        );
      }

      await logAudit({
        user_id: req.user.id,
        group_id: groupId,
        action: 'Assigned fine',
        entity_type: 'fine',
        entity_id: fine_id,
      });

      return res.status(201).json({ message: 'Fine assigned successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * Pay fine (admin only)
 */
router.post('/pay', verifyToken, authorizeRoles('admin'), async (req, res) => {
  let client;

  try {
    const groupId = getGroupId(req);
    const { member_id, fine_id, amount } = req.body;

    if (!member_id || !fine_id || amount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const outstandingResult = await client.query(
      `SELECT outstanding_amount FROM outstanding_fines
       WHERE member_id = $1 AND fine_id = $2 AND group_id = $3
       FOR UPDATE`,
      [member_id, fine_id, groupId]
    );

    if (outstandingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Outstanding fine not found' });
    }

    const outstanding = Number(outstandingResult.rows[0].outstanding_amount);

    if (amountNum > outstanding) {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: 'Payment exceeds outstanding balance' });
    }

    const newOutstanding = outstanding - amountNum;

    const paymentResult = await client.query(
      `INSERT INTO fine_payments (fine_id, member_id, amount, payment_date, recorded_by, group_id)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
       RETURNING id`,
      [fine_id, member_id, amountNum, req.user.id, groupId]
    );

    const payment = paymentResult.rows[0];

    await ledgerService.recordTransaction({
      client,
      groupId,
      memberId: member_id,
      amount: amountNum,
      type: 'fine_payment',
      referenceId: payment.id,
      userId: req.user.id,
    });

    if (newOutstanding <= 0) {
      await client.query(
        `DELETE FROM outstanding_fines WHERE member_id = $1 AND fine_id = $2 AND group_id = $3`,
        [member_id, fine_id, groupId]
      );
    } else {
      await client.query(
        `UPDATE outstanding_fines SET outstanding_amount = $1, updated_at = NOW()
         WHERE member_id = $2 AND fine_id = $3 AND group_id = $4`,
        [newOutstanding, member_id, fine_id, groupId]
      );
    }

    await logAudit({
      client,
      user_id: req.user.id,
      group_id: groupId,
      action: 'Recorded fine payment',
      entity_type: 'fine_payment',
      entity_id: payment.id,
    });

    await client.query('COMMIT');

    return res.status(200).json({ message: 'Fine payment recorded' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
});

/**
 * Get outstanding fines for a member
 */
router.get('/outstanding/:memberId', verifyToken, async (req, res) => {
  try {
    const groupId = getGroupId(req);
    const { memberId } = req.params;

    const result = await pool.query(
      `SELECT ofc.member_id, f.id AS fine_id, f.name, ofc.outstanding_amount,
              ofc.created_at, ofc.updated_at
       FROM outstanding_fines ofc
       JOIN fines f ON f.id = ofc.fine_id AND f.group_id = ofc.group_id
       WHERE ofc.member_id = $1 AND ofc.group_id = $2
       ORDER BY f.name ASC`,
      [memberId, groupId]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;