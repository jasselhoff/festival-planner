import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { validate, registerSchema, loginSchema } from '../middleware/validation';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateMe);

export default router;
