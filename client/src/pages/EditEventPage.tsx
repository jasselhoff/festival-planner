import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventService } from '../services/eventService';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
  });
  const [creatorId, setCreatorId] = useState<number | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const event = await eventService.getEvent(parseInt(id!));
        setFormData({
          name: event.name,
          description: event.description || '',
          location: event.location || '',
          startDate: event.startDate,
          endDate: event.endDate,
        });
        setCreatorId(event.creatorId);
      } catch (error) {
        toast.error('Failed to load event');
        navigate('/events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

  // Check authorization after loading
  useEffect(() => {
    if (!isLoading && creatorId !== null && user && creatorId !== user.id) {
      toast.error('You are not authorized to edit this event');
      navigate(`/events/${id}`);
    }
  }, [isLoading, creatorId, user, id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await eventService.updateEvent(parseInt(id!), formData);
      toast.success('Event updated successfully!');
      navigate(`/events/${id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update event');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Event</h1>

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
              disabled={isSaving}
              className="btn btn-primary flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
