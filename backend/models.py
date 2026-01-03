from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")  # 'admin' or 'user'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    biometrics = relationship("BiometricData", back_populates="user", cascade="all, delete-orphan")
    command_logs = relationship("CommandLog", back_populates="user", cascade="all, delete-orphan")

class BiometricData(Base):
    __tablename__ = "biometric_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    biometric_type = Column(String, nullable=False)  # 'face', 'fingerprint', 'voice'
    is_enrolled = Column(Boolean, default=False)
    enrollment_data = Column(String, nullable=True)  # Mock data for now
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="biometrics")

class Command(Base):
    __tablename__ = "commands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    command = Column(String, nullable=False)
    category = Column(String, nullable=False)  # 'build', 'deploy', 'test', 'security', 'monitoring'
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    logs = relationship("CommandLog", back_populates="command", cascade="all, delete-orphan")

class CommandLog(Base):
    __tablename__ = "command_logs"

    id = Column(Integer, primary_key=True, index=True)
    command_id = Column(Integer, ForeignKey("commands.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, nullable=False)  # 'running', 'success', 'failed'
    output = Column(String, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    command = relationship("Command", back_populates="logs")
    user = relationship("User", back_populates="command_logs")
