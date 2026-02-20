/**
 * Authentication service for DJ Grain Hub
 *
 * All credential validation and token signing now happens server-side.
 * The client stores the JWT returned by the backend, decodes it locally
 * to read claims (avoiding extra round-trips), and sends it as a Bearer
 * header on every API request via api.ts.
 */

// ─── Constants ────────────────────────────────────────────────────────

const TOKEN_KEY = 'dj_grain_hub_token';

// ─── Types ────────────────────────────────────────────────────────────

export type AccessRole = 'super_admin' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  accessRole: AccessRole;
  status: string;
  ownedMachineId?: string;
}

export interface JWTPayload {
  sub: string;
  name: string;
  email: string;
  username: string;
  role: string;
  accessRole: AccessRole;
  ownedMachineId?: string;
  iat: number;
  exp: number;
}

// ─── JWT decode (client-side, no verification) ───────────────────────
// Used only to read claims from the server-issued token without an
// extra round-trip. The server always re-validates on every request.

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

export function decodeTokenUnsafe(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64urlDecode(parts[1])) as JWTPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeTokenUnsafe(token);
  if (!payload?.exp) return true;
  return payload.exp < Math.floor(Date.now() / 1000);
}

// ─── Token Storage ────────────────────────────────────────────────────

export function storeToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}

export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function removeToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

// ─── Auth Flow ────────────────────────────────────────────────────────

/**
 * Full login flow: calls POST /api/auth/login → stores JWT → returns user.
 */
export async function login(username: string, password: string): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { token: string; user: any };
    storeToken(data.token);
    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      username: data.user.username,
      role: data.user.role,
      accessRole: data.user.accessRole as AccessRole,
      status: data.user.status,
      ownedMachineId: data.user.ownedMachineId || '',
    };
  } catch {
    return null;
  }
}

/**
 * Validate credentials without persisting a new token.
 * Used by the kiosk admin modal to verify operator identity.
 */
export async function validateCredentials(username: string, password: string): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { token: string; user: any };
    // Do NOT store the token — operator is proving identity, not logging in
    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      username: data.user.username,
      role: data.user.role,
      accessRole: data.user.accessRole as AccessRole,
      status: data.user.status,
      ownedMachineId: data.user.ownedMachineId || '',
    };
  } catch {
    return null;
  }
}

/**
 * Full logout flow: removes stored token.
 */
export function logout(): void {
  removeToken();
}

/**
 * Session restore: checks token locally for expiry, then calls GET /api/auth/me.
 */
export async function getSession(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  if (isTokenExpired(token)) {
    removeToken();
    return null;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      removeToken();
      return null;
    }
    const user = await res.json() as any;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      accessRole: user.accessRole as AccessRole,
      status: user.status,
      ownedMachineId: user.ownedMachineId || '',
    };
  } catch {
    return null;
  }
}

// ─── Permissions ──────────────────────────────────────────────────────

export const permissions = {
  canManageUsers: (role: AccessRole) => role === 'super_admin',
  canManageMachines: (role: AccessRole) => role === 'super_admin' || role === 'admin',
  canViewTransactions: (role: AccessRole) => role === 'super_admin' || role === 'admin',
  canViewDashboard: (role: AccessRole) => role === 'super_admin' || role === 'admin',
  canViewReports: (role: AccessRole) => role === 'super_admin' || role === 'admin',
  canExportData: (role: AccessRole) => role === 'super_admin',
  canDeleteMachines: (role: AccessRole) => role === 'super_admin',
  canEditSettings: (role: AccessRole) => role === 'super_admin',
};

/**
 * Get human-readable label for access role
 */
export function getAccessRoleLabel(role: AccessRole): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    default:
      return 'Unknown';
  }
}