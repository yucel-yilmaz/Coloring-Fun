import express from 'express';
import { adminRouter } from './routes/admin';
import { artworksRouter } from './routes/artworks';
import { catalogRouter } from './routes/catalog';
import { childrenRouter } from './routes/children';
import { connectionsRouter } from './routes/connections';
import { generationsRouter } from './routes/generations';
import { profileRouter } from './routes/profile';
import { errorHandler } from './http';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16mb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/profile', profileRouter);
  app.use('/api/child-profiles', childrenRouter);
  app.use('/api/ai-connections', connectionsRouter);
  app.use('/api/generations', generationsRouter);
  app.use('/api/artworks', artworksRouter);
  app.use('/api/coloring-pages', catalogRouter);
  app.use('/api/admin', adminRouter);
  app.use(errorHandler);
  return app;
}
