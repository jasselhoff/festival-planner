import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';
import { setInitialized } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
}

// Helper to get which storage is being used
const AUTH_STORAGE_KEY = 'authStorage';

export function getAuthStorage(): Storage {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'session' ? sessionStorage : localStorage;
}

export function getToken(key: string): string | null {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

export function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = getToken('accessToken');
      const refreshToken = getToken('refreshToken');

      // If we have neither token, user is not logged in
      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      // Helper to attempt refresh and get user
      const tryRefresh = async (): Promise<boolean> => {
        if (!refreshToken) return false;
        try {
          const refreshResponse = await authService.refresh(refreshToken);
          const storage = getAuthStorage();
          storage.setItem('accessToken', refreshResponse.accessToken);
          storage.setItem('refreshToken', refreshResponse.refreshToken);
          const userData = await authService.getMe();
          setUser(userData);
          return true;
        } catch {
          return false;
        }
      };

      // If we have an access token, try to use it
      if (accessToken) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
        } catch (error: any) {
          // Access token failed - try refresh
          if (error.response?.status === 401) {
            const refreshed = await tryRefresh();
            if (!refreshed) {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        }
      } else if (refreshToken) {
        // No access token but have refresh token - try to refresh
        const refreshed = await tryRefresh();
        if (!refreshed) {
          clearTokens();
        }
      }

      setIsLoading(false);
      setInitialized(); // Allow api interceptor to handle 401s from now on
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    const response = await authService.login({ email, password, rememberMe });
    const storage = rememberMe ? localStorage : sessionStorage;
    localStorage.setItem(AUTH_STORAGE_KEY, rememberMe ? 'local' : 'session');
    storage.setItem('accessToken', response.accessToken);
    storage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const response = await authService.register({ email, password, displayName });
    // New registrations always use persistent storage
    localStorage.setItem(AUTH_STORAGE_KEY, 'local');
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
  };

  const logout = async () => {
    const refreshToken = getToken('refreshToken');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
    setUser(null);
  };

  const updateProfile = async (displayName: string) => {
    const updatedUser = await authService.updateProfile(displayName);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
