require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/cars',      require('./routes/cars'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/fines',     require('./routes/fines'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/driver',    require('./routes/driver'));
app.use('/api/tariffs',   require('./routes/tariffs'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CityDrive backend running on port ${PORT}`));
