const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

exports.registerUser = async (req, res) => {
  try {
    const { full_name, phone, password } = req.body;

    if (!full_name || !phone || !password) {
      return res.status(400).json({
        message: 'All fields are required',
      });
    }

    // check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [
      phone,
    ]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: 'Phone number already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, phone, password)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, phone, role`,
      [full_name, phone, hashedPassword]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: 'Server error',
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: 'Phone and password required',
      });
    }

    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [
      phone,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      message: 'Server error',
    });
  }
};
