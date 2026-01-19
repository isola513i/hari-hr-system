import { Router } from 'express';
import LeaveRequestController from '../controllers/LeaveRequestController';
import { apiLimiter, validateLeaveRequest, validateRequest } from '../middlewares/security';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/leave-requests - Get all leave requests
router.get('/', LeaveRequestController.getAllLeaveRequests.bind(LeaveRequestController));

// POST /api/leave-requests - Create leave request
router.post(
    '/',
    apiLimiter,
    validateLeaveRequest,
    validateRequest,
    LeaveRequestController.createLeaveRequest.bind(LeaveRequestController)
);

// PATCH /api/leave-requests/:id - Update leave request status (changed from PUT for backward compatibility)
router.patch('/:id', apiLimiter, LeaveRequestController.updateLeaveRequest.bind(LeaveRequestController));

// DELETE /api/leave-requests/:id - Delete leave request
router.delete('/:id', apiLimiter, LeaveRequestController.deleteLeaveRequest.bind(LeaveRequestController));

// GET /api/leave-balances/:employeeId - Get leave balances for employee
router.get('/balances/:employeeId', LeaveRequestController.getLeaveBalances.bind(LeaveRequestController));

export default router;
