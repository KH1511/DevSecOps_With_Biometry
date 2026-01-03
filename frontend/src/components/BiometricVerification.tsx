import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { WebcamCapture } from '@/components/WebcamCapture';
import { AudioCapture } from '@/components/AudioCapture';
import { BiometricType } from '@/types/auth';
import { Fingerprint, ScanFace, Mic, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

const biometricConfig = {
  face: {
    icon: ScanFace,
    label: 'Face Recognition',
    description: 'Position your face in front of the camera',
  },
  fingerprint: {
    icon: Fingerprint,
    label: 'Fingerprint Scan',
    description: 'Place your finger on the scanner',
  },
  voice: {
    icon: Mic,
    label: 'Voice Recognition',
    description: 'Speak the displayed phrase clearly',
  },
};

export function BiometricVerification() {
  const { user, verifyBiometric, logout } = useAuth();
  const [selectedType, setSelectedType] = useState<BiometricType | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [showCamera, setShowCamera] = useState(false);
  const [showAudio, setShowAudio] = useState(false);

  const availableBiometrics = user?.biometrics 
    ? (Object.entries(user.biometrics) as [BiometricType, boolean][])
        .filter(([_, enabled]) => enabled)
        .map(([type]) => type)
    : [];

  const handleVerify = async (type: BiometricType) => {
    setSelectedType(type);
    
    // For face recognition, show camera
    if (type === 'face') {
      setShowCamera(true);
    } else if (type === 'voice') {
      // For voice, show audio capture
      setShowAudio(true);
    } else {
      // For other biometrics, use the old flow
      setIsVerifying(true);
      setVerificationStatus('scanning');

      try {
        const success = await verifyBiometric(type);
        if (success) {
          setVerificationStatus('success');
          toast.success('Biometric verification successful!');
        } else {
          setVerificationStatus('failed');
          toast.error('Biometric verification failed. Please try again.');
        }
      } catch {
        setVerificationStatus('failed');
        toast.error('An error occurred during verification.');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleFaceCapture = async (base64Image: string) => {
    setShowCamera(false);
    setIsVerifying(true);
    setVerificationStatus('scanning');

    try {
      const success = await verifyBiometric('face', base64Image);
      if (success) {
        setVerificationStatus('success');
        toast.success('Face verification successful!');
      } else {
        setVerificationStatus('failed');
        toast.error('Face verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Face verification error:', error);
      setVerificationStatus('failed');
      toast.error('An error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAudioCapture = async (base64Audio: string) => {
    setShowAudio(false);
    setIsVerifying(true);
    setVerificationStatus('scanning');

    try {
      const success = await verifyBiometric('voice', base64Audio);
      if (success) {
        setVerificationStatus('success');
        toast.success('Voice verification successful!');
      } else {
        setVerificationStatus('failed');
        toast.error('Voice verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Voice verification error:', error);
      setVerificationStatus('failed');
      toast.error('An error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setSelectedType(null);
    setVerificationStatus('idle');
  };

  return (
    <>
      {showCamera && (
        <WebcamCapture
          onCapture={handleFaceCapture}
          onCancel={() => {
            setShowCamera(false);
            setSelectedType(null);
            setVerificationStatus('idle');
          }}
          isEnrollment={false}
        />
      )}

      {showAudio && (
        <AudioCapture
          onCapture={handleAudioCapture}
          onCancel={() => {
            setShowAudio(false);
            setSelectedType(null);
            setVerificationStatus('idle');
          }}
          isEnrollment={false}
        />
      )}
      
      <div className="w-full max-w-md mx-auto">
        <div className="bg-card border border-border rounded-lg p-8 relative overflow-hidden">
          <div className="absolute inset-0 scan-line pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center border border-accent/50">
                <Shield className="w-8 h-8 text-accent" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-foreground mb-2">
              Biometric Verification
            </h2>
          <p className="text-muted-foreground text-center text-sm mb-8 font-mono">
            STEP 2: SELECT BIOMETRIC METHOD
          </p>

          {!selectedType ? (
            <div className="space-y-4">
              {availableBiometrics.map((type) => {
                const config = biometricConfig[type];
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant="terminal"
                    className="w-full h-auto py-4 flex items-center gap-4 justify-start"
                    onClick={() => handleVerify(type)}
                    disabled={isVerifying}
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{config.label}</div>
                      <div className="text-xs text-muted-foreground">{config.description}</div>
                    </div>
                  </Button>
                );
              })}

              <div className="pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={logout}
                >
                  Cancel & Return to Login
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              {verificationStatus === 'scanning' && (
                <>
                  <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary animate-pulse">
                    {(() => {
                      const Icon = biometricConfig[selectedType].icon;
                      return <Icon className="w-12 h-12 text-primary" />;
                    })()}
                  </div>
                  <div className="font-mono text-sm text-muted-foreground">
                    SCANNING... PLEASE WAIT
                  </div>
                  <div className="flex justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-8 bg-primary/50 rounded animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                </>
              )}

              {verificationStatus === 'success' && (
                <>
                  <div className="w-24 h-24 mx-auto bg-success/20 rounded-full flex items-center justify-center border-2 border-success">
                    <CheckCircle2 className="w-12 h-12 text-success" />
                  </div>
                  <div className="font-mono text-sm text-success">
                    VERIFICATION SUCCESSFUL
                  </div>
                </>
              )}

              {verificationStatus === 'failed' && (
                <>
                  <div className="w-24 h-24 mx-auto bg-destructive/20 rounded-full flex items-center justify-center border-2 border-destructive">
                    <XCircle className="w-12 h-12 text-destructive" />
                  </div>
                  <div className="font-mono text-sm text-destructive">
                    VERIFICATION FAILED
                  </div>
                  <Button variant="terminal" onClick={resetVerification}>
                    TRY AGAIN
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
