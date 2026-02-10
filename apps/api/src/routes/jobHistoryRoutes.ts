// Re-export from new module location
import { Router } from 'express';
import JobHistoryController from '../modules/employees/job-history.controller';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/job-history - Get job history (optionally filtered by employeeId)
router.get('/', JobHistoryController.getJobHistory.bind(JobHistoryController));

// POST /api/job-history - Add new job history entry
router.post('/', apiLimiter, JobHistoryController.createJobHistory.bind(JobHistoryController));

export default router;
