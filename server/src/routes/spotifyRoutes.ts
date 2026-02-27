import { Router, Request, Response } from 'express';
import { searchArtists } from '../services/spotifyService';
import { authenticateToken } from '../middleware/authMiddleware';
import { validate, createPlaylistSchema } from '../middleware/validation';
import {
  getAuthUrl,
  handleCallback,
  getConnectionStatus,
  disconnect,
} from '../controllers/spotifyAuthController';
import { createPlaylist, getPlaylists } from '../controllers/playlistController';

const router = Router();

router.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
    const artists = await searchArtists(query, limit);

    res.json({ success: true, data: artists });
  } catch (error: any) {
    console.error('Spotify search error:', error);

    if (error.message.includes('credentials not configured')) {
      return res.status(503).json({
        success: false,
        error: 'Spotify integration not configured',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to search artists',
    });
  }
});

// OAuth endpoints
router.get('/auth/url', authenticateToken, getAuthUrl);
router.get('/callback', handleCallback); // No auth - called by Spotify
router.get('/status', authenticateToken, getConnectionStatus);
router.delete('/disconnect', authenticateToken, disconnect);

// Playlist endpoints
router.post('/playlists', authenticateToken, validate(createPlaylistSchema), createPlaylist);
router.get('/playlists/:groupId/:eventId', authenticateToken, getPlaylists);

export default router;
