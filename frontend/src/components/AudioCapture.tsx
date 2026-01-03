import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mic, MicOff, Check, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
// @ts-ignore
import RecordRTC from 'recordrtc';

interface AudioCaptureProps {
  onCapture: (base64Audio: string) => void;
  onCancel: () => void;
  isEnrollment?: boolean;
}

export function AudioCapture({ onCapture, onCancel, isEnrollment = false }: AudioCaptureProps) {
  const recorderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const REQUIRED_DURATION = isEnrollment ? 30 : 10; // 30s for enrollment, 10s for verification

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setPermissionDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      recorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampleRate: 16000
      });

      recorderRef.current.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);

      // Track recording duration
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
        
        // Auto-stop at required duration (30s enrollment, 10s verification)
        if (elapsed >= REQUIRED_DURATION) {
          clearInterval(interval);
          stopRecording();
          toast.success(`Recording complete! (${REQUIRED_DURATION} seconds)`);
        }
      }, 100);

      (window as any).__recordInterval = interval;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionDenied(true);
      toast.error('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;

    if ((window as any).__recordInterval) {
      clearInterval((window as any).__recordInterval);
    }

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current.getBlob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setRecordedAudio(base64);
      };
      reader.readAsDataURL(blob);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    });
  };

  const discardRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setRecordedAudio(null);
    setRecordingDuration(0);
  };

  const confirmRecording = () => {
    if (recordedAudio) {
      setIsProcessing(true);
      onCapture(recordedAudio);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

        {!recordedAudio ? (
          <div className="space-y-6">
            {permissionDenied && (
              <div className="bg-destructive/20 border border-destructive/50 rounded p-3 text-sm text-destructive">
                Microphone access denied. Please enable microphone permissions and try again.
              </div>
            )}

            <div className="space-y-4">
              {!isRecording ? (
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                      <Mic className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-center text-sm text-muted-foreground font-mono">
                      Ready to record
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    {isEnrollment 
                      ? 'Recording will automatically stop after 30 seconds' 
                      : 'Speak for exactly 10 seconds as during enrollment'}
                  </p>

                  <Button
                    variant="terminal"
                    className="w-full"
                    onClick={startRecording}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start {REQUIRED_DURATION}-Second Recording
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center animate-pulse">
                      <MicOff className="w-10 h-10 text-destructive" />
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-lg font-bold text-destructive">
                        {formatTime(recordingDuration)} / {formatTime(REQUIRED_DURATION)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recording... (auto-stops at {REQUIRED_DURATION}s)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {isProcessing ? (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-mono text-primary font-bold">
                    Processing Voice Data
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Analyzing audio features...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-success/10 border border-success/30 rounded-lg p-6 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-success" />
                  </div>
                  <div className="text-center">
                    <p className="font-mono text-success font-bold">
                      Recording Complete
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration: {formatTime(recordingDuration)}
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
                  <Button variant="outline" onClick={() => discardRecording()}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
