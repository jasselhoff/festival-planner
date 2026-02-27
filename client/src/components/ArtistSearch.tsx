import { useState, useEffect, useRef } from 'react';
import { spotifyService } from '../services/spotifyService';
import { artistService } from '../services/artistService';
import type { SpotifyArtist, Artist } from '../types';
import { Loader2, Music, Search, Database, ExternalLink } from 'lucide-react';

// Combined result type for display
interface SearchResult {
  type: 'spotify' | 'database';
  spotifyArtist?: SpotifyArtist;
  dbArtist?: Artist;
  name: string;
  genre?: string;
  imageUrl?: string;
}

interface ArtistSearchProps {
  value: string;
  onChange: (value: string, spotifyArtist?: SpotifyArtist, dbArtist?: Artist) => void;
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
  const [results, setResults] = useState<SearchResult[]>([]);
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
        // Search both Spotify and local database in parallel
        const [spotifyResults, dbResults] = await Promise.all([
          spotifyService.searchArtists(query).catch(() => [] as SpotifyArtist[]),
          artistService.listArtists(query).catch(() => [] as Artist[]),
        ]);

        const combinedResults: SearchResult[] = [];

        // Add database results first (prioritized)
        for (const dbArtist of dbResults) {
          combinedResults.push({
            type: 'database',
            dbArtist,
            name: dbArtist.name,
            genre: dbArtist.genre,
            imageUrl: dbArtist.imageUrl,
          });
        }

        // Add Spotify results, filtering out duplicates
        const dbSpotifyIds = new Set(dbResults.filter(a => a.spotifyArtistId).map(a => a.spotifyArtistId));
        const dbNames = new Set(dbResults.map(a => a.name.toLowerCase()));

        for (const spotifyArtist of spotifyResults) {
          // Skip if already in DB (by Spotify ID or exact name match)
          if (dbSpotifyIds.has(spotifyArtist.id) || dbNames.has(spotifyArtist.name.toLowerCase())) {
            continue;
          }
          combinedResults.push({
            type: 'spotify',
            spotifyArtist,
            name: spotifyArtist.name,
            genre: spotifyArtist.genres[0],
            imageUrl: spotifyArtist.imageUrl,
          });
        }

        setResults(combinedResults);
        setIsOpen(combinedResults.length > 0);

        if (spotifyResults.length === 0 && dbResults.length === 0) {
          setError('No artists found');
        }
      } catch (err: any) {
        console.error('Artist search error:', err);
        setError('Search failed');
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

  const handleSelectResult = (result: SearchResult) => {
    setQuery(result.name);
    onChange(result.name, result.spotifyArtist, result.dbArtist);
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

      {error && !results.length && (
        <p className="text-xs text-amber-600 mt-1">{error} - you can still type manually</p>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.dbArtist?.id || result.spotifyArtist?.id || index}`}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              {result.imageUrl ? (
                <img
                  src={result.imageUrl}
                  alt={result.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <Music className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                  {result.name}
                  {result.type === 'database' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      <Database className="w-3 h-3" />
                      Saved
                    </span>
                  )}
                  {result.type === 'spotify' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      <ExternalLink className="w-3 h-3" />
                      Spotify
                    </span>
                  )}
                </div>
                {result.genre && (
                  <div className="text-xs text-gray-500 truncate">{result.genre}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
