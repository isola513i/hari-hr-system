export type OnboardingStage = 'Pre-boarding' | 'Week 1' | 'Month 1';
export type OnboardingPriority = 'High' | 'Medium' | 'Low';
export type OnboardingDocStatus = 'Pending' | 'Uploaded' | 'Approved' | 'Rejected';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  stage: OnboardingStage;
  assignee: string;
  dueDate: string;
  completed: boolean;
  priority: OnboardingPriority;
  link?: string;
}

export interface OnboardingDocument {
  id: string;
  employeeId: string;
  name: string;
  description: string;
  status: OnboardingDocStatus;
  filePath: string | null;
  fileType: string | null;
  fileSize: string | null;
  uploadedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface KeyContact {
  id: string;
  name: string;
  role: string;
  relation: string;
  email: string;
  avatar: string;
}
