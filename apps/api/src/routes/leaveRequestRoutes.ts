import { Router, Request, Response } from 'express';
import LeaveRequestController from '../controllers/LeaveRequestController';
import LeaveRequestService from '../services/LeaveRequestService';
import SystemConfigService from '../services/SystemConfigService';
import { generateLeaveRequestsPdf } from '../services/LeaveRequestPdfService';
import { apiLimiter, validateLeaveRequest, validateLeaveStatusUpdate, validateLeaveBulkUpdate, validateRequest } from '../middlewares/security';
import { authenticateToken, requireAdmin, requireAdminOrManager } from '../middlewares/auth';
import { cacheMiddleware, invalidateCache } from '../middlewares/cache';
import { medicalCertUpload } from '../middlewares/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/leave-requests:
 *   get:
 *     summary: List all leave requests
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of leave requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/LeaveRequest' }
 */
// GET /api/leave-requests - Get all leave requests (any authenticated user) - cached for 30s
router.get('/', cacheMiddleware(), LeaveRequestController.getAllLeaveRequests.bind(LeaveRequestController));

/**
 * @swagger
 * /api/leave-requests/export/pdf:
 *   get:
 *     summary: Export leave requests as a PDF (HR_ADMIN or MANAGER)
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF document
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 */

// GET /api/leave-requests/export/pdf - Export leave requests as a PDF (HR_ADMIN or MANAGER).
// Registered before '/:id' routes so 'export' isn't captured as an id param.
// Optional query filters: status, type.
router.get('/export/pdf', requireAdminOrManager, async (req: Request, res: Response) => {
    try {
        const { status, type } = req.query as Record<string, string>;
        let requests = await LeaveRequestService.getAllLeaveRequests();

        if (status) requests = requests.filter((r) => r.status === status);
        if (type) requests = requests.filter((r) => r.type === type);

        const filterSummary = [status && `Status: ${status}`, type && `Type: ${type}`].filter(Boolean).join('  •  ');
        const companyName = String(await SystemConfigService.getConfigValue('system', 'app_name', 'HARI HR System'));

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="leave-requests-${new Date().toISOString().split('T')[0]}.pdf"`);
        generateLeaveRequestsPdf(requests, res, { companyName, filterSummary: filterSummary || undefined });
    } catch (error) {
        console.error('Error exporting leave requests PDF:', error);
        res.status(500).json({ error: 'Failed to export leave requests PDF' });
    }
});

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
