import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export function CreateEventPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const event = await eventService.createEvent(formData);
      toast.success('Event created successfully!');
      navigate(`/events/${event.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Event</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="label">
              Event Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., Summer Music Festival 2025"
            />
          </div>

          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Describe the festival..."
            />
          </div>

          <div>
            <label htmlFor="location" className="label">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input"
              placeholder="e.g., Central Park, New York"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="label">
                Start Date *
              </label>
              <input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="label">
                End Date *
              </label>
              <input
                id="endDate"
                type="date"
                required
                value={formData.endDate}
                min={formData.startDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
