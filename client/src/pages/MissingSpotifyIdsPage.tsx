import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { artistService } from '../services/artistService';
import { ArtistSearch } from '../components/ArtistSearch';
import type { Artist, SpotifyArtist } from '../types';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ArtistRowProps {
  artist: Artist;
  onUpdate: (artistId: number, spotifyArtistId: string) => void;
  isUpdating: boolean;
}

function ArtistRow({ artist, onUpdate, isUpdating }: ArtistRowProps) {
  const [selectedSpotifyArtist, setSelectedSpotifyArtist] = useState<SpotifyArtist | null>(null);
  const [searchValue, setSearchValue] = useState(artist.name);

  const handleArtistChange = (value: string, spotifyArtist?: SpotifyArtist) => {
    setSearchValue(value);
    if (spotifyArtist) {
      setSelectedSpotifyArtist(spotifyArtist);
    } else {
      setSelectedSpotifyArtist(null);
    }
  };

  const handleAssign = () => {
    if (selectedSpotifyArtist) {
      onUpdate(artist.id, selectedSpotifyArtist.id);
    }
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{artist.name}</div>
        {artist.genre && (
          <div className="text-sm text-gray-500">{artist.genre}</div>
        )}
      </div>
      <div className="flex-1">
        <ArtistSearch
          value={searchValue}
          onChange={handleArtistChange}
          placeholder="Search Spotify..."
          className="w-full"
        />
      </div>
      <div className="w-32 flex justify-end">
        {selectedSpotifyArtist ? (
          <button
            onClick={handleAssign}
            disabled={isUpdating}
            className="btn btn-primary btn-sm flex items-center gap-1"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Assign
          </button>
        ) : (
          <span className="text-sm text-gray-400">Select an artist</span>
        )}
      </div>
    </div>
  );
}

export function MissingSpotifyIdsPage() {
  const [updatingArtistId, setUpdatingArtistId] = useState<number | null>(null);

  const {
    data: artists,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['artists-missing-spotify-ids'],
    queryFn: () => artistService.listArtistsWithoutSpotifyId(),
  });

  const handleUpdateArtist = async (artistId: number, spotifyArtistId: string) => {
    setUpdatingArtistId(artistId);
    try {
      await artistService.updateArtist(artistId, { spotifyArtistId });
      toast.success('Spotify ID assigned');
      // Refetch the list to remove the updated artist
      refetch();
    } catch (err) {
      console.error('Failed to update artist:', err);
      toast.error('Failed to assign Spotify ID');
    } finally {
      setUpdatingArtistId(null);
    }
  };

  const totalMissing = artists?.length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span className="text-red-700">Failed to load artists. Please try again.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Missing Spotify IDs</h1>
          <p className="text-gray-600 mt-1">
            Assign Spotify artist IDs to artists for accurate playlist generation.
          </p>
        </div>
        {totalMissing > 0 && (
          <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
            {totalMissing} artist{totalMissing !== 1 ? 's' : ''} missing
          </div>
        )}
      </div>

      {!artists || artists.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-green-900 mb-1">All set!</h3>
          <p className="text-green-700">
            All artists have Spotify IDs assigned.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Artists without Spotify IDs</h3>
          </div>
          <div className="px-4 py-2">
            {artists.map((artist) => (
              <ArtistRow
                key={artist.id}
                artist={artist}
                onUpdate={handleUpdateArtist}
                isUpdating={updatingArtistId === artist.id}
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How this works</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Search for the artist on Spotify using the search box</li>
          <li>Click on the correct artist from the dropdown</li>
          <li>Click "Assign" to save the Spotify artist ID</li>
          <li>All acts using this artist will automatically use the assigned Spotify ID</li>
        </ul>
      </div>
    </div>
  );
}
