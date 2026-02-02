import { Router } from 'express';
import LeaveRequestController from '../controllers/LeaveRequestController';
import { apiLimiter, validateLeaveRequest, validateRequest } from '../middlewares/security';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/leave-requests - Get all leave requests (any authenticated user)
router.get('/', LeaveRequestController.getAllLeaveRequests.bind(LeaveRequestController));

// POST /api/leave-requests - Create leave request (any authenticated user can create their own)
router.post(
    '/',
    apiLimiter,
    validateLeaveRequest,
    validateRequest,
    LeaveRequestController.createLeaveRequest.bind(LeaveRequestController)
);

// PATCH /api/leave-requests/:id - Update leave request status (HR_ADMIN only - for approval/rejection)
router.patch('/:id', requireAdmin, apiLimiter, LeaveRequestController.updateLeaveRequest.bind(LeaveRequestController));

// DELETE /api/leave-requests/:id - Delete leave request (HR_ADMIN only)
router.delete('/:id', requireAdmin, apiLimiter, LeaveRequestController.deleteLeaveRequest.bind(LeaveRequestController));

// GET /api/leave-balances/:employeeId - Get leave balances for employee (any authenticated user)
router.get('/balances/:employeeId', LeaveRequestController.getLeaveBalances.bind(LeaveRequestController));

export default router;
