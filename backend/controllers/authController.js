const pool = require('../config/db');
const authService = require('../services/auth.service');

exports.registerUser = async (req, res) => {
  try {
    const errors = authService.validateRegisterInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
        data: { errors }
      });
    }

    const { full_name, phone, password } = req.body;

    // check existing
    const exists = await pool.query('SELECT id FROM users WHERE phone=$1', [
      phone,
    ]);
    if (exists.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered',
        data: null
      });
    }

    const hashed = await authService.hashPassword(password);

    // INSERT without forcing role; DB default will apply
    const insert = await pool.query(
      `INSERT INTO users(full_name, phone, password)
       VALUES($1, $2, $3) RETURNING id`,
      [full_name, phone, hashed]
    );

    // fetch the freshly created row (to get DB default role)
    const userRes = await pool.query(
      'SELECT id, full_name, phone, role, group_id FROM users WHERE id = $1',
      [insert.rows[0].id]
    );

    const user = userRes.rows[0];
    const token = authService.generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user,
      token,
      data: {
        user,
        token
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      data: null
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const errors = authService.validateLoginInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(', '),
        data: { errors }
      });
    }

    const { phone, password } = req.body;
    const userRes = await pool.query(
      'SELECT id, full_name, phone, password, role, group_id FROM users WHERE phone=$1',
      [phone]
    );

    if (!userRes.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
        data: null
      });
    }

    const userRow = userRes.rows[0];
    const match = await authService.comparePassword(password, userRow.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
        data: null
      });
    }

    // Use DB row (without password) for token / response
    const user = {
      id: userRow.id,
      full_name: userRow.full_name,
      phone: userRow.phone,
      role: userRow.role,
      group_id: userRow.group_id,
    };

    const token = authService.generateToken(user);
    return res.json({
      success: true,
      message: 'Login successful',
      user,
      token,
      data: {
        user,
        token
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      data: null
    });
  }
};
