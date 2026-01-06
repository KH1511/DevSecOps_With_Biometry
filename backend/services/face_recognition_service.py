import numpy as np
import cv2
from PIL import Image
import io
import base64
import json
import logging
from .encryption_service import get_encryption_service

# Import pillow_avif to enable AVIF support
try:
    import pillow_avif
except ImportError:
    pass  # AVIF plugin not available, but other formats will still work

# Set up logging
logger = logging.getLogger(__name__)

def base64_to_image(base64_string: str) -> np.ndarray:
    """Convert base64 string to OpenCV image"""
    try:
        # Validate input
        if not base64_string or not isinstance(base64_string, str):
            raise ValueError("Image data is empty or invalid")
        
        logger.info(f"Received base64 string of length: {len(base64_string)}")
        logger.info(f"First 100 chars: {base64_string[:100]}")
        
        # Remove data URL prefix if present
        if ',' in base64_string:
            prefix = base64_string.split(',')[0]
            logger.info(f"Data URL prefix: {prefix}")
            base64_string = base64_string.split(',')[1]
        
        # Remove any whitespace
        base64_string = base64_string.strip()
        
        # Decode base64 to bytes
        try:
            image_bytes = base64.b64decode(base64_string, validate=True)
        except Exception as e:
            raise ValueError(f"Failed to decode base64 data: {str(e)}")
        
        # Validate we have actual image data
        if len(image_bytes) == 0:
            raise ValueError("Decoded image data is empty")
        
        logger.info(f"Decoded {len(image_bytes)} bytes of image data")
        logger.info(f"First few bytes (hex): {image_bytes[:20].hex()}")
        
        # Convert bytes to PIL Image
        try:
            bytes_io = io.BytesIO(image_bytes)
            image = Image.open(bytes_io)
            
            logger.info(f"PIL Image opened - Format: {image.format}, Mode: {image.mode}, Size: {image.size}")
            
            # Verify the image format is supported
            if image.format not in ['JPEG', 'PNG', 'BMP', 'GIF', 'WEBP']:
                # Try to convert to a supported format
                if image.format:
                    # Convert to RGB mode first
                    if image.mode not in ('RGB', 'L'):
                        image = image.convert('RGB')
                else:
                    raise ValueError(f"Unsupported or unknown image format")
            
            # Force load the image to validate format
            image.load()
            
            # Convert to RGB if needed (handle palette mode, etc.)
            if image.mode not in ('RGB', 'RGBA', 'L'):
                image = image.convert('RGB')
                
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Cannot read image data - file may be corrupted or unsupported format: {str(e)}")
        
        # Convert PIL Image to numpy array
        image_array = np.array(image)
        
        # Validate image dimensions
        if image_array.size == 0:
            raise ValueError("Image has no pixel data")
        
        # Convert RGB/RGBA to BGR (OpenCV format)
        if len(image_array.shape) == 3:
            if image_array.shape[2] == 4:  # RGBA
                image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2BGR)
            elif image_array.shape[2] == 3:  # RGB
                image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        elif len(image_array.shape) == 2:  # Grayscale
            image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2BGR)
        
        return image_array
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Unexpected error processing image: {str(e)}")

def extract_face_encoding(image_array: np.ndarray) -> list:
    """Extract face encoding from image using OpenCV with enhanced feature extraction"""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
        
        # Load OpenCV's pre-trained face detector
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces with stricter parameters for better accuracy
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=8, minSize=(80, 80))
        
        if len(faces) == 0:
            raise ValueError("No face detected in the image")
        
        if len(faces) > 1:
            raise ValueError("Multiple faces detected. Please ensure only one face is visible.")
        
        # Get the first (and only) face
        x, y, w, h = faces[0]
        
        # Extract face region with padding for better feature capture
        padding = int(w * 0.1)
        x_start = max(0, x - padding)
        y_start = max(0, y - padding)
        x_end = min(gray.shape[1], x + w + padding)
        y_end = min(gray.shape[0], y + h + padding)
        
        face_roi = gray[y_start:y_end, x_start:x_end]
        
        # Resize to larger standard size for better feature extraction
        face_roi = cv2.resize(face_roi, (200, 200))
        
        # Apply histogram equalization for better contrast
        face_roi = cv2.equalizeHist(face_roi)
        
        # Normalize pixel values
        face_roi = face_roi.astype('float32') / 255.0
        
        # Extract multiple feature types for robust matching
        
        # 1. Local Binary Pattern (LBP) for texture features
        lbp_features = []
        for i in range(1, face_roi.shape[0] - 1):
            for j in range(1, face_roi.shape[1] - 1):
                center = face_roi[i, j]
                code = 0
                code |= (face_roi[i-1, j-1] > center) << 7
                code |= (face_roi[i-1, j] > center) << 6
                code |= (face_roi[i-1, j+1] > center) << 5
                code |= (face_roi[i, j+1] > center) << 4
                code |= (face_roi[i+1, j+1] > center) << 3
                code |= (face_roi[i+1, j] > center) << 2
                code |= (face_roi[i+1, j-1] > center) << 1
                code |= (face_roi[i, j-1] > center) << 0
                lbp_features.append(code / 255.0)
        
        # 2. Histogram of Oriented Gradients (HOG)-like features
        sobelx = cv2.Sobel(face_roi, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(face_roi, cv2.CV_64F, 0, 1, ksize=3)
        magnitude = np.sqrt(sobelx**2 + sobely**2)
        
        # Divide into grid and compute histograms
        grid_size = 8
        cell_size = face_roi.shape[0] // grid_size
        hog_features = []
        
        for i in range(grid_size):
            for j in range(grid_size):
                cell = magnitude[i*cell_size:(i+1)*cell_size, j*cell_size:(j+1)*cell_size]
                hist, _ = np.histogram(cell.flatten(), bins=16, range=(0, 1))
                hog_features.extend((hist / (np.sum(hist) + 1e-6)).tolist())
        
        # 3. Multi-scale histogram features
        hist_full = cv2.calcHist([face_roi], [0], None, [64], [0, 1]).flatten()
        hist_full = hist_full / (np.sum(hist_full) + 1e-6)
        
        # 4. Downsampled face for global structure
        face_small = cv2.resize(face_roi, (50, 50))
        global_features = face_small.flatten()
        
        # Combine all features with appropriate weighting
        encoding = np.concatenate([
            lbp_features[:3000],      # LBP texture features (most discriminative)
            hog_features[:1500],       # Edge orientation features
            hist_full[:100],           # Global histogram
            global_features[:400]      # Global structure
        ]).tolist()
        
        logger.info(f"Extracted {len(encoding)} facial features")
        
        return encoding
    except Exception as e:
        raise ValueError(f"Face encoding failed: {str(e)}")

def enroll_face(base64_image: str) -> str:
    """
    Enroll a face and return encrypted face encoding
    Returns: Encrypted face encoding as string
    """
    try:
        # Get encryption service
        encryption_service = get_encryption_service()
        
        # Convert base64 to image
        image = base64_to_image(base64_image)
        
        # Extract face encoding
        face_encoding = extract_face_encoding(image)
        
        # Convert to JSON string
        encoding_json = json.dumps(face_encoding)
        
        # Encrypt the encoding
        encrypted_encoding = encryption_service.encrypt(encoding_json)
        
        return encrypted_encoding
    except Exception as e:
        raise ValueError(f"Face enrollment failed: {str(e)}")

def verify_face(base64_image: str, stored_encrypted_encoding: str, tolerance: float = 0.10) -> dict:
    """
    Verify a face against stored encrypted encoding
    Returns: dict with 'success' and 'confidence' keys
    
    Note: tolerance represents the maximum allowed distance (lower = stricter)
    Default 0.10 means 90% similarity required for match
    """
    try:
        logger.info("Starting face verification")
        
        # Get encryption service
        encryption_service = get_encryption_service()
        
        # Convert base64 to image
        image = base64_to_image(base64_image)
        
        # Extract face encoding from new image
        new_encoding = extract_face_encoding(image)
        logger.info(f"Extracted {len(new_encoding)} features from verification image")
        
        # Decrypt stored encoding
        decrypted_json = encryption_service.decrypt(stored_encrypted_encoding)
        stored_encoding = json.loads(decrypted_json)
        logger.info(f"Decrypted stored encoding with {len(stored_encoding)} features")
        
        # Ensure both encodings have the same length
        min_length = min(len(new_encoding), len(stored_encoding))
        new_encoding = new_encoding[:min_length]
        stored_encoding = stored_encoding[:min_length]
        
        # Convert to numpy arrays
        new_encoding_array = np.array(new_encoding)
        stored_encoding_array = np.array(stored_encoding)
        
        # Calculate multiple similarity metrics for robust verification
        
        # 1. Cosine similarity (0 to 1, higher is better)
        dot_product = np.dot(new_encoding_array, stored_encoding_array)
        norm_a = np.linalg.norm(new_encoding_array)
        norm_b = np.linalg.norm(stored_encoding_array)
        
        if norm_a == 0 or norm_b == 0:
            cosine_similarity = 0
        else:
            cosine_similarity = dot_product / (norm_a * norm_b)
        
        # 2. Euclidean distance normalized (0 to 1, lower distance = higher similarity)
        euclidean_distance = np.linalg.norm(new_encoding_array - stored_encoding_array)
        max_possible_distance = np.sqrt(len(new_encoding_array) * 2)  # Assuming normalized features
        normalized_distance = euclidean_distance / max_possible_distance
        distance_similarity = 1 - normalized_distance
        
        # 3. Correlation coefficient (-1 to 1, higher is better)
        correlation = np.corrcoef(new_encoding_array, stored_encoding_array)[0, 1]
        if np.isnan(correlation):
            correlation = 0
        correlation_similarity = (correlation + 1) / 2  # Normalize to 0-1
        
        # Combined similarity score (weighted average)
        # Cosine similarity is most reliable for facial features
        combined_similarity = (
            0.5 * cosine_similarity +
            0.3 * distance_similarity +
            0.2 * correlation_similarity
        )
        
        logger.info(f"Similarity metrics - Cosine: {cosine_similarity:.3f}, Distance: {distance_similarity:.3f}, Correlation: {correlation_similarity:.3f}")
        logger.info(f"Combined similarity: {combined_similarity:.3f}, Required threshold: {1 - tolerance:.3f}")
        
        # Decision: require high combined similarity
        # With tolerance=0.15, we need 85% similarity to pass
        is_match = combined_similarity >= (1 - tolerance)
        
        # Calculate confidence (0-100)
        confidence = max(0, min(100, combined_similarity * 100))
        
        return {
            "success": bool(is_match),
            "confidence": float(confidence),
            "similarity": float(combined_similarity),
            "threshold": float(1 - tolerance),
            "metrics": {
                "cosine": float(cosine_similarity),
                "distance": float(distance_similarity),
                "correlation": float(correlation_similarity)
            }
        }
    except Exception as e:
        logger.error(f"Face verification error: {str(e)}")
        raise ValueError(f"Face verification failed: {str(e)}")

def detect_face_in_image(base64_image: str) -> dict:
    """
    Detect if there's a face in the image (for preview/validation)
    Returns: dict with detection info
    """
    try:
        image = base64_to_image(base64_image)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Load OpenCV's pre-trained face detector
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        face_count = len(faces)
        
        return {
            "face_detected": face_count > 0,
            "face_count": face_count,
            "message": "Face detected" if face_count == 1 else 
                      "Multiple faces detected" if face_count > 1 else 
                      "No face detected"
        }
    except Exception as e:
        return {
            "face_detected": False,
            "face_count": 0,
            "message": f"Error: {str(e)}"
        }