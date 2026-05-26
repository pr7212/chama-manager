const pool = require('../config/db');
const validateMember = require('../validators/memberValidator');
const logAudit = require('../utils/auditLogger');

// GET MEMBERS (with pagination)
exports.getMembers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      SELECT id, full_name, phone, national_id, email, role, status, created_at
      FROM members
      ORDER BY created_at DESC, id DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    return res.status(200).json({
      members: result.rows,
      page,
      limit,
    });
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};

// ADD MEMBER
exports.addMember = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    const errors = validateMember(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        errors,
      });
    }

    const { full_name, phone, national_id, email, role, status } = req.body;

    const memberName = (full_name || '').trim();
    const memberPhone = (phone || '').trim();
    const memberNationalId = (national_id || '').trim();
    const memberEmail = email ? email.trim() : null;
    const memberRole = role || 'Member';
    const memberStatus = status || 'Active';

    // extra safety validation
    if (!memberName || !memberPhone) {
      return res.status(400).json({
        message: 'Name and phone are required',
      });
    }

    const existingMember = await pool.query(
      `
      SELECT id FROM members
      WHERE phone = $1
      `,
      [memberPhone]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({
        message: 'Member already exists',
      });
    }

    const result = await pool.query(
      `
      INSERT INTO members (
        full_name,
        phone,
        national_id,
        email,
        role,
        status,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, full_name, phone, national_id, email, role, status, created_at
      `,
      [
        memberName,
        memberPhone,
        memberNationalId,
        memberEmail,
        memberRole,
        memberStatus,
        req.user.id,
      ]
    );

    const member = result.rows[0];

    await logAudit({
      user_id: req.user.id,
      action: 'Added member',
      entity_type: 'member',
      entity_id: member.id,
    });

    return res.status(201).json({
      message: 'Member added successfully',
      member,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A member with this phone number already exists',
      });
    }

    console.error(error.message);

    return res.status(500).json({
      message: 'Server error',
    });
  }
};
