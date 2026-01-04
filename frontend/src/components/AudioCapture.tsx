import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mic, Check, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface AudioCaptureProps {
  onCapture: (base64Audio: string) => void;
  onCancel: () => void;
  isEnrollment?: boolean;
}

export function AudioCapture({ onCapture, onCancel, isEnrollment = false }: AudioCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - accept common audio formats
    const validAudioTypes = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm'];
    if (!validAudioTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|webm)$/i)) {
      toast.error('Please upload a valid audio file (WAV, MP3, OGG, or WebM)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Audio file is too large. Please upload a file smaller than 10MB');
      return;
    }

    setAudioFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const audioData = e.target?.result as string;
      // Extract base64 data without the data URL prefix
      const base64 = audioData.split(',')[1];
      setRecordedAudio(base64);
    };
    reader.readAsDataURL(file);
  };

  const discardRecording = () => {
    setRecordedAudio(null);
    setAudioFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmRecording = () => {
    if (recordedAudio) {
      onCapture(recordedAudio);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">
            {isEnrollment ? 'Enroll Voice' : 'Verify Voice'}
          </h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {!recordedAudio ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-card/50">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Mic className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload a voice recording
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.wav,.mp3,.ogg,.webm"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="voice-upload"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Voice File
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-4 space-y-1 text-left bg-info/10 border border-info/30 rounded-lg p-3">
                    <p className="font-semibold mb-1">Tips for best results:</p>
                    <p>• Use WAV format for best quality</p>
                    <p>• Recommended: {isEnrollment ? '30 seconds' : '10 seconds'} duration</p>
                    <p>• Record in a quiet environment</p>
                    <p>• Speak clearly and naturally</p>
                    <p>• Maximum file size: 10MB</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-success/10 border border-success/30 rounded-lg p-6 flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
                  <Check className="w-10 h-10 text-success" />
                </div>
                <div className="text-center">
                  <p className="font-mono text-success font-bold">
                    Audio File Uploaded
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 break-all px-2">
                    {audioFileName}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="terminal"
                  className="flex-1"
                  onClick={confirmRecording}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirm
                </Button>
                <Button variant="outline" onClick={discardRecording}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
