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
/**
 * @swagger
 * /api/employees/{id}/offboarding/initiate:
 *   post:
 *     summary: Initiate the offboarding workflow for an employee
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [terminationReason, lastWorkingDay]
 *             properties:
 *               terminationReason: { type: string }
 *               lastWorkingDay: { type: string, format: date }
 *               terminationNotes: { type: string }
 *     responses:
 *       200:
 *         description: Offboarding initiated successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Employee not found }
 *       409: { description: Employee is already in Notice Period or Terminated }
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
/**
 * @swagger
 * /api/employees/{id}/offboarding:
 *   get:
 *     summary: Get full offboarding state for an employee
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Offboarding state including tasks, exit interview, and progress summary
 *       401: { description: Unauthorized }
 *       404: { description: Employee or offboarding record not found }
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
/**
 * @swagger
 * /api/employees/{id}/offboarding/tasks:
 *   post:
 *     summary: Create an additional offboarding task for an employee
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               dueDate: { type: string, format: date }
 *               assignedTo: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Offboarding task created successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Employee or offboarding record not found }
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
/**
 * @swagger
 * /api/employees/{id}/offboarding/exit-interview:
 *   post:
 *     summary: Save (upsert) the exit interview for an employee
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reasonForLeaving: { type: string }
 *               jobSatisfaction: { type: number }
 *               wouldRecommend: { type: boolean }
 *               feedback: { type: string }
 *               interviewDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Exit interview saved successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Employee or offboarding record not found }
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
/**
 * @swagger
 * /api/employees/{id}/offboarding/exit-interview:
 *   get:
 *     summary: Fetch the exit interview for an employee
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Exit interview data
 *       401: { description: Unauthorized }
 *       404: { description: Employee or exit interview not found }
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
/**
 * @swagger
 * /api/offboarding/tasks/{taskId}:
 *   patch:
 *     summary: Update an offboarding task (e.g. mark as completed)
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Offboarding task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [pending, in_progress, completed] }
 *               completedAt: { type: string, format: date-time }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Task updated successfully; may trigger auto-finalization when progress reaches 100%
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       404: { description: Task not found }
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
/**
 * @swagger
 * /api/offboarding/tasks/{taskId}:
 *   delete:
 *     summary: Delete an offboarding task
 *     tags: [Offboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Offboarding task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401: { description: Unauthorized }
 *       404: { description: Task not found }
 */
offboardingTaskRouter.delete(
    '/tasks/:taskId',
    requireAdmin,
    apiLimiter,
    OffboardingController.deleteTask.bind(OffboardingController),
);
