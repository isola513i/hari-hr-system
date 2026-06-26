import { Router } from 'express';
import OTRequestController from '../controllers/OTRequestController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

/**
 * @swagger
 * /api/ot-requests:
 *   post:
 *     summary: Create a new OT request
 *     tags: [OT Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, plannedStart, plannedEnd, plannedHours, reason]
 *             properties:
 *               date: { type: string, format: date, description: "OT date (YYYY-MM-DD)" }
 *               plannedStart: { type: string, description: "Planned start time (HH:mm)" }
 *               plannedEnd: { type: string, description: "Planned end time (HH:mm)" }
 *               plannedHours: { type: number, description: "Total planned OT hours" }
 *               otType: { type: string, description: "Type of OT (e.g. weekday, weekend, holiday)" }
 *               reason: { type: string, description: "Reason for the OT request" }
 *     responses:
 *       201:
 *         description: OT request created successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Employee profile required }
 */
router.post('/', OTRequestController.create.bind(OTRequestController));

/**
 * @swagger
 * /api/ot-requests/my:
 *   get:
 *     summary: Get the authenticated employee's own OT requests
 *     tags: [OT Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by request status (pending, approved, rejected, cancelled)
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: Filter by month (YYYY-MM)
 *     responses:
 *       200:
 *         description: List of the employee's OT requests
 *       401: { description: Unauthorized }
 *       403: { description: Employee profile required }
 */
router.get('/my', OTRequestController.getMyRequests.bind(OTRequestController));

/**
 * @swagger
 * /api/ot-requests/stats:
 *   get:
 *     summary: Get OT request statistics (admin only)
 *     tags: [OT Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: Filter stats by month (YYYY-MM)
 *     responses:
 *       200:
 *         description: OT statistics summary
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin access required }
 */
router.get('/stats', requireAdmin, OTRequestController.getStats.bind(OTRequestController));

/**
 * @swagger
 * /api/ot-requests:
 *   get:
 *     summary: Get all OT requests (admin only)
 *     tags: [OT Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by request status (pending, approved, rejected, cancelled)
 *       - in: query
 *         name: employeeName
 *         schema: { type: string }
 *         description: Filter by employee name (partial match)
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: Filter by month (YYYY-MM)
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: List of all OT requests
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin access required }
 */
router.get('/', requireAdmin, OTRequestController.getAll.bind(OTRequestController));

/**
 * @swagger
 * /api/ot-requests/{id}/approve:
 *   put:
 *     summary: Approve an OT request (admin only)
 *     tags: [OT Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: OT request ID
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
 *         description: OT request approved successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin access required }
 *       404: { description: OT request not found }
 */
router.put('/:id/approve', requireAdmin, OTRequestController.approve.bind(OTRequestController));

/**
 * @swagger
 * /api/ot-requests/{id}/reject:
 *   put:
 *     summary: Reject an OT request (admin only)
 *     tags: [OT Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: OT request ID
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
 *         description: OT request rejected successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin access required }
 *       404: { description: OT request not found }
 */
router.put('/:id/reject', requireAdmin, OTRequestController.reject.bind(OTRequestController));

/**
 * @swagger
 * /api/ot-requests/{id}:
 *   delete:
 *     summary: Cancel an OT request
 *     tags: [OT Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: OT request ID
 *     responses:
 *       200:
 *         description: OT request cancelled successfully
 *       401: { description: Unauthorized }
 *       403: { description: Employee profile required }
 *       404: { description: OT request not found }
 */
router.delete('/:id', OTRequestController.cancel.bind(OTRequestController));

export default router;
