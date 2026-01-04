import base64
import io
import json
import wave
from typing import Tuple

import numpy as np
import librosa
from scipy.io import wavfile
from scipy.signal import stft

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


def extract_voice_features(base64_audio: str, required_duration: float, is_enrollment: bool = True) -> list:
    """
    Extract voice features using MFCC (Mel-frequency cepstral coefficients) and spectral features.
    This creates a unique voice "fingerprint" for each speaker.
    
    Args:
        base64_audio: Base64-encoded audio data
        required_duration: Required duration in seconds (30 for enrollment, 10 for verification)
        is_enrollment: Whether this is enrollment (True) or verification (False)
    
    Returns:
        Feature vector combining MFCCs, pitch, and spectral characteristics
    """
    try:
        samples, sample_rate = _base64_to_audio(base64_audio)
        
        # Calculate actual duration
        duration = len(samples) / sample_rate
        
        operation = "enrollment" if is_enrollment else "verification"
        
        # More flexible duration requirements
        # Enrollment: 25-60 seconds
        # Verification: 25-60 seconds
        if is_enrollment:
            min_duration = 25.0
            max_duration = 60.0
            tolerance_msg = "25-60"
        else:
            min_duration = 25.0
            max_duration = 60.0
            tolerance_msg = "25-60"
        
        if duration < min_duration:
            raise ValueError(f"Audio too short for {operation}: {duration:.1f}s. Please record {tolerance_msg} seconds.")
        
        if duration > max_duration:
            raise ValueError(f"Audio too long for {operation}: {duration:.1f}s. Please record {tolerance_msg} seconds.")
        
        # Trim or pad to exact duration
        target_length = int(sample_rate * required_duration)
        if len(samples) < target_length:
            samples = np.pad(samples, (0, target_length - len(samples)), mode='constant')
        else:
            samples = samples[:target_length]
        
        print(f"[VOICE {operation.upper()}] Duration: {len(samples) / sample_rate:.1f}s, Sample rate: {sample_rate}Hz")
        
        # Extract MFCCs (Mel-frequency cepstral coefficients)
        # These capture the shape of the vocal tract and are speaker-specific
        mfccs = librosa.feature.mfcc(y=samples, sr=sample_rate, n_mfcc=20)
        mfcc_mean = np.mean(mfccs, axis=1)
        mfcc_std = np.std(mfccs, axis=1)
        
        # Extract pitch (fundamental frequency)
        pitches, magnitudes = librosa.piptrack(y=samples, sr=sample_rate)
        pitch_mean = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0.0
        
        # Extract spectral features
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=samples, sr=sample_rate))
        spectral_rolloff = np.mean(librosa.feature.spectral_rolloff(y=samples, sr=sample_rate))
        zero_crossing_rate = np.mean(librosa.feature.zero_crossing_rate(samples))
        
        # Combine all features into a single vector
        features = np.concatenate([
            mfcc_mean,           # 20 features
            mfcc_std,            # 20 features
            [pitch_mean],        # 1 feature
            [spectral_centroid], # 1 feature
            [spectral_rolloff],  # 1 feature
            [zero_crossing_rate] # 1 feature
        ])
        
        print(f"[VOICE {operation.upper()}] Features extracted: {len(features)} dimensions")
        print(f"[VOICE {operation.upper()}] Feature range: [{features.min():.4f}, {features.max():.4f}]")
        
        return features.tolist()
    
    except Exception as e:
        raise ValueError(f"Voice feature extraction failed: {str(e)}")


def enroll_voice(base64_audio: str) -> str:
    """Generate and encrypt voice features for storage (25-60 seconds)."""
    encryption_service = get_encryption_service()
    features = extract_voice_features(base64_audio, required_duration=30.0, is_enrollment=True)
    return encryption_service.encrypt(json.dumps(features))


def verify_voice(base64_audio: str, stored_encrypted_features: str, tolerance: float = 0.10) -> dict:
    """
    Compare incoming audio against stored features using multiple similarity metrics.
    Requires 90% similarity (tolerance 0.10) for match.
    
    Args:
        base64_audio: Base64-encoded audio (25-60 seconds)
        stored_encrypted_features: Encrypted enrollment features
        tolerance: Similarity tolerance (default 0.10 = 90% threshold)
    
    Returns:
        Dictionary with success, confidence, similarity, and threshold
    """
    try:
        encryption_service = get_encryption_service()

        # Extract verification features (same duration range as enrollment)
        new_features = np.array(extract_voice_features(base64_audio, required_duration=30.0, is_enrollment=False))
        # Load enrollment features
        stored_features = np.array(json.loads(encryption_service.decrypt(stored_encrypted_features)))

        print(f"[VOICE VERIFY] Feature lengths - New: {len(new_features)}, Stored: {len(stored_features)}")
        
        # Ensure both feature vectors have the same length
        min_length = min(len(new_features), len(stored_features))
        new_features = new_features[:min_length]
        stored_features = stored_features[:min_length]
        
        # Calculate multiple similarity metrics for robust verification
        
        # 1. Cosine similarity (most reliable for voice features)
        dot_product = np.dot(new_features, stored_features)
        norm_new = np.linalg.norm(new_features)
        norm_stored = np.linalg.norm(stored_features)
        
        if norm_new == 0 or norm_stored == 0:
            cosine_similarity = 0.0
        else:
            cosine_similarity = float(dot_product / (norm_new * norm_stored))
        
        # Ensure cosine similarity is in valid range [0, 1]
        cosine_similarity = max(0.0, min(1.0, cosine_similarity))
        
        # 2. Euclidean distance (normalized)
        euclidean_distance = np.linalg.norm(new_features - stored_features)
        max_possible_distance = np.sqrt(len(new_features) * 2)
        normalized_distance = euclidean_distance / max_possible_distance
        distance_similarity = 1.0 - normalized_distance
        distance_similarity = max(0.0, min(1.0, distance_similarity))
        
        # 3. Correlation coefficient
        if np.std(new_features) > 0 and np.std(stored_features) > 0:
            correlation = np.corrcoef(new_features, stored_features)[0, 1]
            if np.isnan(correlation):
                correlation = 0.0
            correlation_similarity = max(0.0, (correlation + 1.0) / 2.0)  # Normalize to [0, 1]
        else:
            correlation_similarity = 0.0
        
        # Combined similarity score (weighted average)
        # Cosine similarity is weighted more heavily for voice features
        combined_similarity = (
            0.6 * cosine_similarity +
            0.25 * distance_similarity +
            0.15 * correlation_similarity
        )
        
        print(f"[VOICE VERIFY] Cosine: {cosine_similarity:.4f}, Distance: {distance_similarity:.4f}, Correlation: {correlation_similarity:.4f}")
        print(f"[VOICE VERIFY] Combined similarity: {combined_similarity:.4f}")
        
        # Stricter threshold: require 90% similarity for match
        threshold = 1.0 - tolerance
        is_match = combined_similarity >= threshold
        
        # Confidence is directly the combined similarity percentage
        confidence = max(0.0, min(100.0, combined_similarity * 100.0))
        
        print(f"[VOICE VERIFY] Threshold: {threshold:.4f}, Match: {is_match}, Confidence: {confidence:.1f}%")

        return {
            "success": bool(is_match),
            "confidence": float(confidence),
            "similarity": float(combined_similarity),
            "threshold": float(threshold),
            "metrics": {
                "cosine": float(cosine_similarity),
                "distance": float(distance_similarity),
                "correlation": float(correlation_similarity)
            }
        }
    except Exception as e:
        raise ValueError(f"Voice verification failed: {str(e)}")
