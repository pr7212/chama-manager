const pool = require('../config/db');
const logAudit = require('../utils/auditLogger');
const notificationService = require('../services/notificationService');
const { sendSMS } = require('../services/smsService');
const ledgerService = require('../services/ledgerService');

const MONTH_NAMES = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function normalizeContributionMonth(value) {
  const raw = String(value || '').trim().toLowerCase();
  const parsed = MONTH_NAMES[raw] || Number(raw);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
    ? parsed
    : null;
}

// ADD CONTRIBUTION (with Group Isolation & Ledger integration)
exports.addContribution = async (req, res) => {
  let client;

  try {
    const { member_id, amount, contribution_month, contribution_year } =
      req.body;

    const recorded_by = req.user?.id;
    const groupId = req.user?.group_id || 1;

    if (!recorded_by) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        data: null
      });
    }

    const contributionAmount = Number(amount);
    const contributionMonth = normalizeContributionMonth(contribution_month);
    const contributionYear = Number(contribution_year);

    // VALIDATION
    if (
      member_id === undefined ||
      amount === undefined ||
      contributionMonth === null ||
      contribution_year === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'All contribution fields are required',
        data: null
      });
    }

    if (
      Number.isNaN(contributionAmount) ||
      contributionAmount <= 0 ||
      Number.isNaN(contributionYear)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount or year',
        data: null
      });
    }

    client = await pool.connect();

    try {
      await client.query('BEGIN');

      const memberResult = await client.query(
        `
        SELECT id, phone, full_name
        FROM members
        WHERE id = $1 AND group_id = $2
        `,
        [member_id, groupId]
      );

      const member = memberResult.rows[0];

      if (!member) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null
        });
      }

      // Prevent duplicate monthly contribution within the group
      const existingContribution = await client.query(
        `
        SELECT id
        FROM contributions
        WHERE member_id = $1
        AND contribution_month = $2
        AND contribution_year = $3
        AND group_id = $4
        `,
        [member_id, contributionMonth, contributionYear, groupId]
      );

      if (existingContribution.rows.length > 0) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          success: false,
          message: 'Contribution already recorded for this month',
          data: null
        });
      }

      // Save contribution
      const result = await client.query(
        `
        INSERT INTO contributions (
          member_id,
          amount,
          contribution_month,
          contribution_year,
          recorded_by,
          group_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          member_id,
          contributionAmount,
          contributionMonth,
          contributionYear,
          recorded_by,
          groupId,
        ]
      );

      const contribution = result.rows[0];

      // Ledger System Integration: Record the contribution transaction
      await ledgerService.recordTransaction({
        client,
        groupId,
        memberId: member_id,
        amount: contributionAmount, // credit/inflow is positive
        type: 'contribution',
        referenceId: contribution.id,
        userId: recorded_by
      });

      // Audit log
      await logAudit({
        client,
        user_id: recorded_by,
        group_id: groupId,
        action: 'Recorded contribution',
        entity_type: 'contribution',
        entity_id: contribution.id,
      });

      await client.query('COMMIT');

      // Create notification (non-blocking)
      notificationService
        .createNotification({
          userId: recorded_by,
          groupId,
          channel: 'in_app',
          type: 'contribution_received',
          title: 'Contribution recorded',
          message: `KES ${contributionAmount} saved for ${contributionMonth} ${contributionYear}`,
          relatedEntityType: 'contribution',
          relatedEntityId: contribution.id,
        })
        .catch((err) => console.error('Notification error:', err.message));

      // Send SMS notification
      try {
        if (member?.phone) {
          await sendSMS(
            member.phone,
            `Hello ${member.full_name}, your contribution of KES ${contributionAmount} for ${contributionMonth} ${contributionYear} has been received successfully.`
          );
        }
      } catch (smsError) {
        console.error('SMS error:', smsError.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Contribution recorded successfully',
        contribution,
        data: contribution
      });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});

      console.error('Transaction error:', txErr.message);

      return res.status(500).json({
        success: false,
        message: 'Server error',
        data: null
      });
    }
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// GET CONTRIBUTIONS (with Group Isolation)
exports.getContributions = async (req, res) => {
  try {
    const groupId = req.user?.group_id || 1;
    const result = await pool.query(
      `
      SELECT
        contributions.*,
        members.full_name
      FROM contributions
      JOIN members
      ON contributions.member_id = members.id
      AND contributions.group_id = members.group_id
      WHERE contributions.group_id = $1
      ORDER BY contributions.created_at DESC
      `,
      [groupId]
    );

    return res.status(200).json({
      success: true,
      message: 'Contributions retrieved successfully',
      data: result.rows,
      // Keep it directly returning array as root fallback for simple api client handling
      contributions: result.rows
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
