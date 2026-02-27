import { Router } from 'express';
import authRoutes from './authRoutes';
import eventRoutes from './eventRoutes';
import groupRoutes from './groupRoutes';
import selectionRoutes from './selectionRoutes';
import spotifyRoutes from './spotifyRoutes';
import artistRoutes from './artistRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/groups', groupRoutes);
router.use('/groups', selectionRoutes); // Selections are under /groups/:groupId/selections
router.use('/spotify', spotifyRoutes);
router.use('/artists', artistRoutes);

export default router;
