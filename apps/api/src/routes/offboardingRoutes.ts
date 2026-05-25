/**
 * Offboarding routes — two routers:
 *
 *  employeeOffboardingRouter  → mounted at /api/employees
 *    POST   /:id/offboarding/initiate
 *    GET    /:id/offboarding
 *    POST   /:id/offboarding/tasks
 *    POST   /:id/offboarding/exit-interview
 *    GET    /:id/offboarding/exit-interview
 *
 *  offboardingTaskRouter      → mounted at /api/offboarding
 *    PATCH  /tasks/:taskId
 *    DELETE /tasks/:taskId
 */

import { Router } from 'express';
import OffboardingController from '../controllers/OffboardingController';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/security';

// ── Employee-scoped offboarding routes (/api/employees prefix) ──────────────

export const employeeOffboardingRouter = Router();

employeeOffboardingRouter.use(authenticateToken);

/**
 * POST /api/employees/:id/offboarding/initiate
 * Initiates the offboarding workflow for an employee. HR_ADMIN only.
 * Body: { terminationReason, lastWorkingDay, terminationNotes? }
 * Returns 409 if employee is already in Notice Period or Terminated (guard clause).
 */
employeeOffboardingRouter.post(
    '/:id/offboarding/initiate',
    requireAdmin,
    apiLimiter,
    OffboardingController.initiateOffboarding.bind(OffboardingController),
);

/**
 * GET /api/employees/:id/offboarding
 * Get the full offboarding state (tasks, exit interview, progress summary).
 */
employeeOffboardingRouter.get(
    '/:id/offboarding',
    requireAdmin,
    OffboardingController.getOffboarding.bind(OffboardingController),
);

/**
 * POST /api/employees/:id/offboarding/tasks
 * Create an additional offboarding task for an employee.
 */
employeeOffboardingRouter.post(
    '/:id/offboarding/tasks',
    requireAdmin,
    apiLimiter,
    OffboardingController.createTask.bind(OffboardingController),
);

/**
 * POST /api/employees/:id/offboarding/exit-interview
 * Save (upsert) the exit interview for an employee.
 */
employeeOffboardingRouter.post(
    '/:id/offboarding/exit-interview',
    requireAdmin,
    apiLimiter,
    OffboardingController.saveExitInterview.bind(OffboardingController),
);

/**
 * GET /api/employees/:id/offboarding/exit-interview
 * Fetch the exit interview for an employee.
 */
employeeOffboardingRouter.get(
    '/:id/offboarding/exit-interview',
    requireAdmin,
    OffboardingController.getExitInterview.bind(OffboardingController),
);

// ── Task-level offboarding routes (/api/offboarding prefix) ────────────────

export const offboardingTaskRouter = Router();

offboardingTaskRouter.use(authenticateToken);

/**
 * PATCH /api/offboarding/tasks/:taskId
 * Update an offboarding task (e.g. mark completed).
 * May trigger auto-finalization when progress reaches 100%.
 */
offboardingTaskRouter.patch(
    '/tasks/:taskId',
    apiLimiter,
    OffboardingController.updateTask.bind(OffboardingController),
);

/**
 * DELETE /api/offboarding/tasks/:taskId
 * Delete an offboarding task. HR_ADMIN only.
 */
offboardingTaskRouter.delete(
    '/tasks/:taskId',
    requireAdmin,
    apiLimiter,
    OffboardingController.deleteTask.bind(OffboardingController),
);
