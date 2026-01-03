import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, BiometricType } from '@/types/auth';
import { authAPI, biometricAPI } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  verifyBiometric: (type: BiometricType, verificationData?: string) => Promise<boolean>;
  logout: () => void;
  enrollBiometric: (userId: string, type: BiometricType, enrollmentData?: string) => Promise<boolean>;
  updateUserBiometric: (userId: string, type: BiometricType, enabled: boolean) => void;
  loadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    passwordVerified: false,
    biometricVerified: false,
    currentStep: 'password',
  });

  // Load user on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      loadUser();
    }
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setAuthState({
        user: {
          id: userData.id.toString(),
          username: userData.username,
          role: userData.role,
          biometrics: userData.biometrics,
          isActive: userData.is_active,
        },
        isAuthenticated: true,
        passwordVerified: true,
        biometricVerified: true,
        currentStep: 'complete',
      });
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('access_token');
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      await authAPI.login(username, password);
      const userData = await authAPI.getCurrentUser();
      
      setAuthState(prev => ({
        ...prev,
        user: {
          id: userData.id.toString(),
          username: userData.username,
          role: userData.role,
          biometrics: userData.biometrics,
          isActive: userData.is_active,
        },
        passwordVerified: true,
        currentStep: 'biometric',
      }));
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const verifyBiometric = async (type: BiometricType, verificationData?: string): Promise<boolean> => {
    try {
      const result = await biometricAPI.verify(type, verificationData);
      
      if (result.success) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          biometricVerified: true,
          currentStep: 'complete',
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric verification failed:', error);
      return false;
    }
  };

  const logout = () => {
    authAPI.logout().catch(console.error);
    setAuthState({
      user: null,
      isAuthenticated: false,
      passwordVerified: false,
      biometricVerified: false,
      currentStep: 'password',
    });
  };

  const enrollBiometric = async (userId: string, type: BiometricType, enrollmentData?: string): Promise<boolean> => {
    try {
      console.log('enrollBiometric called:', { userId, type, hasData: !!enrollmentData });
      const result = await biometricAPI.enroll(type, enrollmentData);
      console.log('Biometric API result:', result);
      
      if (result.success && authState.user?.id === userId) {
        setAuthState(prev => ({
          ...prev,
          user: prev.user ? {
            ...prev.user,
            biometrics: {
              ...prev.user.biometrics,
              [type]: true,
            },
          } : null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric enrollment failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return false;
    }
  };

  const updateUserBiometric = async (userId: string, type: BiometricType, enabled: boolean) => {
    try {
      await biometricAPI.toggle(type, enabled);
      
      if (authState.user?.id === userId) {
        setAuthState(prev => ({
          ...prev,
          user: prev.user ? {
            ...prev.user,
            biometrics: {
              ...prev.user.biometrics,
              [type]: enabled,
            },
          } : null,
        }));
      }
    } catch (error) {
      console.error('Failed to update biometric:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      verifyBiometric,
      logout,
      enrollBiometric,
      updateUserBiometric,
      loadUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
