const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vote = sequelize.define(
    'Vote',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
    },
    {
      tableName: 'votes',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'electionId'],
        },
      ],
    }
  );

  return Vote;
};
