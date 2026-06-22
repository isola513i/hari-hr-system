import { Router } from 'express';
import LeaveRequestController from '../controllers/LeaveRequestController';
import { apiLimiter, validateLeaveRequest, validateLeaveStatusUpdate, validateLeaveBulkUpdate, validateRequest } from '../middlewares/security';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';
import { cacheMiddleware, invalidateCache } from '../middlewares/cache';
import { medicalCertUpload } from '../middlewares/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/leave-requests - Get all leave requests (any authenticated user) - cached for 30s
router.get('/', cacheMiddleware(), LeaveRequestController.getAllLeaveRequests.bind(LeaveRequestController));

// POST /api/leave-requests - Create leave request (any authenticated user can create their own)
// multer runs BEFORE validators so req.body is populated from multipart fields
router.post(
    '/',
    apiLimiter,
    medicalCertUpload.single('medicalCertificate'),
    validateLeaveRequest,
    validateRequest,
    invalidateCache('/api/leave-requests'),
    LeaveRequestController.createLeaveRequest.bind(LeaveRequestController)
);

// PUT /api/leave-requests/:id - Edit own leave request (any authenticated user)
router.put(
    '/:id',
    apiLimiter,
    medicalCertUpload.single('medicalCertificate'),
    invalidateCache('/api/leave-requests'),
    LeaveRequestController.editLeaveRequest.bind(LeaveRequestController)
);

// PATCH /api/leave-requests/bulk - Bulk approve/reject (HR_ADMIN or MANAGER)
// MUST be registered before '/:id' so 'bulk' isn't captured as an id param.
router.patch('/bulk', requireAdminOrManager, apiLimiter, validateLeaveBulkUpdate, validateRequest, invalidateCache('/api/leave-requests'), LeaveRequestController.bulkUpdateLeaveRequests.bind(LeaveRequestController));

// PATCH /api/leave-requests/:id - Update leave request status (HR_ADMIN only - for approval/rejection)
router.patch('/:id', requireAdminOrManager, apiLimiter, validateLeaveStatusUpdate, validateRequest, invalidateCache('/api/leave-requests'), LeaveRequestController.updateLeaveRequest.bind(LeaveRequestController));

// POST /api/leave-requests/:id/cancel - Cancel own leave request (any authenticated user)
router.post('/:id/cancel', apiLimiter, invalidateCache('/api/leave-requests'), LeaveRequestController.cancelLeaveRequest.bind(LeaveRequestController));

// POST /api/leave-requests/:id/cancel-decision - Approve/reject cancel request (HR_ADMIN only)
router.post('/:id/cancel-decision', requireAdminOrManager, apiLimiter, invalidateCache('/api/leave-requests'), LeaveRequestController.handleCancelDecision.bind(LeaveRequestController));

// GET /api/leave-requests/:id/medical-certificate - Download medical certificate
router.get('/:id/medical-certificate', LeaveRequestController.downloadMedicalCertificate.bind(LeaveRequestController));

// DELETE /api/leave-requests/:id - Delete leave request (HR_ADMIN only)
router.delete('/:id', requireAdmin, apiLimiter, invalidateCache('/api/leave-requests'), LeaveRequestController.deleteLeaveRequest.bind(LeaveRequestController));

// GET /api/leave-balances/:employeeId - Get leave balances for employee (any authenticated user) - cached for 60s
router.get('/balances/:employeeId', cacheMiddleware(60000), LeaveRequestController.getLeaveBalances.bind(LeaveRequestController));

export default router;
