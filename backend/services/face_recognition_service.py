import numpy as np
import cv2
from PIL import Image
import io
import base64
import json
import mediapipe as mp
from .encryption_service import get_encryption_service

def base64_to_image(base64_string: str) -> np.ndarray:
    """Convert base64 string to OpenCV image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_string)
        
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL Image to numpy array
        image_array = np.array(image)
        
        # Convert RGB to BGR (OpenCV format)
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        return image_array
    except Exception as e:
        raise ValueError(f"Invalid image format: {str(e)}")

def extract_face_encoding(image_array: np.ndarray) -> list:
    """
    Extract face encoding using MediaPipe FaceMesh (468 landmarks).
    MediaPipe is lightweight, robust to partial occlusions, and fast on CPU.
    """
    try:
        mp_face_mesh = mp.solutions.face_mesh
        
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
        
        # Initialize FaceMesh with single face detection
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        ) as face_mesh:
            results = face_mesh.process(rgb_image)
            
            if not results.multi_face_landmarks:
                raise ValueError("No face detected in the image")
            
            if len(results.multi_face_landmarks) > 1:
                raise ValueError("Multiple faces detected. Please ensure only one face is visible.")
            
            # Extract landmarks (468 points with x, y, z coordinates normalized [0, 1])
            landmarks = results.multi_face_landmarks[0].landmark
            descriptor = np.array([[lm.x, lm.y, lm.z] for lm in landmarks]).flatten()
            
            return descriptor.tolist()
    
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

def verify_face(base64_image: str, stored_encrypted_encoding: str, tolerance: float = 0.6) -> dict:
    """
    Verify a face against stored encrypted encoding
    Returns: dict with 'success' and 'confidence' keys
    """
    try:
        # Get encryption service
        encryption_service = get_encryption_service()
        
        # Convert base64 to image
        image = base64_to_image(base64_image)
        
        # Extract face encoding from new image
        new_encoding = extract_face_encoding(image)
        
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
        
        # Convert similarity (0-1) to match decision
        # Higher similarity means better match
        is_match = similarity >= (1 - tolerance)
        
        # Calculate confidence (0-100)
        confidence = max(0, min(100, similarity * 100))
        
        return {
            "success": bool(is_match),
            "confidence": float(confidence),
            "similarity": float(similarity),
            "threshold": 1 - tolerance
        }
    except Exception as e:
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
