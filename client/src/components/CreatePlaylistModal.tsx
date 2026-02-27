import { useState, useMemo } from 'react';
import { X, Music, Loader2, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { spotifyService } from '../services/spotifyService';
import type {
  EventFull,
  Group,
  GroupMember,
  CreatePlaylistResult,
} from '../types';

interface SelectionData {
  userId: number;
  actId: number;
}

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventFull;
  group: Group;
  members: GroupMember[];
  selections: SelectionData[];
  onPlaylistCreated?: () => void;
}

export function CreatePlaylistModal({
  isOpen,
  onClose,
  event,
  group,
  members,
  selections,
  onPlaylistCreated,
}: CreatePlaylistModalProps) {
  const [playlistName, setPlaylistName] = useState(`${event.name} - ${group.name}`);
  const [description, setDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>(
    members.map((m) => m.userId)
  );
  const [tracksPerArtist, setTracksPerArtist] = useState(3);
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<CreatePlaylistResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute unique artists from filtered selections
  const selectedArtists = useMemo(() => {
    const artistSet = new Set<string>();
    selections
      .filter((s) => selectedMemberIds.includes(s.userId))
      .forEach((s) => {
        const act = event.acts.find((a) => a.id === s.actId);
        if (act) artistSet.add(act.name);
      });
    return Array.from(artistSet);
  }, [selections, selectedMemberIds, event.acts]);

  const estimatedTracks = selectedArtists.length * tracksPerArtist;

  const handleMemberToggle = (userId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedMemberIds(members.map((m) => m.userId));
  };

  const handleSelectNone = () => {
    setSelectedMemberIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedArtists.length === 0) {
      setError('No artists selected. Please select at least one member with selections.');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const playlistResult = await spotifyService.createPlaylist({
        groupId: group.id,
        eventId: event.id,
        playlistName,
        description: description || undefined,
        memberIds: selectedMemberIds.length < members.length ? selectedMemberIds : undefined,
        tracksPerArtist,
        isPublic,
      });

      setResult(playlistResult);
      onPlaylistCreated?.();
    } catch (err: any) {
      console.error('Failed to create playlist:', err);
      setError(err.response?.data?.error || 'Failed to create playlist');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setResult(null);
    setError(null);
    setPlaylistName(`${event.name} - ${group.name}`);
    setDescription('');
    setSelectedMemberIds(members.map((m) => m.userId));
    setTracksPerArtist(3);
    setIsPublic(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Music className="w-5 h-5 text-[#1DB954]" />
            Create Spotify Playlist
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {result ? (
            // Success state
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Playlist Created!
              </h3>
              <p className="text-gray-600 mb-4">
                Added {result.trackCount} tracks from {result.artistsIncluded.length} artists
              </p>

              {result.artistsNotFound.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-left">
                  <p className="text-sm text-yellow-800 font-medium mb-1">
                    Some artists weren't found on Spotify:
                  </p>
                  <p className="text-sm text-yellow-700">
                    {result.artistsNotFound.join(', ')}
                  </p>
                </div>
              )}

              <a
                href={result.playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1DB954] text-white rounded-lg font-medium hover:bg-[#1ed760] transition-colors"
              >
                Open in Spotify
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={handleClose}
                className="block w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          ) : (
            // Form
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Playlist Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent"
                  required
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent resize-none"
                  rows={2}
                  maxLength={300}
                  placeholder="A playlist for our festival experience..."
                />
              </div>

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Include Selections From
                  </label>
                  <div className="text-xs space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-primary-600 hover:underline"
                    >
                      All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleSelectNone}
                      className="text-primary-600 hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg divide-y max-h-32 overflow-y-auto">
                  {members.map((member) => (
                    <label
                      key={member.userId}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.userId)}
                        onChange={() => handleMemberToggle(member.userId)}
                        className="w-4 h-4 text-[#1DB954] border-gray-300 rounded focus:ring-[#1DB954]"
                      />
                      <span className="text-sm text-gray-700">
                        {member.user?.displayName || `User ${member.userId}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tracks per artist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracks Per Artist
                </label>
                <select
                  value={tracksPerArtist}
                  onChange={(e) => setTracksPerArtist(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'track' : 'tracks'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-[#1DB954] border-gray-300 rounded focus:ring-[#1DB954]"
                  />
                  <span className="text-sm text-gray-700">Make playlist public</span>
                </label>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{selectedArtists.length}</span> artists selected
                  {' '}&middot;{' '}
                  <span className="font-medium">~{estimatedTracks}</span> tracks estimated
                </p>
                {selectedArtists.length > 0 && selectedArtists.length <= 10 && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {selectedArtists.join(', ')}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || selectedArtists.length === 0}
                  className="flex-1 px-4 py-2 bg-[#1DB954] text-white rounded-lg font-medium hover:bg-[#1ed760] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Music className="w-4 h-4" />
                      Create Playlist
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
