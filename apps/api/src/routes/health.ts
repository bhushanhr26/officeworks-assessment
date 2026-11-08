import { Router } from 'express';
import type { HealthResponse } from '@catalogue/contracts';

export function healthRouter(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.json(body);
  });
  return router;
}
