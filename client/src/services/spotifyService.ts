import api from './api';
import type { SpotifyArtist } from '../types';

export const spotifyService = {
  async searchArtists(query: string): Promise<SpotifyArtist[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await api.get<{ success: boolean; data: SpotifyArtist[] }>(
      '/spotify/search',
      { params: { q: query } }
    );

    return response.data.data;
  },
};
