const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const ledgerService = require('../services/ledgerService');

// GET MEMBER STATEMENT (with Group Isolation & Ledger integration)
exports.getMemberStatement = async (req, res) => {
  try {
    const memberId = req.params.id;
    const groupId = req.user?.group_id || 1;

    const memberResult = await pool.query(
      `
      SELECT * FROM members
      WHERE id = $1 AND group_id = $2
      `,
      [memberId, groupId]
    );

    const member = memberResult.rows[0];

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
        data: null
      });
    }

    const contributionsResult = await pool.query(
      `
      SELECT *
      FROM contributions
      WHERE member_id = $1 AND group_id = $2
      ORDER BY created_at DESC
      `,
      [memberId, groupId]
    );

    const loansResult = await pool.query(
      `
      SELECT *
      FROM loans
      WHERE member_id = $1 AND group_id = $2
      ORDER BY created_at DESC
      `,
      [memberId, groupId]
    );

    const contributions = contributionsResult.rows;
    const loans = loansResult.rows;

    const totalContributions = contributions.reduce(
      (sum, item) => sum + Number(item.amount),
      0
    );

    const activeLoans = loans.filter((loan) => loan.status === 'active');
    
    // Ledger: Calculate current member balance dynamically
    const dynamicBalance = await ledgerService.getMemberBalance(memberId, groupId);

    return res.status(200).json({
      success: true,
      message: 'Statement retrieved successfully',
      member,
      contributions,
      loans,
      summary: {
        totalContributions,
        activeLoans: activeLoans.length,
        ledgerBalance: dynamicBalance
      },
      data: {
        member,
        contributions,
        loans,
        summary: {
          totalContributions,
          activeLoans: activeLoans.length,
          ledgerBalance: dynamicBalance
        }
      }
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null
    });
  }
};

// GENERATE PDF
exports.generateStatementPDF = async (req, res) => {
  try {
    const memberId = req.params.id;
    const groupId = req.user?.group_id || 1;

    const memberResult = await pool.query(
      `
      SELECT * FROM members
      WHERE id = $1 AND group_id = $2
      `,
      [memberId, groupId]
    );

    const member = memberResult.rows[0];

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
        data: null
      });
    }

    const contributionsResult = await pool.query(
      `
      SELECT *
      FROM contributions
      WHERE member_id = $1 AND group_id = $2
      `,
      [memberId, groupId]
    );

    const loansResult = await pool.query(
      `
      SELECT *
      FROM loans
      WHERE member_id = $1 AND group_id = $2
      `,
      [memberId, groupId]
    );

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=statement_${member.id}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text('Chama Member Statement', {
      align: 'center',
    });

    doc.moveDown();

    doc.fontSize(14).text(`Name: ${member.full_name}`);
    doc.text(`Phone: ${member.phone}`);
    doc.text(`Chama ID: Group ${groupId}`);

    doc.moveDown();

    doc.fontSize(16).text('Contributions');

    contributionsResult.rows.forEach((contribution) => {
      doc
        .fontSize(12)
        .text(
          `${contribution.contribution_month} ${contribution.contribution_year} - KES ${contribution.amount}`
        );
    });

    doc.moveDown();

    doc.fontSize(16).text('Loans');

    loansResult.rows.forEach((loan) => {
      doc
        .fontSize(12)
        .text(
          `Loan: KES ${loan.amount} | Balance: KES ${loan.remaining_balance} | Status: ${loan.status}`
        );
    });

    doc.end();
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      data: null
    });
  }
};
