import { config } from '../config/env';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; height: number; width: number }[];
  popularity: number;
}

interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[];
    total: number;
  };
}

export interface SimplifiedArtist {
  id: string;
  name: string;
  genres: string[];
  imageUrl?: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const { clientId, clientSecret } = config.spotify;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Spotify access token: ${response.status} ${errorText}`);
  }

  const data: SpotifyTokenResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedToken;
}

export async function searchArtists(query: string, limit: number = 10): Promise<SimplifiedArtist[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const token = await getAccessToken();

  const params = new URLSearchParams({
    q: query,
    type: 'artist',
    limit: limit.toString(),
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

  const data: SpotifySearchResponse = await response.json();

  return data.artists.items.map((artist) => ({
    id: artist.id,
    name: artist.name,
    genres: artist.genres,
    imageUrl: artist.images.length > 0
      ? artist.images[artist.images.length - 1].url // Get smallest image
      : undefined,
  }));
}
