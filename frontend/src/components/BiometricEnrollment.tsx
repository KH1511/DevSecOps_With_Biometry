import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { WebcamCapture } from '@/components/WebcamCapture';
import { BiometricType } from '@/types/auth';
import { 
  Fingerprint, 
  ScanFace, 
  Mic, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  Camera,
  Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const enrollmentSteps = {
  face: [
    'Position your face in the center of the frame',
    'Look straight at the camera',
    'Slowly turn your head to the left',
    'Slowly turn your head to the right',
    'Look up slightly',
    'Look down slightly',
  ],
  fingerprint: [
    'Place your finger on the scanner',
    'Lift and place again',
    'Rotate finger slightly to the left',
    'Rotate finger slightly to the right',
    'Press firmly and hold',
  ],
  voice: [
    'Say: "My voice is my password"',
    'Say: "Authenticate my identity"',
    'Say: "Secure access granted"',
    'Count from 1 to 10 slowly',
    'Say your name clearly',
  ],
};

const biometricConfig = {
  face: {
    icon: ScanFace,
    label: 'Face Recognition',
    color: 'text-info',
    bgColor: 'bg-info/20',
    borderColor: 'border-info/50',
  },
  fingerprint: {
    icon: Fingerprint,
    label: 'Fingerprint',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    borderColor: 'border-primary/50',
  },
  voice: {
    icon: Mic,
    label: 'Voice Recognition',
    color: 'text-accent',
    bgColor: 'bg-accent/20',
    borderColor: 'border-accent/50',
  },
};

interface BiometricEnrollmentProps {
  onBack: () => void;
}

export function BiometricEnrollment({ onBack }: BiometricEnrollmentProps) {
  const { user, enrollBiometric } = useAuth();
  const [selectedType, setSelectedType] = useState<BiometricType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const startEnrollment = (type: BiometricType) => {
    setSelectedType(type);
    setCurrentStep(0);
    
    // For face recognition, show camera immediately
    if (type === 'face') {
      setShowCamera(true);
      setIsEnrolling(false); // Don't set enrolling yet, wait for camera capture
    } else {
      // For other biometrics, use the old flow
      setIsEnrolling(true);
      processStep(type, 0);
    }
  };

  const handleFaceCapture = async (base64Image: string) => {
    setShowCamera(false);
    setIsEnrolling(true);
    
    console.log('Face capture received, image length:', base64Image.length);
    console.log('User:', user);
    
    try {
      if (user) {
        console.log('Calling enrollBiometric with user id:', user.id);
        const success = await enrollBiometric(user.id, 'face', base64Image);
        console.log('enrollBiometric result:', success);
        
        if (success) {
          setEnrollmentComplete(true);
          toast.success('Face recognition enrolled successfully!');
        } else {
          toast.error('Face enrollment failed. Please try again.');
          setIsEnrolling(false);
          setSelectedType(null);
        }
      } else {
        console.error('No user found');
        toast.error('User session not found. Please login again.');
        setIsEnrolling(false);
        setSelectedType(null);
      }
    } catch (error) {
      console.error('Face enrollment error:', error);
      if (error instanceof Error) {
        toast.error(`Face enrollment failed: ${error.message}`);
      } else {
        toast.error('Face enrollment failed. Please try again.');
      }
      setIsEnrolling(false);
      setSelectedType(null);
    }
  };

  const processStep = async (type: BiometricType, step: number) => {
    const steps = enrollmentSteps[type];
    
    // Simulate capturing biometric data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (step < steps.length - 1) {
      setCurrentStep(step + 1);
      processStep(type, step + 1);
    } else {
      // Enrollment complete
      if (user) {
        const success = await enrollBiometric(user.id, type);
        if (success) {
          setEnrollmentComplete(true);
          toast.success(`${biometricConfig[type].label} enrolled successfully!`);
        } else {
          toast.error('Enrollment failed. Please try again.');
          resetEnrollment();
        }
      }
      setIsEnrolling(false);
    }
  };

  const resetEnrollment = () => {
    setSelectedType(null);
    setCurrentStep(0);
    setIsEnrolling(false);
    setEnrollmentComplete(false);
  };

  if (enrollmentComplete && selectedType) {
    const config = biometricConfig[selectedType];
    const Icon = config.icon;

    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <div className={`w-20 h-20 mx-auto ${config.bgColor} rounded-full flex items-center justify-center border ${config.borderColor} mb-6`}>
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h3 className="text-xl font-bold mb-2">Enrollment Complete!</h3>
        <p className="text-muted-foreground mb-6">
          {config.label} has been successfully enrolled.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="terminal" onClick={resetEnrollment}>
            <Icon className="w-4 h-4 mr-2" />
            Enroll Another
          </Button>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  if (selectedType && isEnrolling) {
    const config = biometricConfig[selectedType];
    const Icon = config.icon;
    const steps = enrollmentSteps[selectedType];
    const progress = ((currentStep + 1) / steps.length) * 100;

    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center mb-8">
          <div className={`w-24 h-24 mx-auto ${config.bgColor} rounded-full flex items-center justify-center border-2 ${config.borderColor} animate-pulse mb-6`}>
            {selectedType === 'face' && <Camera className={`w-12 h-12 ${config.color}`} />}
            {selectedType === 'fingerprint' && <Icon className={`w-12 h-12 ${config.color}`} />}
            {selectedType === 'voice' && <Volume2 className={`w-12 h-12 ${config.color}`} />}
          </div>
          <h3 className="text-xl font-bold mb-2">{config.label} Enrollment</h3>
          <p className="text-muted-foreground font-mono text-sm">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        <div className="mb-6">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="bg-secondary/50 rounded-lg p-4 border border-border">
            <p className="text-center font-medium text-lg">
              {steps[currentStep]}
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-12 ${config.bgColor} rounded animate-pulse`}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={resetEnrollment} disabled={isEnrolling}>
            Cancel Enrollment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showCamera && (
        <WebcamCapture
          onCapture={handleFaceCapture}
          onCancel={() => {
            setShowCamera(false);
            setSelectedType(null);
            setIsEnrolling(false);
          }}
          isEnrollment={true}
        />
      )}
      
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-xl font-bold">Biometric Enrollment</h3>
        </div>

        <p className="text-muted-foreground mb-6">
          Select a biometric method to enroll. Each enrollment captures multiple samples
          for improved accuracy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(biometricConfig) as [BiometricType, typeof biometricConfig.face][]).map(([type, config]) => {
            const Icon = config.icon;
          const isEnrolled = user?.biometrics[type];

          return (
            <Button
              key={type}
              variant="terminal"
              className="h-auto py-6 flex flex-col items-center gap-3"
              onClick={() => startEnrollment(type)}
              disabled={isEnrolled}
            >
              <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center border ${config.borderColor}`}>
                <Icon className={`w-8 h-8 ${config.color}`} />
              </div>
              <div className="text-center">
                <div className="font-semibold">{config.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isEnrolled ? (
                    <span className="flex items-center gap-1 justify-center text-success">
                      <CheckCircle2 className="w-3 h-3" /> Enrolled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 justify-center">
                      <XCircle className="w-3 h-3" /> Not Enrolled
                    </span>
                  )}
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
    </>
  );
}
