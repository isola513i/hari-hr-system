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
    status: 'Pending' | 'Manager Approved' | 'Approved' | 'Rejected' | 'Cancel Requested';
    avatar?: string;
    handoverEmployeeId?: string;
    handoverEmployeeName?: string;
    handoverNotes?: string;
    medicalCertificatePath?: string;
    rejectionReason?: string;
    approverEmployeeId?: string;
    updatedAt?: string;
    isHalfDay?: boolean;
    halfDayPeriod?: 'morning' | 'afternoon';
}

export interface CreateLeaveRequestDTO {
    employeeId: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
    handoverEmployeeId?: string;
    handoverNotes?: string;
    medicalCertificatePath?: string;
    isHalfDay?: boolean;
    halfDayPeriod?: 'morning' | 'afternoon';
}

export interface UpdateLeaveRequestDTO {
    status: 'Pending' | 'Manager Approved' | 'Approved' | 'Rejected';
    rejectionReason?: string;
    approverEmployeeId?: string;
    managerApprovedBy?: string;
    managerApprovedAt?: Date;
}

export interface EditLeaveRequestDTO {
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
    handoverEmployeeId?: string;
    handoverNotes?: string;
    medicalCertificatePath?: string;
    isHalfDay?: boolean;
    halfDayPeriod?: 'morning' | 'afternoon';
}
