import { Router } from 'express';
import {
  listArtists,
  getArtist,
  createArtist,
  updateArtist,
  deleteArtist,
  listArtistsWithoutSpotifyId,
} from '../controllers/artistController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Artists
router.get('/', listArtists);
router.get('/missing-spotify-ids', listArtistsWithoutSpotifyId);
router.post('/', createArtist);
router.get('/:id', getArtist);
router.put('/:id', updateArtist);
router.delete('/:id', deleteArtist);

export default router;
