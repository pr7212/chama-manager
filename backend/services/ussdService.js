const pool = require('../config/db');

function normalizePhoneVariants(phoneNumber) {
  const digits = String(phoneNumber || '').replace(/\D/g, '');
  const variants = new Set();

  if (!digits) return [];

  variants.add(digits);

  if (digits.startsWith('254') && digits.length >= 12) {
    variants.add(`0${digits.slice(3)}`);
  }

  if (digits.startsWith('0') && digits.length >= 10) {
    variants.add(`254${digits.slice(1)}`);
  }

  return [...variants];
}

function formatKes(value) {
  return `KES ${Number(value || 0).toLocaleString('en-KE', {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return 'None';
  return new Date(value).toISOString().slice(0, 10);
}

function mainMenu() {
  return [
    'CON Chama Manager',
    '1. My profile',
    '2. Contributions',
    '3. Loans',
    '4. Fines',
  ].join('\n');
}

async function findMemberByPhone(phoneNumber) {
  const variants = normalizePhoneVariants(phoneNumber);

  if (variants.length === 0) {
    return null;
  }

  const result = await pool.query(
    `
    SELECT id, full_name, phone
    FROM members
    WHERE regexp_replace(phone, '\\D', '', 'g') = ANY($1::text[])
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [variants]
  );

  return result.rows[0] || null;
}

async function getContributionSummary(memberId) {
  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS contribution_count,
      COALESCE(SUM(amount), 0) AS total_contributed,
      MAX(payment_date) AS last_payment_date
    FROM contributions
    WHERE member_id = $1
    `,
    [memberId]
  );

  return result.rows[0];
}

async function getLoanSummary(memberId) {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_loans,
      COALESCE(SUM(remaining_balance) FILTER (WHERE status = 'active'), 0) AS active_balance,
      COALESCE(SUM(amount_paid), 0) AS total_paid
    FROM loans
    WHERE member_id = $1
    `,
    [memberId]
  );

  return result.rows[0];
}

async function getFineSummary(memberId) {
  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS fine_count,
      COALESCE(SUM(outstanding_amount), 0) AS outstanding_total
    FROM outstanding_fines
    WHERE member_id = $1
    `,
    [memberId]
  );

  return result.rows[0];
}

async function handleUssdSession({ phoneNumber, text }) {
  const selected = String(text || '').trim();

  if (!selected || selected === '0') {
    return mainMenu();
  }

  const member = await findMemberByPhone(phoneNumber);

  if (!member) {
    return 'END This phone number is not registered as a Chama member.';
  }

  switch (selected) {
    case '1':
      return [
        'END My profile',
        `Name: ${member.full_name}`,
        'Role: Member',
        'Status: Active',
      ].join('\n');

    case '2': {
      const summary = await getContributionSummary(member.id);
      return [
        'END Contributions',
        `Total: ${formatKes(summary.total_contributed)}`,
        `Records: ${summary.contribution_count}`,
        `Last: ${formatDate(summary.last_payment_date)}`,
      ].join('\n');
    }

    case '3': {
      const summary = await getLoanSummary(member.id);
      return [
        'END Loans',
        `Active loans: ${summary.active_loans || 0}`,
        `Balance: ${formatKes(summary.active_balance)}`,
        `Paid: ${formatKes(summary.total_paid)}`,
      ].join('\n');
    }

    case '4': {
      const summary = await getFineSummary(member.id);
      return [
        'END Fines',
        `Outstanding: ${formatKes(summary.outstanding_total)}`,
        `Fine types: ${summary.fine_count}`,
      ].join('\n');
    }

    default:
      return 'END Invalid option. Please try again.';
  }
}

module.exports = {
  handleUssdSession,
};
