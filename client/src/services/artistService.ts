import api from './api';
import type { Artist, ArtistCreateInput } from '../types';

export const artistService = {
  async listArtists(query?: string): Promise<Artist[]> {
    const params = query ? { q: query } : {};
    const response = await api.get<{ success: boolean; data: Artist[] }>('/artists', { params });
    return response.data.data;
  },

  async getArtist(id: number): Promise<Artist> {
    const response = await api.get<{ success: boolean; data: Artist }>(`/artists/${id}`);
    return response.data.data;
  },

  async createArtist(data: ArtistCreateInput): Promise<{ artist: Artist; existing: boolean }> {
    const response = await api.post<{ success: boolean; data: Artist; existing?: boolean }>(
      '/artists',
      data
    );
    return {
      artist: response.data.data,
      existing: response.data.existing || false,
    };
  },

  async updateArtist(id: number, data: Partial<ArtistCreateInput>): Promise<Artist> {
    const response = await api.put<{ success: boolean; data: Artist }>(`/artists/${id}`, data);
    return response.data.data;
  },

  async deleteArtist(id: number): Promise<void> {
    await api.delete(`/artists/${id}`);
  },

  async listArtistsWithoutSpotifyId(): Promise<Artist[]> {
    const response = await api.get<{ success: boolean; data: Artist[] }>(
      '/artists/missing-spotify-ids'
    );
    return response.data.data;
  },
};
