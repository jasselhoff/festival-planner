import { Router } from 'express';
import {
  listGroups,
  createGroup,
  getGroup,
  getGroupByUuid,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  listMembers,
  removeMember,
  listGroupEvents,
  addEventToGroup,
  removeEventFromGroup,
} from '../controllers/groupController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validate, createGroupSchema } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Groups
router.get('/', listGroups);
router.post('/', validate(createGroupSchema), createGroup);
router.get('/uuid/:uuid', getGroupByUuid);
router.get('/:id', getGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Membership
router.post('/join/:uuid', joinGroup);
router.delete('/:id/leave', leaveGroup);
router.get('/:id/members', listMembers);
router.delete('/:id/members/:memberId', removeMember);

// Group events
router.get('/:groupId/events', listGroupEvents);
router.post('/:groupId/events', addEventToGroup);
router.delete('/:groupId/events/:eventId', removeEventFromGroup);

export default router;
