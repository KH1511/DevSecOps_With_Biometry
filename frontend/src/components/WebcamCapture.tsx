import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Check, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface WebcamCaptureProps {
  onCapture: (base64Image: string) => void;
  onCancel: () => void;
  isEnrollment?: boolean;
}

export function WebcamCapture({ onCapture, onCancel, isEnrollment = false }: WebcamCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file is too large. Please upload an image smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
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

        <div className="space-y-4">
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-card/50">
            {!capturedImage ? (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Camera className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a clear photo of your face
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="face-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Face Photo
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-4 space-y-1 text-left bg-info/10 border border-info/30 rounded-lg p-3">
                  <p className="font-semibold mb-1">Tips for best results:</p>
                  <p>• Face the camera directly</p>
                  <p>• Ensure good lighting</p>
                  <p>• Remove glasses if possible</p>
                  <p>• Keep a neutral expression</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured face"
                    className="w-full h-64 object-contain rounded-lg bg-black/5"
                  />
                </div>
                <p className="text-sm text-center text-success font-mono">
                  Photo uploaded! Review and confirm.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!capturedImage ? (
              <Button variant="outline" className="w-full" onClick={onCancel}>
                Cancel
              </Button>
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
