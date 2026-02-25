import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groupService } from '../services/groupService';
import type { GroupEvent } from '../services/groupService';
import { eventService } from '../services/eventService';
import type { Group, GroupMember, Event } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Copy,
  Check,
  Plus,
  Loader2,
  Calendar,
  Trash2,
  Crown,
  UserMinus,
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupEvents, setGroupEvents] = useState<GroupEvent[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const isAdmin = members.find((m) => m.userId === user?.id)?.role === 'admin';
  const isCreator = group?.creatorId === user?.id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupData, membersData, eventsData] = await Promise.all([
          groupService.getGroup(parseInt(id!)),
          groupService.listMembers(parseInt(id!)),
          groupService.listGroupEvents(parseInt(id!)),
        ]);
        setGroup(groupData);
        setMembers(membersData);
        setGroupEvents(eventsData);
      } catch (error) {
        toast.error('Failed to load group');
        navigate('/groups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleCopyLink = async () => {
    if (!group) return;
    const link = `${window.location.origin}/groups/join/${group.uuid}`;

    try {
      // Try modern clipboard API first (requires HTTPS)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        // Fallback for HTTP: use a temporary textarea
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // If all else fails, show the link in a prompt
      toast.error('Could not copy. Link: ' + link);
    }
  };

  const handleOpenAddEvent = async () => {
    try {
      const events = await eventService.listEvents();
      // Filter out events already in the group
      const groupEventIds = new Set(groupEvents.map((e) => e.id));
      setAllEvents(events.filter((e) => !groupEventIds.has(e.id)));
      setShowAddEventModal(true);
    } catch (error) {
      toast.error('Failed to load events');
    }
  };

  const handleAddEvent = async () => {
    if (!selectedEventId || !group) return;

    try {
      await groupService.addEventToGroup(group.id, selectedEventId);
      const addedEvent = allEvents.find((e) => e.id === selectedEventId);
      if (addedEvent) {
        setGroupEvents([
          ...groupEvents,
          { ...addedEvent, addedAt: new Date().toISOString(), addedBy: user!.id },
        ]);
      }
      setShowAddEventModal(false);
      setSelectedEventId(null);
      toast.success('Event added to group!');
    } catch (error) {
      toast.error('Failed to add event');
    }
  };

  const handleRemoveEvent = async (eventId: number) => {
    if (!group || !confirm('Remove this event from the group?')) return;

    try {
      await groupService.removeEventFromGroup(group.id, eventId);
      setGroupEvents(groupEvents.filter((e) => e.id !== eventId));
      toast.success('Event removed');
    } catch (error) {
      toast.error('Failed to remove event');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!group || !confirm('Remove this member from the group?')) return;

    try {
      await groupService.removeMember(group.id, memberId);
      setMembers(members.filter((m) => m.userId !== memberId));
      toast.success('Member removed');
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !confirm('Leave this group?')) return;

    try {
      await groupService.leaveGroup(group.id);
      toast.success('Left group');
      navigate('/groups');
    } catch (error) {
      toast.error('Failed to leave group');
    }
  };

  const handleDeleteGroup = async () => {
    if (!group || !confirm('Delete this group? This cannot be undone.')) return;

    try {
      await groupService.deleteGroup(group.id);
      toast.success('Group deleted');
      navigate('/groups');
    } catch (error) {
      toast.error('Failed to delete group');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/groups')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Groups
      </button>

      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-gray-600 mt-2">{group.description}</p>
            )}
          </div>
          <button
            onClick={handleCopyLink}
            className="btn btn-secondary flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Invite Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Members section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Members ({members.length})
          </h2>
        </div>

        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">
                    {member.user?.displayName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.user?.displayName}</span>
                    {member.role === 'admin' && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{member.user?.email}</span>
                </div>
              </div>
              {isAdmin && member.userId !== user?.id && member.userId !== group.creatorId && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Events section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Events</h2>
          <button
            onClick={handleOpenAddEvent}
            className="btn btn-secondary text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>

        {groupEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No events added yet. Add an event to start planning!
          </p>
        ) : (
          <div className="space-y-2">
            {groupEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <div>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-gray-500">
                      {dayjs(event.startDate).format('MMM D')} -{' '}
                      {dayjs(event.endDate).format('MMM D, YYYY')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/groups/${group.id}/events/${event.id}/calendar`}
                    className="btn btn-primary text-sm"
                  >
                    View Calendar
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveEvent(event.id)}
                      className="text-gray-400 hover:text-red-500 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <div>
          {!isCreator && (
            <button onClick={handleLeaveGroup} className="btn btn-secondary text-red-600">
              Leave Group
            </button>
          )}
        </div>
        <div>
          {isCreator && (
            <button onClick={handleDeleteGroup} className="btn btn-danger">
              Delete Group
            </button>
          )}
        </div>
      </div>

      {/* Add event modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Event to Group</h2>
            {allEvents.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">No events available to add.</p>
                <Link to="/events/create" className="btn btn-primary">
                  Create an Event
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {allEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEventId(event.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedEventId === event.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{event.name}</div>
                      <div className="text-sm text-gray-500">
                        {dayjs(event.startDate).format('MMM D')} -{' '}
                        {dayjs(event.endDate).format('MMM D, YYYY')}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowAddEventModal(false);
                      setSelectedEventId(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddEvent}
                    disabled={!selectedEventId}
                    className="btn btn-primary"
                  >
                    Add Event
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
