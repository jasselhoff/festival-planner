import { useState, useEffect, useRef } from 'react';
import { spotifyService } from '../services/spotifyService';
import type { SpotifyArtist } from '../types';
import { Loader2, Music, Search } from 'lucide-react';

interface ArtistSearchProps {
  value: string;
  onChange: (value: string, artist?: SpotifyArtist) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function ArtistSearch({
  value,
  onChange,
  placeholder = 'Search for an artist...',
  required = false,
  className = '',
}: ArtistSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SpotifyArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const artists = await spotifyService.searchArtists(query);
        setResults(artists);
        setIsOpen(artists.length > 0);
      } catch (err: any) {
        console.error('Artist search error:', err);
        if (err.response?.status === 503) {
          setError('Spotify search unavailable');
        } else {
          setError('Search failed');
        }
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
  };

  const handleSelectArtist = (artist: SpotifyArtist) => {
    setQuery(artist.name);
    onChange(artist.name, artist);
    setIsOpen(false);
    setResults([]);
  };

  const handleFocus = () => {
    if (results.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          className="input pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-amber-600 mt-1">{error} - you can still type manually</p>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((artist) => (
            <button
              key={artist.id}
              type="button"
              onClick={() => handleSelectArtist(artist)}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <Music className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{artist.name}</div>
                {artist.genres.length > 0 && (
                  <div className="text-xs text-gray-500 truncate">
                    {artist.genres.slice(0, 3).join(', ')}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
