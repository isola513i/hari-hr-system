import { Router } from 'express';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken, requireAdmin, requireAdminOrFinance, requireRole } from '../middlewares/auth';
import { cacheMiddleware, invalidateCache } from '../middlewares/cache';
import { receiptUpload, generateStorageKey, getFileBuffer } from '../middlewares/upload';
import { storageService } from '../services/StorageService';
import ExpenseClaimService from '../services/ExpenseClaimService';
import NotificationService from '../services/NotificationService';
import { emitExpenseClaimCreated, emitExpenseClaimUpdated, emitExpenseClaimDeleted } from '../socket';
import { query } from '../db';
import { safeErrorMessage } from '../utils/errorResponse';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/expense-claims:
 *   get:
 *     summary: List all expense claims
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of all expense claims
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
// GET /api/expense-claims - Get all expense claims (cached)
router.get('/', cacheMiddleware(), async (_req, res) => {
    try {
        const claims = await ExpenseClaimService.getAllExpenseClaims();
        res.json(claims);
    } catch (error: any) {
        console.error('Error fetching expense claims:', error);
        res.status(500).json({ error: 'Failed to fetch expense claims' });
    }
});

/**
 * @swagger
 * /api/expense-claims/summary/{employeeId}:
 *   get:
 *     summary: Get expense claim summary for an employee
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: The employee's UUID
 *     responses:
 *       200:
 *         description: Expense summary totals and counts for the employee
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
// GET /api/expense-claims/summary/:employeeId - Employee summary (cached 60s)
router.get('/summary/:employeeId', cacheMiddleware(60000), async (req, res) => {
    try {
        const { employeeId } = req.params;
        const summary = await ExpenseClaimService.getEmployeeSummary(employeeId);
        res.json(summary);
    } catch (error: any) {
        console.error('Error fetching employee expense summary:', error);
        res.status(500).json({ error: 'Failed to fetch expense summary' });
    }
});

/**
 * @swagger
 * /api/expense-claims/manager-queue:
 *   get:
 *     summary: Get pending expense claims for manager's direct reports
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending claims awaiting manager review
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — Manager or HR_ADMIN role required }
 *       500: { description: Internal server error }
 */
// GET /api/expense-claims/manager-queue - Manager sees direct reports' pending claims
router.get('/manager-queue', requireRole('MANAGER', 'HR_ADMIN'), async (req, res) => {
    try {
        const user = (req as any).user;
        const claims = await ExpenseClaimService.getManagerQueue(user.employeeId);
        res.json(claims);
    } catch (error: any) {
        console.error('Error fetching manager expense queue:', error);
        res.status(500).json({ error: 'Failed to fetch expense queue' });
    }
});

/**
 * @swagger
 * /api/expense-claims/admin/summary:
 *   get:
 *     summary: Get organisation-wide expense claim summary (Admin/Finance only)
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated totals and status breakdown across all employees
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — Admin or Finance role required }
 *       500: { description: Internal server error }
 */
// GET /api/expense-claims/admin/summary - Admin/Finance summary (cached 60s)
router.get('/admin/summary', requireAdminOrFinance, cacheMiddleware(60000), async (_req, res) => {
    try {
        const summary = await ExpenseClaimService.getAdminSummary();
        res.json(summary);
    } catch (error: any) {
        console.error('Error fetching admin expense summary:', error);
        res.status(500).json({ error: 'Failed to fetch admin expense summary' });
    }
});

/**
 * @swagger
 * /api/expense-claims:
 *   post:
 *     summary: Submit a new expense claim with optional receipt upload
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [employeeId, title, category, amount, expenseDate]
 *             properties:
 *               employeeId: { type: string, format: uuid }
 *               title: { type: string, description: Short title for the claim }
 *               category: { type: string, description: Expense category (e.g. Travel, Meals, Equipment) }
 *               amount: { type: number, description: Claim amount in THB }
 *               expenseDate: { type: string, format: date, description: Date the expense was incurred }
 *               description: { type: string, description: Optional additional details }
 *               receipt: { type: string, format: binary, description: Optional receipt file }
 *     responses:
 *       201:
 *         description: Expense claim created successfully
 *       401: { description: Unauthorized }
 *       500: { description: Internal server error }
 */
// POST /api/expense-claims - Create expense claim with optional receipt upload
router.post('/', apiLimiter, receiptUpload.single('receipt'), invalidateCache('/api/expense-claims'), async (req, res) => {
    try {
        const { employeeId, title, category, amount, expenseDate, description } = req.body;

        let receiptPath: string | undefined;
        if (req.file) {
            const key = generateStorageKey('expense-receipts', req.file, 'receipt');
            const buffer = getFileBuffer(req.file);
            await storageService.upload({ key, body: buffer, contentType: req.file.mimetype });
            receiptPath = storageService.getPublicUrl(key) || `/uploads/${key}`;
        }

        const claim = await ExpenseClaimService.createExpenseClaim({
            employeeId,
            title,
            category,
            amount: parseFloat(amount),
            expenseDate,
            description,
            receiptPath,
        });

        // Fetch employee name for notification
        const empResult = await query('SELECT name FROM employees WHERE id = $1', [employeeId]);
        const employeeName = empResult.rows[0]?.name || 'An employee';

        await NotificationService.notifyAdmins({
            title: 'New Expense Claim',
            message: `${employeeName} submitted an expense claim: ${title} (฿${amount})`,
            type: 'info',
            link: '/expenses',
        });

        emitExpenseClaimCreated(claim);
        res.status(201).json(claim);
    } catch (error: any) {
        console.error('Error creating expense claim:', error);
        res.status(500).json({ error: safeErrorMessage(error, 'Failed to create expense claim') });
    }
});

/**
 * @swagger
 * /api/expense-claims/{id}:
 *   put:
 *     summary: Edit an existing expense claim (owner only, while still pending)
 *     tags: [Expense Claims]
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
 *             type: object
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               amount: { type: number }
 *               expenseDate: { type: string, format: date }
 *               description: { type: string }
 *               receipt: { type: string, format: binary, description: Replacement receipt file }
 *     responses:
 *       200:
 *         description: Expense claim updated successfully
 *       400: { description: Validation error or claim not editable }
 *       401: { description: Unauthorized }
 *       404: { description: Expense claim not found }
 */
// PUT /api/expense-claims/:id - Edit expense claim with optional receipt upload
router.put('/:id', apiLimiter, receiptUpload.single('receipt'), invalidateCache('/api/expense-claims'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const { title, category, amount, expenseDate, description } = req.body;

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (category !== undefined) updates.category = category;
        if (amount !== undefined) updates.amount = parseFloat(amount);
        if (expenseDate !== undefined) updates.expenseDate = expenseDate;
        if (description !== undefined) updates.description = description;

        if (req.file) {
            const key = generateStorageKey('expense-receipts', req.file, 'receipt');
            const buffer = getFileBuffer(req.file);
            await storageService.upload({ key, body: buffer, contentType: req.file.mimetype });
            updates.receiptPath = storageService.getPublicUrl(key) || `/uploads/${key}`;
        }

        const claim = await ExpenseClaimService.editExpenseClaim(id, user.employeeId, updates);
        if (!claim) {
            return res.status(404).json({ error: 'Expense claim not found' });
        }

        // Notify admins about the edit
        NotificationService.notifyAdmins({
            title: 'Expense Claim Edited',
            message: `Expense claim "${claim.title}" has been edited.`,
            type: 'info',
            link: '/expenses',
        }).catch((err) => console.error('Failed to notify admins about expense edit:', err));

        emitExpenseClaimUpdated(claim);
        res.json(claim);
    } catch (error: any) {
        console.error('Error editing expense claim:', error);
        res.status(400).json({ error: safeErrorMessage(error, 'Failed to edit expense claim') });
    }
});

/**
 * @swagger
 * /api/expense-claims/{id}:
 *   patch:
 *     summary: Update expense claim status (Admin/Finance only)
 *     tags: [Expense Claims]
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
 *               status: { type: string, enum: [Approved, Rejected, Paid], description: New status to apply }
 *               rejectionReason: { type: string, description: Required when status is Rejected }
 *               approverEmployeeId: { type: string, format: uuid, description: Employee ID of the approver }
 *     responses:
 *       200:
 *         description: Status updated and employee notified
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — Admin or Finance role required }
 *       404: { description: Expense claim not found }
 *       500: { description: Internal server error }
 */
// PATCH /api/expense-claims/:id - Update status (requireAdmin or Finance)
router.patch('/:id', requireAdminOrFinance, apiLimiter, invalidateCache('/api/expense-claims'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason, approverEmployeeId } = req.body;

        const claim = await ExpenseClaimService.updateExpenseClaimStatus(id, {
            status,
            rejectionReason,
            approverEmployeeId,
        });

        if (!claim) {
            return res.status(404).json({ error: 'Expense claim not found' });
        }

        // Notify the employee
        const userResult = await query(
            'SELECT u.id FROM users u JOIN employees e ON u.email = e.email WHERE e.id = $1',
            [claim.employeeId]
        );
        if (userResult.rows[0]) {
            await NotificationService.create({
                user_id: userResult.rows[0].id,
                title: `Expense Claim ${status}`,
                message: `Your expense claim "${claim.title}" has been ${status.toLowerCase()}.`,
                type: status === 'Approved' ? 'success' : status === 'Rejected' ? 'warning' : 'info',
                link: '/expenses',
            });
        }

        emitExpenseClaimUpdated(claim);
        res.json(claim);
    } catch (error: any) {
        console.error('Error updating expense claim status:', error);
        res.status(500).json({ error: safeErrorMessage(error, 'Failed to update expense claim status') });
    }
});

/**
 * @swagger
 * /api/expense-claims/{id}/manager-approve:
 *   patch:
 *     summary: Manager first-tier approval of an expense claim
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Claim advanced to manager-approved state
 *       400: { description: Claim not in an approvable state }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — Manager or HR_ADMIN role required }
 *       404: { description: Expense claim not found }
 */
// PATCH /api/expense-claims/:id/manager-approve - Manager first-tier approval
router.patch('/:id/manager-approve', requireRole('MANAGER', 'HR_ADMIN'), apiLimiter, invalidateCache('/api/expense-claims'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const claim = await ExpenseClaimService.managerApprove(id, user.employeeId);
        if (!claim) {
            return res.status(404).json({ error: 'Expense claim not found' });
        }
        emitExpenseClaimUpdated(claim);
        res.json(claim);
    } catch (error: any) {
        console.error('Error manager-approving expense claim:', error);
        res.status(400).json({ error: safeErrorMessage(error, 'Failed to approve expense claim') });
    }
});

/**
 * @swagger
 * /api/expense-claims/{id}/cancel:
 *   post:
 *     summary: Cancel own expense claim
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Expense claim cancelled successfully
 *       400: { description: Claim cannot be cancelled in its current state }
 *       401: { description: Unauthorized }
 *       404: { description: Expense claim not found }
 */
// POST /api/expense-claims/:id/cancel - Cancel own expense claim
router.post('/:id/cancel', apiLimiter, invalidateCache('/api/expense-claims'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const claim = await ExpenseClaimService.cancelExpenseClaim(id, user.employeeId);
        if (!claim) {
            return res.status(404).json({ error: 'Expense claim not found' });
        }

        // Notify admins about the cancellation
        NotificationService.notifyAdmins({
            title: 'Expense Claim Cancelled',
            message: `Expense claim "${claim.title}" has been cancelled.`,
            type: 'warning',
            link: '/expenses',
        }).catch((err) => console.error('Failed to notify admins about expense cancel:', err));

        emitExpenseClaimUpdated(claim);
        res.json(claim);
    } catch (error: any) {
        console.error('Error cancelling expense claim:', error);
        res.status(400).json({ error: safeErrorMessage(error, 'Failed to cancel expense claim') });
    }
});

/**
 * @swagger
 * /api/expense-claims/{id}:
 *   delete:
 *     summary: Delete an expense claim (Admin/Finance only)
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Expense claim deleted successfully
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — Admin or Finance role required }
 *       500: { description: Internal server error }
 */
// DELETE /api/expense-claims/:id - Delete (requireAdmin or Finance)
router.delete('/:id', requireAdminOrFinance, apiLimiter, invalidateCache('/api/expense-claims'), async (req, res) => {
    try {
        const { id } = req.params;
        await ExpenseClaimService.deleteExpenseClaim(id);

        emitExpenseClaimDeleted(id);
        res.json({ success: true, message: 'Expense claim deleted' });
    } catch (error: any) {
        console.error('Error deleting expense claim:', error);
        res.status(500).json({ error: safeErrorMessage(error, 'Failed to delete expense claim') });
    }
});

/**
 * @swagger
 * /api/expense-claims/{id}/receipt:
 *   get:
 *     summary: Download or stream the receipt file for an expense claim
 *     tags: [Expense Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Receipt file streamed inline (PDF, image, etc.)
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — only the owner, HR_ADMIN, or Finance may download }
 *       404: { description: Expense claim not found or no receipt attached }
 *       500: { description: Failed to download receipt }
 */
// GET /api/expense-claims/:id/receipt - Download receipt
router.get('/:id/receipt', async (req, res) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const claim = await ExpenseClaimService.getExpenseClaimById(id);
        if (!claim) {
            res.status(404).json({ error: 'Expense claim not found' });
            return;
        }

        if (user.role !== 'HR_ADMIN' && user.role !== 'FINANCE' && user.employeeId !== claim.employeeId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        if (!claim.receiptPath) {
            res.status(404).json({ error: 'No receipt attached' });
            return;
        }

        const key = claim.receiptPath;
        const { body, contentType, contentLength } = await storageService.download(key);

        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Content-Disposition', 'inline');

        body.pipe(res);
    } catch (error: any) {
        console.error('Download receipt error:', error);
        res.status(500).json({ error: 'Failed to download receipt' });
    }
});

export default router;
