require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function run() {
  const email = 'owner@citydrive.ru';
  const password = 'Owner1Pass!';

  const existing = await pool.query('SELECT id FROM employees WHERE email = $1', [email]);
  if (existing.rows.length) {
    console.log(`Сотрудник с email ${email} уже существует (id=${existing.rows[0].id})`);
    await pool.end();
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = await pool.query(`
    INSERT INTO employees (email, phone, password_hash, first_name, last_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 'admin', true)
    RETURNING id, email, role
  `, [email, '+70000000000', password_hash, 'Владелец', 'CityDrive']);

  const emp = result.rows[0];
  console.log(`✓ Создан сотрудник:`);
  console.log(`  ID:       ${emp.id}`);
  console.log(`  Email:    ${emp.email}`);
  console.log(`  Роль:     ${emp.role}`);
  console.log(`  Пароль:   ${password}`);
  console.log(`  Логин:    /admin/login`);

  await pool.end();
}

run().catch(console.error);
