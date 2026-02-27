import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
import { groupService } from '../services/groupService';
import { selectionService } from '../services/selectionService';
import type { SelectionWithUser, Conflict } from '../services/selectionService';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import type { EventFull, Group, GroupMember, Day, WebSocketMessage, SavedPlaylist } from '../types';
import {
  ArrowLeft,
  Loader2,
  Wifi,
  WifiOff,
  AlertTriangle,
  Check,
  Users,
  Eye,
  EyeOff,
  Music,
  ExternalLink,
} from 'lucide-react';
import { SpotifyConnectButton } from '../components/SpotifyConnectButton';
import { CreatePlaylistModal } from '../components/CreatePlaylistModal';
import { spotifyService } from '../services/spotifyService';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { formatDisplayTime, formatTimeRange } from '../utils/timeFormat';

// User colors for selections
const USER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-indigo-500',
];

export function CalendarPage() {
  const { groupId, eventId } = useParams<{ groupId: string; eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventFull | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selections, setSelections] = useState<SelectionWithUser[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>([]);

  // Create a map of userId to color
  const userColorMap = new Map<number, string>();
  members.forEach((member, index) => {
    userColorMap.set(member.userId, USER_COLORS[index % USER_COLORS.length]);
  });

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'SELECTION_ADDED': {
        const { userId, actId, userName, priority } = message.payload;
        setSelections((prev) => [
          ...prev.filter((s) => !(s.userId === userId && s.actId === actId)),
          {
            id: Date.now(),
            userId,
            groupId: parseInt(groupId!),
            actId,
            priority,
            createdAt: new Date().toISOString(),
            user: { id: userId, email: '', displayName: userName },
          },
        ]);
        break;
      }
      case 'SELECTION_REMOVED': {
        const { userId, actId } = message.payload;
        setSelections((prev) =>
          prev.filter((s) => !(s.userId === userId && s.actId === actId))
        );
        break;
      }
    }
  }, [groupId]);

  const { isConnected } = useWebSocket({
    groupId: parseInt(groupId!),
    onMessage: handleWebSocketMessage,
    enabled: !!groupId,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventData, groupData, membersData, selectionsData, conflictsData, playlistsData] =
          await Promise.all([
            eventService.getEventFull(parseInt(eventId!)),
            groupService.getGroup(parseInt(groupId!)),
            groupService.listMembers(parseInt(groupId!)),
            selectionService.getGroupSelections(parseInt(groupId!)),
            selectionService.getConflicts(parseInt(groupId!), parseInt(eventId!)),
            spotifyService.getPlaylists(parseInt(groupId!), parseInt(eventId!)).catch(() => []),
          ]);

        setEvent(eventData);
        setGroup(groupData);
        setMembers(membersData);
        setSelections(selectionsData);
        setConflicts(conflictsData);
        setPlaylists(playlistsData);

        if (eventData.days.length > 0) {
          setSelectedDay(eventData.days[0]);
        }
      } catch (error) {
        toast.error('Failed to load data');
        navigate(`/groups/${groupId}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [groupId, eventId, navigate]);

  const handleToggleSelection = async (actId: number) => {
    if (!user) return;

    const existingSelection = selections.find(
      (s) => s.userId === user.id && s.actId === actId
    );

    try {
      if (existingSelection) {
        await selectionService.removeSelection(parseInt(groupId!), actId);
        setSelections((prev) =>
          prev.filter((s) => !(s.userId === user.id && s.actId === actId))
        );
      } else {
        const selection = await selectionService.addSelection(parseInt(groupId!), actId);
        setSelections((prev) => [
          ...prev,
          {
            ...selection,
            user: { id: user.id, email: user.email, displayName: user.displayName },
          },
        ]);
      }

      // Refresh conflicts
      const newConflicts = await selectionService.getConflicts(
        parseInt(groupId!),
        parseInt(eventId!)
      );
      setConflicts(newConflicts);
    } catch (error) {
      toast.error('Failed to update selection');
    }
  };

  const handlePlaylistCreated = async () => {
    const updated = await spotifyService.getPlaylists(parseInt(groupId!), parseInt(eventId!));
    setPlaylists(updated);
  };

  const isSelected = (actId: number) => {
    return selections.some((s) => s.userId === user?.id && s.actId === actId);
  };

  const getActSelections = (actId: number) => {
    return selections.filter((s) => s.actId === actId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!event || !group) return null;

  // Get IDs of acts that have been selected by anyone in the group
  const selectedActIds = new Set(selections.map((s) => s.actId));

  // Filter acts by day, and optionally by selection status
  const dayActs = event.acts.filter((a) => {
    if (a.dayId !== selectedDay?.id) return false;
    if (showOnlySelected && !selectedActIds.has(a.id)) return false;
    return true;
  });
  const sortedStages = [...event.stages].sort((a, b) => a.sortOrder - b.sortOrder);

  // Calculate time range (handles extended hours like 25:00, 26:00 etc.)
  const times = dayActs.flatMap((a) => [a.startTime, a.endTime]);
  const minTime = times.length > 0 ? times.sort()[0] : '12:00';
  const maxTime = times.length > 0 ? times.sort().reverse()[0] : '23:00';

  // Generate time slots (supports extended hours beyond 24 for next-day times)
  const timeSlots: { value: string; label: string }[] = [];
  const startHour = parseInt(minTime.split(':')[0]);
  const endHour = Math.min(parseInt(maxTime.split(':')[0]) + 1, 30); // Cap at 30 (6am next day)
  for (let h = startHour; h <= endHour; h++) {
    const value = `${h.toString().padStart(2, '0')}:00`;
    timeSlots.push({ value, label: formatDisplayTime(value) });
  }

  const timeToPixels = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - startHour * 60;
    return totalMinutes * 2; // 2 pixels per minute
  };

  const myConflicts = conflicts.filter((c) => c.userId === user?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Group
        </button>
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-600">
              <Wifi className="w-4 h-4" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <WifiOff className="w-4 h-4" />
              Offline
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {event.name} - {group.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Click on acts to mark the ones you want to see
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Show existing playlist link */}
            {playlists.length > 0 && (
              <a
                href={playlists[0].spotifyPlaylistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                title={`${playlists[0].playlistName} (${playlists[0].trackCount} tracks)`}
              >
                <Music className="w-4 h-4 text-[#1DB954]" />
                <span className="max-w-[150px] truncate">{playlists[0].playlistName}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Create Playlist button */}
            {spotifyConnected ? (
              <button
                onClick={() => setIsPlaylistModalOpen(true)}
                disabled={selections.length === 0}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#1DB954] text-white hover:bg-[#1ed760] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Music className="w-4 h-4" />
                {playlists.length > 0 ? 'New Playlist' : 'Create Playlist'}
              </button>
            ) : (
              <SpotifyConnectButton onStatusChange={setSpotifyConnected} />
            )}
            <button
              onClick={() => setShowOnlySelected(!showOnlySelected)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showOnlySelected
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {showOnlySelected ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Selected Only
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show All
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts warning */}
      {myConflicts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
            <AlertTriangle className="w-5 h-5" />
            You have {myConflicts.length} schedule conflict(s)
          </div>
          <div className="text-sm text-yellow-600 space-y-1">
            {myConflicts.map((conflict, idx) => {
              const conflictDay = event.days.find((d) => d.id === conflict.dayId);
              const dayLabel = conflictDay?.name || dayjs(conflictDay?.date).format('ddd, MMM D');
              return (
                <div key={idx}>
                  {conflict.acts.map((a) => a.actName).join(' & ')} overlap at{' '}
                  {formatDisplayTime(conflict.acts[0].startTime)} on {dayLabel}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member legend */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Group Members</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded"
            >
              <div
                className={`w-3 h-3 rounded-full ${userColorMap.get(member.userId)}`}
              />
              <span className="text-sm">
                {member.user?.displayName}
                {member.userId === user?.id && ' (you)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {event.days.map((day) => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              selectedDay?.id === day.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {day.name || dayjs(day.date).format('ddd, MMM D')}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="card overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time header */}
          <div className="flex border-b border-gray-200 pb-2 mb-2">
            <div className="w-32 flex-shrink-0" />
            <div className="flex-1 relative" style={{ height: '24px' }}>
              {timeSlots.map((slot) => (
                <div
                  key={slot.value}
                  className="absolute text-xs text-gray-500"
                  style={{ left: timeToPixels(slot.value) }}
                >
                  {slot.label}
                </div>
              ))}
            </div>
          </div>

          {/* Stages and acts */}
          {sortedStages.map((stage) => {
            const stageActs = dayActs.filter((a) => a.stageId === stage.id);

            return (
              <div key={stage.id} className="flex mb-4">
                <div className="w-32 flex-shrink-0 font-medium text-sm py-2 pr-4 text-right">
                  {stage.name}
                </div>
                <div
                  className="flex-1 relative bg-gray-50 rounded"
                  style={{ height: '60px' }}
                >
                  {/* Grid lines */}
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.value}
                      className="absolute top-0 bottom-0 border-l border-gray-200"
                      style={{ left: timeToPixels(slot.value) }}
                    />
                  ))}

                  {/* Acts */}
                  {stageActs.map((act) => {
                    const actSelections = getActSelections(act.id);
                    const selected = isSelected(act.id);
                    const left = timeToPixels(act.startTime);
                    const width = timeToPixels(act.endTime) - left;

                    return (
                      <button
                        key={act.id}
                        onClick={() => handleToggleSelection(act.id)}
                        title={`${act.name}\n${formatTimeRange(act.startTime, act.endTime)}${act.genre ? `\n${act.genre}` : ''}`}
                        className={`absolute top-1 bottom-1 rounded px-2 py-1 text-left overflow-hidden transition-all ${
                          selected
                            ? 'bg-primary-100 border-2 border-primary-500'
                            : 'bg-white border border-gray-300 hover:border-primary-300'
                        }`}
                        style={{ left, width: Math.max(width, 60) }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="truncate">
                            <div className="font-medium text-xs truncate">
                              {act.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTimeRange(act.startTime, act.endTime)}
                            </div>
                          </div>
                          {selected && (
                            <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          )}
                        </div>

                        {/* Selection indicators */}
                        {actSelections.length > 0 && (
                          <div className="absolute bottom-1 left-1 flex -space-x-1">
                            {actSelections.slice(0, 5).map((sel) => (
                              <div
                                key={sel.userId}
                                className={`w-4 h-4 rounded-full border-2 border-white ${userColorMap.get(
                                  sel.userId
                                )}`}
                                title={sel.user.displayName}
                              />
                            ))}
                            {actSelections.length > 5 && (
                              <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white text-white text-[8px] flex items-center justify-center">
                                +{actSelections.length - 5}
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection summary */}
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-3">Your Selections</h3>
        {selections.filter((s) => s.userId === user?.id).length === 0 ? (
          <p className="text-gray-500 text-sm">
            You haven't selected any acts yet. Click on acts above to mark them.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selections
              .filter((s) => s.userId === user?.id)
              .map((sel) => {
                const act = event.acts.find((a) => a.id === sel.actId);
                if (!act) return null;
                return (
                  <div
                    key={sel.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    <span>{act.name}</span>
                    <button
                      onClick={() => handleToggleSelection(act.id)}
                      className="hover:text-primary-900"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Spotify Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        event={event}
        group={group}
        members={members}
        selections={selections}
        onPlaylistCreated={handlePlaylistCreated}
      />
    </div>
  );
}
