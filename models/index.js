// Файл: models/index.js
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
});

const TableModel = require('./Table')(sequelize);
const ReservationModel = require('./Reservation')(sequelize);

// Ассоциации
TableModel.associate({ Reservation: ReservationModel });
ReservationModel.associate({ Table: TableModel });

module.exports = {
  sequelize,
  Table: TableModel,
  Reservation: ReservationModel,
};