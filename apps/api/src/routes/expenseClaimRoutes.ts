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
