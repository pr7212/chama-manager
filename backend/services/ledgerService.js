const pool = require('../config/db');

function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} is required`);
  }

  return parsed;
}

function toLedgerAmount(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed === 0) {
    throw new Error('Transaction amount must be a non-zero number');
  }

  return parsed;
}

/**
 * Record a transaction in the ledger (credits: positive, debits: negative)
 */
const recordTransaction = async ({
  client,
  groupId,
  memberId,
  amount,
  type,
  referenceId,
  userId,
}) => {
  const db = client || pool;
  const scopedGroupId = toPositiveInteger(groupId, 'groupId');
  const scopedMemberId = toPositiveInteger(memberId, 'memberId');
  const transactionAmount = toLedgerAmount(amount);

  if (!type) {
    throw new Error('Transaction type is required');
  }

  const insertQuery = `
    INSERT INTO transactions (group_id, member_id, amount, type, reference_id, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const result = await db.query(insertQuery, [
    scopedGroupId,
    scopedMemberId,
    transactionAmount,
    type,
    referenceId,
    userId,
  ]);

  return result.rows[0];
};

/**
 * Dynamically calculate member balance (sum of all ledger transactions)
 */
const getMemberBalance = async (memberId, groupId) => {
  const scopedMemberId = toPositiveInteger(memberId, 'memberId');
  const scopedGroupId = toPositiveInteger(groupId, 'groupId');

  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE member_id = $1 AND group_id = $2`,
    [scopedMemberId, scopedGroupId]
  );

  return Number(result.rows[0].balance);
};

/**
 * Dynamically calculate total group funds
 */
const getGroupBalance = async (groupId) => {
  const scopedGroupId = toPositiveInteger(groupId, 'groupId');

  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM transactions WHERE group_id = $1`,
    [scopedGroupId]
  );

  return Number(result.rows[0].balance);
};

module.exports = {
  recordTransaction,
  getMemberBalance,
  getGroupBalance,
};