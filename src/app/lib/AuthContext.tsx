import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, AccessRole, getSession, login as authLogin, logout as authLogout, permissions } from './auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (check: (role: AccessRole) => boolean) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionUser = await getSession();
        setUser(sessionUser);
      } catch (error) {
        console.error('Session check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const loggedInUser = await authLogin(username, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (check: (role: AccessRole) => boolean): boolean => {
      if (!user || typeof check !== 'function') return false;
      return check(user.accessRole);
    },
    [user]
  );

  const isSuperAdmin = user?.accessRole === 'super_admin';
  const isAdmin = user?.accessRole === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasPermission,
        isSuperAdmin,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a safe default during HMR / React Fast Refresh
    // when the provider tree hasn't mounted yet.
    // This prevents the app from crashing with a blank screen.
    return {
      user: null,
      loading: true,
      login: async () => false,
      logout: () => {},
      hasPermission: () => false,
      isSuperAdmin: false,
      isAdmin: false,
    };
  }
  return context;
}

// Re-export permissions for convenience
export { permissions };