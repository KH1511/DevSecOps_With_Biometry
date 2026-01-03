import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Upload } from 'lucide-react';
import { toast } from 'sonner';
// @ts-ignore
import RecordRTC from 'recordrtc';

export function VoiceStoragePage() {
  const recorderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const startRecording = async () => {
    try {
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

      const startTime = Date.now();
      const interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);

      (window as any).__recordInterval = interval;
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    const interval = (window as any).__recordInterval;
    if (interval) {
      clearInterval(interval);
    }

    if (!recorderRef.current) {
      return;
    }

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current.getBlob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Full = reader.result as string;
        const base64 = base64Full.includes(',') ? base64Full.split(',')[1] : base64Full;
        
        // Debug: check first bytes
        const decoded = atob(base64.substring(0, 20));
        console.log('First bytes:', decoded);
        console.log('Audio blob size:', blob.size);
        console.log('Base64 length:', base64.length);
        
        setRecordedAudio(base64);
      };
      reader.readAsDataURL(blob);
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  const uploadVoice = async () => {
    if (!recordedAudio) {
      toast.error('No audio recorded');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Not authenticated. Please login first.');
      return;
    }

    console.log('Token found:', token.substring(0, 20) + '...');
    setIsUploading(true);
    try {
      const response = await fetch('http://localhost:8000/biometric/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          biometric_type: 'voice',
          enrollment_data: recordedAudio
        })
      });

      console.log('Response status:', response.status);
      const text = await response.text();
      console.log('Response text:', text);

      if (response.ok) {
        const data = JSON.parse(text);
        toast.success(data.message || 'Voice stored successfully!');
        setRecordedAudio(null);
        setRecordingDuration(0);
      } else {
        toast.error(`Backend error: ${response.status} - ${text || 'No response'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Connection error');
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Voice Storage</h1>
            <p className="text-muted-foreground text-sm font-mono">
              Record and store your voice for verification
            </p>
          </div>

          <div className="space-y-6">
            {/* Recording Section */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${
                  isRecording 
                    ? 'bg-destructive/20 border-destructive animate-pulse' 
                    : recordedAudio 
                    ? 'bg-success/20 border-success' 
                    : 'bg-primary/20 border-primary'
                }`}>
                  <Mic className={`w-10 h-10 ${
                    isRecording 
                      ? 'text-destructive' 
                      : recordedAudio 
                      ? 'text-success' 
                      : 'text-primary'
                  }`} />
                </div>
              </div>

              {!isRecording ? (
                <Button
                  variant="terminal"
                  className="w-full h-12"
                  onClick={startRecording}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="terminal"
                    className="w-full h-12"
                    onClick={stopRecording}
                  >
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop ({formatTime(recordingDuration)})
                  </Button>
                  <p className="text-xs text-muted-foreground text-center font-mono">
                    Recording... Keep speaking
                  </p>
                </div>
              )}
            </div>

            {/* Audio Preview */}
            {recordedAudio && (
              <div className="space-y-3 p-4 bg-secondary/50 rounded-lg border border-border">
                <p className="text-sm font-mono text-success">✓ Recording Ready</p>
                <audio
                  controls
                  className="w-full h-8"
                  style={{
                    filter: 'invert(0.8)',
                  }}
                >
                  <source src={`data:audio/wav;base64,${recordedAudio}`} type="audio/wav" />
                </audio>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="terminal"
                    className="flex-1"
                    onClick={uploadVoice}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Storing...' : 'Store in Database'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRecordedAudio(null);
                      setRecordingDuration(0);
                    }}
                    disabled={isUploading}
                  >
                    Retake
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center font-mono">
              Your voice will be encrypted and stored<br/>
              for future verification during login
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
