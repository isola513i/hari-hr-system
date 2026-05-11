import { Router, Request, Response } from 'express';
import { apiLimiter } from '../middlewares/security';

const router = Router();

/**
 * POST /api/logs/client-error
 * Accepts frontend error reports. No auth required — errors may fire before login.
 * Writes structured output to stdout so Render.com/server logs capture them.
 */
router.post('/client-error', apiLimiter, (req: Request, res: Response) => {
  const { message, stack, timestamp, url, userId, page, action, level } = req.body;
  const entry = { level: level ?? 'error', message, stack, timestamp, url, userId, page, action };
  console.error('[CLIENT]', JSON.stringify(entry));
  res.status(204).send();
});

export default router;
