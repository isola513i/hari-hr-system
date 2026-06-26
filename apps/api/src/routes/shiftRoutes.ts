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
/**
 * @swagger
 * /api/shifts/schedule:
 *   get:
 *     summary: Get weekly or date-range shift schedule
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Start of the schedule range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *         description: End of the schedule range (YYYY-MM-DD)
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *         description: Filter assignments by department
 *     responses:
 *       200:
 *         description: List of shift assignments for the requested range
 *       400: { description: startDate and endDate are required }
 *       401: { description: Unauthorized }
 */
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
/**
 * @swagger
 * /api/shifts/my-schedule:
 *   get:
 *     summary: Get the authenticated employee's upcoming shift schedule
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Start of the range (defaults to today)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: End of the range (defaults to 14 days from today)
 *     responses:
 *       200:
 *         description: Shift assignments for the current employee
 *       401: { description: Unauthorized }
 */
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
/**
 * @swagger
 * /api/shifts/assign:
 *   post:
 *     summary: Bulk-assign a shift to one or more employees on specified dates
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeIds, shiftId, dates]
 *             properties:
 *               employeeIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: IDs of employees to assign
 *               shiftId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the shift template to assign
 *               dates:
 *                 type: array
 *                 items: { type: string, format: date }
 *                 description: Dates on which to assign the shift (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Shift assigned successfully
 *       400: { description: employeeIds, shiftId, and dates are required }
 *       401: { description: Unauthorized }
 */
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
/**
 * @swagger
 * /api/shifts/assignments/{id}:
 *   delete:
 *     summary: Remove a single shift assignment
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the shift assignment to remove
 *     responses:
 *       200:
 *         description: Assignment removed
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
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
/**
 * @swagger
 * /api/shifts:
 *   get:
 *     summary: List all active shift templates
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of active shift templates
 *       401: { description: Unauthorized }
 */
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
/**
 * @swagger
 * /api/shifts:
 *   post:
 *     summary: Create a new shift template
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, startTime, endTime]
 *             properties:
 *               name: { type: string, description: Display name of the shift }
 *               startTime: { type: string, example: "08:00", description: Shift start time (HH:mm) }
 *               endTime: { type: string, example: "17:00", description: Shift end time (HH:mm) }
 *               color: { type: string, example: "#3B82F6", description: Optional hex color for calendar display }
 *     responses:
 *       201:
 *         description: Shift template created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
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
/**
 * @swagger
 * /api/shifts/{id}:
 *   put:
 *     summary: Update an existing shift template
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the shift template to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               startTime: { type: string, example: "08:00" }
 *               endTime: { type: string, example: "17:00" }
 *               color: { type: string, example: "#3B82F6" }
 *     responses:
 *       200:
 *         description: Updated shift template
 *       401: { description: Unauthorized }
 *       404: { description: Shift not found }
 */
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
/**
 * @swagger
 * /api/shifts/{id}:
 *   delete:
 *     summary: Deactivate a shift template
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID of the shift template to deactivate
 *     responses:
 *       200:
 *         description: Shift deactivated
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
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
