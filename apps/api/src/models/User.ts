export type { User, UserRole, LoginCredentials, AuthResponse } from '@hari/shared-types';

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    confirmPassword: string;
}
