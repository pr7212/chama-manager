const pool = require('../config/db');
const validateMember = require('../validators/memberValidator');
const logAudit = require('../utils/auditLogger');

// GET MEMBERS (with pagination and group isolation)
exports.getMembers = async (req, res) => {
  try {
    const groupId = req.user?.group_id || 1;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      SELECT id, full_name, phone, national_id, email, role, status, created_at, group_id
      FROM members
      WHERE group_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3
      `,
      [groupId, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: 'Members retrieved successfully',
      members: result.rows,
      page,
      limit,
      data: {
        members: result.rows,
        page,
        limit,
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

// ADD MEMBER (with group isolation)
exports.addMember = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        data: null
      });
    }

    const groupId = req.user?.group_id || 1;
    const errors = validateMember(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
        data: { errors }
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
        success: false,
        message: 'Name and phone are required',
        data: null
      });
    }

    const existingMember = await pool.query(
      `
      SELECT id FROM members
      WHERE phone = $1 AND group_id = $2
      `,
      [memberPhone, groupId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Member already exists',
        data: null
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
        created_by,
        group_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, full_name, phone, national_id, email, role, status, created_at, group_id
      `,
      [
        memberName,
        memberPhone,
        memberNationalId,
        memberEmail,
        memberRole,
        memberStatus,
        req.user.id,
        groupId,
      ]
    );

    const member = result.rows[0];

    await logAudit({
      user_id: req.user.id,
      group_id: groupId,
      action: 'Added member',
      entity_type: 'member',
      entity_id: member.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Member added successfully',
      member,
      data: {
        member
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A member with this phone number already exists',
        data: null
      });
    }

    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null
    });
  }
};
