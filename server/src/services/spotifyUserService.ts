import { config } from '../config/env';
import { db } from '../db/database';
import crypto from 'crypto';

// Types
export interface SpotifyConnection {
  id: number;
  userId: number;
  spotifyUserId: string;
  displayName: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
  scopes: string;
  createdAt: string;
  updatedAt: string;
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: { id: string; name: string }[];
  album: { name: string; images: { url: string }[] };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  external_urls: { spotify: string };
}

// OAuth state management using HMAC
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export function generateOAuthState(userId: number): string {
  const timestamp = Date.now();
  const payload = `${userId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', config.jwt.secret)
    .update(payload)
    .digest('hex')
    .substring(0, 32);
  return `${signature}:${payload}`;
}

export function verifyOAuthState(state: string): { valid: boolean; userId?: number } {
  const parts = state.split(':');
  if (parts.length !== 3) {
    return { valid: false };
  }

  const [signature, userIdStr, timestampStr] = parts;
  const userId = parseInt(userIdStr, 10);
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(userId) || isNaN(timestamp)) {
    return { valid: false };
  }

  // Check if state has expired
  if (Date.now() - timestamp > STATE_EXPIRY_MS) {
    return { valid: false };
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', config.jwt.secret)
    .update(`${userId}:${timestamp}`)
    .digest('hex')
    .substring(0, 32);

  if (signature !== expectedSignature) {
    return { valid: false };
  }

  return { valid: true, userId };
}

// Database operations
export function getSpotifyConnection(userId: number): SpotifyConnection | null {
  const row = db.prepare(`
    SELECT id, user_id, spotify_user_id, display_name, access_token, refresh_token,
           token_expires_at, scopes, created_at, updated_at
    FROM spotify_connections
    WHERE user_id = ?
  `).get(userId);

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    spotifyUserId: row.spotify_user_id,
    displayName: row.display_name,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function saveSpotifyConnection(
  userId: number,
  spotifyUserId: string,
  displayName: string | null,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  scopes: string
): void {
  const tokenExpiresAt = Date.now() + expiresIn * 1000;

  const existing = getSpotifyConnection(userId);

  if (existing) {
    db.prepare(`
      UPDATE spotify_connections
      SET spotify_user_id = ?, display_name = ?, access_token = ?, refresh_token = ?,
          token_expires_at = ?, scopes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(spotifyUserId, displayName, accessToken, refreshToken, tokenExpiresAt, scopes, userId);
  } else {
    db.prepare(`
      INSERT INTO spotify_connections (user_id, spotify_user_id, display_name, access_token, refresh_token, token_expires_at, scopes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, spotifyUserId, displayName, accessToken, refreshToken, tokenExpiresAt, scopes);
  }

  db.save();
}

export function deleteSpotifyConnection(userId: number): void {
  db.prepare('DELETE FROM spotify_connections WHERE user_id = ?').run(userId);
  db.save();
}

// Token refresh
async function refreshUserToken(connection: SpotifyConnection): Promise<SpotifyConnection> {
  const { clientId, clientSecret } = config.spotify;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Spotify token: ${response.status} ${errorText}`);
  }

  const data = await response.json() as SpotifyTokenResponse;

  // Update the connection with new tokens
  const newRefreshToken = data.refresh_token || connection.refreshToken;
  saveSpotifyConnection(
    connection.userId,
    connection.spotifyUserId,
    connection.displayName,
    data.access_token,
    newRefreshToken,
    data.expires_in,
    connection.scopes
  );

  return {
    ...connection,
    accessToken: data.access_token,
    refreshToken: newRefreshToken,
    tokenExpiresAt: Date.now() + data.expires_in * 1000,
  };
}

// Get valid access token (refreshes if needed)
async function getValidAccessToken(userId: number): Promise<{ token: string; connection: SpotifyConnection }> {
  let connection = getSpotifyConnection(userId);

  if (!connection) {
    throw new Error('Spotify account not connected');
  }

  // Refresh token if it expires within 60 seconds
  if (Date.now() > connection.tokenExpiresAt - 60000) {
    connection = await refreshUserToken(connection);
  }

  return { token: connection.accessToken, connection };
}

// OAuth token exchange
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: string;
}> {
  const { clientId, clientSecret, redirectUri } = config.spotify;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${response.status} ${errorText}`);
  }

  const data = await response.json() as SpotifyTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token!,
    expiresIn: data.expires_in,
    scopes: data.scope,
  };
}

// Get Spotify user profile
export async function getSpotifyUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Spotify user profile: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<SpotifyUserProfile>;
}

// Spotify API operations with user token

export async function searchArtistByName(
  userId: number,
  artistName: string
): Promise<{ id: string; name: string } | null> {
  const { token } = await getValidAccessToken(userId);

  const params = new URLSearchParams({
    q: artistName,
    type: 'artist',
    limit: '1',
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify search failed: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { artists?: { items?: { id: string; name: string }[] } };
  const artist = data.artists?.items?.[0];

  if (!artist) return null;

  return { id: artist.id, name: artist.name };
}

export async function getArtistTopTracks(
  userId: number,
  artistId: string,
  market: string = 'US'
): Promise<SpotifyTrack[]> {
  const { token } = await getValidAccessToken(userId);

  const response = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get top tracks: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { tracks?: SpotifyTrack[] };
  return data.tracks || [];
}

export async function createPlaylist(
  userId: number,
  name: string,
  description: string,
  isPublic: boolean
): Promise<SpotifyPlaylist> {
  const { token, connection } = await getValidAccessToken(userId);

  const response = await fetch(
    `https://api.spotify.com/v1/users/${connection.spotifyUserId}/playlists`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create playlist: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<SpotifyPlaylist>;
}

export async function addTracksToPlaylist(
  userId: number,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  const { token } = await getValidAccessToken(userId);

  // Spotify allows max 100 tracks per request
  const batches = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    batches.push(trackUris.slice(i, i + 100));
  }

  for (const batch of batches) {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: batch,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add tracks to playlist: ${response.status} ${errorText}`);
    }

    // Small delay between batches to avoid rate limiting
    if (batches.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// High-level operation: Create playlist from artists
// Artists can have a spotifyId (from when they were added via ArtistSearch) or just a name (manual entry)
export async function createPlaylistFromArtists(
  userId: number,
  options: {
    playlistName: string;
    description: string;
    artists: { name: string; spotifyId: string | null }[];
    tracksPerArtist: number;
    isPublic: boolean;
  }
): Promise<{
  playlistUrl: string;
  playlistId: string;
  trackCount: number;
  artistsIncluded: string[];
  artistsNotFound: string[];
}> {
  const { playlistName, description, artists, tracksPerArtist, isPublic } = options;

  // Create the playlist first
  const playlist = await createPlaylist(userId, playlistName, description, isPublic);

  const artistsIncluded: string[] = [];
  const artistsNotFound: string[] = [];
  const allTrackUris: string[] = [];

  // Get top tracks for each artist
  for (const artistInfo of artists) {
    try {
      let artistId: string | null = artistInfo.spotifyId;
      let artistName = artistInfo.name;

      // If no stored Spotify ID, search for the artist
      if (!artistId) {
        const searchResult = await searchArtistByName(userId, artistInfo.name);
        if (!searchResult) {
          artistsNotFound.push(artistInfo.name);
          continue;
        }
        artistId = searchResult.id;
        artistName = searchResult.name;
      }

      const topTracks = await getArtistTopTracks(userId, artistId);
      const tracksToAdd = topTracks.slice(0, tracksPerArtist);

      for (const track of tracksToAdd) {
        allTrackUris.push(track.uri);
      }

      artistsIncluded.push(artistName);

      // Small delay between artist lookups to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing artist "${artistInfo.name}":`, error);
      artistsNotFound.push(artistInfo.name);
    }
  }

  // Deduplicate track URIs (same track can appear in multiple artists' top tracks)
  const uniqueTrackUris = [...new Set(allTrackUris)];

  // Add all tracks to the playlist
  if (uniqueTrackUris.length > 0) {
    await addTracksToPlaylist(userId, playlist.id, uniqueTrackUris);
  }

  return {
    playlistUrl: playlist.external_urls.spotify,
    playlistId: playlist.id,
    trackCount: uniqueTrackUris.length,
    artistsIncluded,
    artistsNotFound,
  };
}
