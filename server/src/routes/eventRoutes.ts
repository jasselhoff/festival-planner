import { Router } from 'express';
import {
  listEvents,
  listMyEvents,
  createEvent,
  getEvent,
  getEventFull,
  updateEvent,
  deleteEvent,
  listStages,
  createStage,
  updateStage,
  deleteStage,
  listDays,
  listActs,
  createAct,
  updateAct,
  deleteAct,
  listActsWithoutSpotifyId,
} from '../controllers/eventController';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  validate,
  createEventSchema,
  createStageSchema,
  createActSchema,
} from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Events
router.get('/', listEvents);
router.get('/my', listMyEvents);
router.get('/acts/missing-spotify-ids', listActsWithoutSpotifyId);
router.post('/', validate(createEventSchema), createEvent);
router.get('/:id', getEvent);
router.get('/:id/full', getEventFull);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Days
router.get('/:eventId/days', listDays);

// Stages
router.get('/:eventId/stages', listStages);
router.post('/:eventId/stages', validate(createStageSchema), createStage);
router.put('/:eventId/stages/:stageId', updateStage);
router.delete('/:eventId/stages/:stageId', deleteStage);

// Acts
router.get('/:eventId/acts', listActs);
router.post('/:eventId/acts', validate(createActSchema), createAct);
router.put('/:eventId/acts/:actId', updateAct);
router.delete('/:eventId/acts/:actId', deleteAct);

export default router;
