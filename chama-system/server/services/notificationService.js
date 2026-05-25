const pool = require('../config/db');

/**
 * Create a notification row.
 * @param {Object} params
 * @param {number} params.userId
 * @param {string} params.channel - e.g. 'sms'|'in_app'|'email'
 * @param {string} params.type - e.g. 'contribution_received'|'loan_due'
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.relatedEntityType]
 * @param {number|null} [params.relatedEntityId]
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
