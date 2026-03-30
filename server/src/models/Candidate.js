const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Candidate = sequelize.define(
    'Candidate',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(140),
        allowNull: false,
      },
      party: {
        type: DataTypes.STRING(140),
        allowNull: false,
      },
      manifesto: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'candidates',
      timestamps: true,
    }
  );

  return Candidate;
};
