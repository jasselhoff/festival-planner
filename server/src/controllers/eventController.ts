import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database';
import { AppError } from '../middleware/errorHandler';
import type { Event, Day, Stage, Act, EventFull } from '@festival-planner/shared';

interface EventRow {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  creator_id: number;
  created_at: string;
}

interface DayRow {
  id: number;
  event_id: number;
  date: string;
  name: string | null;
}

interface StageRow {
  id: number;
  event_id: number;
  name: string;
  description: string | null;
  sort_order: number;
}

interface ActRow {
  id: number;
  event_id: number;
  day_id: number;
  stage_id: number;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  genre: string | null;
}

function mapEventRow(row: EventRow): Event {
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    description: row.description || undefined,
    location: row.location || undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    creatorId: row.creator_id,
    createdAt: row.created_at,
  };
}

function mapDayRow(row: DayRow): Day {
  return {
    id: row.id,
    eventId: row.event_id,
    date: row.date,
    name: row.name || undefined,
  };
}

function mapStageRow(row: StageRow): Stage {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    description: row.description || undefined,
    sortOrder: row.sort_order,
  };
}

function mapActRow(row: ActRow): Act {
  return {
    id: row.id,
    eventId: row.event_id,
    dayId: row.day_id,
    stageId: row.stage_id,
    name: row.name,
    description: row.description || undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    genre: row.genre || undefined,
  };
}

// List all events
export function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = db
      .prepare('SELECT * FROM events ORDER BY start_date DESC')
      .all() as EventRow[];

    const events = rows.map(mapEventRow);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
}

// List user's events
export function listMyEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const rows = db
      .prepare('SELECT * FROM events WHERE creator_id = ? ORDER BY start_date DESC')
      .all(userId) as EventRow[];

    const events = rows.map(mapEventRow);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
}

// Create event
export function createEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { name, description, location, startDate, endDate } = req.body;

    const uuid = uuidv4();

    const result = db
      .prepare(
        `INSERT INTO events (uuid, name, description, location, start_date, end_date, creator_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(uuid, name, description || null, location || null, startDate, endDate, userId);

    const eventId = result.lastInsertRowid as number;

    // Auto-create days based on date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    let dayNum = 1;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      db.prepare(
        'INSERT INTO days (event_id, date, name) VALUES (?, ?, ?)'
      ).run(eventId, dateStr, `Day ${dayNum}`);
      dayNum++;
    }

    const eventRow = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(eventId) as EventRow;

    const event = mapEventRow(eventRow);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
}

// Get event by ID
export function getEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const eventRow = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(id) as EventRow | undefined;

    if (!eventRow) {
      return next(new AppError('Event not found', 404));
    }

    const event = mapEventRow(eventRow);
    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
}

// Get event with all nested data
export function getEventFull(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const eventRow = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(id) as EventRow | undefined;

    if (!eventRow) {
      return next(new AppError('Event not found', 404));
    }

    const days = db
      .prepare('SELECT * FROM days WHERE event_id = ? ORDER BY date')
      .all(id) as DayRow[];

    const stages = db
      .prepare('SELECT * FROM stages WHERE event_id = ? ORDER BY sort_order')
      .all(id) as StageRow[];

    const acts = db
      .prepare('SELECT * FROM acts WHERE event_id = ? ORDER BY start_time')
      .all(id) as ActRow[];

    const eventFull: EventFull = {
      ...mapEventRow(eventRow),
      days: days.map(mapDayRow),
      stages: stages.map(mapStageRow),
      acts: acts.map(mapActRow),
    };

    res.json({ success: true, data: eventFull });
  } catch (error) {
    next(error);
  }
}

// Update event
export function updateEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { name, description, location, startDate, endDate } = req.body;

    const eventRow = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(id) as EventRow | undefined;

    if (!eventRow) {
      return next(new AppError('Event not found', 404));
    }

    if (eventRow.creator_id !== userId) {
      return next(new AppError('Not authorized to update this event', 403));
    }

    db.prepare(
      `UPDATE events SET
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         location = COALESCE(?, location),
         start_date = COALESCE(?, start_date),
         end_date = COALESCE(?, end_date),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(name, description, location, startDate, endDate, id);

    const updated = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(id) as EventRow;

    res.json({ success: true, data: mapEventRow(updated) });
  } catch (error) {
    next(error);
  }
}

// Delete event
export function deleteEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const eventRow = db
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(id) as EventRow | undefined;

    if (!eventRow) {
      return next(new AppError('Event not found', 404));
    }

    if (eventRow.creator_id !== userId) {
      return next(new AppError('Not authorized to delete this event', 403));
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(id);

    res.json({ success: true, data: { message: 'Event deleted successfully' } });
  } catch (error) {
    next(error);
  }
}

// Stages
export function listStages(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;

    const rows = db
      .prepare('SELECT * FROM stages WHERE event_id = ? ORDER BY sort_order')
      .all(eventId) as StageRow[];

    res.json({ success: true, data: rows.map(mapStageRow) });
  } catch (error) {
    next(error);
  }
}

export function createStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;
    const userId = req.user!.userId;
    const { name, description, sortOrder } = req.body;

    // Check ownership
    const event = db
      .prepare('SELECT creator_id FROM events WHERE id = ?')
      .get(eventId) as { creator_id: number } | undefined;

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    if (event.creator_id !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    const result = db
      .prepare(
        'INSERT INTO stages (event_id, name, description, sort_order) VALUES (?, ?, ?, ?)'
      )
      .run(eventId, name, description || null, sortOrder || 0);

    const stage = db
      .prepare('SELECT * FROM stages WHERE id = ?')
      .get(result.lastInsertRowid) as StageRow;

    res.status(201).json({ success: true, data: mapStageRow(stage) });
  } catch (error) {
    next(error);
  }
}

export function updateStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, stageId } = req.params;
    const userId = req.user!.userId;
    const { name, description, sortOrder } = req.body;

    const event = db
      .prepare('SELECT creator_id FROM events WHERE id = ?')
      .get(eventId) as { creator_id: number } | undefined;

    if (!event || event.creator_id !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    db.prepare(
      `UPDATE stages SET
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         sort_order = COALESCE(?, sort_order)
       WHERE id = ? AND event_id = ?`
    ).run(name, description, sortOrder, stageId, eventId);

    const stage = db
      .prepare('SELECT * FROM stages WHERE id = ?')
      .get(stageId) as StageRow;

    res.json({ success: true, data: mapStageRow(stage) });
  } catch (error) {
    next(error);
  }
}

export function deleteStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, stageId } = req.params;
    const userId = req.user!.userId;

    const event = db
      .prepare('SELECT creator_id FROM events WHERE id = ?')
      .get(eventId) as { creator_id: number } | undefined;

    if (!event || event.creator_id !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    db.prepare('DELETE FROM stages WHERE id = ? AND event_id = ?').run(stageId, eventId);

    res.json({ success: true, data: { message: 'Stage deleted successfully' } });
  } catch (error) {
    next(error);
  }
}

// Days
export function listDays(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;

    const rows = db
      .prepare('SELECT * FROM days WHERE event_id = ? ORDER BY date')
      .all(eventId) as DayRow[];

    res.json({ success: true, data: rows.map(mapDayRow) });
  } catch (error) {
    next(error);
  }
}

// Acts
export function listActs(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;

    const rows = db
      .prepare('SELECT * FROM acts WHERE event_id = ? ORDER BY day_id, start_time')
      .all(eventId) as ActRow[];

    res.json({ success: true, data: rows.map(mapActRow) });
  } catch (error) {
    next(error);
  }
}

export function createAct(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId } = req.params;
    const userId = req.user!.userId;
    const { dayId, stageId, name, description, startTime, endTime, genre } = req.body;

    const event = db
      .prepare('SELECT creator_id FROM events WHERE id = ?')
      .get(eventId) as { creator_id: number } | undefined;

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    if (event.creator_id !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    const result = db
      .prepare(
        `INSERT INTO acts (event_id, day_id, stage_id, name, description, start_time, end_time, genre)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(eventId, dayId, stageId, name, description || null, startTime, endTime, genre || null);

    const act = db
      .prepare('SELECT * FROM acts WHERE id = ?')
      .get(result.lastInsertRowid) as ActRow;

    res.status(201).json({ success: true, data: mapActRow(act) });
  } catch (error) {
    next(error);
  }
}

export function updateAct(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, actId } = req.params;
    const userId = req.user!.userId;
    const { dayId, stageId, name, description, startTime, endTime, genre } = req.body;

    const event = db
      .prepare('SELECT creator_id FROM events WHERE id = ?')
      .get(eventId) as { creator_id: number } | undefined;

    if (!event || event.creator_id !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    db.prepare(
      `UPDATE acts SET
         day_id = COALESCE(?, day_id),
         stage_id = COALESCE(?, stage_id),
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         start_time = COALESCE(?, start_time),
         end_time = COALESCE(?, end_time),
         genre = COALESCE(?, genre)
       WHERE id = ? AND event_id = ?`
    ).run(dayId, stageId, name, description, startTime, endTime, genre, actId, eventId);

    const act = db
      .prepare('SELECT * FROM acts WHERE id = ?')
      .get(actId) as ActRow;

    res.json({ success: true, data: mapActRow(act) });
  } catch (error) {
    next(error);
  }
}

export function deleteAct(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventId, actId } = req.params;
    const userId = req.user!.userId;

    const event = db
      .prepare('SELECT creator_id FROM events WHERE id = ?')
      .get(eventId) as { creator_id: number } | undefined;

    if (!event || event.creator_id !== userId) {
      return next(new AppError('Not authorized', 403));
    }

    db.prepare('DELETE FROM acts WHERE id = ? AND event_id = ?').run(actId, eventId);

    res.json({ success: true, data: { message: 'Act deleted successfully' } });
  } catch (error) {
    next(error);
  }
}
