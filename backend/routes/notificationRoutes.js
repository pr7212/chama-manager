const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');
const pool = require('../config/db');
const { createNotification } = require('../services/notificationService');

function getGroupId(req) {
  return req.user?.group_id || 1;
}

// Get notifications for logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const groupId = getGroupId(req);
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 AND group_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id, groupId]
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Mark a notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const groupId = getGroupId(req);
    const result = await pool.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND group_id = $3
       RETURNING id`,
      [req.params.id, req.user.id, groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Manually trigger notification (admin use)
router.post('/trigger', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const groupId = getGroupId(req);
    const {
      user_id,
      channel,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id,
    } = req.body;

    if (!user_id || !channel || !type || !title || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND group_id = $2',
      [user_id, groupId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found in this group' });
    }

    const notif = await createNotification({
      userId: user_id,
      groupId,
      channel,
      type,
      title,
      message,
      relatedEntityType: related_entity_type || null,
      relatedEntityId: related_entity_id ?? null,
    });

    return res
      .status(201)
      .json({ message: 'Notification created', notification: notif });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;