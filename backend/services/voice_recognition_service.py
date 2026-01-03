import base64
import io
import json
import wave
from typing import Tuple

import numpy as np
from scipy.io import wavfile

from .encryption_service import get_encryption_service


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


def _reduce_vector(vector: np.ndarray, target_len: int) -> np.ndarray:
    if vector.size == target_len:
        return vector
    x_old = np.linspace(0, 1, num=vector.size)
    x_new = np.linspace(0, 1, num=target_len)
    return np.interp(x_new, x_old, vector)


def extract_voice_signature(base64_audio: str) -> list:
    """Create a compact voice signature from base64 WAV data."""
    samples, sample_rate = _base64_to_audio(base64_audio)

    if samples.size < int(sample_rate * 0.3):  # ~300ms minimum
        raise ValueError("Audio clip too short; provide at least 0.3s of speech")

    # Normalize and remove DC offset
    samples = samples - np.mean(samples)
    max_amp = np.max(np.abs(samples)) + 1e-9
    samples = samples / max_amp

    # Adaptive frame length based on sample rate
    frame_len = min(2048, max(512, int(sample_rate * 0.03)))
    hop = frame_len // 2

    frames = []
    # Ensure we have enough frames for meaningful analysis
    for start in range(0, max(1, len(samples) - frame_len), hop):
        if start + frame_len <= len(samples):
            frame = samples[start:start + frame_len]
        else:
            # Pad last frame if needed
            frame = np.pad(samples[start:], (0, frame_len - len(samples[start:])), mode='constant')
        
        windowed = frame * np.hamming(frame_len)
        spectrum = np.abs(np.fft.rfft(windowed))
        frames.append(spectrum)

    if not frames:
        raise ValueError("Unable to extract voice features from audio")

    spec = np.vstack(frames)
    spec_mean = spec.mean(axis=0)
    spec_std = spec.std(axis=0)
    
    # Add spectral centroid and rolloff for better discrimination
    freqs = np.fft.rfftfreq(frame_len, 1.0 / sample_rate)
    spectral_centroid = np.sum(freqs * spec_mean) / (np.sum(spec_mean) + 1e-9)
    
    target_bins = 96
    mean_reduced = _reduce_vector(spec_mean, target_bins)
    std_reduced = _reduce_vector(spec_std, target_bins)

    energy = float(np.mean(np.square(samples)))
    zcr = float(np.mean(np.abs(np.diff(np.sign(samples)))) / 2)
    
    # Normalize spectral centroid to 0-1 range
    normalized_centroid = float(min(1.0, spectral_centroid / (sample_rate / 2)))

    signature = np.concatenate([
        mean_reduced,
        std_reduced,
        np.array([energy, zcr, normalized_centroid], dtype=np.float32)
    ])

    # Normalize the final signature to unit length
    sig_norm = np.linalg.norm(signature)
    if sig_norm > 0:
        signature = signature / sig_norm

    return signature.tolist()


def enroll_voice(base64_audio: str) -> str:
    """Generate and encrypt a voice signature for storage."""
    encryption_service = get_encryption_service()
    signature = extract_voice_signature(base64_audio)
    return encryption_service.encrypt(json.dumps(signature))


def verify_voice(base64_audio: str, stored_encrypted_signature: str, tolerance: float = 0.35) -> dict:
    """Compare incoming audio against stored signature and return match metadata."""
    encryption_service = get_encryption_service()

    new_signature = np.array(extract_voice_signature(base64_audio))
    stored_signature = np.array(json.loads(encryption_service.decrypt(stored_encrypted_signature)))

    # Normalize both signatures to unit vectors for better cosine similarity
    new_norm = np.linalg.norm(new_signature)
    stored_norm = np.linalg.norm(stored_signature)
    
    if new_norm == 0 or stored_norm == 0:
        similarity = 0.0
    else:
        new_normalized = new_signature / new_norm
        stored_normalized = stored_signature / stored_norm
        similarity = float(np.dot(new_normalized, stored_normalized))

    # Similarity ranges from -1 to 1, convert to 0-100 scale
    # Shift from [-1, 1] to [0, 2], then to [0, 100]
    confidence = max(0.0, min(100.0, (similarity + 1.0) * 50.0))
    
    # Lower tolerance is more permissive (higher threshold = harder to match)
    threshold = 1.0 - tolerance  # e.g., tolerance 0.35 -> threshold 0.65
    is_match = similarity >= threshold

    return {
        "success": bool(is_match),
        "confidence": confidence,
        "similarity": similarity,
        "threshold": threshold
    }
