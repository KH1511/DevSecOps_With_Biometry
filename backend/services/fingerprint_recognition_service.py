import base64
import io
import json
import numpy as np
from PIL import Image
import cv2
from typing import Tuple, List
from .encryption_service import get_encryption_service


def base64_to_image(base64_string: str) -> np.ndarray:
    """Convert base64 string to OpenCV image array"""
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_bytes = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)
        
        # Convert to grayscale if needed
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        
        return image_array
    except Exception as e:
        raise ValueError(f"Invalid image format: {str(e)}")


def preprocess_fingerprint(image: np.ndarray) -> np.ndarray:
    """Preprocess fingerprint image for feature extraction"""
    # Normalize image
    image = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(image, (5, 5), 0)
    
    # Apply adaptive thresholding
    binary = cv2.adaptiveThreshold(
        blurred, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 11, 2
    )
    
    # Morphological operations to clean up
    kernel = np.ones((3, 3), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
    
    return cleaned


def extract_minutiae_features(image: np.ndarray) -> np.ndarray:
    """Extract minutiae-like features from fingerprint image"""
    # Apply thinning to get ridge skeleton
    kernel = np.ones((3, 3), np.uint8)
    thinned = cv2.ximgproc.thinning(image) if hasattr(cv2, 'ximgproc') else image
    
    # Detect edges and corners (minutiae approximation)
    edges = cv2.Canny(image, 50, 150)
    corners = cv2.goodFeaturesToTrack(
        image, maxCorners=100, qualityLevel=0.01, minDistance=10
    )
    
    # Create feature vector from image statistics
    features = []
    
    # Divide image into blocks and extract features
    block_size = 16
    h, w = image.shape
    for i in range(0, h - block_size, block_size):
        for j in range(0, w - block_size, block_size):
            block = image[i:i+block_size, j:j+block_size]
            features.extend([
                np.mean(block),
                np.std(block),
                np.median(block)
            ])
    
    # Limit feature vector size
    features = np.array(features[:300])
    
    # Add global features
    global_features = [
        np.mean(image),
        np.std(image),
        np.sum(edges) / (h * w),
        len(corners) if corners is not None else 0
    ]
    
    features = np.concatenate([features, global_features])
    
    # Normalize
    if np.linalg.norm(features) > 0:
        features = features / np.linalg.norm(features)
    
    return features


def extract_orb_features(image: np.ndarray) -> np.ndarray:
    """Extract ORB (Oriented FAST and Rotated BRIEF) features"""
    orb = cv2.ORB_create(nfeatures=100)
    keypoints, descriptors = orb.detectAndCompute(image, None)
    
    if descriptors is None or len(descriptors) == 0:
        # Return zero vector if no features detected
        return np.zeros(100 * 32)
    
    # Flatten and pad/truncate to fixed size
    flat_descriptors = descriptors.flatten()
    target_size = 100 * 32  # 100 keypoints * 32 descriptor size
    
    if len(flat_descriptors) < target_size:
        flat_descriptors = np.pad(
            flat_descriptors, 
            (0, target_size - len(flat_descriptors)), 
            'constant'
        )
    else:
        flat_descriptors = flat_descriptors[:target_size]
    
    return flat_descriptors.astype(np.float32)


def extract_fingerprint_encoding(image_array: np.ndarray) -> list:
    """
    Extract comprehensive fingerprint encoding combining multiple features
    """
    try:
        # Ensure grayscale
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        
        # Resize to standard size
        image_array = cv2.resize(image_array, (256, 256))
        
        # Preprocess
        processed = preprocess_fingerprint(image_array)
        
        # Extract different feature types
        minutiae_features = extract_minutiae_features(processed)
        orb_features = extract_orb_features(processed)
        
        # Combine features
        combined_features = np.concatenate([
            minutiae_features,
            orb_features[:500]  # Limit ORB features
        ])
        
        # Normalize final encoding
        if np.linalg.norm(combined_features) > 0:
            combined_features = combined_features / np.linalg.norm(combined_features)
        
        return combined_features.tolist()
    
    except Exception as e:
        raise ValueError(f"Fingerprint encoding failed: {str(e)}")


def enroll_fingerprint(base64_image: str) -> str:
    """
    Enroll a fingerprint and return encrypted encoding
    """
    try:
        encryption_service = get_encryption_service()
        
        # Convert base64 to image
        image = base64_to_image(base64_image)
        
        # Validate image size
        if image.size < 10000:  # At least 100x100
            raise ValueError("Fingerprint image too small. Please capture a clearer image.")
        
        # Extract fingerprint encoding
        fingerprint_encoding = extract_fingerprint_encoding(image)
        
        # Convert to JSON string
        encoding_json = json.dumps(fingerprint_encoding)
        
        # Encrypt the encoding
        encrypted_encoding = encryption_service.encrypt(encoding_json)
        
        return encrypted_encoding
    
    except Exception as e:
        raise ValueError(f"Fingerprint enrollment failed: {str(e)}")


def verify_fingerprint(
    base64_image: str, 
    stored_encrypted_encoding: str, 
    tolerance: float = 0.6
) -> dict:
    """
    Verify a fingerprint against stored encrypted encoding
    Returns: dict with 'success', 'confidence', 'similarity', and 'threshold'
    """
    try:
        encryption_service = get_encryption_service()
        
        # Convert base64 to image
        image = base64_to_image(base64_image)
        
        # Extract fingerprint encoding from new image
        new_encoding = extract_fingerprint_encoding(image)
        
        # Decrypt stored encoding
        decrypted_json = encryption_service.decrypt(stored_encrypted_encoding)
        stored_encoding = json.loads(decrypted_json)
        
        # Convert to numpy arrays
        new_encoding_array = np.array(new_encoding)
        stored_encoding_array = np.array(stored_encoding)
        
        # Calculate cosine similarity
        dot_product = np.dot(new_encoding_array, stored_encoding_array)
        norm_a = np.linalg.norm(new_encoding_array)
        norm_b = np.linalg.norm(stored_encoding_array)
        
        if norm_a == 0 or norm_b == 0:
            similarity = 0
        else:
            similarity = dot_product / (norm_a * norm_b)
        
        # Ensure similarity is in [0, 1] range
        similarity = max(0, min(1, similarity))
        
        # Determine if it's a match
        threshold = 1 - tolerance
        is_match = similarity >= threshold
        
        # Calculate confidence (0-100)
        confidence = similarity * 100
        
        return {
            "success": bool(is_match),
            "confidence": float(confidence),
            "similarity": float(similarity),
            "threshold": float(threshold)
        }
    
    except Exception as e:
        raise ValueError(f"Fingerprint verification failed: {str(e)}")


def detect_fingerprint_quality(base64_image: str) -> dict:
    """
    Assess the quality of a fingerprint image
    Returns: dict with quality metrics
    """
    try:
        image = base64_to_image(base64_image)
        
        # Check image size
        if image.size < 10000:
            return {
                "quality": "poor",
                "score": 0,
                "message": "Image too small. Please capture a larger fingerprint."
            }
        
        # Calculate sharpness (Laplacian variance)
        laplacian = cv2.Laplacian(image, cv2.CV_64F)
        sharpness = laplacian.var()
        
        # Calculate contrast
        contrast = image.std()
        
        # Normalize scores
        sharpness_score = min(100, (sharpness / 100) * 100)
        contrast_score = min(100, (contrast / 50) * 100)
        
        # Overall score
        overall_score = (sharpness_score + contrast_score) / 2
        
        if overall_score >= 70:
            quality = "excellent"
            message = "Fingerprint quality is excellent"
        elif overall_score >= 50:
            quality = "good"
            message = "Fingerprint quality is good"
        elif overall_score >= 30:
            quality = "fair"
            message = "Fingerprint quality is acceptable, but could be better"
        else:
            quality = "poor"
            message = "Fingerprint quality is poor. Please recapture with better lighting and focus"
        
        return {
            "quality": quality,
            "score": float(overall_score),
            "sharpness": float(sharpness_score),
            "contrast": float(contrast_score),
            "message": message
        }
    
    except Exception as e:
        return {
            "quality": "error",
            "score": 0,
            "message": f"Error analyzing fingerprint: {str(e)}"
        }