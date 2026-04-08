import { OnboardingTask, Employee, OnboardingDocument, KeyContact } from '../../types';

export interface FlowStage {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    tasks: { title: string; completed: boolean }[];
}

export type ShowToastFn = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

export interface FlowGraphProps {
    tasks: OnboardingTask[];
}

export interface TaskListProps {
    tasks: OnboardingTask[];
    filteredTasks: OnboardingTask[];
    groupedTasks: Record<string, OnboardingTask[]>;
    userRole: string | undefined;
    progress: number;
    readOnly?: boolean;
    assigneeFilter: string;
    priorityFilter: string;
    dateFilter: string;
    onSetAssigneeFilter: (value: string) => void;
    onSetPriorityFilter: (value: string) => void;
    onSetDateFilter: (value: string) => void;
    onToggleTask: (id: string) => void;
    onCyclePriority: (id: string) => void;
    getStageIcon: (stage: string) => React.ReactNode;
    formatDate: (dateString: string) => string;
    isDueSoon: (dateString: string) => boolean;
    isOverdue: (dateString: string) => boolean;
    getPriorityBadgeClass: (priority: string) => string;
}

export interface KeyContactsProps {
    contacts: KeyContact[];
    showToast: ShowToastFn;
    isAdmin?: boolean;
    onAddContact?: (data: { name: string; role: string; relation: string; email: string }) => void;
    onEditContact?: (id: string, data: { name: string; role: string; relation: string; email: string }) => void;
    onDeleteContact?: (id: string) => void;
}

export interface DocumentChecklistProps {
    documents: OnboardingDocument[];
    userRole: string | undefined;
    uploadingDocId: string | null;
    reviewNoteDocId: string | null;
    reviewNote: string;
    onSetUploadingDocId: (id: string | null) => void;
    onSetReviewNoteDocId: (id: string | null) => void;
    onSetReviewNote: (note: string) => void;
    onDocUpload: (docId: string, file: File) => void;
    onDocDownload: (docId: string) => void;
    onDocReview: (docId: string, status: 'Approved' | 'Rejected', note?: string) => void;
}

export interface OnboardingOverviewProps {
    employees: Employee[];
    tasks: OnboardingTask[];
    documents: OnboardingDocument[];
    onSelectEmployee: (id: string) => void;
}

export interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    inviteForm: {
        name: string;
        email: string;
        role: string;
        department: string;
        startDate: string;
    };
    inviteErrors: Record<string, string>;
    allEmployees: Employee[];
    onSetInviteForm: (form: InviteModalProps['inviteForm']) => void;
    onSetInviteErrors: (errors: Record<string, string>) => void;
    onSelectEmployee: (employee: Employee) => void;
    onSubmit: (e: React.FormEvent) => void;
}
