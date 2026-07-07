import { Router } from 'express';
import { asyncRoute } from '../http';
import { getCatalogOverrides } from '../services/catalog';

export const catalogRouter = Router();

catalogRouter.get('/overrides', asyncRoute(async (_req, res) => {
  res.json(await getCatalogOverrides());
}));
