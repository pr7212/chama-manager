const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const { createNotification } = require('../services/notificationService');
const pool = require('../config/db');

const router = express.Router();

// Get notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [req.user.id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Manual trigger endpoint (admin/treasurer use)
// Body: { user_id, channel, type, title, message, related_entity_type, related_entity_id }
router.post('/trigger', verifyToken, async (req, res) => {
  try {
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

    const notif = await createNotification({
      userId: user_id,
      channel,
      type,
      title,
      message,
      relatedEntityType: related_entity_type || null,
      relatedEntityId: related_entity_id ?? null,
    });

    res
      .status(201)
      .json({ message: 'Notification created', notification: notif });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
