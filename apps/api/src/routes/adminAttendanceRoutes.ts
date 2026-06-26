import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import AttendanceService from '../services/AttendanceService';
import { safeErrorMessage } from '../utils/errorResponse';

const router = Router();

// All admin attendance routes require authentication + admin role
router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * /api/admin/attendance/snapshot:
 *   get:
 *     summary: Get today's attendance snapshot
 *     tags: [Admin Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Snapshot counts (present, late, absent, remote, halfDay, total)
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/snapshot', async (_req: Request, res: Response) => {
  try {
    const snapshot = await AttendanceService.adminGetTodaySnapshot();
    res.json(snapshot);
  } catch (error: unknown) {
    console.error('Error getting attendance snapshot:', error);
    res.status(500).json({ error: 'Failed to get attendance snapshot' });
  }
});

/**
 * @swagger
 * /api/admin/attendance/calendar:
 *   get:
 *     summary: Get compact attendance data for a date range
 *     tags: [Admin Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Start of the date range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *         description: End of the date range (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Array of { employeeId, date } for records with clock_in
 *       400: { description: startDate and endDate are required }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const data = await AttendanceService.getAttendanceCalendarData(
      startDate as string,
      endDate as string
    );
    res.json(data);
  } catch (error: unknown) {
    console.error('Error getting calendar attendance data:', error);
    res.status(500).json({ error: 'Failed to get calendar attendance data' });
  }
});

/**
 * @swagger
 * /api/admin/attendance/records:
 *   get:
 *     summary: List paginated attendance records with filters
 *     tags: [Admin Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by employee name or ID
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *         description: Filter by department
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by attendance status
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Filter from this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Filter up to this date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Records per page
 *     responses:
 *       200:
 *         description: Paginated attendance records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/records', async (req: Request, res: Response) => {
  try {
    const { search, department, status, startDate, endDate, page, limit } = req.query;

    const result = await AttendanceService.adminGetAllAttendance({
      search: search as string | undefined,
      department: department as string | undefined,
      status: status as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Error getting admin attendance records:', error);
    res.status(500).json({ error: 'Failed to get attendance records' });
  }
});

/**
 * @swagger
 * /api/admin/attendance/records:
 *   put:
 *     summary: Upsert an attendance record (create or update)
 *     tags: [Admin Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, date]
 *             properties:
 *               employeeId: { type: string, format: uuid }
 *               date: { type: string, format: date }
 *               clockIn: { type: string, format: date-time }
 *               clockOut: { type: string, format: date-time }
 *               status: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Upserted attendance record
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.put('/records', async (req: Request, res: Response) => {
  try {
    const { employeeId, date, clockIn, clockOut, status, notes } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ error: 'employeeId and date are required' });
    }

    const record = await AttendanceService.adminUpsertAttendance({
      employeeId,
      date,
      clockIn,
      clockOut,
      status,
      notes,
      modifiedBy: req.user!.userId,
    });

    res.json(record);
  } catch (error: unknown) {
    console.error('Error upserting attendance:', error);
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to upsert attendance record') });
  }
});

/**
 * @swagger
 * /api/admin/attendance/records/{id}:
 *   delete:
 *     summary: Delete an attendance record
 *     tags: [Admin Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Attendance record ID
 *     responses:
 *       200:
 *         description: Attendance record deleted
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
router.delete('/records/:id', async (req: Request, res: Response) => {
  try {
    await AttendanceService.adminDeleteAttendance(req.params.id);
    res.json({ message: 'Attendance record deleted' });
  } catch (error: unknown) {
    console.error('Error deleting attendance:', error);
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to delete attendance record') });
  }
});

/**
 * @swagger
 * /api/admin/attendance/analytics:
 *   get:
 *     summary: Get attendance trend and late arrivals analytics
 *     tags: [Admin Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 7, maximum: 90, default: 14 }
 *         description: Number of days to include in the trend (clamped to 7–90)
 *     responses:
 *       200:
 *         description: Attendance trend and late arrivals data
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;
    const data = await AttendanceService.getAnalytics(Math.min(Math.max(days, 7), 90));
    res.json(data);
  } catch (error: unknown) {
    console.error('Error getting attendance analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;
