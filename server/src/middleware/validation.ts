import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from './errorHandler';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map((e) => e.message).join(', ');
        return next(new AppError(message, 400));
      }
      next(error);
    }
  };
}

// Auth validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1, 'Display name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Event validation schemas
export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export const createStageSchema = z.object({
  name: z.string().min(1, 'Stage name is required').max(100),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
});

// Extended time format allows hours 00-29 to support acts ending after midnight
// e.g., "25:30" means 01:30 the next day
const extendedTimeRegex = /^([0-2][0-9]):([0-5][0-9])$/;

const extendedTimeSchema = z.string().regex(extendedTimeRegex, 'Invalid time format (HH:MM)').refine(
  (time) => {
    const hours = parseInt(time.split(':')[0], 10);
    return hours <= 29;
  },
  { message: 'Hours must be between 00 and 29' }
);

export const createActSchema = z.object({
  dayId: z.number().int().positive(),
  stageId: z.number().int().positive(),
  name: z.string().min(1, 'Act name is required').max(200),
  description: z.string().optional(),
  startTime: extendedTimeSchema,
  endTime: extendedTimeSchema,
  genre: z.string().optional(),
  artistId: z.number().int().positive().optional(),
});

// Group validation schemas
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().optional(),
});

// Selection validation schema
export const createSelectionSchema = z.object({
  actId: z.number().int().positive(),
  priority: z.number().int().min(1).max(3).optional(),
});

// Spotify playlist creation schema
export const createPlaylistSchema = z.object({
  groupId: z.number().int().positive(),
  eventId: z.number().int().positive(),
  playlistName: z.string().min(1, 'Playlist name is required').max(100),
  description: z.string().max(300).optional(),
  memberIds: z.array(z.number().int().positive()).optional(),
  tracksPerArtist: z.number().int().min(1).max(10).default(3),
  isPublic: z.boolean().default(true),
});
