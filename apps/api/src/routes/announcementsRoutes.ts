import { Router } from 'express';
import AnnouncementsController from '../controllers/AnnouncementsController';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get all announcements
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of announcements retrieved successfully
 *       401: { description: Unauthorized }
 */
router.get('/', AnnouncementsController.getAllAnnouncements.bind(AnnouncementsController));

/**
 * @swagger
 * /api/announcements:
 *   post:
 *     summary: Create a new announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               publishedAt: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Announcement created successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post('/', apiLimiter, AnnouncementsController.createAnnouncement.bind(AnnouncementsController));

/**
 * @swagger
 * /api/announcements/{id}:
 *   patch:
 *     summary: Update an announcement (Admin only)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               publishedAt: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Announcement updated successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.patch('/:id', requireAdmin, apiLimiter, AnnouncementsController.updateAnnouncement.bind(AnnouncementsController));

/**
 * @swagger
 * /api/announcements/{id}:
 *   delete:
 *     summary: Delete an announcement (Admin only)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Announcement deleted successfully
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
router.delete('/:id', requireAdmin, apiLimiter, AnnouncementsController.deleteAnnouncement.bind(AnnouncementsController));

export default router;
