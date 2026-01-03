import base64
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
import os
from config import BIOMETRIC_ENCRYPTION_KEY, BIOMETRIC_ENCRYPTION_SALT


class EncryptionService:
    """Service for encrypting and decrypting sensitive data using AES-256-CBC"""
    
    def __init__(self, password: bytes = None, salt: bytes = None):
        """
        Initialize the encryption service with a password and salt.
        Uses AES-256-CBC for encryption as per the BiometricProcessor standard.
        
        Args:
            password: Encryption password (defaults to config value)
            salt: Salt for key derivation (defaults to config value)
        """
        # Use config values as defaults
        self.password = password or BIOMETRIC_ENCRYPTION_KEY.encode()
        self.salt = salt or BIOMETRIC_ENCRYPTION_SALT.encode()
        
        self.encryption_key = self._generate_encryption_key()
    
    def _generate_encryption_key(self) -> bytes:
        """
        Generate AES-256 encryption key from password using SHA-256.
        This matches the BiometricProcessor implementation.
        
        Returns:
            32-byte (256-bit) encryption key
        """
        # Hash the key string to get 32 bytes (256 bits)
        key = hashlib.sha256(self.password).digest()
        return key
    
    def encrypt(self, data: str) -> str:
        """
        Encrypt string data using AES-256-CBC.
        Matches the BiometricProcessor encryption approach.
        
        Args:
            data: Plain text string to encrypt
            
        Returns:
            Base64-encoded encrypted string (IV on first line, ciphertext on second line)
            
        Raises:
            ValueError: If encryption fails
        """
        try:
            data_bytes = data.encode('utf-8')
            
            # Create AES cipher in CBC mode
            cipher = AES.new(self.encryption_key, AES.MODE_CBC)
            
            # Encrypt with padding
            cipher_text = cipher.encrypt(pad(data_bytes, AES.block_size))
            
            # Encode IV and ciphertext as base64
            iv = base64.b64encode(cipher.iv).decode('utf-8')
            encrypted_data = base64.b64encode(cipher_text).decode('utf-8')
            
            # Return IV and encrypted data separated by newline
            return iv + '\n' + encrypted_data
        except Exception as e:
            raise ValueError(f"Failed to encrypt data: {str(e)}")
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt encrypted string data using AES-256-CBC.
        Matches the BiometricProcessor decryption approach.
        
        Args:
            encrypted_data: Base64-encoded encrypted string (IV and ciphertext separated by newline)
            
        Returns:
            Decrypted plain text string
            
        Raises:
            ValueError: If decryption fails
        """
        try:
            # Split IV and ciphertext
            lines = encrypted_data.strip().split('\n')
            if len(lines) != 2:
                raise ValueError("Invalid encrypted data format")
            
            iv = base64.b64decode(lines[0])
            cipher_text = base64.b64decode(lines[1])
            
            # Create AES cipher with stored IV
            cipher = AES.new(self.encryption_key, AES.MODE_CBC, iv)
            
            # Decrypt and unpad
            decrypted = unpad(cipher.decrypt(cipher_text), AES.block_size)
            
            return decrypted.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Failed to decrypt data: {str(e)}")
    
    def encrypt_bytes(self, data: bytes) -> bytes:
        """
        Encrypt bytes data using AES-256-CBC.
        
        Args:
            data: Bytes to encrypt
            
        Returns:
            Encrypted bytes (includes IV and ciphertext)
            
        Raises:
            ValueError: If encryption fails
        """
        try:
            # Create AES cipher in CBC mode
            cipher = AES.new(self.encryption_key, AES.MODE_CBC)
            
            # Encrypt with padding
            cipher_text = cipher.encrypt(pad(data, AES.block_size))
            
            # Combine IV and ciphertext
            return cipher.iv + cipher_text
        except Exception as e:
            raise ValueError(f"Failed to encrypt bytes: {str(e)}")
    
    def decrypt_bytes(self, encrypted_data: bytes) -> bytes:
        """
        Decrypt encrypted bytes data using AES-256-CBC.
        
        Args:
            encrypted_data: Encrypted bytes (includes IV and ciphertext)
            
        Returns:
            Decrypted bytes
            
        Raises:
            ValueError: If decryption fails
        """
        try:
            # Extract IV (first 16 bytes) and ciphertext
            iv = encrypted_data[:16]
            ciphertext = encrypted_data[16:]
            
            # Create AES cipher with stored IV
            cipher = AES.new(self.encryption_key, AES.MODE_CBC, iv)
            
            # Decrypt and unpad
            return unpad(cipher.decrypt(ciphertext), AES.block_size)
        except Exception as e:
            raise ValueError(f"Failed to decrypt bytes: {str(e)}")
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using SHA-256.
        
        Args:
            password: Plain text password
            
        Returns:
            Hex-encoded SHA-256 hash of the password
        """
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its SHA-256 hash.
        
        Args:
            plain_password: Plain text password to verify
            hashed_password: Hex-encoded SHA-256 hash to compare against
            
        Returns:
            True if password matches, False otherwise
        """
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


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
