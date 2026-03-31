// Файл: socket.js
let io;

module.exports = {
  init: (server) => {
    io = require('socket.io')(server, {
      cors: { origin: '*' }, // для разработки
    });
    io.on('connection', (socket) => {
      console.log('Admin connected');
      socket.on('disconnect', () => console.log('Admin disconnected'));
    });
    return io;
  },
  getIO: () => {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
  },
  broadcastUpdate: (event, data) => {
    if (io) io.emit(event, data);
  },
};