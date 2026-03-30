const express = require('express');
const { fn, col } = require('sequelize');
const { Candidate, Election, Vote } = require('../models');

const router = express.Router();

router.get('/:electionId/dashboard', async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);

    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const candidates = await Candidate.findAll({
      where: { electionId },
      attributes: ['id', 'name', 'party'],
      order: [['createdAt', 'ASC']],
    });

    const counts = await Vote.findAll({
      where: { electionId },
      attributes: ['candidateId', [fn('COUNT', col('id')), 'voteCount']],
      group: ['candidateId'],
      raw: true,
    });

    const totalVotes = await Vote.count({ where: { electionId } });

    const voteCountByCandidate = counts.reduce((acc, row) => {
      acc[row.candidateId] = Number(row.voteCount || 0);
      return acc;
    }, {});

    const results = candidates.map((candidate) => {
      const votes = voteCountByCandidate[candidate.id] || 0;
      const percentage = totalVotes === 0 ? 0 : Number(((votes / totalVotes) * 100).toFixed(2));
      return {
        candidateId: candidate.id,
        name: candidate.name,
        party: candidate.party,
        votes,
        percentage,
      };
    });

    results.sort((a, b) => b.votes - a.votes);

    return res.json({
      election: {
        id: election.id,
        title: election.title,
        startDate: election.startDate,
        endDate: election.endDate,
        isActive: election.isActive,
      },
      totalVotes,
      results,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
