export type BiometricType = 'face' | 'fingerprint' | 'voice';

export interface BiometricStatus {
  face: boolean;
  fingerprint: boolean;
  voice: boolean;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  biometrics: BiometricStatus;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  passwordVerified: boolean;
  biometricVerified: boolean;
  currentStep: 'password' | 'biometric' | 'complete';
}

export interface Command {
  id: string;
  name: string;
  description: string;
  command: string;
  category: 'build' | 'deploy' | 'test' | 'security' | 'monitoring';
  isEnabled: boolean;
}
