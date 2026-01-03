import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { WebcamCapture } from '@/components/WebcamCapture';
import { AudioCapture } from '@/components/AudioCapture';
import { BiometricType } from '@/types/auth';
import { ScanFace, Shield, AlertCircle, CheckCircle2, Mic, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

const biometricOptions = [
  {
    type: 'face' as BiometricType,
    icon: ScanFace,
    label: 'Face Recognition',
    description: 'Use your camera to enroll your face',
    color: 'info',
  },
  {
    type: 'voice' as BiometricType,
    icon: Mic,
    label: 'Voice Recognition',
    description: 'Record your voice for authentication',
    color: 'accent',
  },
  {
    type: 'fingerprint' as BiometricType,
    icon: Fingerprint,
    label: 'Fingerprint',
    description: 'Coming soon - Fingerprint enrollment',
    color: 'primary',
    disabled: true,
  },
];

export function ForcedBiometricEnrollment() {
  const { user, enrollBiometric, loadUser, logout } = useAuth();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);
  const [selectedType, setSelectedType] = useState<BiometricType | null>(null);

  const startEnrollment = (type: BiometricType) => {
    setSelectedType(type);
    if (type === 'face') {
      setShowCamera(true);
    } else if (type === 'voice') {
      setShowAudio(true);
    }
  };

  const handleFaceCapture = async (base64Image: string) => {
    setShowCamera(false);
    setIsEnrolling(true);
    
    try {
      if (user) {
        const success = await enrollBiometric(user.id, 'face', base64Image);
        
        if (success) {
          setEnrollmentComplete(true);
          toast.success('Face recognition enrolled successfully!');
          
          // Reload user data to update biometric status
          await loadUser();
        } else {
          toast.error('Face enrollment failed. Please try again.');
          setIsEnrolling(false);
        }
      } else {
        toast.error('User session not found. Please login again.');
        setIsEnrolling(false);
      }
    } catch (error) {
      console.error('Face enrollment error:', error);
      toast.error('Face enrollment failed. Please try again.');
      setIsEnrolling(false);
    }
  };

  const handleAudioCapture = async (base64Audio: string) => {
    setShowAudio(false);
    setIsEnrolling(true);
    
    try {
      if (user) {
        const success = await enrollBiometric(user.id, 'voice', base64Audio);
        
        if (success) {
          setEnrollmentComplete(true);
          toast.success('Voice recognition enrolled successfully!');
          
          // Reload user data to update biometric status
          await loadUser();
        } else {
          toast.error('Voice enrollment failed. Please try again.');
          setIsEnrolling(false);
        }
      } else {
        toast.error('User session not found. Please login again.');
        setIsEnrolling(false);
      }
    } catch (error) {
      console.error('Voice enrollment error:', error);
      toast.error('Voice enrollment failed. Please try again.');
      setIsEnrolling(false);
    }
  };

  return (
    <>
      {showCamera && (
        <WebcamCapture
          onCapture={handleFaceCapture}
          onCancel={() => {
            setShowCamera(false);
            setIsEnrolling(false);
            setSelectedType(null);
          }}
          isEnrollment={true}
        />
      )}

      {showAudio && (
        <AudioCapture
          onCapture={handleAudioCapture}
          onCancel={() => {
            setShowAudio(false);
            setIsEnrolling(false);
            setSelectedType(null);
          }}
          isEnrollment={true}
        />
      )}

      <div className="w-full max-w-md mx-auto">
        <div className="bg-card border border-border rounded-lg p-8 relative overflow-hidden">
          <div className="absolute inset-0 scan-line pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center border border-warning/50 pulse-glow">
                <Shield className="w-8 h-8 text-warning" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-foreground mb-2">
              Biometric Enrollment Required
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-8 font-mono">
              STEP 2: ENROLL BIOMETRIC AUTHENTICATION
            </p>

            {!enrollmentComplete ? (
              <>
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">Security Requirement</p>
                      <p>
                        You must enroll at least one biometric method to continue. 
                        This adds an extra layer of security to your account.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {biometricOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.type}
                        variant="terminal"
                        className="w-full h-auto py-4 flex items-center gap-4 justify-start"
                        onClick={() => startEnrollment(option.type)}
                        disabled={isEnrolling || option.disabled}
                      >
                        <div className={`w-12 h-12 bg-${option.color}/20 rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 text-${option.color}`} />
                        </div>
                        <div className="text-left flex-1">
                          <div className="font-semibold flex items-center gap-2">
                            {option.label}
                            {option.disabled && (
                              <span className="text-xs text-muted-foreground font-normal">(Coming Soon)</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isEnrolling && selectedType === option.type
                              ? 'Processing enrollment...'
                              : option.description}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-border mt-6">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={logout}
                    disabled={isEnrolling}
                  >
                    Cancel & Logout
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-success/20 rounded-full flex items-center justify-center border-2 border-success">
                  <CheckCircle2 className="w-12 h-12 text-success" />
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-sm text-success">
                    ENROLLMENT SUCCESSFUL
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Proceeding to biometric verification...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
