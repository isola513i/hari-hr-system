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

/**
 * @swagger
 * /api/leave-requests:
 *   post:
 *     summary: Create a new leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateLeaveRequest'
 *     responses:
 *       201:
 *         description: Leave request created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveRequest'
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
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

/**
 * @swagger
 * /api/leave-requests/{id}:
 *   put:
 *     summary: Edit own leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateLeaveRequest'
 *     responses:
 *       200:
 *         description: Leave request updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveRequest'
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// PUT /api/leave-requests/:id - Edit own leave request (any authenticated user)
router.put(
    '/:id',
    apiLimiter,
    medicalCertUpload.single('medicalCertificate'),
    invalidateCache('/api/leave-requests'),
    LeaveRequestController.editLeaveRequest.bind(LeaveRequestController)
);

/**
 * @swagger
 * /api/leave-requests/bulk:
 *   patch:
 *     summary: Bulk approve or reject leave requests (HR_ADMIN or MANAGER)
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, status]
 *             properties:
 *               ids: { type: array, items: { type: string, format: uuid } }
 *               status: { type: string, enum: [APPROVED, REJECTED] }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Bulk update applied
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
// PATCH /api/leave-requests/bulk - Bulk approve/reject (HR_ADMIN or MANAGER)
// MUST be registered before '/:id' so 'bulk' isn't captured as an id param.
router.patch('/bulk', requireAdminOrManager, apiLimiter, validateLeaveBulkUpdate, validateRequest, invalidateCache('/api/leave-requests'), LeaveRequestController.bulkUpdateLeaveRequests.bind(LeaveRequestController));

/**
 * @swagger
 * /api/leave-requests/{id}:
 *   patch:
 *     summary: Update leave request status (approve or reject) — HR_ADMIN or MANAGER
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [APPROVED, REJECTED] }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Leave request status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveRequest'
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// PATCH /api/leave-requests/:id - Update leave request status (HR_ADMIN only - for approval/rejection)
router.patch('/:id', requireAdminOrManager, apiLimiter, validateLeaveStatusUpdate, validateRequest, invalidateCache('/api/leave-requests'), LeaveRequestController.updateLeaveRequest.bind(LeaveRequestController));

/**
 * @swagger
 * /api/leave-requests/{id}/cancel:
 *   post:
 *     summary: Request cancellation of own leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cancellation request submitted
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// POST /api/leave-requests/:id/cancel - Cancel own leave request (any authenticated user)
router.post('/:id/cancel', apiLimiter, invalidateCache('/api/leave-requests'), LeaveRequestController.cancelLeaveRequest.bind(LeaveRequestController));

/**
 * @swagger
 * /api/leave-requests/{id}/cancel-decision:
 *   post:
 *     summary: Approve or reject a cancellation request — HR_ADMIN or MANAGER
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [approved]
 *             properties:
 *               approved: { type: boolean }
 *               comment: { type: string }
 *     responses:
 *       200:
 *         description: Cancel decision recorded
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// POST /api/leave-requests/:id/cancel-decision - Approve/reject cancel request (HR_ADMIN only)
router.post('/:id/cancel-decision', requireAdminOrManager, apiLimiter, invalidateCache('/api/leave-requests'), LeaveRequestController.handleCancelDecision.bind(LeaveRequestController));

/**
 * @swagger
 * /api/leave-requests/{id}/medical-certificate:
 *   get:
 *     summary: Download the medical certificate for a leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Medical certificate file
 *         content:
 *           application/octet-stream:
 *             schema: { type: string, format: binary }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// GET /api/leave-requests/:id/medical-certificate - Download medical certificate
router.get('/:id/medical-certificate', LeaveRequestController.downloadMedicalCertificate.bind(LeaveRequestController));

/**
 * @swagger
 * /api/leave-requests/{id}:
 *   delete:
 *     summary: Delete a leave request — HR_ADMIN only
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Leave request deleted
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 */
// DELETE /api/leave-requests/:id - Delete leave request (HR_ADMIN only)
router.delete('/:id', requireAdmin, apiLimiter, invalidateCache('/api/leave-requests'), LeaveRequestController.deleteLeaveRequest.bind(LeaveRequestController));

/**
 * @swagger
 * /api/leave-requests/balances/{employeeId}:
 *   get:
 *     summary: Get leave balances for an employee
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Leave balance data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveBalance'
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// GET /api/leave-balances/:employeeId - Get leave balances for employee (any authenticated user) - cached for 60s
router.get('/balances/:employeeId', cacheMiddleware(60000), LeaveRequestController.getLeaveBalances.bind(LeaveRequestController));

export default router;
