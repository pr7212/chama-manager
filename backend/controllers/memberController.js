// Import the PostgreSQL connection pool for executing database queries.
const pool = require('../config/db');

// Import the member validation function to validate incoming request data.
const validateMember = require('../validators/memberValidator');

// Import the audit logger utility to record important system actions.
const logAudit = require('../utils/auditLogger');

// GET MEMBERS (with pagination and group isolation)
// Retrieves a paginated list of members belonging only to the authenticated user's group.
exports.getMembers = async (req, res) => {
  try {
    // Get the authenticated user's group ID.
    // Default to group 1 if no group is available.
    const groupId = req.user?.group_id || 1;

    // Read the requested page number and ensure it is at least 1.
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    // Define the maximum number of records per page.
    const limit = 10;

    // Calculate the number of records to skip.
    const offset = (page - 1) * limit;

    // Retrieve members for the user's group using pagination.
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

    // Return the retrieved member list along with pagination details.
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
      },
    });
  } catch (error) {
    // Log the error for debugging purposes.
    console.error(error.message);

    // Return a generic server error response.
    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null,
    });
  }
};

// ADD MEMBER (with group isolation)
// Creates a new member within the authenticated user's group.
exports.addMember = async (req, res) => {
  try {
    // Ensure the request is made by an authenticated user.
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        data: null,
      });
    }

    // Get the authenticated user's group ID.
    const groupId = req.user?.group_id || 1;

    // Validate the incoming request body.
    const errors = validateMember(req.body);

    // Return validation errors if any are found.
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
        data: { errors },
      });
    }

    // Extract member information from the request body.
    const { full_name, phone, national_id, email, role, status } = req.body;

    // Normalize and sanitize input values.
    const memberName = (full_name || '').trim();
    const memberPhone = (phone || '').trim();
    const memberNationalId = (national_id || '').trim();
    const memberEmail = email ? email.trim() : null;

    // Apply default values if optional fields are missing.
    const memberRole = role || 'Member';
    const memberStatus = status || 'Active';

    // Extra safety validation to ensure required fields are not empty.
    if (!memberName || !memberPhone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required',
        data: null,
      });
    }

    // Check whether another member with the same phone number
    // already exists within the same group.
    const existingMember = await pool.query(
      `
      SELECT id FROM members
      WHERE phone = $1 AND group_id = $2
      `,
      [memberPhone, groupId]
    );

    // Prevent duplicate member creation.
    if (existingMember.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Member already exists',
        data: null,
      });
    }

    // Insert the new member into the database.
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

    // Retrieve the newly created member.
    const member = result.rows[0];

    // Record this action in the audit log for accountability.
    await logAudit({
      user_id: req.user.id,
      group_id: groupId,
      action: 'Added member',
      entity_type: 'member',
      entity_id: member.id,
    });

    // Return a success response with the created member.
    return res.status(201).json({
      success: true,
      message: 'Member added successfully',
      member,
      data: {
        member,
      },
    });
  } catch (error) {
    // Handle database unique constraint violations.
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A member with this phone number already exists',
        data: null,
      });
    }

    // Log unexpected errors for debugging.
    console.error(error.message);

    // Return a generic server error response.
    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null,
    });
  }
};
