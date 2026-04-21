const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireEmployee, requireRole } = require('../middleware/roles');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, car_class,
             price_per_minute, price_per_km, insurance_deposit,
             default_delivery_fee, default_pickup_fee,
             dirty_car_fine, smoking_fine, pet_hair_fine,
             is_active, created_at
      FROM tariffs
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, requireEmployee, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const {
      name, description, car_class, price_per_minute, price_per_km, insurance_deposit,
      default_delivery_fee, default_pickup_fee,
      dirty_car_fine, smoking_fine, pet_hair_fine, is_active,
    } = req.body;
    if (!name || !price_per_minute) return res.status(400).json({ error: 'Название и цена обязательны' });

    const result = await pool.query(`
      INSERT INTO tariffs (name, description, car_class, price_per_minute, price_per_km, insurance_deposit,
        default_delivery_fee, default_pickup_fee, dirty_car_fine, smoking_fine, pet_hair_fine,
        is_active, valid_from)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW())
      RETURNING *
    `, [
      name, description || null, car_class || null,
      price_per_minute, price_per_km || 0, insurance_deposit || 0,
      default_delivery_fee || 500, default_pickup_fee || 500,
      dirty_car_fine || 500, smoking_fine || 2000, pet_hair_fine || 3000,
      is_active !== false,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, requireEmployee, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [
      'name', 'description', 'car_class',
      'price_per_minute', 'price_per_km', 'insurance_deposit',
      'default_delivery_fee', 'default_pickup_fee',
      'dirty_car_fine', 'smoking_fine', 'pet_hair_fine', 'is_active',
    ];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        params.push(req.body[f]);
        updates.push(`${f} = $${params.length}`);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'Нет полей для обновления' });
    updates.push('updated_at = NOW()');
    params.push(id);
    const result = await pool.query(
      `UPDATE tariffs SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Тариф не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, requireEmployee, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const inUse = await pool.query('SELECT id FROM bookings WHERE tariff_id = $1 LIMIT 1', [id]);
    if (inUse.rows.length) return res.status(409).json({ error: 'Тариф используется в бронированиях' });
    await pool.query('DELETE FROM tariffs WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
