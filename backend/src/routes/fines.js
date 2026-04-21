const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireEmployee, requireClient, requireRole } = require('../middleware/roles');

router.get('/', auth, requireEmployee, async (req, res) => {
  try {
    const { payment_status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = [];
    const params = [];

    if (payment_status) { params.push(payment_status); where.push(`f.payment_status = $${params.length}`); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM fines f ${whereClause}`, params);
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT f.*, u.first_name || ' ' || u.last_name as client_name, u.phone as client_phone,
             c.brand || ' ' || c.model as car_name, c.license_plate
      FROM fines f
      JOIN users u ON u.id = f.user_id
      LEFT JOIN cars c ON c.id = f.car_id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', auth, requireClient, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, c.brand || ' ' || c.model as car_name, c.license_plate
      FROM fines f
      LEFT JOIN cars c ON c.id = f.car_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, requireEmployee, requireRole('admin', 'moderator', 'manager'), async (req, res) => {
  try {
    const { user_id, booking_id, car_id, fine_type, amount, violation_date, violation_place, admin_comment } = req.body;

    try {
      const result = await pool.query(
        `CALL assign_fine($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [null, null, user_id, booking_id || null, car_id || null, fine_type, amount, violation_date || null, admin_comment || null]
      );
      const row = result.rows[0];
      return res.status(201).json({ fine_id: row?.p_fine_id });
    } catch {
      const result = await pool.query(`
        INSERT INTO fines (user_id, booking_id, car_id, fine_type, amount, violation_date, violation_place, admin_comment, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [user_id, booking_id || null, car_id || null, fine_type, amount,
          violation_date || null, violation_place || null, admin_comment || null, req.user.id]);
      await pool.query('UPDATE users SET can_book = false WHERE id = $1', [user_id]);
      return res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/fiscal', auth, async (req, res) => {
  try {
    const fineId = parseInt(req.params.id);
    const userId = req.user.table === 'users' ? req.user.id : null;
    const result = await pool.query(
      'SELECT * FROM get_fine_receipt($1, $2)',
      [fineId, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Чек не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const fineResult = await pool.query('SELECT * FROM fines WHERE id = $1', [id]);
    if (!fineResult.rows.length) return res.status(404).json({ error: 'Fine not found' });
    const fine = fineResult.rows[0];

    if (req.user.table === 'users' && fine.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (fine.payment_status === 'paid') return res.status(400).json({ error: 'Штраф уже оплачен' });

    try {
      await pool.query(`CALL pay_fine($1, $2)`, [parseInt(id), null]);
    } catch {
      await pool.query(
        "UPDATE fines SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1",
        [id]
      );
      const unpaid = await pool.query(
        "SELECT COUNT(*) FROM fines WHERE user_id = $1 AND payment_status = 'pending'",
        [fine.user_id]
      );
      if (parseInt(unpaid.rows[0].count) === 0) {
        await pool.query('UPDATE users SET can_book = true WHERE id = $1', [fine.user_id]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
