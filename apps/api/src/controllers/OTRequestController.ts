import { Request, Response } from 'express';
import OTRequestService from '../services/OTRequestService';

class OTRequestController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { date, plannedStart, plannedEnd, plannedHours, otType, reason } = req.body;
      if (!date || !plannedStart || !plannedEnd || !plannedHours || !reason) {
        res.status(400).json({ error: 'date, plannedStart, plannedEnd, plannedHours, and reason are required' });
        return;
      }

      const ot = await OTRequestService.create(employeeId, { date, plannedStart, plannedEnd, plannedHours: parseFloat(plannedHours), otType, reason });
      res.status(201).json(ot);
    } catch (err: any) {
      console.error('Error creating OT request:', err);
      const status = err.message?.includes('Cannot') || err.message?.includes('must be') ? 400 : 500;
      res.status(status).json({ error: err.message || 'Failed to create OT request' });
    }
  }

  async getMyRequests(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { status, month } = req.query as Record<string, string>;
      const requests = await OTRequestService.getByEmployee(employeeId, { status, month });
      res.json(requests);
    } catch (err: any) {
      console.error('Error fetching OT requests:', err);
      res.status(500).json({ error: 'Failed to fetch OT requests' });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { status, employeeName, month, department } = req.query as Record<string, string>;
      const requests = await OTRequestService.getAll({ status, employeeName, month, department });
      res.json(requests);
    } catch (err: any) {
      console.error('Error fetching all OT requests:', err);
      res.status(500).json({ error: 'Failed to fetch OT requests' });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { month } = req.query as Record<string, string>;
      const stats = await OTRequestService.getStats(month);
      res.json(stats);
    } catch (err: any) {
      console.error('Error fetching OT stats:', err);
      res.status(500).json({ error: 'Failed to fetch OT stats' });
    }
  }

  async approve(req: Request, res: Response): Promise<void> {
    try {
      const reviewerEmployeeId = (req as any).user?.employeeId;
      if (!reviewerEmployeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { id } = req.params;
      const { notes } = req.body;
      const ot = await OTRequestService.approve(id, reviewerEmployeeId, notes);
      res.json(ot);
    } catch (err: any) {
      console.error('Error approving OT request:', err);
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Failed to approve OT request' });
    }
  }

  async reject(req: Request, res: Response): Promise<void> {
    try {
      const reviewerEmployeeId = (req as any).user?.employeeId;
      if (!reviewerEmployeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { id } = req.params;
      const { notes } = req.body;
      const ot = await OTRequestService.reject(id, reviewerEmployeeId, notes);
      res.json(ot);
    } catch (err: any) {
      console.error('Error rejecting OT request:', err);
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Failed to reject OT request' });
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.employeeId;
      if (!employeeId) { res.status(403).json({ error: 'Employee profile required' }); return; }

      const { id } = req.params;
      await OTRequestService.cancel(id, employeeId);
      res.json({ message: 'OT request cancelled' });
    } catch (err: any) {
      console.error('Error cancelling OT request:', err);
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Failed to cancel OT request' });
    }
  }
}

export default new OTRequestController();
