import base64
import io
import json
import numpy as np
from PIL import Image
import cv2
from typing import Tuple, List
from skimage.morphology import skeletonize
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


def extract_minutiae_features(image: np.ndarray) -> dict:
    """
    Extract minutiae by skeletonization using Crossing Number (CN) technique.
    Crossing Number on binary skeleton identifies:
    - CN = 1: Termination (ridge ending)
    - CN = 3: Bifurcation (ridge split)
    """
    try:
        # Binarization
        _, binary = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY_INV)
        
        # Skeletonization
        skeleton = skeletonize(binary / 255).astype(np.uint8)
        
        # Kernel for calculating number of neighbors (Crossing Number)
        # Central pixel gets weight 10, neighbors get weight 1
        kernel = np.array([[1, 1, 1], [1, 10, 1], [1, 1, 1]])
        neighbor_sum = cv2.filter2D(skeleton, -1, kernel, borderType=cv2.BORDER_CONSTANT)
        
        # 11 = 1 central pixel (10) + 1 neighbor (1) -> Termination
        # 13 = 1 central pixel (10) + 3 neighbors (3) -> Bifurcation
        term_coords = np.argwhere(neighbor_sum == 11)
        bif_coords = np.argwhere(neighbor_sum == 13)
        
        return {
            'terminations': len(term_coords),
            'bifurcations': len(bif_coords),
            'term_coords': term_coords.tolist() if len(term_coords) > 0 else [],
            'bif_coords': bif_coords.tolist() if len(bif_coords) > 0 else []
        }
    except Exception as e:
        raise ValueError(f"Minutiae extraction failed: {str(e)}")


def extract_fingerprint_encoding(image_array: np.ndarray) -> list:
    """
    Extract comprehensive fingerprint encoding based on minutiae features.
    Returns a feature vector including termination and bifurcation counts,
    along with image statistics and minutiae spatial positions.
    """
    try:
        # Ensure grayscale
        if len(image_array.shape) == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        
        # Resize to standard size
        image_array = cv2.resize(image_array, (256, 256))
        
        # Extract minutiae features
        minutiae = extract_minutiae_features(image_array)
        
        # Create feature vector starting with minutiae counts
        feature_vector = [
            float(minutiae['terminations']),
            float(minutiae['bifurcations']),
        ]
        
        # Add spatial positions of minutiae (normalized coordinates)
        # This makes the encoding much more distinctive
        term_coords = np.array(minutiae['term_coords']) if minutiae['term_coords'] else np.array([])
        bif_coords = np.array(minutiae['bif_coords']) if minutiae['bif_coords'] else np.array([])
        
        # Flatten and add up to 20 termination positions (x, y pairs)
        if len(term_coords) > 0:
            flat_terms = term_coords.flatten() / 256.0  # Normalize to [0,1]
            feature_vector.extend(flat_terms[:40].tolist())  # Up to 20 points
            # Pad if less than 20
            if len(flat_terms) < 40:
                feature_vector.extend([0.0] * (40 - len(flat_terms)))
        else:
            feature_vector.extend([0.0] * 40)
        
        # Flatten and add up to 20 bifurcation positions (x, y pairs)
        if len(bif_coords) > 0:
            flat_bifs = bif_coords.flatten() / 256.0  # Normalize to [0,1]
            feature_vector.extend(flat_bifs[:40].tolist())  # Up to 20 points
            # Pad if less than 20
            if len(flat_bifs) < 40:
                feature_vector.extend([0.0] * (40 - len(flat_bifs)))
        else:
            feature_vector.extend([0.0] * 40)
        
        # Add spatial distribution features (divide image into 8x8 grid = 64 blocks)
        block_size = 32
        h, w = image_array.shape
        for i in range(0, h - block_size, block_size):
            for j in range(0, w - block_size, block_size):
                block = image_array[i:i+block_size, j:j+block_size]
                # Add mean, std, and variance for better discrimination
                feature_vector.extend([
                    float(np.mean(block)) / 255.0,
                    float(np.std(block)) / 128.0,
                    float(np.var(block)) / 10000.0
                ])
        
        # Convert to numpy array (don't normalize to preserve distinctiveness)
        feature_vector = np.array(feature_vector)
        
        # Add histogram features for additional distinctiveness
        hist = cv2.calcHist([image_array], [0], None, [32], [0, 256]).flatten()
        hist = hist / (hist.sum() + 1e-9)  # Normalize histogram
        feature_vector = np.concatenate([feature_vector, hist])
        
        print(f"[FINGERPRINT ENCODING] Feature vector length: {len(feature_vector)}")
        print(f"[FINGERPRINT ENCODING] Minutiae - Terms: {minutiae['terminations']}, Bifs: {minutiae['bifurcations']}")
        
        return feature_vector.tolist()
    
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
    tolerance: float = 0.05
) -> dict:
    """
    Verify a fingerprint against stored encrypted encoding
    Returns: dict with 'success', 'confidence', 'similarity', and 'threshold'
    Requires 95% similarity (tolerance 0.05) for match
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
        
        print(f"[FINGERPRINT VERIFY] Encoding lengths - New: {len(new_encoding_array)}, Stored: {len(stored_encoding_array)}")
        
        # Calculate multiple similarity metrics for robustness
        # 1. Cosine similarity
        dot_product = np.dot(new_encoding_array, stored_encoding_array)
        norm_a = np.linalg.norm(new_encoding_array)
        norm_b = np.linalg.norm(stored_encoding_array)
        
        if norm_a == 0 or norm_b == 0:
            cosine_similarity = 0.0
        else:
            cosine_similarity = dot_product / (norm_a * norm_b)
        
        # 2. Euclidean distance (converted to similarity)
        euclidean_dist = np.linalg.norm(new_encoding_array - stored_encoding_array)
        max_dist = np.sqrt(len(new_encoding_array) * 2)  # Maximum possible distance
        euclidean_similarity = 1.0 - (euclidean_dist / max_dist)
        
        # 3. Correlation coefficient
        if np.std(new_encoding_array) > 0 and np.std(stored_encoding_array) > 0:
            correlation = np.corrcoef(new_encoding_array, stored_encoding_array)[0, 1]
        else:
            correlation = 0.0
        
        # Combine metrics (weighted average)
        similarity = (cosine_similarity * 0.5 + euclidean_similarity * 0.3 + correlation * 0.2)
        
        # Ensure similarity is in [0, 1] range
        similarity = max(0, min(1, similarity))
        
        # Determine if it's a match (requires 95% similarity)
        threshold = 1 - tolerance
        is_match = similarity >= threshold
        
        # Calculate confidence (0-100)
        confidence = similarity * 100
        
        print(f"[FINGERPRINT VERIFY] Cosine: {cosine_similarity:.4f}, Euclidean: {euclidean_similarity:.4f}, Correlation: {correlation:.4f}")
        print(f"[FINGERPRINT VERIFY] Combined Similarity: {similarity:.4f}, Threshold: {threshold:.4f}, Match: {is_match}")
        print(f"[FINGERPRINT VERIFY] Confidence: {confidence:.2f}%, Tolerance: {tolerance}")
        
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