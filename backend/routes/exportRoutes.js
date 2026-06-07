const express = require('express');
const verifyToken = require('../middleware/authMiddleware');
const pool = require('../config/db');

const router = express.Router();

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';

  const headers = Object.keys(rows[0]);

  const escape = (val) => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const csvLines = [headers.join(',')];

  for (const row of rows) {
    csvLines.push(headers.map((h) => escape(row[h])).join(','));
  }

  return csvLines.join('\n');
}

// ======================
// EXPORT CONTRIBUTIONS
// ======================
router.get('/contributions', verifyToken, async (req, res) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();

    const result = await pool.query(`
      SELECT
        contributions.id,
        members.full_name,
        contributions.amount,
        contributions.contribution_month,
        contributions.contribution_year,
        contributions.payment_date,
        contributions.created_at
      FROM contributions
      JOIN members ON contributions.member_id = members.id
      ORDER BY contributions.created_at DESC
    `);

    const rows = result.rows;

    if (format === 'xlsx') {
      const xlsx = require('xlsx');

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(rows);

      xlsx.utils.book_append_sheet(wb, ws, 'Contributions');

      const buf = xlsx.write(wb, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=contributions.xlsx'
      );

      return res.end(buf);
    }

    const csv = toCSV(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=contributions.csv'
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ======================
// EXPORT LOANS
// ======================
router.get('/loans', verifyToken, async (req, res) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();

    const result = await pool.query(`
      SELECT
        loans.id,
        members.full_name,
        loans.amount,
        loans.interest_rate,
        loans.total_amount,
        loans.amount_paid,
        loans.remaining_balance,
        loans.due_date,
        loans.status,
        loans.created_at
      FROM loans
      JOIN members ON loans.member_id = members.id
      ORDER BY loans.created_at DESC
    `);

    const rows = result.rows;

    if (format === 'xlsx') {
      const xlsx = require('xlsx');

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(rows);

      xlsx.utils.book_append_sheet(wb, ws, 'Loans');

      const buf = xlsx.write(wb, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename=loans.xlsx');

      return res.end(buf);
    }

    const csv = toCSV(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=loans.csv');

    return res.status(200).send(csv);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
