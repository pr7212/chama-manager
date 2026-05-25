const pool = require('../config/db');

/**
 * Writes an audit log row.
 *
 * Important: errors MUST be rethrown so callers can rollback related DB work.
 *
 * @param {object} params
 * @param {import('pg').PoolClient} [params.client] - transaction client
 * @param {number|string} params.user_id
 * @param {string} params.action
 * @param {string} params.entity_type
 * @param {number|string} params.entity_id
 */
const logAudit = async ({
  client = null,
  user_id,
  action,
  entity_type,
  entity_id,
}) => {
  const db = client || pool;

  // Let any error bubble up (required for transactional consistency)
  await db.query(
    `
      INSERT INTO audit_logs
      (
        user_id,
        action,
        entity_type,
        entity_id
      )
      VALUES ($1, $2, $3, $4)
    `,
    [user_id, action, entity_type, entity_id]
  );
};

module.exports = logAudit;
