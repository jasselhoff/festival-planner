import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Users, Plus, ArrowRight } from 'lucide-react';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome, {user?.displayName}!
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Plan your festival experience with friends. Create events, form groups, and
          coordinate which acts to see together.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Events</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Create festival events with multiple days, stages, and acts. Share them with the
            community or keep them private.
          </p>
          <div className="flex gap-3">
            <Link to="/events/create" className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Event
            </Link>
            <Link to="/events" className="btn btn-secondary flex items-center gap-2">
              Browse Events
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Groups</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Create or join groups with friends. Add events to your group and see everyone's
            act selections on a shared calendar.
          </p>
          <div className="flex gap-3">
            <Link to="/groups" className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Group
            </Link>
            <Link to="/groups" className="btn btn-secondary flex items-center gap-2">
              My Groups
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">How it works</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Create or find a festival event with the lineup</li>
          <li>Create a group and invite your friends using a share link</li>
          <li>Add the event to your group</li>
          <li>Everyone marks the acts they want to see</li>
          <li>View the calendar to see who wants to see what and find conflicts</li>
        </ol>
      </div>
    </div>
  );
}
