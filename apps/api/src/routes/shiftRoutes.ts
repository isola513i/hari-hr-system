import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/security';
import ShiftService from '../services/ShiftService';

const router = Router();

router.use(authenticateToken);

// ---------------------------------------------------------------------------
// Specific paths FIRST (before /:id wildcard routes)
// ---------------------------------------------------------------------------

// GET /api/shifts/schedule — weekly/range schedule (admin or manager)
router.get('/schedule', requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, department } = req.query as { startDate?: string; endDate?: string; department?: string };
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const assignments = await ShiftService.getSchedule(startDate, endDate, department);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// GET /api/shifts/my-schedule — employee's own upcoming schedule
router.get('/my-schedule', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(401).json({ error: 'Unauthorized' });
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const start = startDate ?? new Date().toISOString().slice(0, 10);
    const end = endDate ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const schedule = await ShiftService.getMySchedule(employeeId, start, end);
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching my schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// POST /api/shifts/assign — bulk assign (admin or manager)
router.post('/assign', apiLimiter, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const { employeeIds, shiftId, dates } = req.body as { employeeIds: string[]; shiftId: string; dates: string[] };
    if (!employeeIds?.length || !shiftId || !dates?.length) {
      return res.status(400).json({ error: 'employeeIds, shiftId, and dates are required' });
    }
    const createdBy = req.user?.userId ?? req.user?.employeeId ?? undefined;
    await ShiftService.assignShift(employeeIds, shiftId, dates, createdBy);
    res.json({ message: 'Shift assigned successfully' });
  } catch (error) {
    console.error('Error assigning shift:', error);
    res.status(500).json({ error: 'Failed to assign shift' });
  }
});

// DELETE /api/shifts/assignments/:id — remove one assignment (admin or manager)
router.delete('/assignments/:id', apiLimiter, requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    await ShiftService.removeAssignment(req.params.id);
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    console.error('Error removing assignment:', error);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

// ---------------------------------------------------------------------------
// Collection routes
// ---------------------------------------------------------------------------

// GET /api/shifts — list active shift templates (all authenticated)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const shifts = await ShiftService.listShifts();
    res.json(shifts);
  } catch (error) {
    console.error('Error listing shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// POST /api/shifts — create shift template (admin only)
router.post('/', apiLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, color } = req.body as { name: string; startTime: string; endTime: string; color?: string };
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: 'name, startTime, and endTime are required' });
    }
    const shift = await ShiftService.createShift({ name, startTime, endTime, color });
    res.status(201).json(shift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// ---------------------------------------------------------------------------
// /:id parameterized routes LAST
// ---------------------------------------------------------------------------

// PUT /api/shifts/:id — update shift template (admin only)
router.put('/:id', apiLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, startTime, endTime, color } = req.body as { name?: string; startTime?: string; endTime?: string; color?: string };
    const shift = await ShiftService.updateShift(req.params.id, { name, startTime, endTime, color });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    res.json(shift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

// DELETE /api/shifts/:id — deactivate shift template (admin only)
router.delete('/:id', apiLimiter, requireAdmin, async (req: Request, res: Response) => {
  try {
    await ShiftService.deleteShift(req.params.id);
    res.json({ message: 'Shift deactivated' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

export default router;
