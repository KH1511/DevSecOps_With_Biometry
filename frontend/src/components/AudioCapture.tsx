// frontend/src/components/AudioCapture.tsx

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Play, Pause, RotateCcw, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface AudioCaptureProps {
  onCapture: (audioBase64: string) => void;
  onCancel: () => void;
  phrase?: string;
  isEnrollment?: boolean;
}

export function AudioCapture({ onCapture, onCancel, phrase, isEnrollment = false }: AudioCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const displayPhrase = phrase || "My voice is my password";
  const maxRecordingTime = 10; // seconds

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder with appropriate mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        setAudioBlob(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxRecordingTime) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      toast.success('Recording stopped');
    }
  };

  const playRecording = () => {
    if (audioURL && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const resetRecording = () => {
    setAudioURL('');
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const handleConfirm = async () => {
    if (!audioBlob) {
      toast.error('No audio recorded');
      return;
    }

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onCapture(base64Audio);
      };
    } catch (error) {
      console.error('Error converting audio:', error);
      toast.error('Failed to process audio');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-6 space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">
            {isEnrollment ? 'Enroll Voice' : 'Voice Verification'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Please speak the following phrase clearly
          </p>
        </div>

        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-center text-lg font-mono text-primary">
            "{displayPhrase}"
          </p>
        </Card>

        <div className="flex flex-col items-center space-y-4">
          {/* Recording Button */}
          <div className="relative">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className="w-24 h-24 rounded-full"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!!audioURL}
            >
              {isRecording ? (
                <MicOff className="w-12 h-12" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </Button>
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-destructive animate-ping" />
            )}
          </div>

          {/* Recording Time */}
          {isRecording && (
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-destructive">
                {recordingTime}s / {maxRecordingTime}s
              </p>
              <p className="text-xs text-muted-foreground">Recording...</p>
            </div>
          )}

          {/* Audio Preview */}
          {audioURL && (
            <div className="w-full space-y-3">
              <audio
                ref={audioRef}
                src={audioURL}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={playRecording}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">
                    Recording ready ({recordingTime}s)
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetRecording}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          
          <Button
            variant="terminal"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!audioURL}
          >
            <Check className="w-4 h-4 mr-2" />
            Confirm
          </Button>
        </div>
      </Card>
    </div>
  );
}