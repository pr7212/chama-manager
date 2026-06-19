const pool = require('../config/db');

/**
 * Writes an audit log row.
 * Must NOT swallow errors (important for transaction rollback).
 */
const logAudit = async ({
  client = null,
  user_id,
  group_id = null,
  action,
  entity_type,
  entity_id,
}) => {
  try {
    const db = client || pool;

    if (!user_id || !action || !entity_type || !entity_id) {
      throw new Error('Missing audit log required fields');
    }

    await db.query(
      `INSERT INTO audit_logs (
        user_id,
        group_id,
        action,
        entity_type,
        entity_id
      ) VALUES ($1, $2, $3, $4, $5)`,
      [user_id, group_id, action, entity_type, entity_id]
    );
  } catch (error) {
    console.error('Audit log error:', error.message);

    // IMPORTANT: rethrow so transactions can rollback properly
    throw error;
  }
};

module.exports = logAudit;