import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import {
  getSpotifyConnection,
  createPlaylistFromArtists,
} from '../services/spotifyUserService';

interface SelectionWithActRow {
  id: number;
  user_id: number;
  group_id: number;
  act_id: number;
  act_name: string;
  artist_spotify_id: string | null;
}

interface PlaylistRow {
  id: number;
  group_id: number;
  event_id: number;
  created_by: number;
  spotify_playlist_id: string;
  spotify_playlist_url: string;
  playlist_name: string;
  description: string | null;
  track_count: number;
  artists_included: string | null;
  is_public: number;
  created_at: string;
}

export async function createPlaylist(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const {
      groupId,
      eventId,
      playlistName,
      description = '',
      memberIds,
      tracksPerArtist = 3,
      isPublic = true,
    } = req.body;

    // Verify user has Spotify connected
    const connection = getSpotifyConnection(userId);
    if (!connection) {
      return next(new AppError('Spotify account not connected', 400));
    }

    // Verify user is a member of the group
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    // Verify the event is linked to the group
    const groupEvent = db
      .prepare('SELECT * FROM group_events WHERE group_id = ? AND event_id = ?')
      .get(groupId, eventId);

    if (!groupEvent) {
      return next(new AppError('Event not found in this group', 404));
    }

    // Get selections with act names
    // If memberIds is provided, filter by those members; otherwise get all
    let query: string;
    let params: (string | number)[];

    if (memberIds && memberIds.length > 0) {
      const placeholders = memberIds.map(() => '?').join(',');
      query = `
        SELECT s.id, s.user_id, s.group_id, s.act_id, a.name as act_name, ar.spotify_artist_id as artist_spotify_id
        FROM selections s
        JOIN acts a ON s.act_id = a.id
        LEFT JOIN artists ar ON a.artist_id = ar.id
        WHERE s.group_id = ? AND a.event_id = ? AND s.user_id IN (${placeholders})
      `;
      params = [groupId, eventId, ...memberIds];
    } else {
      query = `
        SELECT s.id, s.user_id, s.group_id, s.act_id, a.name as act_name, ar.spotify_artist_id as artist_spotify_id
        FROM selections s
        JOIN acts a ON s.act_id = a.id
        LEFT JOIN artists ar ON a.artist_id = ar.id
        WHERE s.group_id = ? AND a.event_id = ?
      `;
      params = [groupId, eventId];
    }

    const selections = db.prepare(query).all(...params) as SelectionWithActRow[];

    if (selections.length === 0) {
      return next(new AppError('No selections found for this event', 400));
    }

    // Get unique artists with their Spotify IDs (if available)
    // Use a Map to deduplicate by act name and preserve the spotify_artist_id from artists table
    const artistMap = new Map<string, { name: string; spotifyId: string | null }>();
    for (const s of selections) {
      if (!artistMap.has(s.act_name)) {
        artistMap.set(s.act_name, {
          name: s.act_name,
          spotifyId: s.artist_spotify_id,
        });
      }
    }
    const artists = Array.from(artistMap.values());

    // Create the playlist
    const result = await createPlaylistFromArtists(userId, {
      playlistName,
      description,
      artists,
      tracksPerArtist,
      isPublic,
    });

    // Save playlist to database
    db.prepare(
      `INSERT INTO playlists
        (group_id, event_id, created_by, spotify_playlist_id, spotify_playlist_url,
         playlist_name, description, track_count, artists_included, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      groupId,
      eventId,
      userId,
      result.playlistId,
      result.playlistUrl,
      playlistName,
      description || null,
      result.trackCount,
      JSON.stringify(result.artistsIncluded),
      isPublic ? 1 : 0
    );
    db.save();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    if (error instanceof Error && error.message.includes('Spotify')) {
      return next(new AppError(error.message, 502));
    }
    next(error);
  }
}

export function getPlaylists(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    const { groupId, eventId } = req.params;

    // Verify user is a member of the group
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    const rows = db
      .prepare(
        `SELECT p.*, u.display_name as creator_name
         FROM playlists p
         JOIN users u ON p.created_by = u.id
         WHERE p.group_id = ? AND p.event_id = ?
         ORDER BY p.created_at DESC`
      )
      .all(groupId, eventId) as (PlaylistRow & { creator_name: string })[];

    const playlists = rows.map((row) => ({
      id: row.id,
      groupId: row.group_id,
      eventId: row.event_id,
      createdBy: row.created_by,
      spotifyPlaylistId: row.spotify_playlist_id,
      spotifyPlaylistUrl: row.spotify_playlist_url,
      playlistName: row.playlist_name,
      description: row.description || undefined,
      trackCount: row.track_count,
      artistsIncluded: row.artists_included ? JSON.parse(row.artists_included) : [],
      isPublic: row.is_public === 1,
      createdAt: row.created_at,
      createdByUser: { id: row.created_by, displayName: row.creator_name },
    }));

    res.json({ success: true, data: playlists });
  } catch (error) {
    next(error);
  }
}
