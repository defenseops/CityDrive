const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireEmployee } = require('../middleware/roles');

router.get('/', auth, async (req, res) => {
  try {
    const { status, car_class, parking_lot_id } = req.query;
    const where = [];
    const params = [];

    if (status) { params.push(status); where.push(`c.status = $${params.length}`); }
    if (car_class) { params.push(car_class); where.push(`c.car_class = $${params.length}`); }
    if (parking_lot_id) { params.push(parking_lot_id); where.push(`c.current_parking_lot_id = $${params.length}`); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await pool.query(`
      SELECT c.id, c.license_plate, c.brand, c.model, c.year, c.color, c.car_class,
             c.transmission, c.engine_type, c.fuel_level, c.odometer_km, c.status,
             c.price_per_minute, c.price_per_km, c.insurance_deposit, c.child_seat,
             c.current_lat, c.current_lon, c.address,
             p.id as parking_lot_id, p.name as parking_name, p.address as parking_address
      FROM cars c
      LEFT JOIN parking_lots p ON p.id = c.current_parking_lot_id
      ${whereClause}
      ORDER BY c.brand, c.model
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const carResult = await pool.query(`
      SELECT c.*, p.name as parking_name, p.address as parking_address
      FROM cars c
      LEFT JOIN parking_lots p ON p.id = c.current_parking_lot_id
      WHERE c.id = $1
    `, [id]);
    if (!carResult.rows.length) return res.status(404).json({ error: 'Car not found' });

    const damages = await pool.query(
      `SELECT * FROM car_damages WHERE car_id = $1 AND status = 'active' ORDER BY detected_at DESC`,
      [id]
    );
    res.json({ ...carResult.rows[0], damages: damages.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, requireEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, fuel_level, odometer_km, current_parking_lot_id } = req.body;
    const updates = [];
    const params = [];

    if (status !== undefined) { params.push(status); updates.push(`status = $${params.length}`); }
    if (fuel_level !== undefined) { params.push(fuel_level); updates.push(`fuel_level = $${params.length}`); }
    if (odometer_km !== undefined) { params.push(odometer_km); updates.push(`odometer_km = $${params.length}`); }
    if (current_parking_lot_id !== undefined) { params.push(current_parking_lot_id); updates.push(`current_parking_lot_id = $${params.length}`); }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    updates.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
      `UPDATE cars SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Car not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
