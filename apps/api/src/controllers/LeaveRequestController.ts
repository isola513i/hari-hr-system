import { Request, Response } from 'express';
import LeaveRequestService, { LeaveRequestService as LeaveRequestServiceClass } from '../services/LeaveRequestService';
import { emitLeaveRequestCreated, emitLeaveRequestUpdated, emitLeaveRequestDeleted } from '../socket';
import { getPaginationParams, getSortParams } from '../utils/pagination';
import type { LeaveRequest, UpdateLeaveRequestDTO } from '../models/LeaveRequest';
import { storageService } from '../services/StorageService';
import { generateStorageKey, getFileBuffer } from '../middlewares/upload';
import { query } from '../db';
import NotificationService from '../services/NotificationService';

export class LeaveRequestController {
    async getAllLeaveRequests(req: Request, res: Response): Promise<void> {
        try {
            const user = (req as any).user;
            const usePagination = req.query.page !== undefined || req.query.limit !== undefined;

            const sanitize = (requests: LeaveRequest[]) => {
                if (user?.role === 'HR_ADMIN' || user?.role === 'MANAGER') return requests;
                return requests.map((r) =>
                    r.employeeId === user?.employeeId
                        ? r
                        : LeaveRequestServiceClass.stripSensitiveLeaveFields(r)
                );
            };

            if (usePagination) {
                const paginationParams = getPaginationParams(req);
                const sortParams = getSortParams(
                    req,
                    ['created_at', 'start_date', 'end_date', 'status', 'type'],
                    'created_at',
                    'DESC'
                );

                const filters = {
                    status: req.query.status as string | undefined,
                    employeeId: req.query.employeeId as string | undefined,
                    type: req.query.type as string | undefined,
                };

                const result = await LeaveRequestService.getLeaveRequestsPaginated(
                    paginationParams,
                    filters,
                    sortParams.field,
                    sortParams.order
                );

                result.data = sanitize(result.data);
                res.json(result);
            } else {
                const requests = await LeaveRequestService.getAllLeaveRequests();
                res.json(sanitize(requests));
            }
        } catch (error: any) {
            console.error('Get leave requests error:', error);
            res.status(500).json({ error: 'Failed to fetch leave requests' });
        }
    }

    async createLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const requestData = req.body;

            // FormData sends booleans as strings — convert "false"/"true" to actual booleans
            if (typeof requestData.isHalfDay === 'string') {
                requestData.isHalfDay = requestData.isHalfDay === 'true';
            }

            if (!requestData.employeeId || !requestData.type || !requestData.startDate || !requestData.endDate) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const start = new Date(requestData.startDate);
            const end = new Date(requestData.endDate);

            if (end < start) {
                res.status(400).json({ error: 'End date must be after start date' });
                return;
            }

            if (req.file) {
                const key = generateStorageKey('medical-certs', req.file, 'cert');
                const buffer = getFileBuffer(req.file);
                await storageService.upload({ key, body: buffer, contentType: req.file.mimetype });
                requestData.medicalCertificatePath = key;
            }

            const leaveRequest = await LeaveRequestService.createLeaveRequest(requestData);

            emitLeaveRequestCreated(leaveRequest);

            res.status(201).json(leaveRequest);
        } catch (error: any) {
            console.error('Create leave request error:', error);
            res.status(400).json({ error: error.message || 'Failed to create leave request' });
        }
    }

    async editLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const employeeId = (req as any).user?.employeeId;

            if (!employeeId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const editData = req.body;

            // FormData sends booleans as strings — convert "false"/"true" to actual booleans
            if (typeof editData.isHalfDay === 'string') {
                editData.isHalfDay = editData.isHalfDay === 'true';
            }

            if (!editData.type || !editData.startDate || !editData.endDate) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const start = new Date(editData.startDate);
            const end = new Date(editData.endDate);
            if (end < start) {
                res.status(400).json({ error: 'End date must be after start date' });
                return;
            }

            if (req.file) {
                const key = generateStorageKey('medical-certs', req.file, 'cert');
                const buffer = getFileBuffer(req.file);
                await storageService.upload({ key, body: buffer, contentType: req.file.mimetype });
                editData.medicalCertificatePath = key;
            }

            const leaveRequest = await LeaveRequestService.editLeaveRequest(id, employeeId, editData);

            emitLeaveRequestUpdated(leaveRequest);

            res.json(leaveRequest);
        } catch (error: any) {
            console.error('Edit leave request error:', error);
            const statusCode = error.statusCode || 400;
            res.status(statusCode).json({ error: error.message || 'Failed to edit leave request' });
        }
    }

    /**
     * Apply a status change to a single leave request, enforcing the same rules
     * for both the single-update and bulk-update endpoints: valid target status,
     * not-already-final guard, manager-scope check (managers may only act on
     * their direct reports, and their "Approved" becomes "Manager Approved"),
     * the persisted update, the HR notification, and the socket emit.
     *
     * Throws an Error with a numeric `statusCode` so callers can map failures to
     * the right HTTP status (single endpoint) or per-item result (bulk endpoint).
     */
    private async applyStatusUpdate(
        id: string,
        status: string,
        rejectionReason: string | undefined,
        user: any,
    ): Promise<LeaveRequest> {
        if (!status || !['Pending', 'Approved', 'Rejected', 'Manager Approved'].includes(status)) {
            const err: any = new Error('Invalid status');
            err.statusCode = 400;
            throw err;
        }

        const approverEmployeeId = user?.employeeId;
        let effectiveStatus = status;
        let managerApprovedBy: string | undefined;
        let managerApprovedAt: Date | undefined;

        const leaveReq = await LeaveRequestService.getLeaveRequestById(id);
        if (!leaveReq) {
            const err: any = new Error('Leave request not found');
            err.statusCode = 404;
            throw err;
        }

        if (['Approved', 'Rejected'].includes(leaveReq.status)) {
            const err: any = new Error(`Cannot update a leave request that is already ${leaveReq.status.toLowerCase()}`);
            err.statusCode = 400;
            throw err;
        }

        if (user?.role === 'MANAGER' && user.employeeId) {
            const empResult = await query(
                'SELECT manager_id FROM employees WHERE id = $1',
                [leaveReq.employeeId]
            );
            if (empResult.rows[0]?.manager_id !== user.employeeId) {
                const err: any = new Error('You can only approve leave requests from your direct reports');
                err.statusCode = 403;
                throw err;
            }
            if (status === 'Approved') {
                effectiveStatus = 'Manager Approved';
                managerApprovedBy = user.employeeId;
                managerApprovedAt = new Date();
            }
        }

        const leaveRequest = await LeaveRequestService.updateLeaveRequestStatus(id, {
            status: effectiveStatus as UpdateLeaveRequestDTO['status'],
            rejectionReason: effectiveStatus === 'Rejected' ? rejectionReason : undefined,
            approverEmployeeId,
            managerApprovedBy,
            managerApprovedAt,
        });

        // If manager just set 'Manager Approved', notify HR for final approval
        if (effectiveStatus === 'Manager Approved') {
            const empName = leaveRequest.employeeName || 'An employee';
            NotificationService.notifyAdmins({
                title: 'Leave Request Ready for Final Approval',
                message: `Manager approved ${empName}'s ${leaveRequest.type} leave request — needs HR final approval.`,
                type: 'info',
                link: '/leave-requests',
            }).catch(() => {});
        }

        emitLeaveRequestUpdated(leaveRequest);
        return leaveRequest;
    }

    async updateLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status, rejectionReason } = req.body;
            const leaveRequest = await this.applyStatusUpdate(id, status, rejectionReason, (req as any).user);
            res.json(leaveRequest);
        } catch (error: any) {
            console.error('Update leave request error:', error);
            const statusCode = error.statusCode || (error.message === 'Leave request not found' ? 404 : 400);
            res.status(statusCode).json({ error: error.message || 'Failed to update leave request' });
        }
    }

    /**
     * Bulk approve/reject leave requests in one call.
     * Body: { ids: string[]; status: string; rejectionReason?: string }
     * Each id is processed independently — one failure never aborts the rest;
     * the response reports a per-item success/error breakdown.
     */
    async bulkUpdateLeaveRequests(req: Request, res: Response): Promise<void> {
        try {
            const { ids, status, rejectionReason } = req.body;
            const user = (req as any).user;

            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'ids must be a non-empty array' });
                return;
            }
            if (ids.length > 100) {
                res.status(400).json({ error: 'Cannot process more than 100 requests at once' });
                return;
            }

            const results = await Promise.all(
                ids.map(async (id: string) => {
                    try {
                        const leaveRequest = await this.applyStatusUpdate(id, status, rejectionReason, user);
                        return { id, success: true, status: leaveRequest.status };
                    } catch (error: any) {
                        return { id, success: false, error: error.message || 'Failed to update' };
                    }
                })
            );

            const succeeded = results.filter((r) => r.success).length;
            res.json({
                total: ids.length,
                succeeded,
                failed: ids.length - succeeded,
                results,
            });
        } catch (error: any) {
            console.error('Bulk update leave requests error:', error);
            res.status(500).json({ error: error.message || 'Failed to bulk update leave requests' });
        }
    }

    async deleteLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await LeaveRequestService.deleteLeaveRequest(id);

            emitLeaveRequestDeleted(id);

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

    async cancelLeaveRequest(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const employeeId = (req as any).user?.employeeId;

            if (!employeeId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const result = await LeaveRequestService.cancelLeaveRequest(id, employeeId);

            if (result.action === 'deleted') {
                emitLeaveRequestDeleted(id);
                res.json({ message: 'Leave request cancelled successfully', action: 'deleted' });
            } else {
                // cancel_requested
                if (result.leaveRequest) {
                    emitLeaveRequestUpdated(result.leaveRequest);
                }
                res.json({ message: 'Leave cancellation requested. Awaiting manager confirmation.', action: 'cancel_requested' });
            }
        } catch (error: any) {
            console.error('Cancel leave request error:', error);
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ error: error.message || 'Failed to cancel leave request' });
        }
    }

    async handleCancelDecision(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { decision } = req.body;
            const user = (req as any).user;
            const approverEmployeeId = user?.employeeId;

            if (!approverEmployeeId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // MANAGER can only handle cancel decisions for direct reports
            if (user?.role === 'MANAGER') {
                const leaveReq = await LeaveRequestService.getLeaveRequestById(id);
                if (leaveReq) {
                    const empResult = await query(
                        'SELECT manager_id FROM employees WHERE id = $1',
                        [leaveReq.employeeId]
                    );
                    if (empResult.rows[0]?.manager_id !== approverEmployeeId) {
                        res.status(403).json({ error: 'You can only manage leave requests from your direct reports' });
                        return;
                    }
                }
            }

            if (!decision || !['approve_cancel', 'reject_cancel'].includes(decision)) {
                res.status(400).json({ error: 'Invalid decision. Must be "approve_cancel" or "reject_cancel".' });
                return;
            }

            const result = await LeaveRequestService.handleCancelDecision(id, decision, approverEmployeeId);

            if (result.action === 'deleted') {
                emitLeaveRequestDeleted(id);
                res.json({ message: 'Leave cancellation approved. Request has been deleted.' });
            } else {
                // reverted
                if (result.leaveRequest) {
                    emitLeaveRequestUpdated(result.leaveRequest);
                }
                res.json({ message: 'Leave cancellation rejected. Request reverted to Approved.' });
            }
        } catch (error: any) {
            console.error('Handle cancel decision error:', error);
            const statusCode = error.statusCode || 500;
            res.status(statusCode).json({ error: error.message || 'Failed to handle cancel decision' });
        }
    }

    async downloadMedicalCertificate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user = (req as any).user;

            const leaveRequest = await LeaveRequestService.getLeaveRequestById(id);
            if (!leaveRequest) {
                res.status(404).json({ error: 'Leave request not found' });
                return;
            }

            if (user.role !== 'HR_ADMIN' && user.role !== 'MANAGER' && user.employeeId !== leaveRequest.employeeId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            if (!leaveRequest.medicalCertificatePath) {
                res.status(404).json({ error: 'No medical certificate attached' });
                return;
            }

            const key = leaveRequest.medicalCertificatePath;
            const { body, contentType, contentLength } = await storageService.download(key);

            res.setHeader('Content-Type', contentType);
            if (contentLength) res.setHeader('Content-Length', contentLength);
            res.setHeader('Content-Disposition', 'inline');

            body.pipe(res);
        } catch (error: any) {
            console.error('Download medical certificate error:', error);
            res.status(500).json({ error: 'Failed to download medical certificate' });
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
