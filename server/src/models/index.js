const sequelize = require('../config/database');
const createUser = require('./User');
const createElection = require('./Election');
const createCandidate = require('./Candidate');
const createVote = require('./Vote');

const User = createUser(sequelize);
const Election = createElection(sequelize);
const Candidate = createCandidate(sequelize);
const Vote = createVote(sequelize);

Election.hasMany(Candidate, { foreignKey: 'electionId', onDelete: 'CASCADE' });
Candidate.belongsTo(Election, { foreignKey: 'electionId' });

User.hasMany(Vote, { foreignKey: 'userId', onDelete: 'CASCADE' });
Vote.belongsTo(User, { foreignKey: 'userId' });

Election.hasMany(Vote, { foreignKey: 'electionId', onDelete: 'CASCADE' });
Vote.belongsTo(Election, { foreignKey: 'electionId' });

Candidate.hasMany(Vote, { foreignKey: 'candidateId', onDelete: 'CASCADE' });
Vote.belongsTo(Candidate, { foreignKey: 'candidateId' });

module.exports = {
  sequelize,
  User,
  Election,
  Candidate,
  Vote,
};
