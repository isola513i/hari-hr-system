export interface ExpenseClaim {
    id: string;
    employeeId: string;
    employeeName: string;
    avatar: string;
    title: string;
    category: string;
    amount: number;
    currency: string;
    expenseDate: string;
    description?: string;
    receiptPath?: string;
    status: 'Pending' | 'Manager Approved' | 'Approved' | 'Rejected' | 'Reimbursed' | 'Cancelled';
    rejectionReason?: string;
    approverEmployeeId?: string;
    managerReviewedBy?: string;
    managerReviewedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateExpenseClaimDTO {
    employeeId: string;
    title: string;
    category: string;
    amount: number;
    expenseDate: string;
    description?: string;
    receiptPath?: string;
}

export interface UpdateExpenseClaimStatusDTO {
    status: 'Approved' | 'Rejected' | 'Reimbursed';
    rejectionReason?: string;
    approverEmployeeId?: string;
}
