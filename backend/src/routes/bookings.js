const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireEmployee, requireClient } = require('../middleware/roles');

router.post('/', auth, requireClient, async (req, res) => {
  try {
    const {
      car_id, tariff_id, planned_start_at, planned_end_at,
      has_delivery, delivery_address, delivery_lat, delivery_lon,
      has_pickup, pickup_address, pickup_lat, pickup_lon,
    } = req.body;
    const user_id = req.user.id;

    const userCheck = await pool.query('SELECT can_book FROM users WHERE id = $1', [user_id]);
    if (!userCheck.rows[0]?.can_book) {
      return res.status(403).json({ error: 'Бронирование недоступно. Пройдите верификацию.' });
    }

    try {
      const result = await pool.query(
        `CALL create_booking($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [null, null, null, user_id, car_id, tariff_id,
         planned_start_at || null, planned_end_at || null,
         has_delivery || false, delivery_address || null,
         has_pickup || false, pickup_address || null]
      );
      const row = result.rows[0];
      if (row?.p_status === 'error') return res.status(400).json({ error: row.p_message });
      return res.status(201).json({ booking_id: row?.p_booking_id, message: row?.p_message || 'Бронь создана' });
    } catch {
      const tariffResult = await pool.query('SELECT * FROM tariffs WHERE id = $1', [tariff_id]);
      if (!tariffResult.rows.length) return res.status(400).json({ error: 'Тариф не найден' });
      const tariff = tariffResult.rows[0];

      const result = await pool.query(`
        INSERT INTO bookings
          (user_id, car_id, tariff_id, planned_start_at, planned_end_at,
           has_delivery, delivery_address, delivery_lat, delivery_lon,
           has_pickup, pickup_address, pickup_lat, pickup_lon,
           insurance_deposit, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'reserved')
        RETURNING id
      `, [user_id, car_id, tariff_id, planned_start_at || null, planned_end_at || null,
          has_delivery || false, delivery_address || null, delivery_lat || null, delivery_lon || null,
          has_pickup || false, pickup_address || null, pickup_lat || null, pickup_lon || null,
          tariff.insurance_deposit]);

      await pool.query("UPDATE cars SET status = 'reserved' WHERE id = $1", [car_id]);
      return res.status(201).json({ booking_id: result.rows[0].id, message: 'Бронь создана' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, requireEmployee, async (req, res) => {
  try {
    const { status, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = [];
    const params = [];

    if (status) { params.push(status); where.push(`b.status = $${params.length}`); }
    if (date_from) { params.push(date_from); where.push(`b.reserved_at >= $${params.length}`); }
    if (date_to) { params.push(date_to); where.push(`b.reserved_at <= $${params.length}`); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM bookings b ${whereClause}`, params);
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT b.id, b.uuid, b.status, b.reserved_at, b.started_at, b.ended_at,
             b.total_cost, b.insurance_deposit, b.has_delivery, b.has_pickup,
             b.user_id, b.car_id,
             u.first_name || ' ' || u.last_name as client_name, u.phone as client_phone,
             c.brand || ' ' || c.model as car_name, c.license_plate, c.car_class
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/receipts', auth, requireClient, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.uuid, b.status, b.reserved_at, b.started_at, b.ended_at,
             b.total_cost, b.base_rental_cost, b.insurance_deposit,
             b.start_odometer, b.end_odometer,
             c.brand || ' ' || c.model as car_name, c.license_plate, c.car_class,
             t.name as tariff_name, t.price_per_km,
             (SELECT amount FROM transactions WHERE booking_id = b.id AND type = 'charge' AND status = 'success' LIMIT 1) as charge_amount,
             (SELECT amount FROM transactions WHERE booking_id = b.id AND type = 'refund'  AND status = 'success' LIMIT 1) as refund_amount
      FROM bookings b
      JOIN cars c ON c.id = b.car_id
      LEFT JOIN tariffs t ON t.id = b.tariff_id
      WHERE b.user_id = $1 AND b.status = 'completed'
      ORDER BY b.ended_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/print-receipt', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.table === 'users' ? req.user.id : null;
    const result = await pool.query(
      'SELECT print_booking_receipt($1, $2) AS text',
      [bookingId, userId]
    );
    res.json({ text: result.rows[0].text });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/:id/fiscal', auth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.table === 'users' ? req.user.id : null;
    const result = await pool.query(
      'SELECT * FROM get_booking_receipt($1, $2)',
      [bookingId, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Чек не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/my', auth, requireClient, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.uuid, b.status, b.reserved_at, b.started_at, b.ended_at,
             b.total_cost, b.base_rental_cost, b.insurance_deposit,
             b.start_odometer, b.end_odometer,
             b.has_delivery, b.has_pickup, b.delivery_address, b.pickup_address,
             c.brand || ' ' || c.model as car_name, c.license_plate, c.car_class,
             p1.name as pickup_parking_name, p2.name as return_parking_name,
             (SELECT amount FROM transactions WHERE booking_id = b.id AND type = 'hold' AND status = 'pending' LIMIT 1) as pending_hold_amount,
             (SELECT id    FROM transactions WHERE booking_id = b.id AND type = 'hold' AND status = 'pending' LIMIT 1) as pending_hold_id,
             (SELECT amount FROM transactions WHERE booking_id = b.id AND type = 'charge' AND status = 'success' LIMIT 1) as charge_amount,
             (SELECT amount FROM transactions WHERE booking_id = b.id AND type = 'refund' AND status = 'success' LIMIT 1) as refund_amount
      FROM bookings b
      JOIN cars c ON c.id = b.car_id
      LEFT JOIN parking_lots p1 ON p1.id = b.pickup_parking_lot_id
      LEFT JOIN parking_lots p2 ON p2.id = b.return_parking_lot_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT b.*,
             u.first_name || ' ' || u.last_name as client_name, u.phone as client_phone,
             c.brand || ' ' || c.model as car_name, c.license_plate, c.car_class,
             t.name as tariff_name, t.price_per_minute, t.price_per_km
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      LEFT JOIN tariffs t ON t.id = b.tariff_id
      WHERE b.id = $1
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = result.rows[0];
    if (req.user.table === 'users' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/activate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!bookingResult.rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = bookingResult.rows[0];
    if (req.user.table === 'users' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (booking.status !== 'reserved') return res.status(400).json({ error: 'Бронь не в статусе reserved' });
    await pool.query(
      "UPDATE bookings SET status = 'active', started_at = NOW(), updated_at = NOW() WHERE id = $1",
      [id]
    );
    await pool.query("UPDATE cars SET status = 'in_use' WHERE id = $1", [booking.car_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!bookingResult.rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = bookingResult.rows[0];
    if (req.user.table === 'users' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!['reserved', 'active'].includes(booking.status)) {
      return res.status(400).json({ error: 'Нельзя отменить эту бронь' });
    }
    await pool.query(
      "UPDATE bookings SET status = 'cancelled', ended_at = NOW(), updated_at = NOW() WHERE id = $1",
      [id]
    );
    await pool.query("UPDATE cars SET status = 'available' WHERE id = $1", [booking.car_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client requests pickup at end of trip
router.post('/:id/request-return', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (!bookingResult.rows.length) return res.status(404).json({ error: 'Бронь не найдена' });
    const booking = bookingResult.rows[0];
    if (req.user.table === 'users' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (booking.status !== 'active') return res.status(400).json({ error: 'Бронь не активна' });

    const existing = await pool.query(
      `SELECT id FROM delivery_assignments WHERE booking_id = $1 AND task_type = 'pickup'`, [id]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Запрос на возврат уже создан' });

    await pool.query(
      `INSERT INTO delivery_assignments (booking_id, task_type, status) VALUES ($1, 'pickup', 'pending')`, [id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pay-deposit', auth, requireClient, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await pool.query(
      `SELECT id FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );
    if (!booking.rows.length) return res.status(404).json({ error: 'Бронь не найдена или не активна' });

    const result = await pool.query(
      `UPDATE transactions SET status = 'success', updated_at = NOW()
       WHERE booking_id = $1 AND type = 'hold' AND status = 'pending'
       RETURNING id`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Нет ожидающих платежей' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', auth, requireEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const { end_odometer } = req.body;

    try {
      const result = await pool.query(
        `CALL complete_rental($1, $2, $3, $4, $5, $6, $7)`,
        [null, null, null, parseInt(id), req.user.id, end_odometer || null, null]
      );
      const row = result.rows[0];
      if (row?.p_status === 'error') return res.status(400).json({ error: row.p_message });
      return res.json({ success: true, total_cost: row?.p_total_cost });
    } catch {
      const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
      if (!bookingResult.rows.length) return res.status(404).json({ error: 'Booking not found' });
      const booking = bookingResult.rows[0];
      if (booking.status !== 'active') return res.status(400).json({ error: 'Бронь не активна' });

      await pool.query(
        "UPDATE bookings SET status = 'completed', ended_at = NOW(), end_odometer = $2, updated_at = NOW() WHERE id = $1",
        [id, end_odometer || booking.start_odometer]
      );
      await pool.query("UPDATE cars SET status = 'available', odometer_km = $2, updated_at = NOW() WHERE id = $1",
        [booking.car_id, end_odometer || 0]);
      return res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
