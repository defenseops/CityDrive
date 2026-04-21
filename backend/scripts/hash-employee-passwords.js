require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../src/config/db');
const bcrypt = require('bcryptjs');

const employees = [
  { email: 'admin@citydrive.ru',        password: 'Admin1Pass!' },
  { email: 'moderator@citydrive.ru',    password: 'Moderator1!' },
  { email: 'manager@citydrive.ru',      password: 'Manager1Pass!' },
  { email: 'parking1@citydrive.ru',     password: 'Parking1Pass!' },
  { email: 'driver1@citydrive.ru',      password: 'Driver1Pass!' },
];

async function run() {
  for (const emp of employees) {
    const hash = await bcrypt.hash(emp.password, 10);
    const result = await pool.query(
      'UPDATE employees SET password_hash = $1 WHERE email = $2 RETURNING email',
      [hash, emp.email]
    );
    if (result.rows.length) {
      console.log(`✓ ${emp.email}`);
    } else {
      console.log(`✗ Not found: ${emp.email}`);
    }
  }
  await pool.end();
}

run().catch(console.error);
