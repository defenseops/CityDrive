const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireEmployee, requireClient, requireRole } = require('../middleware/roles');
const upload = require('../config/upload');

router.get('/me/documents', auth, requireClient, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_documents WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/me/documents', auth, requireClient, upload.single('file'), async (req, res) => {
  try {
    const { doc_type } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const file_url = `/uploads/documents/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO user_documents (user_id, doc_type, file_url, verification_status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [req.user.id, doc_type, file_url]
    );
    await pool.query(
      `UPDATE users SET verification_status = 'documents_uploaded', updated_at = NOW()
       WHERE id = $1 AND verification_status = 'unverified'`,
      [req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pending-verification', auth, requireEmployee, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.uuid, u.phone, u.email, u.first_name, u.last_name, u.verification_status, u.created_at,
        json_agg(json_build_object('id', ud.id, 'doc_type', ud.doc_type, 'file_url', ud.file_url,
          'verification_status', ud.verification_status)) as documents
      FROM users u
      LEFT JOIN user_documents ud ON ud.user_id = u.id
      WHERE u.verification_status IN ('documents_uploaded', 'pending_verification')
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/verify', auth, requireEmployee, requireRole('admin', 'moderator'), async (req, res) => {
  try {
    const { action, reason } = req.body;
    const userId = req.params.id;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    const status = action === 'approve' ? 'verified' : 'rejected';
    await pool.query('UPDATE users SET verification_status = $1, updated_at = NOW() WHERE id = $2', [status, userId]);
    if (action === 'approve') {
      await pool.query(
        `UPDATE user_documents SET verification_status = 'verified', verified_by = $1, verified_at = NOW()
         WHERE user_id = $2 AND verification_status = 'pending'`,
        [req.user.id, userId]
      );
    } else {
      await pool.query(
        `UPDATE user_documents SET verification_status = 'rejected', verified_by = $1, verified_at = NOW(),
         rejection_reason = $2 WHERE user_id = $3 AND verification_status = 'pending'`,
        [req.user.id, reason || null, userId]
      );
    }
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me/balance', auth, async (req, res) => {
  try {
    if (req.user.table !== 'users') return res.status(403).json({ error: 'Только для клиентов' });
    // refund = пополнение (возврат средств / пополнение счёта)
    // charge/hold = списание
    const result = await pool.query(
      `SELECT COALESCE(
        SUM(CASE WHEN type = 'refund' AND status = 'success' THEN amount ELSE 0 END)
        - SUM(CASE WHEN type IN ('charge','hold') AND status = 'success' THEN amount ELSE 0 END),
        0
       ) AS balance
       FROM transactions WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ balance: parseFloat(result.rows[0].balance) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/me/topup', auth, async (req, res) => {
  try {
    if (req.user.table !== 'users') return res.status(403).json({ error: 'Только для клиентов' });
    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Некорректная сумма' });
    if (parseFloat(amount) > 100000) return res.status(400).json({ error: 'Максимум 100 000 ₽ за раз' });
    const result = await pool.query(
      `INSERT INTO transactions (user_id, amount, type, status, description, payment_gateway)
       VALUES ($1, $2, 'refund', 'success', 'Пополнение баланса', 'internal')
       RETURNING id, amount, created_at`,
      [req.user.id, parseFloat(amount)]
    );
    res.status(201).json({ success: true, transaction: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me/notifications', auth, async (req, res) => {
  try {
    if (req.user.table !== 'users') return res.status(403).json({ error: 'Только для клиентов' });
    const result = await pool.query(`
      SELECT id, table_name, operation, record_id, new_data, old_data, created_at
      FROM audit_log
      WHERE (
        (table_name = 'bookings' AND (new_data->>'user_id')::bigint = $1)
        OR (table_name = 'fines'    AND (new_data->>'user_id')::bigint = $1)
        OR (table_name = 'transactions' AND (new_data->>'user_id')::bigint = $1)
      )
      ORDER BY created_at DESC
      LIMIT 20
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, requireEmployee, requireRole('admin', 'manager', 'moderator'), async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      where.push(`u.verification_status = $${params.length}`);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
    params.push(parseInt(limit), offset);

    const result = await pool.query(`
      SELECT u.id, u.uuid, u.phone, u.email, u.first_name, u.last_name,
             u.verification_status, u.can_book, u.rating, u.total_rides, u.created_at
      FROM users u ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
