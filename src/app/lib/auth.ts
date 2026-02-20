/**
 * JWT Authentication Service for DJ Grain Hub
 * 
 * Uses the native Web Crypto API for HMAC-SHA256 JWT signing/verification.
 * No external dependencies required.
 * 
 * NOTE: In production, JWT signing/verification and password validation
 * should happen server-side. This client-side implementation is for
 * demo/prototype purposes only. Passwords in users.json would be
 * bcrypt-hashed and stored in a real database.
 */

import usersData from '../../db/users.json';

// JWT Config
const JWT_SECRET = 'dj-grain-hub-jwt-secret-key-2026-secure';
const TOKEN_KEY = 'dj_grain_hub_token';
const TOKEN_EXPIRY_HOURS = 8;

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
  iat: number;
  exp: number;
}

// ─── Base64url helpers ────────────────────────────────────────────────

function base64urlEncode(data: string): string {
  const base64 = btoa(data);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── Web Crypto HMAC-SHA256 ───────────────────────────────────────────

async function getCryptoKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function hmacSign(data: string): Promise<string> {
  const key = await getCryptoKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return uint8ArrayToBase64url(new Uint8Array(signature));
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
  const expectedSignature = await hmacSign(data);
  return expectedSignature === signature;
}

// ─── JWT Operations ───────────────────────────────────────────────────

/**
 * Generate a signed JWT token
 */
export async function generateToken(user: AuthUser): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const payload: JWTPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    accessRole: user.accessRole,
    iat: now,
    exp: now + (TOKEN_EXPIRY_HOURS * 3600),
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSign(signingInput);

  return `${signingInput}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const isValid = await hmacVerify(signingInput, signature);
    if (!isValid) {
      console.error('JWT: Invalid signature');
      return null;
    }

    // Decode payload
    const payload: JWTPayload = JSON.parse(base64urlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.error('JWT: Token expired');
      return null;
    }

    // Look up user record to get ownedMachineId (not stored in JWT)
    const userRecord = usersData.find((u: any) => u.id === payload.sub);

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      accessRole: payload.accessRole,
      status: 'active',
      ownedMachineId: (userRecord as any)?.ownedMachineId || '',
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Decode a JWT without verification (for display purposes only)
 */
export function decodeTokenUnsafe(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64urlDecode(parts[1]));
  } catch {
    return null;
  }
}

// ─── Credential Validation ────────────────────────────────────────────

/**
 * Authenticate user credentials against the user database
 */
export function validateCredentials(username: string, password: string): AuthUser | null {
  const user = usersData.find(
    (u: any) => u.username === username && u.password === password
  );

  if (!user) return null;
  if (user.status === 'inactive') return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    accessRole: (user as any).accessRole as AccessRole,
    status: user.status,
    ownedMachineId: (user as any).ownedMachineId || '',
  };
}

// ─── Token Storage ────────────────────────────────────────────────────

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Auth Flow ────────────────────────────────────────────────────────

/**
 * Full login flow: validate -> generate JWT -> store
 */
export async function login(username: string, password: string): Promise<AuthUser | null> {
  const user = validateCredentials(username, password);
  if (!user) return null;

  const token = await generateToken(user);
  storeToken(token);

  return user;
}

/**
 * Full logout flow: remove token
 */
export function logout(): void {
  removeToken();
}

/**
 * Session restore: verify stored token
 */
export async function getSession(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  const user = await verifyToken(token);
  if (!user) {
    removeToken();
    return null;
  }

  return user;
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