export type UserRole = 'HR_ADMIN' | 'EMPLOYEE';

export interface User {
  userId: string;
  employeeId: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  phone?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
