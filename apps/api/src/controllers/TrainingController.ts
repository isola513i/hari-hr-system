import { Request, Response } from 'express';
import TrainingService from '../services/TrainingService';
import { NotificationService } from '../services/NotificationService';
import { safeErrorMessage } from '../utils/errorResponse';
import { query } from '../db';

const notificationService = new NotificationService();

class TrainingController {
  // GET /api/training/modules
  async getAllModules(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const modules = await TrainingService.getAllModules(includeInactive);
      res.json(modules);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch modules') });
    }
  }

  // GET /api/training/modules/:id
  async getModuleById(req: Request, res: Response): Promise<void> {
    try {
      const mod = await TrainingService.getModuleById(req.params.id);
      if (!mod) { res.status(404).json({ error: 'Module not found' }); return; }
      res.json(mod);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch module') });
    }
  }

  // POST /api/training/modules
  async createModule(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, duration, type, thumbnail } = req.body;
      if (!title) { res.status(400).json({ error: 'Title is required' }); return; }

      const user = req.user as any;
      const mod = await TrainingService.createModule({
        title, description, duration, type, thumbnail,
        createdBy: user?.employeeId || null,
      });
      res.status(201).json(mod);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to create module') });
    }
  }

  // PUT /api/training/modules/:id
  async updateModule(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, duration, type, status, thumbnail, isActive } = req.body;
      const mod = await TrainingService.updateModule(req.params.id, {
        title, description, duration, type, status, thumbnail, isActive,
      });
      if (!mod) { res.status(404).json({ error: 'Module not found' }); return; }
      res.json(mod);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to update module') });
    }
  }

  // DELETE /api/training/modules/:id
  async deleteModule(req: Request, res: Response): Promise<void> {
    try {
      await TrainingService.deleteModule(req.params.id);
      res.json({ message: 'Module deactivated' });
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to delete module') });
    }
  }

  // GET /api/training/employee/:employeeId
  async getEmployeeTraining(req: Request, res: Response): Promise<void> {
    try {
      const training = await TrainingService.getEmployeeTraining(req.params.employeeId);
      res.json(training);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch training records') });
    }
  }

  // POST /api/training/assign
  async assignTraining(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId, moduleId, title, duration, dueDate } = req.body;
      if (!employeeId) { res.status(400).json({ error: 'employeeId required' }); return; }

      const user = req.user as any;
      const record = await TrainingService.assignTraining({
        employeeId, moduleId, title, duration, dueDate,
        assignedBy: user?.employeeId || null,
      });

      // Send notification to the assigned employee
      try {
        const userResult = await query(
          'SELECT u.id FROM users u JOIN employees e ON u.id = e.user_id WHERE e.id = $1',
          [employeeId]
        );
        if (userResult.rows.length > 0) {
          await notificationService.create({
            user_id: userResult.rows[0].id,
            title: 'New Training Assigned',
            message: `You have been assigned training: ${record.title}`,
            type: 'info',
            link: '/employees/' + employeeId,
          });
        }
      } catch { /* non-blocking */ }

      res.status(201).json(record);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to assign training') });
    }
  }

  // POST /api/training/bulk-assign
  async bulkAssignTraining(req: Request, res: Response): Promise<void> {
    try {
      const { employeeIds, moduleId, dueDate } = req.body;
      if (!employeeIds?.length || !moduleId) {
        res.status(400).json({ error: 'employeeIds and moduleId required' });
        return;
      }

      const user = req.user as any;
      const records = await TrainingService.bulkAssignTraining({
        employeeIds, moduleId, dueDate,
        assignedBy: user?.employeeId || null,
      });

      // Notify assigned employees
      try {
        for (const record of records) {
          const userResult = await query(
            'SELECT u.id FROM users u JOIN employees e ON u.id = e.user_id WHERE e.id = $1',
            [record.employeeId]
          );
          if (userResult.rows.length > 0) {
            await notificationService.create({
              user_id: userResult.rows[0].id,
              title: 'New Training Assigned',
              message: `You have been assigned training: ${record.title}`,
              type: 'info',
            });
          }
        }
      } catch { /* non-blocking */ }

      res.status(201).json({ assigned: records.length, records });
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to bulk assign training') });
    }
  }

  // PATCH /api/training/:id
  async updateTraining(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any;
      const isAdminOrManager = user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';

      // Non-admin users can only update their own training records
      if (!isAdminOrManager) {
        const existing = await query(
          'SELECT employee_id FROM employee_training WHERE id = $1',
          [req.params.id]
        );
        if (existing.rows.length === 0) { res.status(404).json({ error: 'Training record not found' }); return; }
        if (existing.rows[0].employee_id !== user?.employeeId) {
          res.status(403).json({ error: 'You can only update your own training records' });
          return;
        }
      }

      const { status, score } = req.body;
      const record = await TrainingService.updateTraining(req.params.id, status, score);
      if (!record) { res.status(404).json({ error: 'Training record not found' }); return; }

      // Notify admins when training is completed or scored
      if (status === 'Completed' || score !== undefined) {
        const empResult = await query(
          'SELECT name FROM employees WHERE id = $1',
          [record.employeeId]
        );
        const empName = empResult.rows[0]?.name || 'An employee';
        const msg = score !== undefined
          ? `${empName} scored ${score}% on training: ${record.title}`
          : `${empName} has completed training: ${record.title}`;
        notificationService.notifyAdmins({
          title: 'Training Update',
          message: msg,
          type: 'info',
          link: '/training',
        }).catch((err) => console.error('Failed to notify admins about training update:', err));
      }

      res.json(record);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to update training') });
    }
  }

  // DELETE /api/training/:id
  async deleteTraining(req: Request, res: Response): Promise<void> {
    try {
      await TrainingService.deleteTraining(req.params.id);
      res.json({ message: 'Training record deleted' });
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to delete training') });
    }
  }

  // GET /api/training/analytics
  async getAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const analytics = await TrainingService.getAnalytics();
      res.json(analytics);
    } catch (err) {
      res.status(500).json({ error: safeErrorMessage(err, 'Failed to fetch analytics') });
    }
  }
}

export default new TrainingController();
