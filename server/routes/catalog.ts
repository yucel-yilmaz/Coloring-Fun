import { Router } from 'express';
import { asyncRoute } from '../http';
import { getCatalogOverrides, getCatalogPages } from '../services/catalog';

export const catalogRouter = Router();

catalogRouter.get('/', asyncRoute(async (_req, res) => {
  res.json((await getCatalogPages()).filter((item) => !item.hidden));
}));

catalogRouter.get('/overrides', asyncRoute(async (_req, res) => {
  res.json(await getCatalogOverrides());
}));
