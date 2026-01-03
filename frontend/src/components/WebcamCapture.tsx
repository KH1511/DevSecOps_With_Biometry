import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface WebcamCaptureProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
  isEnrollment?: boolean;
}

export function WebcamCapture({ onCapture, onCancel, isEnrollment = false }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraReady(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(base64Image);
    setFaceDetected(null);
  }, []);

  const retake = () => {
    setCapturedImage(null);
    setFaceDetected(null);
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopCamera();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {isEnrollment ? 'Enroll Face' : 'Verify Face'}
          </h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden mb-4">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
              />
              {isCameraReady && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Face detection overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-primary/50 rounded-full animate-pulse" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <img src={capturedImage} alt="Captured" className="w-full h-auto" />
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground text-center">
            {!capturedImage ? (
              <>
                <p className="font-mono">Position your face in the center</p>
                <p className="text-xs mt-1">Ensure good lighting and remove glasses if possible</p>
              </>
            ) : (
              <p className="font-mono text-success">Photo captured! Review and confirm.</p>
            )}
          </div>

          <div className="flex gap-3">
            {!capturedImage ? (
              <>
                <Button
                  variant="terminal"
                  className="flex-1"
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="terminal" className="flex-1" onClick={confirmCapture}>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm & Continue
                </Button>
                <Button variant="outline" onClick={retake}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
