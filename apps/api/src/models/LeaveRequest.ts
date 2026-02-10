export type { LeaveRequest, LeaveRequestStatus } from '@hari/shared-types';

export interface CreateLeaveRequestDTO {
    employeeId: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
}

export interface UpdateLeaveRequestDTO {
    status: 'Pending' | 'Approved' | 'Rejected';
}
