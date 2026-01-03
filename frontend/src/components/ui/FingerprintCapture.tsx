import { useState, useRef } from 'react';
import { Camera, Fingerprint, Upload, CheckCircle, XCircle } from 'lucide-react';

interface FingerprintCaptureProps {
  onCapture: (imageData: string) => void;
  mode: 'enroll' | 'verify';
  disabled?: boolean;
}

export function FingerprintCapture({ onCapture, mode, disabled }: FingerprintCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [quality, setQuality] = useState<any>(null);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
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
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      
      // Check quality
      await checkFingerprintQuality(imageData);
    };
    reader.readAsDataURL(file);
  };

  const checkFingerprintQuality = async (imageData: string) => {
    setIsCheckingQuality(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/biometric/detect-fingerprint-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: imageData })
      });

      if (response.ok) {
        const result = await response.json();
        setQuality(result);
      }
    } catch (error) {
      console.error('Error checking fingerprint quality:', error);
    } finally {
      setIsCheckingQuality(false);
    }
  };

  const handleCapture = () => {
    if (capturedImage && quality && quality.score >= 30) {
      onCapture(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setQuality(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getQualityColor = () => {
    if (!quality) return 'text-gray-400';
    if (quality.score >= 70) return 'text-green-500';
    if (quality.score >= 50) return 'text-yellow-500';
    if (quality.score >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getQualityIcon = () => {
    if (!quality) return null;
    if (quality.score >= 30) {
      return <CheckCircle className={`w-5 h-5 ${getQualityColor()}`} />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-card/50">
        {!capturedImage ? (
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Fingerprint className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {mode === 'enroll' ? 'Enroll Fingerprint' : 'Verify Fingerprint'}
              </h3>
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
              <label
                htmlFor="fingerprint-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium cursor-pointer hover:bg-primary/90 transition-colors ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload Fingerprint Image
              </label>
            </div>
            <div className="text-xs text-muted-foreground mt-4 space-y-1">
              <p>• Use a high-quality fingerprint scanner or camera</p>
              <p>• Ensure good lighting and clear ridges</p>
              <p>• Image should be at least 100x100 pixels</p>
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

            {isCheckingQuality ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground mt-2">Analyzing quality...</p>
              </div>
            ) : quality ? (
              <div className={`p-4 rounded-lg border ${
                quality.score >= 30 ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {getQualityIcon()}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Quality Score</span>
                      <span className={`text-sm font-bold ${getQualityColor()}`}>
                        {quality.score.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          quality.score >= 70 ? 'bg-green-500' :
                          quality.score >= 50 ? 'bg-yellow-500' :
                          quality.score >= 30 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${quality.score}%` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {quality.message}
                </p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                onClick={handleRetake}
                disabled={disabled}
                className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
              >
                Retake
              </button>
              <button
                onClick={handleCapture}
                disabled={disabled || !quality || quality.score < 30}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === 'enroll' ? 'Enroll' : 'Verify'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}