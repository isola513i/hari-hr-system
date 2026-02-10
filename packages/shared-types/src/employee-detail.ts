export interface JobHistoryItem {
  id: string;
  role: string;
  department: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  date: string;
  reviewer: string;
  rating: number;
  notes: string;
}

export interface EmployeeTrainingRecord {
  id: string;
  employeeId: string;
  title: string;
  duration: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  completionDate?: string;
  score?: number;
}

export interface TrainingModule {
  id: string;
  title: string;
  duration: string;
  type: 'Video' | 'Quiz' | 'Reading';
  status: 'Locked' | 'In Progress' | 'Completed';
  progress: number;
  thumbnail: string;
}

export interface OrgNode {
  id: string;
  parentId: string | null;
  name: string;
  role: string;
  avatar: string;
  department?: string;
  email?: string;
  status?: 'Active' | 'On Leave' | 'Terminated';
  directReportCount?: number;
  children?: OrgNode[];
}
