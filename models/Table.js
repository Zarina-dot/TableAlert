// Файл: models/Table.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Table = sequelize.define('Table', {
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
  });

  Table.associate = (models) => {
    Table.hasMany(models.Reservation, { foreignKey: 'tableId', onDelete: 'CASCADE' });
  };

  return Table;
};