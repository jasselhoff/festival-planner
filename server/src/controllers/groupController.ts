import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import type { Group, GroupMember, User } from '@festival-planner/shared';

interface GroupRow {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  creator_id: number;
  created_at: string;
}

interface GroupMemberRow {
  id: number;
  group_id: number;
  user_id: number;
  role: string;
  joined_at: string;
}

interface UserRow {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
}

function mapGroupRow(row: GroupRow): Group {
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    description: row.description || undefined,
    creatorId: row.creator_id,
    createdAt: row.created_at,
  };
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

function mapGroupMemberRow(row: GroupMemberRow & Partial<UserRow>): GroupMember {
  const member: GroupMember = {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role as 'admin' | 'member',
    joinedAt: row.joined_at,
  };

  if (row.email) {
    member.user = {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name!,
      createdAt: row.created_at!,
    };
  }

  return member;
}

// List user's groups
export function listGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const rows = db
      .prepare(
        `SELECT g.* FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ?
         ORDER BY g.created_at DESC`
      )
      .all(userId) as GroupRow[];

    res.json({ success: true, data: rows.map(mapGroupRow) });
  } catch (error) {
    next(error);
  }
}

// Create group
export function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { name, description } = req.body;

    const uuid = uuidv4();

    const result = db
      .prepare(
        'INSERT INTO groups (uuid, name, description, creator_id) VALUES (?, ?, ?, ?)'
      )
      .run(uuid, name, description || null, userId);

    const groupId = result.lastInsertRowid as number;

    // Add creator as admin member
    db.prepare(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)'
    ).run(groupId, userId, 'admin');

    const groupRow = db
      .prepare('SELECT * FROM groups WHERE id = ?')
      .get(groupId) as GroupRow;

    res.status(201).json({ success: true, data: mapGroupRow(groupRow) });
  } catch (error) {
    next(error);
  }
}

// Get group by UUID (for joining)
export function getGroupByUuid(req: Request, res: Response, next: NextFunction) {
  try {
    const { uuid } = req.params;

    const groupRow = db
      .prepare('SELECT * FROM groups WHERE uuid = ?')
      .get(uuid) as GroupRow | undefined;

    if (!groupRow) {
      return next(new AppError('Group not found', 404));
    }

    res.json({ success: true, data: mapGroupRow(groupRow) });
  } catch (error) {
    next(error);
  }
}

// Get group by ID
export function getGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if user is member
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(id, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    const groupRow = db
      .prepare('SELECT * FROM groups WHERE id = ?')
      .get(id) as GroupRow | undefined;

    if (!groupRow) {
      return next(new AppError('Group not found', 404));
    }

    res.json({ success: true, data: mapGroupRow(groupRow) });
  } catch (error) {
    next(error);
  }
}

// Update group
export function updateGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { name, description } = req.body;

    // Check if user is admin
    const membership = db
      .prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(id, userId) as { role: string } | undefined;

    if (!membership || membership.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    db.prepare(
      `UPDATE groups SET
         name = COALESCE(?, name),
         description = COALESCE(?, description)
       WHERE id = ?`
    ).run(name, description, id);

    const groupRow = db
      .prepare('SELECT * FROM groups WHERE id = ?')
      .get(id) as GroupRow;

    res.json({ success: true, data: mapGroupRow(groupRow) });
  } catch (error) {
    next(error);
  }
}

// Delete group
export function deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const groupRow = db
      .prepare('SELECT * FROM groups WHERE id = ?')
      .get(id) as GroupRow | undefined;

    if (!groupRow) {
      return next(new AppError('Group not found', 404));
    }

    if (groupRow.creator_id !== userId) {
      return next(new AppError('Only the creator can delete the group', 403));
    }

    db.prepare('DELETE FROM groups WHERE id = ?').run(id);

    res.json({ success: true, data: { message: 'Group deleted successfully' } });
  } catch (error) {
    next(error);
  }
}

// Join group
export function joinGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { uuid } = req.params;
    const userId = req.user!.userId;

    const groupRow = db
      .prepare('SELECT * FROM groups WHERE uuid = ?')
      .get(uuid) as GroupRow | undefined;

    if (!groupRow) {
      return next(new AppError('Group not found', 404));
    }

    // Check if already a member
    const existing = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupRow.id, userId);

    if (existing) {
      return next(new AppError('Already a member of this group', 409));
    }

    db.prepare(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)'
    ).run(groupRow.id, userId, 'member');

    res.json({ success: true, data: mapGroupRow(groupRow) });
  } catch (error) {
    next(error);
  }
}

// Leave group
export function leaveGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const groupRow = db
      .prepare('SELECT * FROM groups WHERE id = ?')
      .get(id) as GroupRow | undefined;

    if (!groupRow) {
      return next(new AppError('Group not found', 404));
    }

    if (groupRow.creator_id === userId) {
      return next(new AppError('Creator cannot leave the group. Delete it instead.', 400));
    }

    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(id, userId);

    // Also delete user's selections for this group
    db.prepare('DELETE FROM selections WHERE group_id = ? AND user_id = ?').run(id, userId);

    res.json({ success: true, data: { message: 'Left group successfully' } });
  } catch (error) {
    next(error);
  }
}

// List group members
export function listMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if user is member
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(id, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    const rows = db
      .prepare(
        `SELECT gm.*, u.email, u.display_name, u.created_at as user_created_at
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = ?
         ORDER BY gm.joined_at`
      )
      .all(id) as (GroupMemberRow & { email: string; display_name: string; user_created_at: string })[];

    const members = rows.map((row) => ({
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      role: row.role as 'admin' | 'member',
      joinedAt: row.joined_at,
      user: {
        id: row.user_id,
        email: row.email,
        displayName: row.display_name,
        createdAt: row.user_created_at,
      },
    }));

    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
}

// Remove member
export function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, memberId } = req.params;
    const userId = req.user!.userId;

    // Check if user is admin
    const membership = db
      .prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(id, userId) as { role: string } | undefined;

    if (!membership || membership.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    // Check if target is the creator
    const group = db
      .prepare('SELECT creator_id FROM groups WHERE id = ?')
      .get(id) as { creator_id: number };

    if (group.creator_id === parseInt(memberId)) {
      return next(new AppError('Cannot remove the group creator', 400));
    }

    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(id, memberId);
    db.prepare('DELETE FROM selections WHERE group_id = ? AND user_id = ?').run(id, memberId);

    res.json({ success: true, data: { message: 'Member removed successfully' } });
  } catch (error) {
    next(error);
  }
}

// List group events
export function listGroupEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId } = req.params;
    const userId = req.user!.userId;

    // Check membership
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    const rows = db
      .prepare(
        `SELECT e.*, ge.added_at, ge.added_by
         FROM events e
         JOIN group_events ge ON e.id = ge.event_id
         WHERE ge.group_id = ?
         ORDER BY e.start_date`
      )
      .all(groupId) as (any)[];

    const events = rows.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      name: row.name,
      description: row.description || undefined,
      location: row.location || undefined,
      startDate: row.start_date,
      endDate: row.end_date,
      creatorId: row.creator_id,
      createdAt: row.created_at,
      addedAt: row.added_at,
      addedBy: row.added_by,
    }));

    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
}

// Add event to group
export function addEventToGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId } = req.params;
    const userId = req.user!.userId;
    const { eventId } = req.body;

    // Check membership
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    // Check if event exists
    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Check if already added
    const existing = db
      .prepare('SELECT * FROM group_events WHERE group_id = ? AND event_id = ?')
      .get(groupId, eventId);

    if (existing) {
      return next(new AppError('Event already added to group', 409));
    }

    db.prepare(
      'INSERT INTO group_events (group_id, event_id, added_by) VALUES (?, ?, ?)'
    ).run(groupId, eventId, userId);

    res.status(201).json({ success: true, data: { message: 'Event added to group' } });
  } catch (error) {
    next(error);
  }
}

// Remove event from group
export function removeEventFromGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId, eventId } = req.params;
    const userId = req.user!.userId;

    // Check if user is admin
    const membership = db
      .prepare('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId) as { role: string } | undefined;

    if (!membership || membership.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    db.prepare('DELETE FROM group_events WHERE group_id = ? AND event_id = ?').run(groupId, eventId);

    // Also delete selections for this event in this group
    db.prepare(
      `DELETE FROM selections WHERE group_id = ? AND act_id IN (
         SELECT id FROM acts WHERE event_id = ?
       )`
    ).run(groupId, eventId);

    res.json({ success: true, data: { message: 'Event removed from group' } });
  } catch (error) {
    next(error);
  }
}
