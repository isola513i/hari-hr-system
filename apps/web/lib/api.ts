import { LoginCredentials, AuthResponse, TotpLoginResponse, TotpSetupResponse, TotpStatusResponse } from '../types';
import errorLogging from '../services/errorLogging';

// Use environment variable for API URL, fallback to /api for local development with proxy
export const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// API host for constructing asset URLs (avatars, uploads)
// If VITE_API_URL is set (e.g. https://api.example.com/api), extract the origin
// If not set (local dev with proxy), use empty string for relative URLs
export const API_HOST = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : '';

// Helper to resolve avatar URLs - converts relative paths to absolute
export const resolveAvatarUrl = (avatar: string | null | undefined, fallbackName?: string): string => {
  if (!avatar || avatar.startsWith('blob:')) return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'User')}`;
  if (avatar.startsWith('/')) return `${API_HOST}${avatar}`;
  return avatar;
};

/**
 * Type for request body data
 * Constrains data to be a valid JSON-serializable object
 */
type RequestBody = Record<string, unknown> | Array<unknown>;

// ============================================================================
// Token helpers (exported for raw fetch calls like FormData uploads)
// ============================================================================

export function getAuthToken(): string | null {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// ============================================================================
// Refresh token queue — ensures only ONE refresh at a time
// ============================================================================

let refreshPromise: Promise<boolean> | null = null;

function getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

function getActiveStorage(): Storage {
    return localStorage.getItem('token') ? localStorage : sessionStorage;
}

function clearAuthStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
}

async function refreshAccessToken(): Promise<boolean> {
    const rt = getRefreshToken();
    if (!rt) return false;

    try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
        });

        if (!response.ok) return false;

        const data: AuthResponse = await response.json();
        const storage = getActiveStorage();
        storage.setItem('token', data.accessToken || data.token);
        storage.setItem('refreshToken', data.refreshToken);
        // Keep user data fresh — map backend fields to frontend User format
        if (data.user) {
            const existingUser = JSON.parse(storage.getItem('user') || '{}');
            const mappedUser = {
                ...existingUser,
                ...data.user,
                id: data.user.employeeId || data.user.userId || existingUser.id,
                employeeId: data.user.employeeId,
            };
            storage.setItem('user', JSON.stringify(mappedUser));
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Queue-based refresh: concurrent 401s share the same refresh promise.
 */
function queueRefresh(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

// ============================================================================
// Core helpers
// ============================================================================

const getHeaders = () => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept-Language': localStorage.getItem('language') || 'en',
    };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const handleResponse = async (response: Response, retryFn?: () => Promise<Response>) => {
    if (response.status === 401 && retryFn) {
        // Attempt to refresh the access token
        const refreshed = await queueRefresh();
        if (refreshed) {
            const retryResponse = await retryFn();
            if (retryResponse.status === 401) {
                // Refresh succeeded but retry still 401 — give up
                clearAuthStorage();
                window.location.href = '/#/login';
                throw new Error('Unauthorized');
            }
            if (!retryResponse.ok) {
                const error = await retryResponse.json().catch(() => ({}));
                throw new Error(error.error || error.message || 'Request failed');
            }
            return retryResponse.json();
        }
        // Refresh failed — clear storage and redirect
        clearAuthStorage();
        window.location.href = '/#/login';
        throw new Error('Unauthorized');
    }
    if (response.status === 401) {
        clearAuthStorage();
        window.location.href = '/#/login';
        throw new Error('Unauthorized');
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Request failed');
    }
    return response.json();
};

// ============================================================================
// Public API
// ============================================================================

export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: getHeaders(),
                cache: 'no-store',
            });
            return handleResponse(response, () =>
                fetch(`${BASE_URL}${endpoint}`, { method: 'GET', headers: getHeaders(), cache: 'no-store' })
            );
        } catch (error: any) {
            errorLogging.logError(error, { endpoint, method: 'GET' });
            throw error;
        }
    },

    post: async <T>(endpoint: string, data: RequestBody): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response, () =>
            fetch(`${BASE_URL}${endpoint}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })
        );
    },

    patch: async <T>(endpoint: string, data: RequestBody): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response, () =>
            fetch(`${BASE_URL}${endpoint}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) })
        );
    },

    put: async <T>(endpoint: string, data: RequestBody): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response, () =>
            fetch(`${BASE_URL}${endpoint}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) })
        );
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response, () =>
            fetch(`${BASE_URL}${endpoint}`, { method: 'DELETE', headers: getHeaders() })
        );
    },

    // Specifically for login which might not need token header or needs custom handling
    auth: {
        login: async (credentials: LoginCredentials): Promise<AuthResponse | TotpLoginResponse> => {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || error.message || 'Login failed');
            }
            return response.json();
        },

        // ── 2FA / TOTP ──────────────────────────────────────────────────────

        /** POST /auth/2fa/verify — complete TOTP login with pending_token + code */
        verifyTotp: async (pending_token: string, code: string, rememberMe?: boolean): Promise<AuthResponse> => {
            const response = await fetch(`${BASE_URL}/auth/2fa/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pending_token, code, rememberMe }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || error.message || 'Verification failed');
            }
            return response.json();
        },

        /** GET /auth/2fa/setup — generate QR code + secret (protected) */
        setupTotp: (): Promise<TotpSetupResponse> => api.get('/auth/2fa/setup'),

        /** POST /auth/2fa/enable — verify first code + enable 2FA */
        enableTotp: (secret: string, token: string): Promise<{ message: string; backupCodes: string[] }> =>
            api.post('/auth/2fa/enable', { secret, token }),

        /** POST /auth/2fa/disable — self-service disable (requires password) */
        disableTotp: (password: string): Promise<{ message: string }> =>
            api.post('/auth/2fa/disable', { password }),

        /** GET /auth/2fa/status — get 2FA enabled state + backup code count */
        getTotpStatus: (): Promise<TotpStatusResponse> => api.get('/auth/2fa/status'),

        /** POST /auth/2fa/backup-codes — regenerate backup codes */
        regenerateBackupCodes: (token: string): Promise<{ message: string; backupCodes: string[] }> =>
            api.post('/auth/2fa/backup-codes', { token }),

        /** POST /auth/2fa/admin-reset — HR_ADMIN: reset 2FA for any user */
        adminResetTotp: (userId: string): Promise<{ message: string }> =>
            api.post('/auth/2fa/admin-reset', { userId }),
    }
};
