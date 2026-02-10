export type EmployeeStatus = 'Active' | 'On Leave' | 'Terminated';

export type OnboardingStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  joinDate: string;
  salary?: number;
  avatar?: string;
  status?: EmployeeStatus;
  onboardingStatus?: OnboardingStatus;
  onboardingPercentage?: number;
  bio?: string;
  phone?: string;
  phoneNumber?: string;
  address?: string;
  location?: string;
  slack?: string;
  emergencyContact?: string;
  skills?: string[];
  managerId?: string;
}
