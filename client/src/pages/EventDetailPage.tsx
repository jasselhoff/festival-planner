import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventService } from '../services/eventService';
import type { EventFull, SpotifyArtist } from '../types';
import { useAuth } from '../context/AuthContext';
import { ArtistSearch } from '../components/ArtistSearch';
import { TimeInput } from '../components/TimeInput';
import { formatTimeRange } from '../utils/timeFormat';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Loader2,
  Music,
  Clock,
  Pencil,
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Stage form state
  const [showStageForm, setShowStageForm] = useState(false);
  const [stageName, setStageName] = useState('');
  const [stageDescription, setStageDescription] = useState('');

  // Act form state
  const [showActForm, setShowActForm] = useState(false);
  const [actForm, setActForm] = useState({
    name: '',
    description: '',
    stageId: 0,
    dayId: 0,
    startTime: '12:00',
    endTime: '13:00',
    genre: '',
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await eventService.getEventFull(parseInt(id!));
        setEvent(data);
        if (data.days.length > 0) {
          setSelectedDay(data.days[0].id);
        }
      } catch (error) {
        toast.error('Failed to load event');
        navigate('/events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

  const isOwner = event?.creatorId === user?.id;

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    try {
      const stage = await eventService.createStage(event.id, {
        name: stageName,
        description: stageDescription || undefined,
        sortOrder: event.stages.length,
      });
      setEvent({ ...event, stages: [...event.stages, stage] });
      setStageName('');
      setStageDescription('');
      setShowStageForm(false);
      toast.success('Stage added');
    } catch (error) {
      toast.error('Failed to add stage');
    }
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!event || !confirm('Delete this stage and all its acts?')) return;

    try {
      await eventService.deleteStage(event.id, stageId);
      setEvent({
        ...event,
        stages: event.stages.filter((s) => s.id !== stageId),
        acts: event.acts.filter((a) => a.stageId !== stageId),
      });
      toast.success('Stage deleted');
    } catch (error) {
      toast.error('Failed to delete stage');
    }
  };

  const handleAddAct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    try {
      const act = await eventService.createAct(event.id, {
        name: actForm.name,
        description: actForm.description || undefined,
        stageId: actForm.stageId,
        dayId: actForm.dayId,
        startTime: actForm.startTime,
        endTime: actForm.endTime,
        genre: actForm.genre || undefined,
      });
      setEvent({ ...event, acts: [...event.acts, act] });
      setActForm({
        name: '',
        description: '',
        stageId: event.stages[0]?.id || 0,
        dayId: selectedDay || event.days[0]?.id || 0,
        startTime: '12:00',
        endTime: '13:00',
        genre: '',
      });
      setShowActForm(false);
      toast.success('Act added');
    } catch (error) {
      toast.error('Failed to add act');
    }
  };

  const handleDeleteAct = async (actId: number) => {
    if (!event || !confirm('Delete this act?')) return;

    try {
      await eventService.deleteAct(event.id, actId);
      setEvent({
        ...event,
        acts: event.acts.filter((a) => a.id !== actId),
      });
      toast.success('Act deleted');
    } catch (error) {
      toast.error('Failed to delete act');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!event) return null;

  const selectedDayActs = event.acts.filter((a) => a.dayId === selectedDay);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/events')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </button>

      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            {event.description && (
              <p className="text-gray-600 mt-2">{event.description}</p>
            )}
          </div>
          {isOwner && (
            <Link
              to={`/events/${event.id}/edit`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit Event
            </Link>
          )}
        </div>

        <div className="flex gap-6 mt-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              {dayjs(event.startDate).format('MMM D')} -{' '}
              {dayjs(event.endDate).format('MMM D, YYYY')}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Days tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {event.days.map((day) => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(day.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedDay === day.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {day.name || dayjs(day.date).format('ddd, MMM D')}
          </button>
        ))}
      </div>

      {/* Stages section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Stages</h2>
          {isOwner && (
            <button
              onClick={() => setShowStageForm(true)}
              className="btn btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Stage
            </button>
          )}
        </div>

        {showStageForm && (
          <form onSubmit={handleAddStage} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Stage name"
                required
                className="input"
              />
              <input
                type="text"
                value={stageDescription}
                onChange={(e) => setStageDescription(e.target.value)}
                placeholder="Description (optional)"
                className="input"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" className="btn btn-primary text-sm">
                Add Stage
              </button>
              <button
                type="button"
                onClick={() => setShowStageForm(false)}
                className="btn btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {event.stages.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No stages yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {event.stages.map((stage) => (
              <div
                key={stage.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg"
              >
                <span className="font-medium text-sm">{stage.name}</span>
                {isOwner && (
                  <button
                    onClick={() => handleDeleteStage(stage.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acts section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Acts</h2>
          {isOwner && event.stages.length > 0 && (
            <button
              onClick={() => {
                setActForm({
                  ...actForm,
                  stageId: event.stages[0].id,
                  dayId: selectedDay || event.days[0].id,
                });
                setShowActForm(true);
              }}
              className="btn btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Act
            </button>
          )}
        </div>

        {showActForm && (
          <form onSubmit={handleAddAct} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <ArtistSearch
                value={actForm.name}
                onChange={(name: string, artist?: SpotifyArtist) => {
                  setActForm({
                    ...actForm,
                    name,
                    genre: artist?.genres?.[0] || actForm.genre,
                  });
                }}
                placeholder="Search artist or type name"
                required
              />
              <input
                type="text"
                value={actForm.genre}
                onChange={(e) => setActForm({ ...actForm, genre: e.target.value })}
                placeholder="Genre (optional)"
                className="input"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <select
                value={actForm.dayId}
                onChange={(e) => setActForm({ ...actForm, dayId: parseInt(e.target.value) })}
                className="input"
              >
                {event.days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.name || dayjs(day.date).format('MMM D')}
                  </option>
                ))}
              </select>
              <select
                value={actForm.stageId}
                onChange={(e) => setActForm({ ...actForm, stageId: parseInt(e.target.value) })}
                className="input"
              >
                {event.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <TimeInput
                value={actForm.startTime}
                onChange={(value) => setActForm({ ...actForm, startTime: value })}
                extended
                required
              />
              <TimeInput
                value={actForm.endTime}
                onChange={(value) => setActForm({ ...actForm, endTime: value })}
                extended
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary text-sm">
                Add Act
              </button>
              <button
                type="button"
                onClick={() => setShowActForm(false)}
                className="btn btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {selectedDayActs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No acts for this day</p>
        ) : (
          <div className="space-y-2">
            {event.stages.map((stage) => {
              const stageActs = selectedDayActs
                .filter((a) => a.stageId === stage.id)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              if (stageActs.length === 0) return null;

              return (
                <div key={stage.id} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-medium text-sm">{stage.name}</div>
                  <div className="divide-y">
                    {stageActs.map((act) => (
                      <div
                        key={act.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm text-gray-500 w-32">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTimeRange(act.startTime, act.endTime)}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <Music className="w-4 h-4 text-primary-600" />
                              {act.name}
                            </div>
                            {act.genre && (
                              <span className="text-xs text-gray-500">{act.genre}</span>
                            )}
                          </div>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteAct(act.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
