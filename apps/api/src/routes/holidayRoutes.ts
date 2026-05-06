import { Router } from 'express';
import HolidayController from '../controllers/HolidayController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/security';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/holidays - Get all holidays (any authenticated user)
// Optional query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', HolidayController.getAllHolidays.bind(HolidayController));

// GET /api/holidays/calculate-days - Calculate business days between dates
router.get('/calculate-days', HolidayController.calculateBusinessDays.bind(HolidayController));

// POST /api/holidays - Create holiday (admin only)
router.post('/', requireAdmin, apiLimiter, HolidayController.createHoliday.bind(HolidayController));

// POST /api/holidays/bulk - Bulk create holidays (admin only)
router.post('/bulk', requireAdmin, apiLimiter, HolidayController.bulkCreateHolidays.bind(HolidayController));

// PUT /api/holidays/:id - Update holiday (admin only)
router.put('/:id', requireAdmin, apiLimiter, HolidayController.updateHoliday.bind(HolidayController));

// DELETE /api/holidays/:id - Delete holiday (admin only)
router.delete('/:id', requireAdmin, apiLimiter, HolidayController.deleteHoliday.bind(HolidayController));

export default router;
