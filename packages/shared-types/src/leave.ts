export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected';

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
  status: LeaveRequestStatus;
  avatar?: string;
}

export interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
}
