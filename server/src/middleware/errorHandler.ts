import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  console.error('Unexpected error:', err);

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
}
