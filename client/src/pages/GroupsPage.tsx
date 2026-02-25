import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { groupService } from '../services/groupService';
import type { Group } from '../types';
import { Users, Plus, Loader2, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [joinUuid, setJoinUuid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await groupService.listGroups();
        setGroups(data);
      } catch (error) {
        toast.error('Failed to load groups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const group = await groupService.createGroup(formData);
      setGroups([group, ...groups]);
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      toast.success('Group created!');
      navigate(`/groups/${group.id}`);
    } catch (error) {
      toast.error('Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Extract UUID from URL if full URL was pasted
      let uuid = joinUuid.trim();
      if (uuid.includes('/')) {
        const parts = uuid.split('/');
        uuid = parts[parts.length - 1];
      }

      const group = await groupService.joinGroup(uuid);
      setGroups([group, ...groups]);
      setJoinUuid('');
      setShowJoinForm(false);
      toast.success('Joined group!');
      navigate(`/groups/${group.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to join group');
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinForm(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            Join Group
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        </div>
      </div>

      {/* Create form modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Group</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Group Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Festival Squad 2025"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  placeholder="What's this group for?"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join form modal */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Join Group</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="label">Invite Link or Code *</label>
                <input
                  type="text"
                  required
                  value={joinUuid}
                  onChange={(e) => setJoinUuid(e.target.value)}
                  className="input"
                  placeholder="Paste the invite link or code"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                >
                  {isSubmitting ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
          <p className="text-gray-600 mb-4">
            Create a group to start planning with friends, or join one using an invite link.
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={() => setShowJoinForm(true)} className="btn btn-secondary">
              Join Group
            </button>
            <button onClick={() => setShowCreateForm(true)} className="btn btn-primary">
              Create Group
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
              </div>
              {group.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
