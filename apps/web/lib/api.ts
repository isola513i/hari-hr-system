import { LoginCredentials, AuthResponse } from '../types';

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
  if (!avatar) return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'User')}`;
  if (avatar.startsWith('/')) return `${API_HOST}${avatar}`;
  return avatar;
};

/**
 * Type for request body data
 * Constrains data to be a valid JSON-serializable object
 */
type RequestBody = Record<string, unknown> | Array<unknown>;

const getHeaders = () => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const handleResponse = async (response: Response) => {
    if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Request failed');
    }
    return response.json();
};

export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    post: async <T>(endpoint: string, data: RequestBody): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    patch: async <T>(endpoint: string, data: RequestBody): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    put: async <T>(endpoint: string, data: RequestBody): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    // Specifically for login which might not need token header or needs custom handling
    auth: {
        login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
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
        }
    }
};
