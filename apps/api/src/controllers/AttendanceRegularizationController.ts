import { Request, Response } from 'express';
import AttendanceRegularizationService from '../services/AttendanceRegularizationService';

class AttendanceRegularizationController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { date, requestedClockIn, requestedClockOut, reason } = req.body;
      if (!date || !reason) {
        res.status(400).json({ error: 'date and reason are required' });
        return;
      }

      const request = await AttendanceRegularizationService.create(employeeId, {
        date,
        requestedClockIn,
        requestedClockOut,
        reason,
      });
      res.status(201).json(request);
    } catch (err: any) {
      console.error('Error creating regularization request:', err);
      const status = err.message?.includes('required') || err.message?.includes('Provide') || err.message?.includes('Cannot') ? 400 : 500;
      res.status(status).json({ error: err.message || 'Failed to create regularization request' });
    }
  }

  async getMyRequests(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { status } = req.query as Record<string, string>;
      const requests = await AttendanceRegularizationService.getByEmployee(employeeId, { status });
      res.json(requests);
    } catch (err: any) {
      console.error('Error fetching regularization requests:', err);
      res.status(500).json({ error: 'Failed to fetch regularization requests' });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const role = (req as any).user?.role;
      const callerEmployeeId = (req as any).user?.employeeId as string | undefined;
      const { status, date } = req.query as Record<string, string>;
      const requests = await AttendanceRegularizationService.getAll({
        status,
        date,
        myTeam: role === 'MANAGER',
        callerEmployeeId,
      });
      res.json(requests);
    } catch (err: any) {
      console.error('Error fetching all regularization requests:', err);
      res.status(500).json({ error: 'Failed to fetch regularization requests' });
    }
  }

  async managerApprove(req: Request, res: Response): Promise<void> {
    try {
      const managerEmployeeId = (req as any).user?.employeeId;
      if (!managerEmployeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const request = await AttendanceRegularizationService.managerApprove(req.params.id, managerEmployeeId);
      res.json(request);
    } catch (err: any) {
      console.error('Error manager-approving regularization request:', err);
      const status = err.message?.includes('not found') ? 404 : err.message?.includes('only') ? 403 : 400;
      res.status(status).json({ error: err.message || 'Failed to approve regularization request' });
    }
  }

  async approve(req: Request, res: Response): Promise<void> {
    try {
      const reviewerId = (req as any).user?.employeeId;
      if (!reviewerId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { notes } = req.body;
      const request = await AttendanceRegularizationService.approve(req.params.id, reviewerId, notes);
      res.json(request);
    } catch (err: any) {
      console.error('Error approving regularization request:', err);
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Failed to approve regularization request' });
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    try {
      const reviewerId = (req as any).user?.employeeId;
      if (!reviewerId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { notes } = req.body;
      const request = await AttendanceRegularizationService.reject(req.params.id, reviewerId, notes);
      res.json(request);
    } catch (err: any) {
      console.error('Error rejecting regularization request:', err);
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Failed to reject regularization request' });
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      await AttendanceRegularizationService.cancel(req.params.id, employeeId);
      res.json({ message: 'Regularization request cancelled' });
    } catch (err: any) {
      console.error('Error cancelling regularization request:', err);
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Failed to cancel regularization request' });
    }
  }
}

export default new AttendanceRegularizationController();
