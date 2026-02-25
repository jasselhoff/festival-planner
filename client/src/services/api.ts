import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { getToken, getAuthStorage, clearTokens } from '../context/AuthContext';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent interceptor from handling auth during initial load
let isInitializing = true;

export function setInitialized() {
  isInitializing = false;
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _skipInterceptor?: boolean };

    // Skip interceptor handling if flagged or during initialization
    if (originalRequest._skipInterceptor || isInitializing) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getToken('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          // Store in the same storage type as before
          const storage = getAuthStorage();
          storage.setItem('accessToken', accessToken);
          storage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
