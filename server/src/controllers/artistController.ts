import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database';
import { AppError } from '../middleware/errorHandler';

interface ArtistRow {
  id: number;
  name: string;
  spotify_artist_id: string | null;
  genre: string | null;
  image_url: string | null;
  created_by: number;
  created_at: string;
}

export interface Artist {
  id: number;
  name: string;
  spotifyArtistId?: string;
  genre?: string;
  imageUrl?: string;
  createdBy: number;
  createdAt: string;
}

function mapArtistRow(row: ArtistRow): Artist {
  return {
    id: row.id,
    name: row.name,
    spotifyArtistId: row.spotify_artist_id || undefined,
    genre: row.genre || undefined,
    imageUrl: row.image_url || undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// List all artists for the current user (with optional search)
export function listArtists(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { q } = req.query;

    let query: string;
    let params: any[];

    if (q && typeof q === 'string' && q.trim().length > 0) {
      // Search by name (case-insensitive)
      query = `
        SELECT * FROM artists
        WHERE created_by = ? AND name LIKE ?
        ORDER BY name
        LIMIT 50
      `;
      params = [userId, `%${q.trim()}%`];
    } else {
      // List all
      query = `
        SELECT * FROM artists
        WHERE created_by = ?
        ORDER BY name
        LIMIT 100
      `;
      params = [userId];
    }

    const rows = db.prepare(query).all(...params) as ArtistRow[];
    const artists = rows.map(mapArtistRow);

    res.json({ success: true, data: artists });
  } catch (error) {
    next(error);
  }
}

// Get artist by ID
export function getArtist(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const row = db.prepare(
      'SELECT * FROM artists WHERE id = ? AND created_by = ?'
    ).get(id, userId) as ArtistRow | undefined;

    if (!row) {
      return next(new AppError('Artist not found', 404));
    }

    res.json({ success: true, data: mapArtistRow(row) });
  } catch (error) {
    next(error);
  }
}

// Create artist
export function createArtist(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { name, spotifyArtistId, genre, imageUrl } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return next(new AppError('Artist name is required', 400));
    }

    // Check if artist already exists (by spotify_id if available)
    if (spotifyArtistId) {
      const existing = db.prepare(
        'SELECT id FROM artists WHERE spotify_artist_id = ? AND created_by = ?'
      ).get(spotifyArtistId, userId) as { id: number } | undefined;

      if (existing) {
        // Return existing artist instead of creating duplicate
        const row = db.prepare('SELECT * FROM artists WHERE id = ?').get(existing.id) as ArtistRow;
        return res.json({ success: true, data: mapArtistRow(row), existing: true });
      }
    }

    const result = db.prepare(`
      INSERT INTO artists (name, spotify_artist_id, genre, image_url, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(name.trim(), spotifyArtistId || null, genre || null, imageUrl || null, userId);

    const artistId = result.lastInsertRowid as number;
    const row = db.prepare('SELECT * FROM artists WHERE id = ?').get(artistId) as ArtistRow;

    db.save();

    res.status(201).json({ success: true, data: mapArtistRow(row) });
  } catch (error) {
    next(error);
  }
}

// Update artist
// Users can update artists from events they created OR events in groups they're a member of
export function updateArtist(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { name, spotifyArtistId, genre, imageUrl } = req.body;

    // Check if user has access to this artist (via event ownership or group membership)
    const hasAccess = db.prepare(`
      SELECT DISTINCT ar.* FROM artists ar
      JOIN acts a ON a.artist_id = ar.id
      JOIN events e ON a.event_id = e.id
      LEFT JOIN group_events ge ON ge.event_id = e.id
      LEFT JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ar.id = ? AND (e.creator_id = ? OR gm.user_id = ?)
    `).get(id, userId, userId) as ArtistRow | undefined;

    if (!hasAccess) {
      return next(new AppError('Artist not found', 404));
    }

    db.prepare(`
      UPDATE artists SET
        name = COALESCE(?, name),
        spotify_artist_id = COALESCE(?, spotify_artist_id),
        genre = COALESCE(?, genre),
        image_url = COALESCE(?, image_url)
      WHERE id = ?
    `).run(
      name ?? null,
      spotifyArtistId ?? null,
      genre ?? null,
      imageUrl ?? null,
      id
    );

    const row = db.prepare('SELECT * FROM artists WHERE id = ?').get(id) as ArtistRow;

    db.save();

    res.json({ success: true, data: mapArtistRow(row) });
  } catch (error) {
    next(error);
  }
}

// Delete artist
export function deleteArtist(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = db.prepare(
      'SELECT * FROM artists WHERE id = ? AND created_by = ?'
    ).get(id, userId) as ArtistRow | undefined;

    if (!existing) {
      return next(new AppError('Artist not found', 404));
    }

    // Check if artist is used by any acts
    const usedByActs = db.prepare(
      'SELECT COUNT(*) as count FROM acts WHERE artist_id = ?'
    ).get(id) as { count: number };

    if (usedByActs.count > 0) {
      return next(new AppError(`Cannot delete artist: used by ${usedByActs.count} act(s)`, 400));
    }

    db.prepare('DELETE FROM artists WHERE id = ?').run(id);
    db.save();

    res.json({ success: true, data: { message: 'Artist deleted successfully' } });
  } catch (error) {
    next(error);
  }
}

// List artists without Spotify IDs (for bulk editing)
// Shows artists from events the user created OR events in groups they're a member of
export function listArtistsWithoutSpotifyId(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const rows = db.prepare(`
      SELECT DISTINCT ar.* FROM artists ar
      JOIN acts a ON a.artist_id = ar.id
      JOIN events e ON a.event_id = e.id
      LEFT JOIN group_events ge ON ge.event_id = e.id
      LEFT JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE (e.creator_id = ? OR gm.user_id = ?)
        AND (ar.spotify_artist_id IS NULL OR ar.spotify_artist_id = '')
      ORDER BY ar.name
    `).all(userId, userId) as ArtistRow[];

    const artists = rows.map(mapArtistRow);

    res.json({ success: true, data: artists });
  } catch (error) {
    next(error);
  }
}
