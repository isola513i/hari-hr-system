import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, requireAdminOrManager, requireRole } from '../middlewares/auth';
import WFHRequestService from '../services/WFHRequestService';
import { apiLimiter } from '../middlewares/security';
import { safeErrorMessage } from '../utils/errorResponse';
import { query } from '../db';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/wfh-requests:
 *   post:
 *     summary: Submit a WFH request
 *     tags: [WFH Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date]
 *             properties:
 *               date: { type: string, format: date, description: "WFH date (YYYY-MM-DD)" }
 *               reason: { type: string, description: "Optional reason for WFH" }
 *     responses:
 *       201:
 *         description: WFH request created successfully
 *       400: { description: Validation error or missing date }
 *       401: { description: Unauthorized }
 */
router.post('/', apiLimiter, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(400).json({ error: 'Employee ID not found' });

    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const request = await WFHRequestService.create({ employeeId, date, reason });
    res.status(201).json(request);
  } catch (error: unknown) {
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to create WFH request') });
  }
});

/**
 * @swagger
 * /api/wfh-requests/my:
 *   get:
 *     summary: Get my WFH requests
 *     tags: [WFH Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of the authenticated employee's WFH requests
 *       400: { description: Employee ID not found }
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
router.get('/my', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return res.status(400).json({ error: 'Employee ID not found' });

    const requests = await WFHRequestService.getMyRequests(employeeId);
    res.json(requests);
  } catch (error: unknown) {
    res.status(500).json({ error: safeErrorMessage(error, 'Failed to get WFH requests') });
  }
});

/**
 * @swagger
 * /api/wfh-requests/admin:
 *   get:
 *     summary: List all WFH requests (admin/manager view)
 *     tags: [WFH Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, manager_approved, approved, rejected] }
 *         description: Filter by request status
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Filter by WFH date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of WFH requests (managers see only their direct reports)
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin or manager role required }
 *       500: { description: Internal server error }
 */
router.get('/admin', requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const role = (req as any).user?.role;
    const callerEmployeeId = (req as any).user?.employeeId as string | undefined;
    const myTeam = role === 'MANAGER';
    const { status, date } = req.query;
    const requests = await WFHRequestService.getAll({
      status: status as string | undefined,
      date: date as string | undefined,
      myTeam,
      callerEmployeeId,
    });
    res.json(requests);
  } catch (error: unknown) {
    res.status(500).json({ error: safeErrorMessage(error, 'Failed to get WFH requests') });
  }
});

/**
 * @swagger
 * /api/wfh-requests/{id}/manager-approve:
 *   put:
 *     summary: Manager first-tier approval of a WFH request
 *     tags: [WFH Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: WFH request ID
 *     responses:
 *       200:
 *         description: WFH request approved by manager
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — manager role required or not a direct report }
 *       404: { description: WFH request not found }
 */
router.put('/:id/manager-approve', requireRole('MANAGER'), async (req: Request, res: Response) => {
  try {
    const managerEmployeeId = (req as any).user?.employeeId;
    if (!managerEmployeeId) return res.status(403).json({ error: 'Employee profile required' });

    const request = await WFHRequestService.managerApprove(req.params.id, managerEmployeeId);
    res.json(request);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to approve WFH request';
    const status = msg.includes('not found') ? 404 : msg.includes('only') ? 403 : 400;
    res.status(status).json({ error: msg });
  }
});

/**
 * @swagger
 * /api/wfh-requests/{id}/approve:
 *   put:
 *     summary: HR Admin final approval of a WFH request
 *     tags: [WFH Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: WFH request ID
 *     responses:
 *       200:
 *         description: WFH request fully approved
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin role required }
 *       404: { description: WFH request not found }
 */
router.put('/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const reviewedById = req.user?.employeeId;
    if (!reviewedById) return res.status(400).json({ error: 'Reviewer ID not found' });

    const request = await WFHRequestService.approve(req.params.id, reviewedById);
    res.json(request);
  } catch (error: unknown) {
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to approve WFH request') });
  }
});

/**
 * @swagger
 * /api/wfh-requests/{id}/reject:
 *   put:
 *     summary: Reject a WFH request (admin or manager)
 *     tags: [WFH Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: WFH request ID
 *     responses:
 *       200:
 *         description: WFH request rejected
 *       400: { description: Validation error or request already approved }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin/manager role required or not a direct report }
 *       404: { description: WFH request not found }
 */
router.put('/:id/reject', requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const reviewedById = req.user?.employeeId;
    if (!reviewedById) return res.status(400).json({ error: 'Reviewer ID not found' });

    const role = (req as any).user?.role;
    if (role === 'MANAGER') {
      const wfhRow = await query('SELECT employee_id, status FROM wfh_requests WHERE id = $1', [req.params.id]);
      if (!wfhRow.rows[0]) return res.status(404).json({ error: 'WFH request not found' });
      if (wfhRow.rows[0].status === 'approved') {
        return res.status(400).json({ error: 'Cannot reject an already-approved WFH request' });
      }
      const empRow = await query('SELECT manager_id FROM employees WHERE id = $1', [wfhRow.rows[0].employee_id]);
      if (empRow.rows[0]?.manager_id !== reviewedById) {
        return res.status(403).json({ error: 'You can only reject requests from your direct reports' });
      }
    }

    const request = await WFHRequestService.reject(req.params.id, reviewedById);
    res.json(request);
  } catch (error: unknown) {
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to reject WFH request') });
  }
});

export default router;
