import axios from 'axios';
import api from './api';
import type { User, AuthResponse, UserCreateInput, LoginInput } from '../types';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(data: UserCreateInput): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
    return response.data.data;
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', data);
    return response.data.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    // Use axios directly to avoid interceptor loops
    const response = await axios.post<{ success: boolean; data: RefreshResponse }>('/api/auth/refresh', { refreshToken });
    return response.data.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>('/auth/me');
    return response.data.data;
  },

  async updateProfile(displayName: string): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>('/auth/me', { displayName });
    return response.data.data;
  },
};
