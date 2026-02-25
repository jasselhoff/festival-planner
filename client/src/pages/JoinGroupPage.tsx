import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupService } from '../services/groupService';
import { useAuth } from '../context/AuthContext';
import { Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Group } from '../types';

export function JoinGroupPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroup = async () => {
      if (!uuid) return;

      try {
        const data = await groupService.getGroupByUuid(uuid);
        setGroup(data);
      } catch (error: any) {
        setError(error.response?.data?.error || 'Group not found');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchGroup();
    } else if (!authLoading) {
      // Redirect to login, saving the join URL
      navigate('/login', { state: { from: { pathname: `/groups/join/${uuid}` } } });
    }
  }, [uuid, isAuthenticated, authLoading, navigate]);

  const handleJoin = async () => {
    if (!uuid) return;
    setIsJoining(true);

    try {
      const joinedGroup = await groupService.joinGroup(uuid);
      toast.success('Joined group successfully!');
      navigate(`/groups/${joinedGroup.id}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Already a member
        toast.success('You are already a member of this group');
        navigate(`/groups/${group?.id}`);
      } else {
        toast.error(error.response?.data?.error || 'Failed to join group');
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Join Group
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate('/groups')} className="btn btn-primary">
            Go to My Groups
          </button>
        </div>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card text-center max-w-md w-full">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-green-100 rounded-full">
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Join "{group.name}"?
        </h2>

        {group.description && (
          <p className="text-gray-600 mb-4">{group.description}</p>
        )}

        <p className="text-sm text-gray-500 mb-6">
          You've been invited to join this group. Click below to accept the invitation.
        </p>

        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/groups')} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="btn btn-primary flex items-center gap-2"
          >
            {isJoining && <Loader2 className="w-4 h-4 animate-spin" />}
            Join Group
          </button>
        </div>
      </div>
    </div>
  );
}
