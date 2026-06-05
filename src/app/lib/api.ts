/**
 * API client for DJ Grain Hub
 *
 * Wraps all fetch calls to the Express backend.
 * Uses /api which is proxied to http://localhost:3000 by Vite in development.
 * Bearer JWT is automatically attached from localStorage on every request.
 */

const BASE_URL = '/api';
const TOKEN_KEY = 'dj_grain_hub_token';

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Merge caller-supplied headers (allow overrides)
  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let errMessage = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      errMessage = body.error || body.message || errMessage;
    } catch {
      // ignore parse errors
    }
    throw new Error(errMessage);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string): Promise<T> =>
    request<T>(path),

  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string): Promise<T> =>
    request<T>(path, { method: 'DELETE' }),
};
