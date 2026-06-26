import { Router } from 'express';
import { authenticateToken, requireAdmin, requireAdminOrManager, requireRole } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/security';
import AttendanceRegularizationController from '../controllers/AttendanceRegularizationController';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/attendance-regularization:
 *   post:
 *     summary: Submit an attendance correction request
 *     tags: [Attendance Regularization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, reason]
 *             properties:
 *               date: { type: string, format: date, description: "Date of the attendance record to correct (YYYY-MM-DD)" }
 *               requestedClockIn: { type: string, description: "Requested clock-in time (HH:mm or ISO)" }
 *               requestedClockOut: { type: string, description: "Requested clock-out time (HH:mm or ISO)" }
 *               reason: { type: string, description: "Reason for the correction request" }
 *     responses:
 *       201:
 *         description: Regularization request created successfully
 *       400: { description: Validation error — date and reason are required }
 *       401: { description: Unauthorized }
 *       403: { description: Employee profile required }
 */
// Employee submits a correction request
router.post('/', apiLimiter, AttendanceRegularizationController.create.bind(AttendanceRegularizationController));

/**
 * @swagger
 * /api/attendance-regularization/my:
 *   get:
 *     summary: Get my attendance regularization requests
 *     tags: [Attendance Regularization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by request status (e.g. PENDING, APPROVED, REJECTED)
 *     responses:
 *       200:
 *         description: List of the authenticated employee's regularization requests
 *       401: { description: Unauthorized }
 *       403: { description: Employee profile required }
 */
// Employee views their own requests
router.get('/my', AttendanceRegularizationController.getMyRequests.bind(AttendanceRegularizationController));

/**
 * @swagger
 * /api/attendance-regularization/admin:
 *   get:
 *     summary: List all regularization requests (admin sees all; manager sees direct reports only)
 *     tags: [Attendance Regularization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by request status (e.g. PENDING, APPROVED, REJECTED)
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Filter by correction date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of attendance regularization requests
 *       401: { description: Unauthorized }
 *       403: { description: Admin or Manager role required }
 */
// Admin/Manager views requests (manager sees only their direct reports)
router.get('/admin', requireAdminOrManager, AttendanceRegularizationController.getAll.bind(AttendanceRegularizationController));

/**
 * @swagger
 * /api/attendance-regularization/{id}/manager-approve:
 *   put:
 *     summary: Manager first-tier approval of a regularization request (direct reports only)
 *     tags: [Attendance Regularization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Regularization request ID
 *     responses:
 *       200:
 *         description: Request approved by manager
 *       400: { description: Invalid request state }
 *       401: { description: Unauthorized }
 *       403: { description: Manager role required or not a direct report }
 *       404: { description: Request not found }
 */
// Manager first-tier approval (direct reports only)
router.put('/:id/manager-approve', requireRole('MANAGER'), AttendanceRegularizationController.managerApprove.bind(AttendanceRegularizationController));

/**
 * @swagger
 * /api/attendance-regularization/{id}/approve:
 *   put:
 *     summary: HR Admin final approval — applies the correction to attendance records
 *     tags: [Attendance Regularization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Regularization request ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string, description: "Optional reviewer notes" }
 *     responses:
 *       200:
 *         description: Request fully approved and attendance record corrected
 *       401: { description: Unauthorized }
 *       403: { description: Admin role required }
 *       404: { description: Request not found }
 */
// HR Admin final approval — applies the correction to attendance_records
router.put('/:id/approve', requireAdmin, AttendanceRegularizationController.approve.bind(AttendanceRegularizationController));

/**
 * @swagger
 * /api/attendance-regularization/{id}/reject:
 *   put:
 *     summary: Reject an attendance regularization request
 *     tags: [Attendance Regularization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Regularization request ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string, description: "Optional rejection reason / reviewer notes" }
 *     responses:
 *       200:
 *         description: Request rejected successfully
 *       401: { description: Unauthorized }
 *       403: { description: Admin or Manager role required }
 *       404: { description: Request not found }
 */
// Admin or Manager rejection
router.put('/:id/reject', requireAdminOrManager, AttendanceRegularizationController.reject.bind(AttendanceRegularizationController));

/**
 * @swagger
 * /api/attendance-regularization/{id}:
 *   delete:
 *     summary: Cancel a pending attendance regularization request
 *     tags: [Attendance Regularization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Regularization request ID
 *     responses:
 *       200:
 *         description: Regularization request cancelled
 *       401: { description: Unauthorized }
 *       403: { description: Employee profile required }
 *       404: { description: Request not found }
 */
// Employee cancels their own pending request
router.delete('/:id', AttendanceRegularizationController.cancel.bind(AttendanceRegularizationController));

export default router;
