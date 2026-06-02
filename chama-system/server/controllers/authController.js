const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

exports.registerUser = async (req, res) => {
  try {
    const { full_name, phone, password } = req.body;

    // check existing
    const exists = await pool.query('SELECT id FROM users WHERE phone=$1', [
      phone,
    ]);
    if (exists.rows.length) {
      return res
        .status(400)
        .json({ message: 'Phone number already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);

    // INSERT without forcing role; DB default will apply
    const insert = await pool.query(
      `INSERT INTO users(full_name, phone, password)
       VALUES($1, $2, $3) RETURNING id`,
      [full_name, phone, hashed]
    );

    // fetch the freshly created row (to get DB default role)
    const userRes = await pool.query(
      'SELECT id, full_name, phone, role FROM users WHERE id = $1',
      [insert.rows[0].id]
    );

    const user = userRes.rows[0];
    const token = generateToken(user);

    return res
      .status(201)
      .json({ message: 'User registered successfully', user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const userRes = await pool.query(
      'SELECT id, full_name, phone, password, role FROM users WHERE phone=$1',
      [phone]
    );

    if (!userRes.rows.length) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const userRow = userRes.rows[0];
    const match = await bcrypt.compare(password, userRow.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Use DB row (without password) for token / response
    const user = {
      id: userRow.id,
      full_name: userRow.full_name,
      phone: userRow.phone,
      role: userRow.role,
    };

    const token = generateToken(user);
    return res.json({ message: 'Login successful', user, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
