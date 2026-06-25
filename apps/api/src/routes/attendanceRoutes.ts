import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, requireOwnerOrAdmin } from '../middlewares/auth';
import AttendanceService from '../services/AttendanceService';
import { apiLimiter, validateClockIn, validateRequest } from '../middlewares/security';
import { emitAttendanceUpdated } from '../socket';
import { safeErrorMessage } from '../utils/errorResponse';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/attendance/clock-in:
 *   post:
 *     summary: Clock in for the current user
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string, maxLength: 500 }
 *               latitude: { type: number, format: float }
 *               longitude: { type: number, format: float }
 *               accuracy: { type: number, format: float, description: GPS accuracy in metres }
 *     responses:
 *       201: { description: Clock-in recorded }
 *       400: { description: Validation error or outside geofence }
 */
router.post('/clock-in', apiLimiter, validateClockIn, validateRequest, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID not found' });
    }

    // Extract real client IP (handles reverse proxies / load balancers)
    const clientIp = (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] as string ||
      req.socket.remoteAddress ||
      ''
    ).replace(/^::ffff:/, ''); // normalise IPv4-mapped IPv6

    const attendance = await AttendanceService.clockIn({
      employeeId,
      notes: req.body.notes,
      latitude: req.body.latitude != null ? parseFloat(req.body.latitude) : undefined,
      longitude: req.body.longitude != null ? parseFloat(req.body.longitude) : undefined,
      accuracy: req.body.accuracy != null ? parseFloat(req.body.accuracy) : undefined,
      clientIp,
    });

    emitAttendanceUpdated(attendance);
    res.status(201).json(attendance);
  } catch (error: unknown) {
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to clock in') });
  }
});

/**
 * @swagger
 * /api/attendance/clock-out:
 *   post:
 *     summary: Clock out for the current user
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Clock-out recorded }
 *       400: { description: Not clocked in or validation error }
 */
router.post('/clock-out', apiLimiter, validateClockIn, validateRequest, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID not found' });
    }

    const attendance = await AttendanceService.clockOut({
      employeeId,
      notes: req.body.notes,
    });

    emitAttendanceUpdated(attendance);
    res.json(attendance);
  } catch (error: unknown) {
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to clock out') });
  }
});

/**
 * GET /api/attendance/today
 * Get today's attendance status for current user
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID not found' });
    }

    const attendance = await AttendanceService.getTodayStatus(employeeId);
    res.json(attendance || { status: 'Not clocked in' });
  } catch (error: unknown) {
    console.error('Error getting today status:', error);
    res.status(500).json({ error: 'Failed to get attendance status' });
  }
});

/**
 * GET /api/attendance/my-history
 * Get attendance history for current user
 */
router.get('/my-history', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID not found' });
    }

    const { startDate, endDate } = req.query;
    const attendance = await AttendanceService.getAttendanceByEmployee(
      employeeId,
      startDate as string,
      endDate as string
    );

    res.json(attendance);
  } catch (error: unknown) {
    console.error('Error getting attendance history:', error);
    res.status(500).json({ error: 'Failed to get attendance history' });
  }
});

/**
 * GET /api/attendance/employee/:employeeId
 * Get attendance for a specific employee (admin or self)
 */
router.get(
  '/employee/:employeeId',
  requireOwnerOrAdmin((req) => req.params.employeeId),
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      const attendance = await AttendanceService.getAttendanceByEmployee(
        employeeId,
        startDate as string,
        endDate as string
      );

      res.json(attendance);
    } catch (error: unknown) {
      console.error('Error getting employee attendance:', error);
      res.status(500).json({ error: 'Failed to get attendance' });
    }
  }
);

/**
 * GET /api/attendance/summary/:employeeId
 * Get attendance summary for an employee
 */
router.get(
  '/summary/:employeeId',
  requireOwnerOrAdmin((req) => req.params.employeeId),
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const summary = await AttendanceService.getAttendanceSummary(
        employeeId,
        startDate as string,
        endDate as string
      );

      res.json(summary);
    } catch (error: unknown) {
      console.error('Error getting attendance summary:', error);
      res.status(500).json({ error: 'Failed to get attendance summary' });
    }
  }
);

export default router;
