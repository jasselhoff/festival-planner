import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from './errorHandler';

export interface JwtPayload {
  userId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Invalid token', 403));
  }
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function generateTokens(
  user: { id: number; email: string },
  refreshExpiresIn: string = config.jwt.refreshExpiresIn
) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.refreshSecret,
    { expiresIn: refreshExpiresIn }
  );

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
}
