const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireEmployee } = require('../middleware/roles');

router.get('/stats', auth, requireEmployee, async (req, res) => {
  try {
    const [cars, users, bookings, fines] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'available') as available,
          COUNT(*) FILTER (WHERE status = 'in_use') as in_use,
          COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance
        FROM cars
      `),
      pool.query(`
        SELECT COUNT(*) as total,
          COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
          COUNT(*) FILTER (WHERE verification_status IN ('documents_uploaded','pending_verification')) as pending
        FROM users
      `),
      pool.query(`
        SELECT COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM bookings
      `),
      pool.query(`
        SELECT COUNT(*) as total,
          COUNT(*) FILTER (WHERE payment_status = 'pending') as pending,
          COALESCE(SUM(amount) FILTER (WHERE payment_status = 'pending'), 0) as pending_amount
        FROM fines
      `),
    ]);
    res.json({
      cars: cars.rows[0],
      users: users.rows[0],
      bookings: bookings.rows[0],
      fines: fines.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/revenue', auth, requireEmployee, async (req, res) => {
  try {
    const { period = 'week', date_from, date_to } = req.query;

    let from, to;
    const now = new Date();
    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (period === 'week') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      to   = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      from = date_from ? new Date(date_from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      to   = date_to   ? new Date(new Date(date_to).getTime() + 24 * 60 * 60 * 1000) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    const [totals, byDay, fineRevenue] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE type = 'charge'), 0)  AS total_charges,
          COALESCE(SUM(amount) FILTER (WHERE type = 'refund'), 0)  AS total_refunds,
          COUNT(*)            FILTER (WHERE type = 'charge')       AS charge_count
        FROM transactions
        WHERE status = 'success' AND type IN ('charge', 'refund')
          AND created_at >= $1 AND created_at < $2
      `, [from, to]),
      pool.query(`
        SELECT
          DATE(created_at) AS day,
          COALESCE(SUM(amount) FILTER (WHERE type = 'charge'), 0) AS revenue,
          COUNT(*)          FILTER (WHERE type = 'charge')        AS bookings
        FROM transactions
        WHERE status = 'success' AND type IN ('charge', 'refund')
          AND created_at >= $1 AND created_at < $2
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `, [from, to]),
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS fines_collected
        FROM fines
        WHERE payment_status = 'paid'
          AND updated_at >= $1 AND updated_at < $2
      `, [from, to]),
    ]);

    const { total_charges, total_refunds, charge_count } = totals.rows[0];
    const net = parseFloat(total_charges) - parseFloat(total_refunds);
    const avg = charge_count > 0 ? parseFloat((net / charge_count).toFixed(2)) : 0;

    res.json({
      period: { from: from.toISOString(), to: to.toISOString() },
      total_charges:    parseFloat(total_charges),
      total_refunds:    parseFloat(total_refunds),
      net_revenue:      parseFloat(net.toFixed(2)),
      bookings_count:   parseInt(charge_count),
      avg_per_booking:  avg,
      fines_collected:  parseFloat(fineRevenue.rows[0].fines_collected),
      by_day:           byDay.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/receipts', auth, requireEmployee, async (req, res) => {
  try {
    const { sort = 'date_desc', search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = ["b.status = 'completed'"];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.first_name || ' ' || u.last_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR c.license_plate ILIKE $${params.length})`);
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const orderMap = {
      date_desc:   'b.ended_at DESC',
      date_asc:    'b.ended_at ASC',
      amount_desc: 'b.total_cost DESC NULLS LAST',
      amount_asc:  'b.total_cost ASC NULLS LAST',
    };
    const orderBy = orderMap[sort] || 'b.ended_at DESC';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM bookings b JOIN users u ON u.id = b.user_id JOIN cars c ON c.id = b.car_id ${whereClause}`,
      params
    );

    params.push(parseInt(limit), offset);
    const result = await pool.query(`
      SELECT b.id, b.uuid, b.ended_at, b.started_at, b.total_cost, b.base_rental_cost,
             b.insurance_deposit, b.start_odometer, b.end_odometer,
             u.first_name || ' ' || u.last_name as client_name, u.phone as client_phone,
             c.brand || ' ' || c.model as car_name, c.license_plate,
             t.name as tariff_name, t.price_per_km,
             (SELECT amount FROM transactions WHERE booking_id = b.id AND type = 'charge' AND status = 'success' LIMIT 1) as charge_amount,
             (SELECT amount FROM transactions WHERE booking_id = b.id AND type = 'refund'  AND status = 'success' LIMIT 1) as refund_amount
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      LEFT JOIN tariffs t ON t.id = b.tariff_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit', auth, requireEmployee, async (req, res) => {
  try {
    const { type = 'cars', page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query, countQuery, params;

    if (type === 'cars') {
      countQuery = `SELECT COUNT(*) FROM audit_log WHERE table_name IN ('cars', 'bookings')`;
      query = `
        SELECT
          al.id, al.table_name, al.operation, al.record_id,
          al.old_data, al.new_data, al.changed_by, al.changed_at,
          CASE
            WHEN al.table_name = 'cars' THEN
              (al.new_data->>'brand') || ' ' || (al.new_data->>'model') || ' (' || (al.new_data->>'license_plate') || ')'
            WHEN al.table_name = 'bookings' THEN
              c.brand || ' ' || c.model || ' (' || c.license_plate || ')'
            ELSE NULL
          END AS car_info,
          CASE WHEN al.table_name = 'bookings' THEN
            u.first_name || ' ' || u.last_name
          ELSE NULL END AS client_name,
          CASE WHEN al.table_name = 'bookings' THEN u.phone ELSE NULL END AS client_phone
        FROM audit_log al
        LEFT JOIN bookings b ON al.table_name = 'bookings' AND b.id = al.record_id
        LEFT JOIN cars c ON al.table_name = 'bookings' AND c.id = (al.new_data->>'car_id')::int
        LEFT JOIN users u ON al.table_name = 'bookings' AND u.id = b.user_id
        WHERE al.table_name IN ('cars', 'bookings')
        ORDER BY al.changed_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [parseInt(limit), offset];
    } else {
      countQuery = `SELECT COUNT(*) FROM audit_log WHERE table_name IN ('users', 'fines')`;
      query = `
        SELECT
          al.id, al.table_name, al.operation, al.record_id,
          al.old_data, al.new_data, al.changed_by, al.changed_at,
          CASE
            WHEN al.table_name = 'users' THEN
              COALESCE(
                (SELECT u2.first_name || ' ' || u2.last_name FROM users u2 WHERE u2.id = al.record_id),
                (al.old_data->>'first_name') || ' ' || (al.old_data->>'last_name')
              )
            WHEN al.table_name = 'fines' THEN
              (SELECT u3.first_name || ' ' || u3.last_name FROM users u3
               WHERE u3.id = (al.new_data->>'user_id')::int)
            ELSE NULL
          END AS client_name,
          CASE
            WHEN al.table_name = 'users' THEN
              COALESCE((SELECT u4.phone FROM users u4 WHERE u4.id = al.record_id), al.old_data->>'phone')
            ELSE NULL
          END AS client_phone
        FROM audit_log al
        WHERE al.table_name IN ('users', 'fines')
        ORDER BY al.changed_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [parseInt(limit), offset];
    }

    const [rows, count] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery),
    ]);

    res.json({ data: rows.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
