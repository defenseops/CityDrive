const router = require('express').Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const {
      phone, email, password, first_name, last_name, middle_name,
      birth_date, driver_license_number, driver_license_issue_date,
      driver_license_expiry_date, first_license_issue_date,
    } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users
        (phone, email, password_hash, first_name, last_name, middle_name, birth_date,
         driver_license_number, driver_license_issue_date, driver_license_expiry_date, first_license_issue_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, uuid, phone, email, first_name, last_name, role, verification_status`,
      [phone, email, password_hash, first_name, last_name, middle_name || null,
       birth_date, driver_license_number, driver_license_issue_date,
       driver_license_expiry_date, first_license_issue_date || null]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, uuid: user.uuid, role: user.role, table: 'users', verification_status: user.verification_status },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Телефон или email уже зарегистрирован' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (!result.rows.length) return res.status(401).json({ error: 'Неверный телефон или пароль' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Неверный телефон или пароль' });
    const token = jwt.sign(
      { id: user.id, uuid: user.uuid, role: user.role, table: 'users', verification_status: user.verification_status },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({
      token,
      user: {
        id: user.id, uuid: user.uuid, phone: user.phone, email: user.email,
        first_name: user.first_name, last_name: user.last_name, role: user.role,
        verification_status: user.verification_status, can_book: user.can_book,
        table: 'users',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/employee/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM employees WHERE email = $1 AND is_active = true', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Неверный email или пароль' });
    const emp = result.rows[0];
    const valid = await bcrypt.compare(password, emp.password_hash);
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });
    await pool.query('UPDATE employees SET last_activity_at = NOW() WHERE id = $1', [emp.id]);
    const token = jwt.sign(
      { id: emp.id, uuid: emp.uuid, role: emp.role, table: 'employees' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({
      token,
      user: {
        id: emp.id, uuid: emp.uuid, email: emp.email, phone: emp.phone,
        first_name: emp.first_name, last_name: emp.last_name, role: emp.role,
        table: 'employees',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const { id, table } = req.user;
    if (table === 'users') {
      const result = await pool.query(
        `SELECT id, uuid, phone, email, first_name, last_name, middle_name, birth_date,
                driver_license_number, verification_status, can_book, rating, total_rides, total_spent, role
         FROM users WHERE id = $1`,
        [id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
      res.json({ ...result.rows[0], table: 'users' });
    } else {
      const result = await pool.query(
        'SELECT id, uuid, email, phone, first_name, last_name, middle_name, role FROM employees WHERE id = $1',
        [id]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Employee not found' });
      res.json({ ...result.rows[0], table: 'employees' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
