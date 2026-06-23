import { Router } from 'express';
import { authenticateToken, requireAdmin, requireAdminOrManager, requireRole } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/security';
import AttendanceRegularizationController from '../controllers/AttendanceRegularizationController';

const router = Router();

router.use(authenticateToken);

// Employee submits a correction request
router.post('/', apiLimiter, AttendanceRegularizationController.create.bind(AttendanceRegularizationController));

// Employee views their own requests
router.get('/my', AttendanceRegularizationController.getMyRequests.bind(AttendanceRegularizationController));

// Admin/Manager views requests (manager sees only their direct reports)
router.get('/admin', requireAdminOrManager, AttendanceRegularizationController.getAll.bind(AttendanceRegularizationController));

// Manager first-tier approval (direct reports only)
router.put('/:id/manager-approve', requireRole('MANAGER'), AttendanceRegularizationController.managerApprove.bind(AttendanceRegularizationController));

// HR Admin final approval — applies the correction to attendance_records
router.put('/:id/approve', requireAdmin, AttendanceRegularizationController.approve.bind(AttendanceRegularizationController));

// Admin or Manager rejection
router.put('/:id/reject', requireAdminOrManager, AttendanceRegularizationController.reject.bind(AttendanceRegularizationController));

// Employee cancels their own pending request
router.delete('/:id', AttendanceRegularizationController.cancel.bind(AttendanceRegularizationController));

export default router;
