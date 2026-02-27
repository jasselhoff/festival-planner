import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventService } from '../services/eventService';
import type { Event } from '../types';
import { Calendar, MapPin, Plus, Loader2, Music } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventService.listEvents();
        setEvents(data);
      } catch (error) {
        toast.error('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/events/missing-spotify-ids"
            className="btn btn-secondary flex items-center gap-2"
          >
            <Music className="w-4 h-4" />
            Missing Spotify IDs
          </Link>
          <Link to="/events/create" className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Event
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
          <p className="text-gray-600 mb-4">Create your first festival event to get started.</p>
          <Link to="/events/create" className="btn btn-primary">
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>
              {event.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
              )}
              <div className="space-y-2 text-sm text-gray-500">
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
