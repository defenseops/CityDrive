require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function run() {
  const phone = '+71234567890';
  const password = '123456';

  const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (existing.rows.length) {
    console.log(`Пользователь с телефоном ${phone} уже существует (id=${existing.rows[0].id})`);
    await pool.end();
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  const result = await pool.query(`
    INSERT INTO users (
      phone, email, password_hash,
      first_name, last_name, middle_name,
      birth_date, driver_license_number,
      driver_license_issue_date, driver_license_expiry_date,
      verification_status, can_book
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'verified',true)
    RETURNING id, phone, email, first_name, last_name, verification_status, can_book
  `, [
    phone,
    'testuser1@citydrive.ru',
    password_hash,
    'Кирилл',
    'Тестов',
    'Иванович',
    '1990-05-15',
    '9900 654321',
    '2020-01-01',
    '2030-06-01',
  ]);

  const u = result.rows[0];
  console.log(`✓ Создан тестовый пользователь:`);
  console.log(`  ID:             ${u.id}`);
  console.log(`  Телефон:        ${u.phone}`);
  console.log(`  Email:          ${u.email}`);
  console.log(`  Имя:            ${u.first_name} ${u.last_name}`);
  console.log(`  Верификация:    ${u.verification_status}`);
  console.log(`  Может бронить:  ${u.can_book}`);
  console.log(`  Пароль:         ${password}`);

  await pool.end();
}

run().catch(console.error);
