import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os


class EncryptionService:
    """Service for encrypting and decrypting sensitive data using AES-256-GCM"""
    
    def __init__(self, password: bytes = None, salt: bytes = None):
        """
        Initialize the encryption service with a password and salt.
        Uses AES-256-GCM for authenticated encryption.
        
        Args:
            password: Encryption password (defaults to env variable or hardcoded value)
            salt: Salt for key derivation (defaults to env variable or hardcoded value)
        """
        # In production, these should come from environment variables
        self.password = password or os.getenv(
            'BIOMETRIC_ENCRYPTION_KEY',
            'your-biometric-encryption-key-change-in-production'
        ).encode()
        
        self.salt = salt or os.getenv(
            'BIOMETRIC_ENCRYPTION_SALT',
            'biometric-salt-change-in-production'
        ).encode()
        
        self.encryption_key = self._generate_encryption_key()
        self.cipher = AESGCM(self.encryption_key)
    
    def _generate_encryption_key(self) -> bytes:
        """
        Generate AES-256 encryption key from password and salt using SHA-256.
        
        Returns:
            32-byte (256-bit) encryption key
        """
        # Combine password and salt
        combined = self.password + self.salt
        
        # Hash using SHA-256 to get 32-byte key
        key = hashlib.sha256(combined).digest()
        
        return key
    
    def encrypt(self, data: str) -> str:
        """
        Encrypt string data using AES-256-GCM.
        
        Args:
            data: Plain text string to encrypt
            
        Returns:
            Base64-encoded encrypted string (includes nonce and ciphertext)
            
        Raises:
            ValueError: If encryption fails
        """
        try:
            # Generate a random 96-bit nonce (12 bytes) for GCM
            nonce = os.urandom(12)
            
            # Encrypt the data
            ciphertext = self.cipher.encrypt(nonce, data.encode(), None)
            
            # Combine nonce and ciphertext for storage
            encrypted_data = nonce + ciphertext
            
            # Encode as base64 for storage/transmission
            return base64.b64encode(encrypted_data).decode()
        except Exception as e:
            raise ValueError(f"Failed to encrypt data: {str(e)}")
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt encrypted string data using AES-256-GCM.
        
        Args:
            encrypted_data: Base64-encoded encrypted string
            
        Returns:
            Decrypted plain text string
            
        Raises:
            ValueError: If decryption fails
        """
        try:
            # Decode from base64
            encrypted_bytes = base64.b64decode(encrypted_data.encode())
            
            # Extract nonce (first 12 bytes) and ciphertext
            nonce = encrypted_bytes[:12]
            ciphertext = encrypted_bytes[12:]
            
            # Decrypt the data
            decrypted = self.cipher.decrypt(nonce, ciphertext, None)
            
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"Failed to decrypt data: {str(e)}")
    
    def encrypt_bytes(self, data: bytes) -> bytes:
        """
        Encrypt bytes data using AES-256-GCM.
        
        Args:
            data: Bytes to encrypt
            
        Returns:
            Encrypted bytes (includes nonce and ciphertext)
            
        Raises:
            ValueError: If encryption fails
        """
        try:
            # Generate a random 96-bit nonce (12 bytes) for GCM
            nonce = os.urandom(12)
            
            # Encrypt the data
            ciphertext = self.cipher.encrypt(nonce, data, None)
            
            # Combine nonce and ciphertext
            return nonce + ciphertext
        except Exception as e:
            raise ValueError(f"Failed to encrypt bytes: {str(e)}")
    
    def decrypt_bytes(self, encrypted_data: bytes) -> bytes:
        """
        Decrypt encrypted bytes data using AES-256-GCM.
        
        Args:
            encrypted_data: Encrypted bytes (includes nonce and ciphertext)
            
        Returns:
            Decrypted bytes
            
        Raises:
            ValueError: If decryption fails
        """
        try:
            # Extract nonce (first 12 bytes) and ciphertext
            nonce = encrypted_data[:12]
            ciphertext = encrypted_data[12:]
            
            # Decrypt the data
            return self.cipher.decrypt(nonce, ciphertext, None)
        except Exception as e:
            raise ValueError(f"Failed to decrypt bytes: {str(e)}")


# Global singleton instance for convenience
_encryption_service_instance = None


def get_encryption_service() -> EncryptionService:
    """
    Get or create the global encryption service instance.
    
    Returns:
        EncryptionService instance
    """
    global _encryption_service_instance
    if _encryption_service_instance is None:
        _encryption_service_instance = EncryptionService()
    return _encryption_service_instance
