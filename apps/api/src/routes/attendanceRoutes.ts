import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, requireOwnerOrAdmin } from '../middlewares/auth';
import AttendanceService from '../services/AttendanceService';
import { apiLimiter } from '../middlewares/security';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/attendance/clock-in
 * Clock in for the current user
 */
router.post('/clock-in', apiLimiter, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID not found' });
    }

    const attendance = await AttendanceService.clockIn({
      employeeId,
      notes: req.body.notes,
    });

    res.status(201).json(attendance);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clock in';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/attendance/clock-out
 * Clock out for the current user
 */
router.post('/clock-out', apiLimiter, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID not found' });
    }

    const attendance = await AttendanceService.clockOut({
      employeeId,
      notes: req.body.notes,
    });

    res.json(attendance);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to clock out';
    res.status(400).json({ error: message });
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
