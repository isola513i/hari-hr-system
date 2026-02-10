export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: 'Birthday' | 'Meeting' | 'Social' | 'Training' | 'Holiday' | 'Deadline' | 'Company Event';
  avatar?: string;
  color?: string;
}

export interface AuditLogItem {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'user' | 'leave' | 'policy';
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  type: 'announcement' | 'policy' | 'event';
  date?: string;
  author?: string;
  createdAt?: string;
}

export interface ComplianceItem {
  id: string;
  title: string;
  status: 'Complete' | 'In Progress' | 'Overdue';
}

export interface OnboardingProgressSummary {
  id: string;
  name: string;
  role: string;
  progress: number;
  avatar?: string;
}
