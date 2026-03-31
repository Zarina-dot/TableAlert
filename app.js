const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const { sequelize } = require('./models');
const socket = require('./socket');
require('./services/reminderService');   // <-- сюда
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);

// Инициализация Socket.IO
socket.init(server);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'views'))); // для клиентского HTML

// Настройка сессий
app.use(session({
  secret: 'tablealert-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 день
}));

// API маршруты
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

// Синхронизация с базой данных и добавление тестовых столиков
sequelize.sync({ force: true }).then(async () => {
  console.log('Database synchronized');
  const { Table } = require('./models');
  const count = await Table.count();
  if (count === 0) {
    await Table.bulkCreate([
      { number: 1, capacity: 2, description: 'у окна' },
      { number: 2, capacity: 2, description: 'у окна' },
      { number: 3, capacity: 2, description: 'центр' },
      { number: 4, capacity: 2, description: 'центр' },
      { number: 5, capacity: 2, description: 'у стены' },
      { number: 6, capacity: 2, description: 'у стены' },
      { number: 7, capacity: 2, description: 'тихий угол' },
      { number: 8, capacity: 2, description: 'тихий угол' },
      { number: 9, capacity: 4, description: 'у входа' },
      { number: 10, capacity: 4, description: 'у входа' },
      { number: 11, capacity: 6, description: 'VIP-ложа' }
    ]);
    console.log('11 tables created');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});