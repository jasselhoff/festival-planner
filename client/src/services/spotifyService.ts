import api from './api';
import type {
  SpotifyArtist,
  SpotifyConnectionStatus,
  CreatePlaylistOptions,
  CreatePlaylistResult,
  SavedPlaylist,
} from '../types';

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

  async getConnectionStatus(): Promise<SpotifyConnectionStatus> {
    const response = await api.get<{ success: boolean; data: SpotifyConnectionStatus }>(
      '/spotify/status'
    );
    return response.data.data;
  },

  async getAuthUrl(): Promise<string> {
    const response = await api.get<{ success: boolean; data: { url: string } }>(
      '/spotify/auth/url'
    );
    return response.data.data.url;
  },

  async disconnect(): Promise<void> {
    await api.delete('/spotify/disconnect');
  },

  async createPlaylist(options: CreatePlaylistOptions): Promise<CreatePlaylistResult> {
    const response = await api.post<{ success: boolean; data: CreatePlaylistResult }>(
      '/spotify/playlists',
      options
    );
    return response.data.data;
  },

  async getPlaylists(groupId: number, eventId: number): Promise<SavedPlaylist[]> {
    const response = await api.get<{ success: boolean; data: SavedPlaylist[] }>(
      `/spotify/playlists/${groupId}/${eventId}`
    );
    return response.data.data;
  },
};
