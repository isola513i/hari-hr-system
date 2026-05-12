import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';
import WFHRequestService from '../services/WFHRequestService';
import { apiLimiter } from '../middlewares/security';
import { safeErrorMessage } from '../utils/errorResponse';

const router = Router();

router.use(authenticateToken);

/**
 * POST /api/wfh-requests
 * Employee submits a WFH request
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
 * GET /api/wfh-requests/my
 * Employee views their own WFH requests
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
 * GET /api/wfh-requests/admin
 * Admin/Manager views WFH requests (manager sees only their direct reports)
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
 * PUT /api/wfh-requests/:id/manager-approve
 * Manager gives first-tier approval for a WFH request (direct reports only)
 */
router.put('/:id/manager-approve', requireAdminOrManager, async (req: Request, res: Response) => {
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
 * PUT /api/wfh-requests/:id/approve
 * HR Admin gives final approval for a WFH request
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
 * PUT /api/wfh-requests/:id/reject
 * Admin or Manager rejects a WFH request
 */
router.put('/:id/reject', requireAdminOrManager, async (req: Request, res: Response) => {
  try {
    const reviewedById = req.user?.employeeId;
    if (!reviewedById) return res.status(400).json({ error: 'Reviewer ID not found' });

    const request = await WFHRequestService.reject(req.params.id, reviewedById);
    res.json(request);
  } catch (error: unknown) {
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to reject WFH request') });
  }
});

export default router;
