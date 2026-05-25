import { Employee, JobHistoryItem, PerformanceReview, DocumentItem, OffboardingTask, ExitInterview, OffboardingProgress } from '../../types';

// Shared types
export interface EmployeePermissions {
    isOwnProfile: boolean;
    isAdmin: boolean;
    canEditBasicInfo: boolean;
    canEditSensitiveInfo: boolean;
    canViewSensitiveTabs: boolean;
}

export type EmployeeTab = 'overview' | 'history' | 'documents' | 'training' | 'performance' | 'leave-quotas' | 'offboarding';

export type ShowToastFn = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

// Component Props
export interface EmployeeHeroProps {
    employee: Employee;
    avatar: string;
    permissions: EmployeePermissions;
    onEditProfileClick: () => void;
    onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBannerColorChange: (color: string) => void;
    onPromote: () => void;
    onTransfer: () => void;
    onTerminate: () => void;
}

export interface EmployeeSidebarProps {
    employee: Employee;
    permissions: EmployeePermissions;
    manager: Employee | null;
    directReports: Employee[];
}

export interface OverviewTabProps {
    employee: Employee;
    permissions: EmployeePermissions;
    currentSkills: string[];
    isEditingSkills: boolean;
    newSkillInput: string;
    onSetIsEditingSkills: (editing: boolean) => void;
    onSetNewSkillInput: (input: string) => void;
    onAddSkill: () => void;
    onRemoveSkill: (skill: string) => void;
    onSaveSkills: () => void;
    onCancelSkills: () => void;
}

export interface HistoryTabProps {
    permissions: EmployeePermissions;
    historyList: JobHistoryItem[];
    editingHistoryId: string | null;
    tempHistoryItem: JobHistoryItem | null;
    onSetTempHistoryItem: (item: JobHistoryItem | null) => void;
    onStartEditHistory: (item: JobHistoryItem) => void;
    onCancelEditHistory: () => void;
    onSaveHistory: () => void;
    onAddClick: () => void;
    onDeleteHistory?: (id: string) => void;
}

export interface DocumentsTabProps {
    documentsList: DocumentItem[];
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showToast: ShowToastFn;
}

export interface TrainingTabProps {
    isAdmin: boolean;
    trainingRecords: any[];
    showToast: ShowToastFn;
}

export interface PerformanceTabProps {
    isAdmin: boolean;
    canAddReview: boolean;
    currentUserId?: string;
    reviewsList: PerformanceReview[];
    onAddReview: () => void;
    onEditReview: (review: PerformanceReview) => void;
    onDeleteReview: (reviewId: string) => void;
}

export interface OffboardingTabProps {
    employee: Employee;
    tasks: OffboardingTask[];
    exitInterview: ExitInterview | null;
    progress: OffboardingProgress;
    isLoading: boolean;
    onUpdateTask: (taskId: string, payload: { completed: boolean }) => void;
    onSaveExitInterview: (payload: Record<string, unknown>) => void;
    showToast: ShowToastFn;
}

export interface EmployeeModalsProps {
    // Edit Profile Modal
    isEditProfileOpen: boolean;
    editForm: Partial<Employee>;
    permissions: EmployeePermissions;
    onCloseEditProfile: () => void;
    onProfileChange: (field: keyof Employee, value: any) => void;
    onProfileSave: () => void;

    // Add History Modal
    isAddHistoryModalOpen: boolean;
    newHistoryForm: Partial<JobHistoryItem>;
    onSetNewHistoryForm: (form: Partial<JobHistoryItem>) => void;
    onCloseAddHistory: () => void;
    onSaveNewHistory: () => void;

    // Review Modal
    isReviewModalOpen: boolean;
    reviewForm: Partial<PerformanceReview>;
    isAdmin: boolean;
    onSetReviewForm: (form: Partial<PerformanceReview>) => void;
    onCloseReviewModal: () => void;
    onSaveReview: () => void;

    // Delete Confirmation Modal
    deleteConfirmId: string | null;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;

    // Promote Modal
    isPromoteOpen: boolean;
    promoteForm: { role: string; salary: string };
    onPromoteFormChange: (field: 'role' | 'salary', value: string) => void;
    onClosePromote: () => void;
    onConfirmPromote: () => void;

    // Transfer Modal
    isTransferOpen: boolean;
    transferDepartment: string;
    onTransferDepartmentChange: (value: string) => void;
    onCloseTransfer: () => void;
    onConfirmTransfer: () => void;

    // Terminate / Initiate Offboarding Modal
    isTerminateOpen: boolean;
    terminateForm: {
        terminationReason: string;
        lastWorkingDay: string;
        terminationNotes: string;
    };
    onTerminateFormChange: (field: 'terminationReason' | 'lastWorkingDay' | 'terminationNotes', value: string) => void;
    onCloseTerminate: () => void;
    onConfirmTerminate: () => void;
}
