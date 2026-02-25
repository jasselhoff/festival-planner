import { Router } from 'express';
import {
  getGroupSelections,
  getMySelections,
  addSelection,
  removeSelection,
  getConflicts,
} from '../controllers/selectionController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validate, createSelectionSchema } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Selections
router.get('/:groupId/selections', getGroupSelections);
router.get('/:groupId/selections/me', getMySelections);
router.post('/:groupId/selections', validate(createSelectionSchema), addSelection);
router.delete('/:groupId/selections/:actId', removeSelection);

// Conflicts
router.get('/:groupId/events/:eventId/conflicts', getConflicts);

export default router;
