import { Router } from 'express';
import EventsController from '../controllers/EventsController';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all events
 *       401: { description: Unauthorized }
 */
// GET /api/events - Get all events
router.get('/', EventsController.getAllEvents.bind(EventsController));

/**
 * @swagger
 * /api/events/upcoming:
 *   get:
 *     summary: Get upcoming events
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of upcoming events
 *       401: { description: Unauthorized }
 */
// GET /api/events/upcoming - Get upcoming events
router.get('/upcoming', EventsController.getUpcomingEvents.bind(EventsController));

/**
 * @swagger
 * /api/events/upcoming:
 *   post:
 *     summary: Create a new upcoming event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, date]
 *             properties:
 *               title: { type: string }
 *               date: { type: string, format: date-time }
 *               description: { type: string }
 *               location: { type: string }
 *     responses:
 *       201:
 *         description: Upcoming event created successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
// POST /api/events/upcoming - Create new upcoming event
router.post('/upcoming', apiLimiter, EventsController.createUpcomingEvent.bind(EventsController));

/**
 * @swagger
 * /api/events/upcoming/{id}:
 *   delete:
 *     summary: Delete an upcoming event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the upcoming event to delete
 *     responses:
 *       200:
 *         description: Upcoming event deleted successfully
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// DELETE /api/events/upcoming/:id - Delete an upcoming event
router.delete('/upcoming/:id', apiLimiter, EventsController.deleteUpcomingEvent.bind(EventsController));

export default router;
