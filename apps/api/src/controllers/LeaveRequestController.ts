import { Request, Response } from 'express';
import LeaveRequestService from '../services/LeaveRequestService';

export class LeaveRequestController {
    async getAllLeaveRequests(req: Request, res: Response): Promise<void> {
        try {
            const requests = await LeaveRequestService.getAllLeaveRequests();
            res.json(requests);
        } catch (error: any) {
            console.error('Get leave requests error:', error);
            res.status(500).json({ error: 'Failed to fetch leave requests' });
        }
    }

    async createLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const requestData = req.body;

            // Validate required fields
            if (!requestData.employeeId || !requestData.type || !requestData.startDate || !requestData.endDate) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            // Validate dates
            const start = new Date(requestData.startDate);
            const end = new Date(requestData.endDate);

            if (end < start) {
                res.status(400).json({ error: 'End date must be after start date' });
                return;
            }

            const leaveRequest = await LeaveRequestService.createLeaveRequest(requestData);
            res.status(201).json(leaveRequest);
        } catch (error: any) {
            console.error('Create leave request error:', error);
            res.status(400).json({ error: error.message || 'Failed to create leave request' });
        }
    }

    async updateLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
                res.status(400).json({ error: 'Invalid status' });
                return;
            }

            const leaveRequest = await LeaveRequestService.updateLeaveRequestStatus(id, { status });
            res.json(leaveRequest);
        } catch (error: any) {
            console.error('Update leave request error:', error);
            if (error.message === 'Leave request not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message || 'Failed to update leave request' });
            }
        }
    }

    async deleteLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await LeaveRequestService.deleteLeaveRequest(id);
            res.json({ message: 'Leave request deleted successfully' });
        } catch (error: any) {
            console.error('Delete leave request error:', error);
            if (error.message === 'Leave request not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete leave request' });
            }
        }
    }

    async getLeaveBalances(req: Request, res: Response): Promise<void> {
        try {
            const { employeeId } = req.params;
            const balances = await LeaveRequestService.getLeaveBalances(employeeId);
            res.json(balances);
        } catch (error: any) {
            console.error('Get leave balances error:', error);
            res.status(500).json({ error: 'Failed to fetch leave balances' });
        }
    }
}

export default new LeaveRequestController();
