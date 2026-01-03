import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BiometricEnrollment } from './BiometricEnrollment';
import { BiometricType } from '@/types/auth';
import { 
  Fingerprint, 
  ScanFace, 
  Mic, 
  Settings, 
  UserCog,
  Shield,
  Plus
} from 'lucide-react';

const biometricConfig = {
  face: {
    icon: ScanFace,
    label: 'Face Recognition',
  },
  fingerprint: {
    icon: Fingerprint,
    label: 'Fingerprint',
  },
  voice: {
    icon: Mic,
    label: 'Voice Recognition',
  },
};

export function AdminPanel() {
  const { user, updateUserBiometric } = useAuth();
  const [showEnrollment, setShowEnrollment] = useState(false);

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-card border border-destructive/50 rounded-lg p-8 text-center">
        <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-xl font-bold text-destructive mb-2">Access Denied</h3>
        <p className="text-muted-foreground">
          You don't have permission to access the admin panel.
        </p>
      </div>
    );
  }

  if (showEnrollment) {
    return <BiometricEnrollment onBack={() => setShowEnrollment(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center border border-primary/50">
              <UserCog className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Administrator Panel</h3>
              <p className="text-sm text-muted-foreground font-mono">
                User: {user.username} | Role: {user.role.toUpperCase()}
              </p>
            </div>
          </div>
          <Button variant="terminal" onClick={() => setShowEnrollment(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Enroll Biometric
          </Button>
        </div>
      </div>

      {/* Biometric Management */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Biometric Settings</h3>
        </div>

        <div className="space-y-4">
          {(Object.entries(biometricConfig) as [BiometricType, typeof biometricConfig.face][]).map(([type, config]) => {
            const Icon = config.icon;
            const isEnabled = user.biometrics[type];

            return (
              <div
                key={type}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{config.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {isEnabled ? 'Enrolled and active' : 'Not enrolled'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => updateUserBiometric(user.id, type, checked)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-success" />
          <h3 className="text-lg font-bold">Security Status</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-success/10 border border-success/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-success">
              {Object.values(user.biometrics).filter(Boolean).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Biometrics</div>
          </div>
          <div className="bg-info/10 border border-info/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-info">MFA</div>
            <div className="text-sm text-muted-foreground">Authentication Level</div>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">Active</div>
            <div className="text-sm text-muted-foreground">Account Status</div>
          </div>
        </div>
      </div>
    </div>
  );
}
