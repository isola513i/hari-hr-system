export interface User {
    userId: string;
    employeeId: string;
    email: string;
    name: string;
    role: 'HR_ADMIN' | 'EMPLOYEE';
    avatar?: string;
    jobTitle?: string;
    department?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface RegisterRequest {
    email: string;
    password: string;
    confirmPassword: string;
}
