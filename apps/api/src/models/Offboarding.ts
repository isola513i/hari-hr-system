// ==========================================
// Database Row Interfaces (snake_case)
// ==========================================

export interface OffboardingTaskRow {
    id: string;
    employee_id: string;
    title: string;
    description: string | null;
    stage: string;            // 'Pre-Exit' | 'Last Week' | 'Post-Exit'
    assignee: string;         // 'HR' | 'IT' | 'Manager' | 'Employee' | 'Finance'
    due_date: string | null;
    completed: boolean;
    priority: string;         // 'High' | 'Medium' | 'Low'
    created_at: string;
    updated_at: string;
}

export interface ExitInterviewRow {
    id: string;
    employee_id: string;
    reason_for_leaving: string | null;
    satisfaction_rating: number | null;
    would_rehire: boolean | null;
    feedback: string | null;
    improvements_suggested: string | null;
    conducted_by: string | null;
    conducted_at: string;
    created_at: string;
    updated_at: string;
}

// ==========================================
// DTOs (Request)
// ==========================================

export interface InitiateOffboardingDTO {
    terminationReason: string;    // 'Resignation' | 'Performance' | 'Restructuring' | 'Retirement' | 'Other'
    lastWorkingDay: string;       // ISO date string (YYYY-MM-DD)
    terminationNotes?: string;
}

export interface CreateOffboardingTaskDTO {
    employeeId: string;
    title: string;
    description?: string;
    stage: 'Pre-Exit' | 'Last Week' | 'Post-Exit';
    assignee: 'HR' | 'IT' | 'Manager' | 'Employee' | 'Finance';
    dueDate?: string;
    priority?: 'High' | 'Medium' | 'Low';
}

export interface UpdateOffboardingTaskDTO {
    title?: string;
    description?: string;
    stage?: 'Pre-Exit' | 'Last Week' | 'Post-Exit';
    assignee?: 'HR' | 'IT' | 'Manager' | 'Employee' | 'Finance';
    dueDate?: string;
    completed?: boolean;
    priority?: 'High' | 'Medium' | 'Low';
}

export interface ExitInterviewDTO {
    reasonForLeaving?: string;     // 'Better Opportunity' | 'Career Change' | 'Compensation' | 'Manager' | 'Relocation' | 'Personal' | 'Other'
    satisfactionRating?: number;   // 1-5
    wouldRehire?: boolean;
    feedback?: string;
    improvementsSuggested?: string;
}

// ==========================================
// Response Types (camelCase for frontend)
// ==========================================

export interface OffboardingTaskResponse {
    id: string;
    employeeId: string;
    title: string;
    description: string;
    stage: string;
    assignee: string;
    dueDate: string | null;
    completed: boolean;
    priority: string;
    createdAt: string;
    updatedAt: string;
}

export interface ExitInterviewResponse {
    id: string;
    employeeId: string;
    reasonForLeaving: string | null;
    satisfactionRating: number | null;
    wouldRehire: boolean | null;
    feedback: string | null;
    improvementsSuggested: string | null;
    conductedBy: string | null;
    conductedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface OffboardingProgress {
    total: number;
    completed: number;
    percentage: number;
}

// ==========================================
// Enums / Validation Constants
// ==========================================

export const VALID_TERMINATION_REASONS = [
    'Resignation',
    'Performance',
    'Restructuring',
    'Retirement',
    'Other',
] as const;

export const VALID_OFFBOARDING_STAGES = ['Pre-Exit', 'Last Week', 'Post-Exit'] as const;
export const VALID_OFFBOARDING_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const VALID_OFFBOARDING_ASSIGNEES = ['HR', 'IT', 'Manager', 'Employee', 'Finance'] as const;

export const VALID_EXIT_REASONS = [
    'Better Opportunity',
    'Career Change',
    'Compensation',
    'Manager',
    'Relocation',
    'Personal',
    'Other',
] as const;
