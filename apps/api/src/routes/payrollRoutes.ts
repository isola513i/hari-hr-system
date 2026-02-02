import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, requireOwnerOrAdmin } from '../middlewares/auth';
import PayrollService from '../services/PayrollService';
import { apiLimiter } from '../middlewares/security';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/payroll
 * Create a new payroll record (admin only)
 */
router.post('/', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    const payroll = await PayrollService.createPayroll(req.body);
    res.status(201).json(payroll);
  } catch (error: unknown) {
    console.error('Error creating payroll:', error);
    const message = error instanceof Error ? error.message : 'Failed to create payroll';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/payroll/my-payslips
 * Get payroll history for current user
 */
router.get('/my-payslips', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID not found' });
    }

    const limit = parseInt(req.query.limit as string, 10) || 12;
    const payroll = await PayrollService.getPayrollByEmployee(employeeId, limit);

    res.json(payroll);
  } catch (error: unknown) {
    console.error('Error getting payslips:', error);
    res.status(500).json({ error: 'Failed to get payslips' });
  }
});

/**
 * GET /api/payroll/employee/:employeeId
 * Get payroll for a specific employee (admin or self)
 */
router.get(
  '/employee/:employeeId',
  requireOwnerOrAdmin((req) => req.params.employeeId),
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 12;

      const payroll = await PayrollService.getPayrollByEmployee(employeeId, limit);
      res.json(payroll);
    } catch (error: unknown) {
      console.error('Error getting employee payroll:', error);
      res.status(500).json({ error: 'Failed to get payroll' });
    }
  }
);

/**
 * GET /api/payroll/:id
 * Get a specific payroll record
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const payroll = await PayrollService.getPayrollById(req.params.id);

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // Check if user can access this payroll
    const isOwner = req.user?.employeeId === payroll.employeeId;
    const isAdmin = req.user?.role === 'HR_ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payroll);
  } catch (error: unknown) {
    console.error('Error getting payroll:', error);
    res.status(500).json({ error: 'Failed to get payroll' });
  }
});

/**
 * PATCH /api/payroll/:id/status
 * Update payroll status (admin only)
 */
router.patch('/:id/status', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { status, paymentMethod } = req.body;

    if (!['Pending', 'Processed', 'Paid'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const payroll = await PayrollService.updatePayrollStatus(req.params.id, status, paymentMethod);
    res.json(payroll);
  } catch (error: unknown) {
    console.error('Error updating payroll status:', error);
    const message = error instanceof Error ? error.message : 'Failed to update payroll';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/payroll/summary
 * Get payroll summary for a period (admin only)
 */
router.get('/reports/summary', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const summary = await PayrollService.getPayrollSummary(
      startDate as string,
      endDate as string
    );

    res.json(summary);
  } catch (error: unknown) {
    console.error('Error getting payroll summary:', error);
    res.status(500).json({ error: 'Failed to get payroll summary' });
  }
});

/**
 * POST /api/payroll/salary/:employeeId
 * Update employee salary (admin only)
 */
router.post('/salary/:employeeId', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { newSalary, changeReason } = req.body;

    if (!newSalary || !changeReason) {
      return res.status(400).json({ error: 'newSalary and changeReason are required' });
    }

    const salaryHistory = await PayrollService.updateSalary(
      employeeId,
      newSalary,
      changeReason,
      req.user?.employeeId ?? undefined
    );

    res.status(201).json(salaryHistory);
  } catch (error: unknown) {
    console.error('Error updating salary:', error);
    const message = error instanceof Error ? error.message : 'Failed to update salary';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/payroll/salary/:employeeId/history
 * Get salary history for an employee (admin or self)
 */
router.get(
  '/salary/:employeeId/history',
  requireOwnerOrAdmin((req) => req.params.employeeId),
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const history = await PayrollService.getSalaryHistory(employeeId);
      res.json(history);
    } catch (error: unknown) {
      console.error('Error getting salary history:', error);
      res.status(500).json({ error: 'Failed to get salary history' });
    }
  }
);

export default router;
