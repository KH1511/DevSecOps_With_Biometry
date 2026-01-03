import { useState, useRef } from 'react';
import { Camera, Fingerprint, Upload, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FingerprintCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  mode: 'enroll' | 'verify';
  disabled?: boolean;
}

export function FingerprintCapture({ onCapture, onCancel, mode, disabled }: FingerprintCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file is too large. Please upload an image smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">
                {mode === 'enroll' ? 'Enroll Fingerprint' : 'Verify Fingerprint'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Upload a clear fingerprint image
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={disabled}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-card/50">
        {!capturedImage ? (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Fingerprint className="w-12 h-12 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a clear image of your fingerprint
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={disabled}
                className="hidden"
                id="fingerprint-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Fingerprint Image
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-4 space-y-1 text-left bg-info/10 border border-info/30 rounded-lg p-3">
              <p className="font-semibold mb-1">Tips for best results:</p>
              <p>• Use a high-quality fingerprint scanner or camera</p>
              <p>• Ensure good lighting and clear ridges</p>
              <p>• Image should be at least 100x100 pixels</p>
              <p>• Keep your finger flat and still</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured fingerprint"
                className="w-full h-64 object-contain rounded-lg bg-black/5"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRetake}
                disabled={disabled}
                variant="outline"
                className="flex-1"
              >
                Retake
              </Button>
              <Button
                onClick={handleCapture}
                disabled={disabled}
                className="flex-1"
              >
                {mode === 'enroll' ? 'Enroll' : 'Verify'}
              </Button>
            </div>
          </div>
        )}
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}