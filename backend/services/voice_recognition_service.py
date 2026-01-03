import base64
import io
import json
import wave
from typing import Tuple

import numpy as np
import torch
import torchaudio
from speechbrain.pretrained import EncoderClassifier
from scipy.io import wavfile

from .encryption_service import get_encryption_service

# Load SpeechBrain's pre-trained speaker recognition model
# This model creates speaker embeddings (x-vectors)
spk_model = None

def get_speaker_model():
    """Lazy load the SpeechBrain speaker recognition model."""
    global spk_model
    if spk_model is None:
        print("[VOICE] Loading SpeechBrain ECAPA-TDNN speaker recognition model...")
        spk_model = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir="/tmp/spkrec-ecapa-voxceleb"
        )
        print("[VOICE] Model loaded successfully")
    return spk_model


def _base64_to_audio(base64_string: str) -> Tuple[np.ndarray, int]:
    """Convert base64-encoded audio to mono float32 samples and sample rate."""
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",", 1)[1]

        audio_bytes = base64.b64decode(base64_string)
        
        # Try using scipy first (more flexible)
        try:
            sample_rate, audio = wavfile.read(io.BytesIO(audio_bytes))
            
            # Convert to float32
            if audio.dtype != np.float32:
                if audio.dtype == np.uint8:
                    audio = audio.astype(np.float32) / 128.0 - 1.0
                elif audio.dtype == np.int16:
                    audio = audio.astype(np.float32) / 32768.0
                elif audio.dtype == np.int32:
                    audio = audio.astype(np.float32) / 2147483648.0
                else:
                    audio = audio.astype(np.float32)
            
            # Convert to mono if stereo
            if len(audio.shape) > 1:
                audio = audio.mean(axis=1)
            
            return audio, sample_rate
        except Exception:
            # Fallback to wave library
            with wave.open(io.BytesIO(audio_bytes), "rb") as wav_file:
                sample_rate = wav_file.getframerate()
                n_channels = wav_file.getnchannels()
                sampwidth = wav_file.getsampwidth()
                frames = wav_file.getnframes()
                raw_audio = wav_file.readframes(frames)

            if sampwidth not in (1, 2, 3, 4):
                raise ValueError("Unsupported sample width")

            dtype_map = {1: np.int8, 2: np.int16, 3: np.int32, 4: np.int32}
            audio = np.frombuffer(raw_audio, dtype=dtype_map[sampwidth]).astype(np.float32)

            if sampwidth == 3:
                audio /= float(2 ** 23)
            else:
                max_val = float(2 ** (8 * sampwidth - 1))
                audio /= max_val

            if n_channels > 1:
                audio = audio.reshape(-1, n_channels).mean(axis=1)

            return audio, sample_rate
    except Exception as exc:
        raise ValueError(f"Invalid audio data: {exc}") from exc


def extract_voice_embedding(base64_audio: str, required_duration: float, is_enrollment: bool = True) -> list:
    """
    Extract speaker embedding using SpeechBrain's ECAPA-TDNN model.
    
    Args:
        base64_audio: Base64-encoded audio data
        required_duration: Required duration in seconds (30 for enrollment, 10 for verification)
        is_enrollment: Whether this is enrollment (True) or verification (False)
    
    Returns:
        192-dimensional speaker embedding vector
    """
    try:
        samples, sample_rate = _base64_to_audio(base64_audio)
        
        # Calculate actual duration
        duration = len(samples) / sample_rate
        
        operation = "enrollment" if is_enrollment else "verification"
        
        # Require exact duration (±1s tolerance)
        if duration < (required_duration - 1.0):
            raise ValueError(f"Audio too short for {operation}: {duration:.1f}s. Please record exactly {int(required_duration)} seconds.")
        
        if duration > (required_duration + 1.0):
            raise ValueError(f"Audio too long for {operation}: {duration:.1f}s. Please record exactly {int(required_duration)} seconds.")
        
        # Trim or pad to exact duration
        target_length = int(sample_rate * required_duration)
        if len(samples) < target_length:
            samples = np.pad(samples, (0, target_length - len(samples)), mode='constant')
        else:
            samples = samples[:target_length]
        
        print(f"[VOICE {operation.upper()}] Duration: {len(samples) / sample_rate:.1f}s, Sample rate: {sample_rate}Hz")
        
        # Convert to torch tensor and add batch dimension
        waveform = torch.from_numpy(samples).float().unsqueeze(0)
        
        # Resample to 16kHz if needed (SpeechBrain models expect 16kHz)
        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(sample_rate, 16000)
            waveform = resampler(waveform)
            print(f"[VOICE {operation.upper()}] Resampled to 16kHz")
        
        # Extract speaker embedding using SpeechBrain model
        model = get_speaker_model()
        with torch.no_grad():
            embedding = model.encode_batch(waveform)
            # Convert to numpy and flatten
            embedding = embedding.squeeze().cpu().numpy()
        
        print(f"[VOICE {operation.upper()}] Embedding shape: {embedding.shape}")
        print(f"[VOICE {operation.upper()}] Embedding range: [{embedding.min():.4f}, {embedding.max():.4f}]")
        
        return embedding.tolist()
    
    except Exception as e:
        raise ValueError(f"Voice embedding extraction failed: {str(e)}")


def enroll_voice(base64_audio: str) -> str:
    """Generate and encrypt a voice embedding for storage (30 seconds)."""
    encryption_service = get_encryption_service()
    embedding = extract_voice_embedding(base64_audio, required_duration=30.0, is_enrollment=True)
    return encryption_service.encrypt(json.dumps(embedding))


def verify_voice(base64_audio: str, stored_encrypted_embedding: str, tolerance: float = 0.25) -> dict:
    """
    Compare incoming audio (10s) against stored embedding (30s) using cosine similarity.
    SpeechBrain embeddings are designed to be robust across different durations.
    Requires 75% similarity (tolerance 0.25) for match.
    
    Args:
        base64_audio: Base64-encoded audio (10 seconds)
        stored_encrypted_embedding: Encrypted enrollment embedding (from 30s audio)
        tolerance: Similarity tolerance (default 0.25 = 75% threshold)
    
    Returns:
        Dictionary with success, confidence, similarity, and threshold
    """
    try:
        encryption_service = get_encryption_service()

        # Extract 10-second verification embedding
        new_embedding = np.array(extract_voice_embedding(base64_audio, required_duration=10.0, is_enrollment=False))
        # Load 30-second enrollment embedding
        stored_embedding = np.array(json.loads(encryption_service.decrypt(stored_encrypted_embedding)))

        print(f"[VOICE VERIFY] Embedding lengths - New: {len(new_embedding)}, Stored: {len(stored_embedding)}")
        
        # Calculate cosine similarity
        dot_product = np.dot(new_embedding, stored_embedding)
        norm_new = np.linalg.norm(new_embedding)
        norm_stored = np.linalg.norm(stored_embedding)
        
        if norm_new == 0 or norm_stored == 0:
            similarity = 0.0
        else:
            similarity = float(dot_product / (norm_new * norm_stored))
        
        # Map similarity to confidence percentage [0, 100]
        similarity = max(-1.0, min(1.0, similarity))
        confidence = max(0.0, min(100.0, (similarity + 1.0) * 50.0))
        
        # Require 75% similarity for match
        # SpeechBrain embeddings are normalized, so cosine similarity typically ranges 0.6-1.0 for same speaker
        threshold = 1.0 - tolerance
        is_match = similarity >= threshold
        
        print(f"[VOICE VERIFY] Cosine Similarity: {similarity:.4f}, Threshold: {threshold:.4f}, Match: {is_match}")
        print(f"[VOICE VERIFY] Confidence: {confidence:.2f}%, Tolerance: {tolerance}")

        return {
            "success": bool(is_match),
            "confidence": float(confidence),
            "similarity": float(similarity),
            "threshold": float(threshold)
        }
    except Exception as e:
        raise ValueError(f"Voice verification failed: {str(e)}")
