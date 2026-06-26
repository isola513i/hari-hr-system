import { Router, Request, Response } from 'express';
import { apiLimiter } from '../middlewares/security';

const router = Router();

/**
 * POST /api/logs/client-error
 * Accepts frontend error reports. No auth required — errors may fire before login.
 * Writes structured output to stdout so Render.com/server logs capture them.
 */
/**
 * @swagger
 * /api/logs/client-error:
 *   post:
 *     summary: Submit a client-side error report
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, description: Error message }
 *               stack:   { type: string, description: Stack trace }
 *               timestamp: { type: string, format: date-time, description: When the error occurred }
 *               url:     { type: string, description: Page URL where the error occurred }
 *               userId:  { type: string, description: Authenticated user ID if available }
 *               page:    { type: string, description: Logical page/route name }
 *               action:  { type: string, description: User action that triggered the error }
 *               level:   { type: string, enum: [error, warn, info], default: error }
 *     responses:
 *       204:
 *         description: Error report accepted
 *       429: { description: Too many requests }
 */
router.post('/client-error', apiLimiter, (req: Request, res: Response) => {
  const { message, stack, timestamp, url, userId, page, action, level } = req.body;
  const entry = { level: level ?? 'error', message, stack, timestamp, url, userId, page, action };
  console.error('[CLIENT]', JSON.stringify(entry));
  res.status(204).send();
});

export default router;
