export interface LeaveRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    dates: string;
    days: number;
    reason?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    avatar?: string;
}

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
