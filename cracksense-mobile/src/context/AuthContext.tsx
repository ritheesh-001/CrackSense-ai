import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  initializeInsForgeSession,
  loginWithEmail,
  logoutUser,
  registerWithEmail
} from '../services/insforge';
import { UserProfile, UserRole } from '../types/models';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error: string | null }>;
  register: (
    email: string,
    pass: string,
    name: string,
    role?: UserRole
  ) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
  setUserProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false, error: null }),
  register: async () => ({ success: false, error: null }),
  logout: async () => {},
  setUserProfile: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAuth() {
      try {
        const sessionTask = initializeInsForgeSession();
        const timeoutTask = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 2000)
        );
        const stored = await Promise.race([sessionTask, timeoutTask]);
        if (isMounted && stored) {
          setUser(stored);
        }
      } catch (err) {
        console.warn('Auth restoration notice:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    const { profile, error } = await loginWithEmail(email, pass);
    setIsLoading(false);
    if (profile) {
      setUser(profile);
      return { success: true, error: null };
    }
    return { success: false, error: error || 'Login failed' };
  };

  const register = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole = 'Inspector'
  ) => {
    setIsLoading(true);
    const { profile, error } = await registerWithEmail(email, pass, name, role);
    setIsLoading(false);
    if (profile) {
      setUser(profile);
      return { success: true, error: null };
    }
    return { success: false, error: error || 'Registration failed' };
  };

  const logout = async () => {
    setIsLoading(true);
    await logoutUser();
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setUserProfile: setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
