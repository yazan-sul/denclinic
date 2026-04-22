'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'STAFF' | 'ADMIN' | 'CLINIC_OWNER';

export interface User {
  id: number;
  name: string;
  email: string | null;
  phoneNumber: string;
  roles: UserRole[];
  avatar?: string;
  emailVerified: boolean;
  googleId?: string;
  doctorProfileId?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeRole: UserRole | null;
  switchRole: (role: UserRole) => void;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
}

export interface SignupData {
  fullName: string;
  username: string;
  email?: string;
  phoneNumber: string;
  dateOfBirth: string;
  nationalId: string;
  bloodType: string;
  gender: 'male' | 'female';
  password: string;
  confirmPassword: string;
  role?: 'PATIENT' | 'DOCTOR';
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = (id: number) => `activeRole_${id}`;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Call /api/auth/me which will use the HTTP-only cookie automatically
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include', // Important: include cookies in request
          cache: 'no-store',
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.data);
        } else {
          // If not authenticated, user stays null
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ identifier, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.message || 'فشل تسجيل الدخول');
      }

      const data = await response.json();
      // Cookie is set automatically by server, just update user state
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في تسجيل الدخول';
      setError(message);
      throw err;
    }
  };

  const signup = async (data: SignupData) => {
    setError(null);
    try {
      if (data.password !== data.confirmPassword) {
        throw new Error('كلمات المرور غير متطابقة');
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({
          firstName: data.fullName.trim().split(/\s+/)[0] || '',
          fatherName: data.fullName.trim().split(/\s+/)[1] || '',
          grandfatherName: data.fullName.trim().split(/\s+/)[2] || '',
          familyName: data.fullName.trim().split(/\s+/).slice(3).join(' ') || '',
          username: data.username,
          email: data.email,
          phoneNumber: data.phoneNumber,
          dateOfBirth: data.dateOfBirth,
          nationalId: data.nationalId,
          bloodType: data.bloodType,
          gender: data.gender,
          password: data.password,
          confirmPassword: data.confirmPassword,
          role: data.role || 'PATIENT',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.message || 'فشل إنشاء الحساب');
      }

      const responseData = await response.json();
      // Cookie is set automatically by server, just update user state
      setUser(responseData.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في إنشاء الحساب';
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      // Call logout endpoint - server will clear the HTTP-only cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies in request
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      // Clear client-side state regardless
      sessionStorage.clear();
      setUser(null);
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل إرسال رابط إعادة تعيين كلمة المرور');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في إرسال رابط إعادة التعيين';
      setError(message);
      throw err;
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل إعادة تعيين كلمة المرور');
      }

      const data = await response.json();
      // Cookie is set automatically by server, just update user state
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في إعادة تعيين كلمة المرور';
      setError(message);
      throw err;
    }
  };

  const verifyEmail = async (token: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل التحقق من البريد الإلكتروني');
      }

      const data = await response.json();
      if (user) {
        setUser({ ...user, emailVerified: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في التحقق من البريد الإلكتروني';
      setError(message);
      throw err;
    }
  };

  const googleLogin = async (idToken: string) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل تسجيل الدخول عبر Google');
      }

      const data = await response.json();
      // Cookie is set automatically by server, just update user state
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في تسجيل الدخول عبر Google';
      setError(message);
      throw err;
    }
  };

  // Sync activeRole when user loads / changes
  useEffect(() => {
    if (!user) { setActiveRole(null); return; }
    const stored = localStorage.getItem(ROLE_STORAGE_KEY(user.id)) as UserRole | null;
    setActiveRole(stored && user.roles.includes(stored) ? stored : user.roles[0] ?? null);
  }, [user]);

  const switchRole = (role: UserRole) => {
    if (!user || !user.roles.includes(role)) return;
    setActiveRole(role);
    localStorage.setItem(ROLE_STORAGE_KEY(user.id), role);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        activeRole,
        switchRole,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        googleLogin,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
