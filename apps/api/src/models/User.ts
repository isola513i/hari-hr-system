export interface User {
    userId: string;
    employeeId: string;
    email: string;
    name: string;
    role: 'HR_ADMIN' | 'EMPLOYEE';
    avatar?: string;
    jobTitle?: string;
    department?: string;
    bio?: string;
    phone?: string;
    emailNotifications?: boolean;
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
    token: string;           // backward compat alias = accessToken
    accessToken: string;
    refreshToken: string;
    user: User;
}

/**
 * Returned by login() when the account has 2FA enabled. No access/refresh token
 * is issued at this stage — the caller must detect `totp_required`, then submit
 * the TOTP code together with `pending_token` to POST /auth/2fa/verify to obtain
 * a real AuthResponse. Modeling this as its own type (rather than casting it to
 * AuthResponse) keeps the two outcomes distinct so a half-authenticated session
 * can never be mistaken for a fully-authenticated one.
 */
export interface TotpPendingResponse {
    totp_required: true;
    pending_token: string;
}

/** Result of login(): either full authentication, or a 2FA challenge. */
export type LoginResult = AuthResponse | TotpPendingResponse;

export interface RegisterRequest {
    email: string;
    password: string;
    confirmPassword: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
    confirmPassword: string;
}
