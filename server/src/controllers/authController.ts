import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import {
  generateTokens,
  verifyRefreshToken,
} from '../middleware/authMiddleware';
import type { User, AuthResponse } from '@festival-planner/shared';

const SALT_ROUNDS = 12;

// Parse duration string like '7d', '1h', '15m' to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: string;
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password, displayName } = req.body;

    // Check if user already exists
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existing) {
      return next(new AppError('Email already registered', 409));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = db
      .prepare(
        'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)'
      )
      .run(email, passwordHash, displayName);

    const userId = result.lastInsertRowid as number;

    // Get created user
    const userRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as UserRow;

    const user = mapUserRow(userRow);
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
    });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(userId, refreshToken, expiresAt.toISOString());

    const response: AuthResponse = {
      user,
      accessToken,
      refreshToken,
    };

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, rememberMe = true } = req.body;

    // Find user
    const userRow = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;

    if (!userRow) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Verify password
    const isValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isValid) {
      return next(new AppError('Invalid email or password', 401));
    }

    const user = mapUserRow(userRow);

    // Use different refresh token expiry based on rememberMe
    const refreshExpiresIn = rememberMe
      ? config.jwt.refreshExpiresIn
      : config.jwt.shortRefreshExpiresIn;

    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
    }, refreshExpiresIn);

    // Store refresh token with appropriate expiry
    const expiresAt = new Date(Date.now() + parseDuration(refreshExpiresIn));
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, refreshToken, expiresAt.toISOString());

    const response: AuthResponse = {
      user,
      accessToken,
      refreshToken,
    };

    res.json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
}

export function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token required', 400));
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return next(new AppError('Invalid refresh token', 401));
    }

    // Check if token exists in database
    const tokenRow = db
      .prepare('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > ?')
      .get(refreshToken, new Date().toISOString());

    if (!tokenRow) {
      return next(new AppError('Refresh token expired or revoked', 401));
    }

    // Delete old token
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);

    // Get user
    const userRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(payload.userId) as UserRow | undefined;

    if (!userRow) {
      return next(new AppError('User not found', 404));
    }

    const user = mapUserRow(userRow);
    const tokens = generateTokens({ id: user.id, email: user.email });

    // Store new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, tokens.refreshToken, expiresAt.toISOString());

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
    }

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
}

export function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const userRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as UserRow | undefined;

    if (!userRow) {
      return next(new AppError('User not found', 404));
    }

    const user = mapUserRow(userRow);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.userId;
    const { displayName } = req.body;

    if (displayName) {
      db.prepare(
        'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(displayName, userId);
    }

    const userRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as UserRow;

    const user = mapUserRow(userRow);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}
