import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/LoginForm';
import { BiometricVerification } from '@/components/BiometricVerification';
import { ForcedBiometricEnrollment } from '@/components/ForcedBiometricEnrollment';
import { CommandDashboard } from '@/components/CommandDashboard';
import { AdminPanel } from '@/components/AdminPanel';
import { Header } from '@/components/Header';
import { Shield } from 'lucide-react';

function AuthFlow() {
  const { isAuthenticated, passwordVerified, currentStep, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin'>('dashboard');

  // Initialize activeTab from URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  // Handle tab change with navigation
  const handleTabChange = (tab: 'dashboard' | 'admin') => {
    setActiveTab(tab);
    navigate(tab === 'dashboard' ? '/' : '/admin');
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background grid-pattern flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center border border-primary/50 animate-pulse">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-mono">VERIFYING SESSION...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header activeTab={activeTab} onTabChange={handleTabChange} />
        <main className="p-6">
          {activeTab === 'dashboard' ? <CommandDashboard /> : <AdminPanel />}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-pattern flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md">      
        {currentStep === 'password' && <LoginForm />}
        {currentStep === 'enrollment-required' && passwordVerified && <ForcedBiometricEnrollment />}
        {currentStep === 'biometric' && passwordVerified && <BiometricVerification />}
      </div>

      <footer className="absolute bottom-4 text-center text-xs text-muted-foreground font-mono">
        <p>SECURED BY MULTI-FACTOR AUTHENTICATION</p>
        <p className="mt-1">© 2026 DEVSECOPS CONSOLE</p>
      </footer>
    </div>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <AuthFlow />
    </AuthProvider>
  );
}
