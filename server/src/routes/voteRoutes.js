const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Election, Candidate, Vote } = require('../models');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { electionId, candidateId } = req.body;

    if (!electionId || !candidateId) {
      return res.status(400).json({ message: 'electionId and candidateId are required' });
    }

    await sequelize.transaction(async (transaction) => {
      const now = new Date();
      const election = await Election.findOne({
        where: {
          id: electionId,
          isActive: true,
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!election) {
        const error = new Error('Election is not currently active');
        error.status = 400;
        throw error;
      }

      const candidate = await Candidate.findOne({
        where: {
          id: candidateId,
          electionId,
        },
        transaction,
      });

      if (!candidate) {
        const error = new Error('Candidate not found for this election');
        error.status = 404;
        throw error;
      }

      const existingVote = await Vote.findOne({
        where: { userId, electionId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existingVote) {
        const error = new Error('You have already voted in this election');
        error.status = 409;
        throw error;
      }

      await Vote.create(
        {
          userId,
          electionId,
          candidateId,
        },
        { transaction }
      );
    });

    return res.status(201).json({ message: 'Vote cast successfully' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'You have already voted in this election' });
    }
    return next(error);
  }
});

module.exports = router;
