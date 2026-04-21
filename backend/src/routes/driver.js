const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireEmployee, requireRole } = require('../middleware/roles');

// Init tables and columns
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_assignments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER REFERENCES bookings(id),
      driver_id INTEGER REFERENCES employees(id),
      task_type VARCHAR(20) DEFAULT 'delivery',
      status VARCHAR(20) DEFAULT 'accepted',
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    )
  `).catch(console.error);

  // Add task_type column if table was created without it
  await pool.query(`
    ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) DEFAULT 'delivery'
  `).catch(console.error);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS car_inspections (
      id SERIAL PRIMARY KEY,
      car_id INTEGER REFERENCES cars(id),
      booking_id INTEGER,
      driver_id INTEGER REFERENCES employees(id),
      inspection_type VARCHAR(20) DEFAULT 'pre_delivery',
      body_ok BOOLEAN DEFAULT true,
      glass_ok BOOLEAN DEFAULT true,
      interior_ok BOOLEAN DEFAULT true,
      tires_ok BOOLEAN DEFAULT true,
      lights_ok BOOLEAN DEFAULT true,
      has_new_damage BOOLEAN DEFAULT false,
      defect_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(console.error);
})();

const DRIVER_ROLES = ['driver', 'admin', 'manager', 'parking_manager'];

// ─── DELIVERY FLOW ─────────────────────────────────────────────────────────

// GET /api/driver/deliveries — pending delivery bookings
router.get('/deliveries', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id, b.reserved_at, b.planned_start_at, b.delivery_address,
        u.first_name || ' ' || u.last_name AS client_name, u.phone AS client_phone,
        c.id AS car_id, c.brand || ' ' || c.model AS car_name,
        c.license_plate, c.car_class, c.fuel_level,
        p.name AS parking_name, p.address AS parking_address,
        da.id AS assignment_id, da.driver_id AS assigned_driver_id,
        e.first_name || ' ' || e.last_name AS assigned_driver_name
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      LEFT JOIN parking_lots p ON p.id = c.current_parking_lot_id
      LEFT JOIN delivery_assignments da
        ON da.booking_id = b.id AND da.task_type = 'delivery'
      LEFT JOIN employees e ON e.id = da.driver_id
      WHERE b.has_delivery = true AND b.status = 'reserved'
      ORDER BY b.reserved_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/driver/my-tasks — this driver's active delivery tasks
router.get('/my-tasks', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        da.id, da.task_type, da.status AS task_status, da.created_at, da.completed_at,
        b.id AS booking_id, b.delivery_address, b.reserved_at, b.status AS booking_status,
        u.first_name || ' ' || u.last_name AS client_name, u.phone AS client_phone,
        c.id AS car_id, c.brand || ' ' || c.model AS car_name,
        c.license_plate, c.car_class,
        p.name AS parking_name
      FROM delivery_assignments da
      JOIN bookings b ON b.id = da.booking_id
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      LEFT JOIN parking_lots p ON p.id = c.current_parking_lot_id
      WHERE da.driver_id = $1
      ORDER BY da.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/driver/deliveries/:id/accept — accept delivery + pre-inspection
router.post('/deliveries/:id/accept', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { body_ok, glass_ok, interior_ok, tires_ok, lights_ok, has_new_damage, defect_notes } = req.body;

    const bookingResult = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND has_delivery = true AND status = 'reserved'`, [id]
    );
    if (!bookingResult.rows.length) return res.status(404).json({ error: 'Заказ не найден или уже обработан' });
    const booking = bookingResult.rows[0];

    const existing = await pool.query(
      `SELECT id FROM delivery_assignments WHERE booking_id = $1 AND task_type = 'delivery'`, [id]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Заказ уже принят другим водителем' });

    await pool.query(
      `INSERT INTO delivery_assignments (booking_id, driver_id, task_type) VALUES ($1, $2, 'delivery')`,
      [id, req.user.id]
    );

    await pool.query(`
      INSERT INTO car_inspections
        (car_id, booking_id, driver_id, inspection_type,
         body_ok, glass_ok, interior_ok, tires_ok, lights_ok, has_new_damage, defect_notes)
      VALUES ($1,$2,$3,'pre_delivery',$4,$5,$6,$7,$8,$9,$10)
    `, [
      booking.car_id, parseInt(id), req.user.id,
      body_ok !== false, glass_ok !== false, interior_ok !== false,
      tires_ok !== false, lights_ok !== false,
      has_new_damage || false, defect_notes || null,
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/driver/deliveries/:id/decline — release delivery assignment
router.post('/deliveries/:id/decline', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `DELETE FROM delivery_assignments WHERE booking_id = $1 AND driver_id = $2 AND task_type = 'delivery'`,
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/driver/tasks/:id/complete — delivered to client, activate booking
router.post('/tasks/:id/complete', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { body_ok, glass_ok, interior_ok, tires_ok, lights_ok, has_new_damage, defect_notes } = req.body;

    const taskResult = await pool.query(
      `SELECT da.*, b.car_id FROM delivery_assignments da
       JOIN bookings b ON b.id = da.booking_id
       WHERE da.id = $1 AND da.driver_id = $2 AND da.task_type = 'delivery'`,
      [id, req.user.id]
    );
    if (!taskResult.rows.length) return res.status(404).json({ error: 'Задача не найдена' });
    const { booking_id, car_id } = taskResult.rows[0];

    await pool.query(
      `UPDATE delivery_assignments SET status = 'completed', completed_at = NOW() WHERE id = $1`, [id]
    );
    await pool.query(
      `UPDATE bookings SET status = 'active', started_at = NOW(), updated_at = NOW() WHERE id = $1`, [booking_id]
    );
    await pool.query(`UPDATE cars SET status = 'in_use', updated_at = NOW() WHERE id = $1`, [car_id]);

    // Record start odometer and create deposit hold
    const [carRow, bookingRow] = await Promise.all([
      pool.query('SELECT odometer_km FROM cars WHERE id = $1', [car_id]),
      pool.query('SELECT user_id, insurance_deposit FROM bookings WHERE id = $1', [booking_id]),
    ]);
    const start_odometer = carRow.rows[0]?.odometer_km || 0;
    const { user_id: bUser, insurance_deposit } = bookingRow.rows[0];
    await pool.query('UPDATE bookings SET start_odometer = $1 WHERE id = $2', [start_odometer, booking_id]);
    if (parseFloat(insurance_deposit) > 0) {
      await pool.query(
        `INSERT INTO transactions (user_id, booking_id, amount, type, status, description)
         VALUES ($1, $2, $3, 'hold', 'pending', 'Залог за аренду автомобиля')`,
        [bUser, booking_id, insurance_deposit]
      );
    }

    await pool.query(`
      INSERT INTO car_inspections
        (car_id, booking_id, driver_id, inspection_type,
         body_ok, glass_ok, interior_ok, tires_ok, lights_ok, has_new_damage, defect_notes)
      VALUES ($1,$2,$3,'post_delivery',$4,$5,$6,$7,$8,$9,$10)
    `, [
      car_id, booking_id, req.user.id,
      body_ok !== false, glass_ok !== false, interior_ok !== false,
      tires_ok !== false, lights_ok !== false,
      has_new_damage || false, defect_notes || null,
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PICKUP / RETURN FLOW ──────────────────────────────────────────────────

// GET /api/driver/pickups — active bookings where client requested return
router.get('/pickups', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id, b.started_at, b.delivery_address,
        u.first_name || ' ' || u.last_name AS client_name, u.phone AS client_phone,
        c.id AS car_id, c.brand || ' ' || c.model AS car_name,
        c.license_plate, c.car_class, c.fuel_level,
        p.name AS parking_name,
        da.id AS assignment_id, da.status AS pickup_status,
        da.driver_id AS assigned_driver_id,
        e.first_name || ' ' || e.last_name AS assigned_driver_name
      FROM delivery_assignments da
      JOIN bookings b ON b.id = da.booking_id
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      LEFT JOIN parking_lots p ON p.id = c.current_parking_lot_id
      LEFT JOIN employees e ON e.id = da.driver_id
      WHERE da.task_type = 'pickup' AND da.status IN ('pending','accepted','at_parking')
      ORDER BY da.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/driver/pickups/:id/accept — driver accepts pickup task
router.post('/pickups/:id/accept', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const task = await pool.query(
      `SELECT * FROM delivery_assignments WHERE id = $1 AND task_type = 'pickup' AND status = 'pending'`, [id]
    );
    if (!task.rows.length) return res.status(404).json({ error: 'Задача не найдена или уже принята' });

    await pool.query(
      `UPDATE delivery_assignments SET driver_id = $1, status = 'accepted' WHERE id = $2`,
      [req.user.id, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/driver/pickups/:id/arrived — driver brought car to parking
router.post('/pickups/:id/arrived', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const task = await pool.query(
      `SELECT da.*, b.car_id FROM delivery_assignments da
       JOIN bookings b ON b.id = da.booking_id
       WHERE da.id = $1 AND da.task_type = 'pickup' AND da.driver_id = $2 AND da.status = 'accepted'`,
      [id, req.user.id]
    );
    if (!task.rows.length) return res.status(404).json({ error: 'Задача не найдена' });
    const { booking_id, car_id } = task.rows[0];

    await pool.query(
      `UPDATE delivery_assignments SET status = 'at_parking' WHERE id = $1`, [id]
    );
    // Car is now at parking awaiting inspection
    await pool.query(`UPDATE cars SET status = 'maintenance', updated_at = NOW() WHERE id = $1`, [car_id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PARKING MANAGER ───────────────────────────────────────────────────────

// GET /api/driver/parking-queue — cars at parking awaiting inspection
router.get('/parking-queue', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        da.id AS assignment_id, da.created_at AS arrived_at,
        b.id AS booking_id, b.started_at,
        u.first_name || ' ' || u.last_name AS client_name, u.phone AS client_phone,
        c.id AS car_id, c.brand || ' ' || c.model AS car_name,
        c.license_plate, c.car_class, c.odometer_km,
        p.name AS parking_name,
        e.first_name || ' ' || e.last_name AS driver_name
      FROM delivery_assignments da
      JOIN bookings b ON b.id = da.booking_id
      JOIN users u ON u.id = b.user_id
      JOIN cars c ON c.id = b.car_id
      LEFT JOIN parking_lots p ON p.id = c.current_parking_lot_id
      LEFT JOIN employees e ON e.id = da.driver_id
      WHERE da.task_type = 'pickup' AND da.status = 'at_parking'
      ORDER BY da.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/driver/parking/:id/inspect — parking manager inspection + complete booking
router.post('/parking/:id/inspect', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const { id } = req.params; // assignment_id
    const { body_ok, glass_ok, interior_ok, tires_ok, lights_ok, has_new_damage, defect_notes, end_odometer } = req.body;

    const task = await pool.query(
      `SELECT da.*, b.car_id FROM delivery_assignments da
       JOIN bookings b ON b.id = da.booking_id
       WHERE da.id = $1 AND da.task_type = 'pickup' AND da.status = 'at_parking'`,
      [id]
    );
    if (!task.rows.length) return res.status(404).json({ error: 'Авто не найдено в очереди' });
    const { booking_id, car_id } = task.rows[0];

    // Calculate cost and prepare final transactions
    const bookingInfo = await pool.query(`
      SELECT b.user_id, b.start_odometer, b.insurance_deposit, t.price_per_km
      FROM bookings b
      JOIN tariffs t ON t.id = b.tariff_id
      WHERE b.id = $1
    `, [booking_id]);
    const { user_id: bUser, start_odometer, insurance_deposit, price_per_km } = bookingInfo.rows[0];
    const final_odometer = end_odometer != null ? parseInt(end_odometer) : (start_odometer || 0);
    const km_driven = Math.max(0, final_odometer - (start_odometer || 0));
    const actual_cost = parseFloat((km_driven * parseFloat(price_per_km || 0)).toFixed(2));

    // Save parking inspection
    await pool.query(`
      INSERT INTO car_inspections
        (car_id, booking_id, driver_id, inspection_type,
         body_ok, glass_ok, interior_ok, tires_ok, lights_ok, has_new_damage, defect_notes)
      VALUES ($1,$2,$3,'parking_return',$4,$5,$6,$7,$8,$9,$10)
    `, [
      car_id, booking_id, req.user.id,
      body_ok !== false, glass_ok !== false, interior_ok !== false,
      tires_ok !== false, lights_ok !== false,
      has_new_damage || false, defect_notes || null,
    ]);

    // Update booking with odometer and cost
    await pool.query(`
      UPDATE bookings
      SET end_odometer = $1, base_rental_cost = $2, total_cost = $2, updated_at = NOW()
      WHERE id = $3
    `, [final_odometer, actual_cost, booking_id]);

    // Finalize deposit hold
    await pool.query(`
      UPDATE transactions SET status = 'success', updated_at = NOW()
      WHERE booking_id = $1 AND type = 'hold' AND status IN ('pending', 'processing')
    `, [booking_id]);

    // Charge actual cost
    if (actual_cost > 0) {
      await pool.query(
        `INSERT INTO transactions (user_id, booking_id, amount, type, status, description)
         VALUES ($1, $2, $3, 'charge', 'success', $4)`,
        [bUser, booking_id, actual_cost, `Аренда: ${km_driven} км × ${price_per_km} ₽/км`]
      );
    }

    // Refund deposit remainder
    const refund = parseFloat(insurance_deposit) - actual_cost;
    if (refund > 0) {
      await pool.query(
        `INSERT INTO transactions (user_id, booking_id, amount, type, status, description)
         VALUES ($1, $2, $3, 'refund', 'success', 'Возврат остатка залога')`,
        [bUser, booking_id, refund]
      );
    }

    // Complete the assignment
    await pool.query(
      `UPDATE delivery_assignments SET status = 'completed', completed_at = NOW() WHERE id = $1`, [id]
    );

    // Complete the booking and release the car
    await pool.query(
      `UPDATE bookings SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE id = $1`, [booking_id]
    );
    await pool.query(`UPDATE cars SET status = 'available', updated_at = NOW() WHERE id = $1`, [car_id]);

    res.json({ success: true, actual_cost, km_driven, refund: Math.max(0, refund) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/driver/cars — all cars with status for drivers
router.get('/cars', auth, requireEmployee, requireRole(...DRIVER_ROLES), async (req, res) => {
  try {
    const { status, car_class } = req.query;
    const where = [];
    const params = [];
    if (status) { params.push(status); where.push(`c.status = $${params.length}`); }
    if (car_class) { params.push(car_class); where.push(`c.car_class = $${params.length}`); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await pool.query(`
      SELECT c.id, c.license_plate, c.brand, c.model, c.year, c.color,
             c.car_class, c.fuel_level, c.odometer_km, c.status,
             p.id as parking_lot_id, p.name as parking_name, p.address as parking_address
      FROM cars c
      LEFT JOIN parking_lots p ON p.id = c.current_parking_lot_id
      ${whereClause}
      ORDER BY c.status, c.brand, c.model
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
