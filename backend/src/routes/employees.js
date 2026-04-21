const router = require('express').Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { requireEmployee, requireRole } = require('../middleware/roles');

router.get('/', auth, requireEmployee, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, uuid, email, phone, first_name, last_name, middle_name,
             role, is_active, last_activity_at, created_at
      FROM employees ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, requireEmployee, requireRole('admin'), async (req, res) => {
  try {
    const {
      email, phone, password, first_name, last_name, middle_name, role,
      driver_license_number, driver_license_expiry_date,
    } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO employees (email, phone, password_hash, first_name, last_name, middle_name,
                             role, driver_license_number, driver_license_expiry_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, uuid, email, phone, first_name, last_name, role
    `, [email, phone, password_hash, first_name, last_name, middle_name || null,
        role, driver_license_number || null, driver_license_expiry_date || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email или телефон уже существует' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, requireEmployee, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, middle_name, role, is_active, phone } = req.body;
    const updates = [];
    const params = [];

    if (first_name !== undefined) { params.push(first_name); updates.push(`first_name = $${params.length}`); }
    if (last_name !== undefined) { params.push(last_name); updates.push(`last_name = $${params.length}`); }
    if (middle_name !== undefined) { params.push(middle_name); updates.push(`middle_name = $${params.length}`); }
    if (role !== undefined) { params.push(role); updates.push(`role = $${params.length}`); }
    if (is_active !== undefined) { params.push(is_active); updates.push(`is_active = $${params.length}`); }
    if (phone !== undefined) { params.push(phone); updates.push(`phone = $${params.length}`); }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    updates.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE employees SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, uuid, email, phone, first_name, last_name, role, is_active`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Employee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
