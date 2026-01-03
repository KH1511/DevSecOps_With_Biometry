import axios, { AxiosError } from 'axios';
import type { BiometricType } from '@/types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  async login(username: string, password: string) {
    const response = await api.post('/auth/login', { username, password });
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async logout() {
    await api.post('/auth/logout');
    localStorage.removeItem('access_token');
  },
};

// Biometric API
export const biometricAPI = {
  async enroll(biometricType: BiometricType, enrollmentData?: string) {
    console.log('API enroll called:', { biometricType, hasData: !!enrollmentData, dataLength: enrollmentData?.length });
    const payload = {
      biometric_type: biometricType,
      enrollment_data: enrollmentData,
    };
    console.log('Sending payload:', { ...payload, enrollment_data: enrollmentData ? `${enrollmentData.substring(0, 50)}...` : null });
    
    try {
      const response = await api.post('/biometric/enroll', payload);
      console.log('API enroll response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API enroll error:', error);
      throw error;
    }
  },

  async verify(biometricType: BiometricType, verificationData?: string) {
    const response = await api.post('/biometric/verify', {
      biometric_type: biometricType,
      verification_data: verificationData,
    });
    return response.data;
  },

  async toggle(biometricType: BiometricType, enabled: boolean) {
    const response = await api.put('/biometric/toggle', {
      biometric_type: biometricType,
      enabled,
    });
    return response.data;
  },

  async detectFace(imageData: string) {
    const response = await api.post('/biometric/detect-face', {
      image: imageData,
    });
    return response.data;
  },
};

// Command API
export const commandAPI = {
  async getCommands() {
    const response = await api.get('/commands');
    return response.data;
  },

  async createCommand(commandData: {
    name: string;
    description?: string;
    command: string;
    category: 'build' | 'deploy' | 'test' | 'security' | 'monitoring';
    is_enabled?: boolean;
  }) {
    const response = await api.post('/commands', commandData);
    return response.data;
  },

  async executeCommand(commandId: number) {
    const response = await api.post('/commands/execute', {
      command_id: commandId,
    });
    return response.data;
  },
};

export default api;
