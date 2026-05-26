const pool = require('../config/db');
const logAudit = require('../utils/auditLogger');
const notificationService = require('../services/notificationService');
const { sendSMS } = require('../services/smsService');

// ADD CONTRIBUTION
exports.addContribution = async (req, res) => {
  let client;

  try {
    const { member_id, amount, contribution_month, contribution_year } =
      req.body;

    const recorded_by = req.user?.id;

    if (!recorded_by) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    const contributionAmount = Number(amount);
    const contributionMonth = (contribution_month || '').trim();
    const contributionYear = Number(contribution_year);

    // VALIDATION
    if (
      member_id === undefined ||
      amount === undefined ||
      !contributionMonth ||
      contribution_year === undefined
    ) {
      return res.status(400).json({
        message: 'All contribution fields are required',
      });
    }

    if (
      Number.isNaN(contributionAmount) ||
      contributionAmount <= 0 ||
      Number.isNaN(contributionYear)
    ) {
      return res.status(400).json({
        message: 'Invalid amount or year',
      });
    }

    client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Prevent duplicate monthly contribution
      const existingContribution = await client.query(
        `
        SELECT id
        FROM contributions
        WHERE member_id = $1
        AND contribution_month = $2
        AND contribution_year = $3
        `,
        [member_id, contributionMonth, contributionYear]
      );

      if (existingContribution.rows.length > 0) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          message: 'Contribution already recorded for this month',
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
          recorded_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          member_id,
          contributionAmount,
          contributionMonth,
          contributionYear,
          recorded_by,
        ]
      );

      const contribution = result.rows[0];

      // Audit log
      await logAudit({
        client,
        user_id: recorded_by,
        action: 'Recorded contribution',
        entity_type: 'contribution',
        entity_id: contribution.id,
      });

      await client.query('COMMIT');

      // Create notification (non-blocking)
      notificationService
        .createNotification({
          userId: recorded_by,
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
        const memberResult = await pool.query(
          `
          SELECT phone, full_name
          FROM members
          WHERE id = $1
          `,
          [member_id]
        );

        const member = memberResult.rows[0];

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
        message: 'Contribution recorded successfully',
        contribution,
      });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});

      console.error('Transaction error:', txErr.message);

      return res.status(500).json({
        message: 'Server error',
      });
    }
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: 'Server error',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// GET CONTRIBUTIONS
exports.getContributions = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        contributions.*,
        members.full_name
      FROM contributions
      JOIN members
      ON contributions.member_id = members.id
      ORDER BY contributions.created_at DESC
      `
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};
