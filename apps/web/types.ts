import React from 'react';

export type UserRole = 'HR_ADMIN' | 'EMPLOYEE';

export interface User {
  id: string;
  employeeId?: string;
  email?: string;
  name: string;
  role: UserRole;
  avatar: string;
  jobTitle: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  avatar: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  onboardingStatus: 'Not Started' | 'In Progress' | 'Completed';
  joinDate: string;
  location: string;
  skills: string[];
  // New fields for ESS
  bio?: string;
  slack?: string;
  emergencyContact?: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  color: 'primary' | 'green' | 'orange' | 'red' | 'teal';
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  category: string;
  size: string;
  owner: string;
  lastAccessed: string;
  status: 'Active' | 'Deleted';
  deletedAt?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  dates: string; // Display string like "Jan 15 - Jan 18"
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  reason?: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  avatar: string;
}

export interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
}

export interface ComplianceItem {
  id: string;
  title: string;
  status: 'Complete' | 'In Progress' | 'Overdue';
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
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  stage: 'Pre-boarding' | 'Week 1' | 'Month 1';
  assignee: string;
  dueDate: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  link?: string; // Link to materials
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

export interface OnboardingProgressSummary {
  id: string;
  name: string;
  role: string;
  progress: number;
  avatar?: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: 'Birthday' | 'Meeting' | 'Social';
  avatar?: string;
  color?: string;
}

export interface KeyContact {
  id: string;
  name: string;
  role: string;
  relation: string;
  email: string;
  avatar: string;
}

export interface JobHistoryItem {
  id: string;
  role: string;
  department: string;
  startDate: string;
  endDate: string; // 'Present' if current
  description: string;
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

export interface OrgNode {
  id: string;
  parentId: string | null;
  name: string;
  role: string;
  avatar: string;
  department?: string;
  children?: OrgNode[]; // Helper for recursive rendering
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  date: string;
  reviewer: string;
  rating: number; // 1 to 5
  notes: string;
}