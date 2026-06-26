import { Router } from 'express';
import HolidayController from '../controllers/HolidayController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/security';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/holidays - Get all holidays (any authenticated user)
// Optional query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
/**
 * @swagger
 * /api/holidays:
 *   get:
 *     summary: Get all holidays
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema: { type: string, format: date }
 *         description: Filter holidays from this date (YYYY-MM-DD)
 *       - in: query
 *         name: end
 *         schema: { type: string, format: date }
 *         description: Filter holidays up to this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of holidays
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 *                   date: { type: string, format: date }
 *                   type: { type: string, enum: [public, company] }
 *                   description: { type: string }
 *       401: { description: Unauthorized }
 */
router.get('/', HolidayController.getAllHolidays.bind(HolidayController));

// GET /api/holidays/calculate-days - Calculate business days between dates
/**
 * @swagger
 * /api/holidays/calculate-days:
 *   get:
 *     summary: Calculate business days between two dates
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: end
 *         required: true
 *         schema: { type: string, format: date }
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Business day count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 businessDays: { type: number }
 *                 calendarDays: { type: number }
 *                 holidays: { type: number }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.get('/calculate-days', HolidayController.calculateBusinessDays.bind(HolidayController));

// POST /api/holidays - Create holiday (admin only)
/**
 * @swagger
 * /api/holidays:
 *   post:
 *     summary: Create a holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, date]
 *             properties:
 *               name: { type: string }
 *               date: { type: string, format: date }
 *               type: { type: string, enum: [public, company] }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Holiday created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 date: { type: string, format: date }
 *                 type: { type: string }
 *                 description: { type: string }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 */
router.post('/', requireAdmin, apiLimiter, HolidayController.createHoliday.bind(HolidayController));

// POST /api/holidays/bulk - Bulk create holidays (admin only)
/**
 * @swagger
 * /api/holidays/bulk:
 *   post:
 *     summary: Bulk create holidays
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [holidays]
 *             properties:
 *               holidays:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, date]
 *                   properties:
 *                     name: { type: string }
 *                     date: { type: string, format: date }
 *                     type: { type: string, enum: [public, company] }
 *                     description: { type: string }
 *     responses:
 *       201:
 *         description: Holidays created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created: { type: number }
 *                 holidays:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       date: { type: string, format: date }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 */
router.post('/bulk', requireAdmin, apiLimiter, HolidayController.bulkCreateHolidays.bind(HolidayController));

// PUT /api/holidays/:id - Update holiday (admin only)
/**
 * @swagger
 * /api/holidays/{id}:
 *   put:
 *     summary: Update a holiday
 *     tags: [Holidays]
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
 *               name: { type: string }
 *               date: { type: string, format: date }
 *               type: { type: string, enum: [public, company] }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Holiday updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 date: { type: string, format: date }
 *                 type: { type: string }
 *                 description: { type: string }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Not found }
 */
router.put('/:id', requireAdmin, apiLimiter, HolidayController.updateHoliday.bind(HolidayController));

// DELETE /api/holidays/:id - Delete holiday (admin only)
/**
 * @swagger
 * /api/holidays/{id}:
 *   delete:
 *     summary: Delete a holiday
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Holiday deleted
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Not found }
 */
router.delete('/:id', requireAdmin, apiLimiter, HolidayController.deleteHoliday.bind(HolidayController));

export default router;
