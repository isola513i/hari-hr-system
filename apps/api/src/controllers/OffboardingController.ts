import { Request, Response } from 'express';
import OffboardingService from '../services/OffboardingService';
import AuditLogService from '../services/AuditLogService';

export class OffboardingController {

    /**
     * POST /api/employees/:id/offboarding/initiate
     * Initiates the offboarding flow. HR_ADMIN only.
     * Guard: returns 409 if employee already in Notice Period or Terminated.
     */
    async initiateOffboarding(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user = (req as any).user;

            const { employee, tasks } = await OffboardingService.initiateOffboarding(
                id,
                req.body,
                { userId: user?.userId ?? '', email: user?.email ?? '' },
            );

            // Audit log — controller layer has req context
            AuditLogService.create({
                userId:    user?.userId ?? null,
                userEmail: user?.email  ?? null,
                action:    'EMPLOYEE_OFFBOARDING_INITIATED',
                resource:  `employee:${id}`,
                method:    req.method,
                path:      req.path,
                ip:        req.ip ?? '',
                userAgent: req.headers['user-agent'] ?? '',
                success:   true,
                details: {
                    employeeId:         id,
                    lastWorkingDay:     req.body.lastWorkingDay,
                    terminationReason:  req.body.terminationReason,
                },
            }).catch((err) => console.error('Offboarding initiate audit log failed:', err));

            res.status(201).json({ employee, tasks });
        } catch (error: any) {
            console.error('Initiate offboarding error:', error);
            if (error.message === 'Employee not found') {
                res.status(404).json({ error: error.message });
            } else if (error.message === 'Employee is already offboarding or terminated') {
                res.status(409).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message || 'Failed to initiate offboarding' });
            }
        }
    }

    /**
     * GET /api/employees/:id/offboarding
     * Fetch the full offboarding state for an employee.
     */
    async getOffboarding(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await OffboardingService.getOffboarding(id);

            if (!result.employee) {
                res.status(404).json({ error: 'Employee not found' });
                return;
            }

            res.json(result);
        } catch (error: any) {
            console.error('Get offboarding error:', error);
            res.status(500).json({ error: 'Failed to fetch offboarding data' });
        }
    }

    /**
     * POST /api/employees/:id/offboarding/tasks
     * Create an additional offboarding task. HR_ADMIN only.
     */
    async createTask(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const task = await OffboardingService.createTask({ ...req.body, employeeId: id });
            res.status(201).json(task);
        } catch (error: any) {
            console.error('Create offboarding task error:', error);
            res.status(400).json({ error: error.message || 'Failed to create task' });
        }
    }

    /**
     * PATCH /api/offboarding/tasks/:taskId
     * Update a task. May trigger auto-finalization (Notice Period → Terminated).
     */
    async updateTask(req: Request, res: Response): Promise<void> {
        try {
            const { taskId } = req.params;
            const user = (req as any).user;

            const task = await OffboardingService.updateTask(taskId, req.body, {
                userId: user?.userId ?? '',
                email:  user?.email  ?? '',
            });

            if (!task) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }

            // Audit log when a task is completed
            if (req.body.completed === true) {
                AuditLogService.create({
                    userId:    user?.userId ?? null,
                    userEmail: user?.email  ?? null,
                    action:    'OFFBOARDING_TASK_COMPLETED',
                    resource:  `offboarding_task:${taskId}`,
                    method:    req.method,
                    path:      req.path,
                    ip:        req.ip ?? '',
                    userAgent: req.headers['user-agent'] ?? '',
                    success:   true,
                    details: {
                        taskId,
                        taskTitle: task.title,
                        assignee:  task.assignee,
                        employeeId: task.employeeId,
                    },
                }).catch((err) => console.error('Task completion audit log failed:', err));
            }

            res.json(task);
        } catch (error: any) {
            console.error('Update offboarding task error:', error);
            res.status(400).json({ error: error.message || 'Failed to update task' });
        }
    }

    /**
     * DELETE /api/offboarding/tasks/:taskId
     * Delete an offboarding task. HR_ADMIN only.
     */
    async deleteTask(req: Request, res: Response): Promise<void> {
        try {
            const { taskId } = req.params;
            const deleted = await OffboardingService.deleteTask(taskId);

            if (!deleted) {
                res.status(404).json({ error: 'Task not found' });
                return;
            }

            res.json({ message: 'Task deleted successfully' });
        } catch (error: any) {
            console.error('Delete offboarding task error:', error);
            res.status(500).json({ error: 'Failed to delete task' });
        }
    }

    /**
     * POST /api/employees/:id/offboarding/exit-interview
     * Save (upsert) the exit interview for an employee. HR_ADMIN only.
     */
    async saveExitInterview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user = (req as any).user;

            const interview = await OffboardingService.saveExitInterview(
                id,
                req.body,
                user?.userId ?? '',
            );

            AuditLogService.create({
                userId:    user?.userId ?? null,
                userEmail: user?.email  ?? null,
                action:    'EXIT_INTERVIEW_COMPLETED',
                resource:  `employee:${id}`,
                method:    req.method,
                path:      req.path,
                ip:        req.ip ?? '',
                userAgent: req.headers['user-agent'] ?? '',
                success:   true,
                details:   { employeeId: id },
            }).catch((err) => console.error('Exit interview audit log failed:', err));

            res.status(201).json(interview);
        } catch (error: any) {
            console.error('Save exit interview error:', error);
            res.status(400).json({ error: error.message || 'Failed to save exit interview' });
        }
    }

    /**
     * GET /api/employees/:id/offboarding/exit-interview
     * Fetch the exit interview for an employee.
     */
    async getExitInterview(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const interview = await OffboardingService.getExitInterview(id);
            res.json(interview ?? null);
        } catch (error: any) {
            console.error('Get exit interview error:', error);
            res.status(500).json({ error: 'Failed to fetch exit interview' });
        }
    }
}

export default new OffboardingController();
