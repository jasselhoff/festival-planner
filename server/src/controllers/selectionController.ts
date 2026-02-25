import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import { broadcastToGroup } from '../websocket/wsServer';
import type { Selection } from '@festival-planner/shared';

interface SelectionRow {
  id: number;
  user_id: number;
  group_id: number;
  act_id: number;
  priority: number;
  created_at: string;
}

interface SelectionWithUserRow extends SelectionRow {
  email: string;
  display_name: string;
}

function mapSelectionRow(row: SelectionRow): Selection {
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id,
    actId: row.act_id,
    priority: row.priority,
    createdAt: row.created_at,
  };
}

// Get all selections for a group
export function getGroupSelections(req: Request, res: Response, next: NextFunction) {
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
        `SELECT s.*, u.email, u.display_name
         FROM selections s
         JOIN users u ON s.user_id = u.id
         WHERE s.group_id = ?`
      )
      .all(groupId) as SelectionWithUserRow[];

    const selections = rows.map((row) => ({
      ...mapSelectionRow(row),
      user: {
        id: row.user_id,
        email: row.email,
        displayName: row.display_name,
      },
    }));

    res.json({ success: true, data: selections });
  } catch (error) {
    next(error);
  }
}

// Get current user's selections for a group
export function getMySelections(req: Request, res: Response, next: NextFunction) {
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
      .prepare('SELECT * FROM selections WHERE group_id = ? AND user_id = ?')
      .all(groupId, userId) as SelectionRow[];

    res.json({ success: true, data: rows.map(mapSelectionRow) });
  } catch (error) {
    next(error);
  }
}

// Add or update selection
export function addSelection(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId } = req.params;
    const userId = req.user!.userId;
    const { actId, priority = 1 } = req.body;

    // Check membership
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    // Check if act belongs to an event in the group
    const actInGroup = db
      .prepare(
        `SELECT a.id FROM acts a
         JOIN group_events ge ON a.event_id = ge.event_id
         WHERE a.id = ? AND ge.group_id = ?`
      )
      .get(actId, groupId);

    if (!actInGroup) {
      return next(new AppError('Act is not part of any event in this group', 400));
    }

    // Check if selection already exists
    const existing = db
      .prepare('SELECT * FROM selections WHERE user_id = ? AND group_id = ? AND act_id = ?')
      .get(userId, groupId, actId) as SelectionRow | undefined;

    if (existing) {
      // Update priority
      db.prepare(
        'UPDATE selections SET priority = ? WHERE id = ?'
      ).run(priority, existing.id);

      const updated = db
        .prepare('SELECT * FROM selections WHERE id = ?')
        .get(existing.id) as SelectionRow;

      res.json({ success: true, data: mapSelectionRow(updated) });
    } else {
      // Create new selection
      const result = db
        .prepare(
          'INSERT INTO selections (user_id, group_id, act_id, priority) VALUES (?, ?, ?, ?)'
        )
        .run(userId, groupId, actId, priority);

      const selection = db
        .prepare('SELECT * FROM selections WHERE id = ?')
        .get(result.lastInsertRowid) as SelectionRow;

      // Get user name for broadcast
      const user = db
        .prepare('SELECT display_name FROM users WHERE id = ?')
        .get(userId) as { display_name: string };

      // Broadcast to group members
      broadcastToGroup(parseInt(groupId), {
        type: 'SELECTION_ADDED',
        payload: {
          userId,
          actId,
          groupId: parseInt(groupId),
          userName: user.display_name,
          priority,
        },
      }, userId);

      res.status(201).json({ success: true, data: mapSelectionRow(selection) });
    }
  } catch (error) {
    next(error);
  }
}

// Remove selection
export function removeSelection(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId, actId } = req.params;
    const userId = req.user!.userId;

    // Check membership
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    const result = db
      .prepare('DELETE FROM selections WHERE user_id = ? AND group_id = ? AND act_id = ?')
      .run(userId, groupId, actId);

    if (result.changes > 0) {
      // Broadcast to group members
      broadcastToGroup(parseInt(groupId), {
        type: 'SELECTION_REMOVED',
        payload: {
          userId,
          actId: parseInt(actId),
          groupId: parseInt(groupId),
        },
      }, userId);
    }

    res.json({ success: true, data: { message: 'Selection removed' } });
  } catch (error) {
    next(error);
  }
}

// Get conflicts for an event in a group
export function getConflicts(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupId, eventId } = req.params;
    const userId = req.user!.userId;

    // Check membership
    const membership = db
      .prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?')
      .get(groupId, userId);

    if (!membership) {
      return next(new AppError('Not a member of this group', 403));
    }

    // Get all selections for acts in this event from this group
    const selections = db
      .prepare(
        `SELECT s.*, a.day_id, a.start_time, a.end_time, a.stage_id, a.name as act_name,
                st.name as stage_name, u.display_name
         FROM selections s
         JOIN acts a ON s.act_id = a.id
         JOIN stages st ON a.stage_id = st.id
         JOIN users u ON s.user_id = u.id
         WHERE s.group_id = ? AND a.event_id = ?
         ORDER BY s.user_id, a.day_id, a.start_time`
      )
      .all(groupId, eventId) as any[];

    // Group by user and find overlaps
    const userSelections = new Map<number, any[]>();
    for (const sel of selections) {
      if (!userSelections.has(sel.user_id)) {
        userSelections.set(sel.user_id, []);
      }
      userSelections.get(sel.user_id)!.push(sel);
    }

    const conflicts: any[] = [];

    for (const [uid, sels] of userSelections) {
      // Group by day
      const byDay = new Map<number, any[]>();
      for (const sel of sels) {
        if (!byDay.has(sel.day_id)) {
          byDay.set(sel.day_id, []);
        }
        byDay.get(sel.day_id)!.push(sel);
      }

      // Find overlaps within each day
      for (const [dayId, daySels] of byDay) {
        for (let i = 0; i < daySels.length; i++) {
          for (let j = i + 1; j < daySels.length; j++) {
            const a = daySels[i];
            const b = daySels[j];

            // Check time overlap (simple string comparison works for HH:MM format)
            if (a.start_time < b.end_time && b.start_time < a.end_time) {
              conflicts.push({
                userId: uid,
                userName: a.display_name,
                dayId,
                acts: [
                  {
                    actId: a.act_id,
                    actName: a.act_name,
                    stageId: a.stage_id,
                    stageName: a.stage_name,
                    startTime: a.start_time,
                    endTime: a.end_time,
                  },
                  {
                    actId: b.act_id,
                    actName: b.act_name,
                    stageId: b.stage_id,
                    stageName: b.stage_name,
                    startTime: b.start_time,
                    endTime: b.end_time,
                  },
                ],
              });
            }
          }
        }
      }
    }

    res.json({ success: true, data: conflicts });
  } catch (error) {
    next(error);
  }
}
