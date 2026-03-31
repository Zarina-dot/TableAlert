// Файл: models/Reservation.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reservation = sequelize.define('Reservation', {
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },
    customerPhone: {
      type: DataTypes.STRING,
    },
    date: {
      type: DataTypes.DATEONLY,      // формат YYYY-MM-DD
      allowNull: false,
    },
    time: {
      type: DataTypes.TIME,           // формат HH:MM:SS
      allowNull: false,
    },
    guestsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
      defaultValue: 'confirmed',
    },
  });

  Reservation.associate = (models) => {
    Reservation.belongsTo(models.Table, { foreignKey: 'tableId' });
  };

  return Reservation;
};