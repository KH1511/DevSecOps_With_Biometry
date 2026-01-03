from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

# Auth Schemas
class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# User Schemas
class BiometricStatusSchema(BaseModel):
    face: bool = False
    fingerprint: bool = False
    voice: bool = False

class UserBase(BaseModel):
    username: str
    role: Literal["admin", "user"] = "user"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    biometrics: BiometricStatusSchema
    biometric_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

# Biometric Schemas
class BiometricEnroll(BaseModel):
    biometric_type: Literal["face", "fingerprint", "voice"]
    enrollment_data: Optional[str] = None

class BiometricVerify(BaseModel):
    biometric_type: Literal["face", "fingerprint", "voice"]
    verification_data: Optional[str] = None  # Base64 image for face, other data for fingerprint/voice

class BiometricToggle(BaseModel):
    biometric_type: Literal["face", "fingerprint", "voice"]
    enabled: bool

class BiometricResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None  # New token with biometric_verified flag

# Command Schemas
class CommandBase(BaseModel):
    name: str
    description: Optional[str] = None
    command: str
    category: Literal["build", "deploy", "test", "security", "monitoring"]
    is_enabled: bool = True

class CommandCreate(CommandBase):
    pass

class CommandResponse(CommandBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CommandExecute(BaseModel):
    command_id: int

class CommandLogResponse(BaseModel):
    id: int
    command_id: int
    status: Literal["running", "success", "failed"]
    output: Optional[str] = None
    executed_at: datetime

    class Config:
        from_attributes = True
