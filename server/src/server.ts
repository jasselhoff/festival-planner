import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { createServer } from 'http';
import { config } from './config/env';
import { initializeDatabase } from './db/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import { initWebSocket } from './websocket/wsServer';

async function startServer() {
  // Initialize database (async now)
  await initializeDatabase();

  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
  }));
  app.use(cors({
    origin: config.nodeEnv === 'production' ? true : config.clientUrl,
    credentials: true,
  }));
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api', routes);

  // Serve static files in production
  if (config.nodeEnv === 'production') {
    const clientBuildPath = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientBuildPath));

    // Handle client-side routing - serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
        return next();
      }
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }

  // Error handling (only for API routes now)
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  // Initialize WebSocket
  initWebSocket(server);

  // Start server
  server.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
