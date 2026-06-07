const pool = require('../config/db');

/**
 * Create a notification record
 */
async function createNotification({
  userId,
  channel,
  type,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
}) {
  if (!userId || !channel || !type || !title || !message) {
    throw new Error('Missing required notification fields');
  }

  const result = await pool.query(
    `
    INSERT INTO notifications (
      user_id,
      channel,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
    `,
    [userId, channel, type, title, message, relatedEntityType, relatedEntityId]
  );

  return result.rows[0];
}

module.exports = {
  createNotification,
};
