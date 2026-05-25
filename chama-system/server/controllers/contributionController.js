const pool = require('../config/db');
const logAudit = require('../utils/auditLogger');
const notificationService = require('../services/notificationService');

// ADD CONTRIBUTION
exports.addContribution = async (req, res) => {
  let client;
  try {
    const { member_id, amount, contribution_month, contribution_year } =
      req.body;

    const recorded_by = req.user.id;
    const contributionAmount = Number(amount);
    const contributionMonth = contribution_month
      ? contribution_month.trim()
      : '';
    const contributionYear = Number(contribution_year);

    if (!member_id || !amount || !contributionMonth || !contribution_year) {
      return res.status(400).json({
        message: 'All contribution fields required',
      });
    }

    if (
      Number.isNaN(contributionAmount) ||
      contributionAmount <= 0 ||
      Number.isNaN(contributionYear)
    ) {
      return res.status(400).json({
        message: 'Amount must be greater than 0',
      });
    }

    client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingContribution = await client.query(
        `
                SELECT * FROM contributions
                WHERE
                    member_id = $1
                AND
                    contribution_month = $2
                AND
                    contribution_year = $3
                `,
        [member_id, contributionMonth, contributionYear]
      );

      if (existingContribution.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: 'Contribution already recorded for this month',
        });
      }

      const result = await client.query(
        `
            INSERT INTO contributions
            (
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

      await logAudit({
        client,
        user_id: req.user.id,
        action: 'Recorded contribution',
        entity_type: 'contribution',
        entity_id: result.rows[0].id,
      });

      await client.query('COMMIT');

      // Create in-app notification for the user who recorded it (manual until we add role-based recipients)
      try {
        await notificationService.createNotification({
          userId: req.user.id,
          channel: 'in_app',
          type: 'contribution_received',
          title: 'Contribution received',
          message: `Contribution for ${contributionMonth} ${contributionYear} recorded: KES ${contributionAmount}`,
          relatedEntityType: 'contribution',
          relatedEntityId: result.rows[0].id,
        });
      } catch (notifErr) {
        console.error('Notification create failed:', notifErr.message);
      }

      res.status(201).json({
        message: 'Contribution recorded',
        contribution: result.rows[0],
      });
    } catch (txErr) {
      // If contribution insert succeeded but audit log fails, rollback everything.
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr.message);
      }

      console.error(txErr.message);
      res.status(500).json({
        message: 'Server error',
      });
    }
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: 'Server error',
    });
  } finally {
    if (client) client.release();
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

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: 'Server error',
    });
  }
};
