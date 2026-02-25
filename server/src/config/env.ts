import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    shortRefreshExpiresIn: process.env.JWT_SHORT_REFRESH_EXPIRES_IN || '1h',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/festival_planner.db',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
  },
};
