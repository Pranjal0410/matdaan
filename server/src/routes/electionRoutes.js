const express = require('express');
const { Election, Candidate } = require('../models');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, isActive } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ message: 'title, startDate and endDate are required' });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'startDate must be before endDate' });
    }

    const election = await Election.create({
      title,
      description,
      startDate,
      endDate,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });

    return res.status(201).json({ message: 'Election created', election });
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const elections = await Election.findAll({
      order: [['createdAt', 'DESC']],
    });

    return res.json({ elections });
  } catch (error) {
    return next(error);
  }
});

router.post('/:electionId/candidates', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);
    const { name, party, manifesto } = req.body;

    if (!name || !party) {
      return res.status(400).json({ message: 'name and party are required' });
    }

    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const candidate = await Candidate.create({
      name,
      party,
      manifesto,
      electionId,
    });

    return res.status(201).json({ message: 'Candidate added', candidate });
  } catch (error) {
    return next(error);
  }
});

router.get('/:electionId/candidates', async (req, res, next) => {
  try {
    const electionId = Number(req.params.electionId);

    const election = await Election.findByPk(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const candidates = await Candidate.findAll({
      where: { electionId },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'name', 'party', 'manifesto', 'createdAt'],
    });

    return res.json({
      election: {
        id: election.id,
        title: election.title,
        startDate: election.startDate,
        endDate: election.endDate,
        isActive: election.isActive,
      },
      candidates,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
