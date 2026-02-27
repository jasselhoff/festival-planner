import { useState, useEffect } from 'react';
import { Music, Loader2, Unlink } from 'lucide-react';
import { spotifyService } from '../services/spotifyService';
import type { SpotifyConnectionStatus } from '../types';

interface SpotifyConnectButtonProps {
  onStatusChange?: (connected: boolean) => void;
  className?: string;
}

export function SpotifyConnectButton({ onStatusChange, className = '' }: SpotifyConnectButtonProps) {
  const [status, setStatus] = useState<SpotifyConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const connectionStatus = await spotifyService.getConnectionStatus();
      setStatus(connectionStatus);
      onStatusChange?.(connectionStatus.connected);
    } catch (err) {
      console.error('Failed to fetch Spotify status:', err);
      setError('Failed to check Spotify connection');
      setStatus({ connected: false });
      onStatusChange?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const authUrl = await spotifyService.getAuthUrl();
      // Redirect to Spotify authorization page
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to get Spotify auth URL:', err);
      setError('Failed to connect to Spotify');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Spotify account?')) {
      return;
    }

    try {
      setIsDisconnecting(true);
      setError(null);
      await spotifyService.disconnect();
      setStatus({ connected: false });
      onStatusChange?.(false);
    } catch (err) {
      console.error('Failed to disconnect Spotify:', err);
      setError('Failed to disconnect Spotify');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking...
      </button>
    );
  }

  if (error) {
    return (
      <button
        onClick={fetchStatus}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors ${className}`}
      >
        <Music className="w-4 h-4" />
        Retry Connection
      </button>
    );
  }

  if (status?.connected) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-600">
          <span className="text-green-600 font-medium">Spotify:</span>{' '}
          {status.displayName || status.spotifyUserId}
        </span>
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Disconnect Spotify"
        >
          {isDisconnecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Unlink className="w-3 h-3" />
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#1DB954] text-white hover:bg-[#1ed760] transition-colors disabled:opacity-50 ${className}`}
    >
      {isConnecting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Music className="w-4 h-4" />
      )}
      Link Spotify
    </button>
  );
}
