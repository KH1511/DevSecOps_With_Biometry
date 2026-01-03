from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
import asyncio
from typing import List

from database import engine, get_db, Base
from models import User, BiometricData, Command, CommandLog
from schemas import (
    UserLogin, Token, UserResponse, BiometricStatusSchema,
    BiometricEnroll, BiometricVerify, BiometricToggle, BiometricResponse,
    CommandResponse, CommandCreate, CommandExecute, CommandLogResponse
)
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_active_user, get_current_admin_user,
    get_biometric_verified_user, security,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
import services.face_recognition_service as face_service
import services.voice_recognition_service as voice_service

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Secure DevSecOps Console API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database with default data
def init_db():
    db = next(get_db())
    
    # Check if admin user exists
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        # Create admin user - Note: Use environment variable for production
        # Default password for demo: admin123
        default_password = "admin123"  # TODO: Use environment variable
        admin_user = User(
            username="admin",
            hashed_password=get_password_hash(default_password),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Create biometric data for admin (all disabled by default)
        biometric_types = ["face", "fingerprint", "voice"]
        for bio_type in biometric_types:
            biometric = BiometricData(
                user_id=admin_user.id,
                biometric_type=bio_type,
                is_enrolled=False,
                enrollment_data=None
            )
            db.add(biometric)
        
        db.commit()
    
    # Check if commands exist
    command_count = db.query(Command).count()
    if command_count == 0:
        default_commands = [
            Command(name="Build Project", description="Compile and build the application", command="npm run build", category="build", is_enabled=True),
            Command(name="Run Tests", description="Execute all unit tests", command="npm test", category="test", is_enabled=True),
            Command(name="Deploy Staging", description="Deploy to staging environment", command="deploy --env=staging", category="deploy", is_enabled=True),
            Command(name="Deploy Production", description="Deploy to production environment", command="deploy --env=production", category="deploy", is_enabled=True),
            Command(name="Security Scan", description="Run security vulnerability scan", command="npm audit", category="security", is_enabled=True),
            Command(name="Health Check", description="Check system health status", command="health-check --all", category="monitoring", is_enabled=True),
            Command(name="Lint Code", description="Run code linting", command="npm run lint", category="build", is_enabled=True),
            Command(name="Integration Tests", description="Run integration test suite", command="npm run test:integration", category="test", is_enabled=True),
        ]
        for cmd in default_commands:
            db.add(cmd)
        db.commit()
    
    db.close()

@app.on_event("startup")
async def startup_event():
    init_db()

# ============= AUTH ENDPOINTS =============

@app.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_login.username).first()
    if not user or not verify_password(user_login.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires,
        biometric_verified=False  # User must verify biometrics
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    credentials = Depends(security),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get biometric verification status from token
    from jose import jwt, JWTError
    biometric_verified = False
    try:
        token = credentials.credentials
        payload = jwt.decode(token, "your-secret-key-change-this-in-production-use-env-variable", algorithms=["HS256"])
        biometric_verified = payload.get("biometric_verified", False)
    except JWTError:
        pass
    
    # Get biometric status
    biometrics = db.query(BiometricData).filter(BiometricData.user_id == current_user.id).all()
    biometric_status = BiometricStatusSchema()
    for bio in biometrics:
        if bio.biometric_type == "face":
            biometric_status.face = bio.is_enrolled
        elif bio.biometric_type == "fingerprint":
            biometric_status.fingerprint = bio.is_enrolled
        elif bio.biometric_type == "voice":
            biometric_status.voice = bio.is_enrolled
    
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        is_active=current_user.is_active,
        biometrics=biometric_status,
        biometric_verified=biometric_verified,
        created_at=current_user.created_at
    )

@app.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    return {"message": "Successfully logged out"}

# ============= BIOMETRIC ENDPOINTS =============

@app.post("/biometric/enroll", response_model=BiometricResponse)
async def enroll_biometric(
    biometric_data: BiometricEnroll,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if biometric_data.biometric_type == "face":
        if not biometric_data.enrollment_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face image data is required for face recognition enrollment"
            )
        try:
            encrypted_encoding = face_service.enroll_face(biometric_data.enrollment_data)
            enrollment_data = encrypted_encoding
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    elif biometric_data.biometric_type == "voice":
        if not biometric_data.enrollment_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voice audio data is required for voice enrollment"
            )
        try:
            enrollment_data = voice_service.enroll_voice(biometric_data.enrollment_data)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    else:
        await asyncio.sleep(3)
        enrollment_data = biometric_data.enrollment_data or f"mock_{biometric_data.biometric_type}_data"
    
    # Check if biometric already exists
    existing = db.query(BiometricData).filter(
        BiometricData.user_id == current_user.id,
        BiometricData.biometric_type == biometric_data.biometric_type
    ).first()
    
    if existing:
        existing.is_enrolled = True
        existing.enrollment_data = enrollment_data
    else:
        new_biometric = BiometricData(
            user_id=current_user.id,
            biometric_type=biometric_data.biometric_type,
            is_enrolled=True,
            enrollment_data=enrollment_data
        )
        db.add(new_biometric)
    
    db.commit()
    
    return BiometricResponse(
        success=True,
        message=f"{biometric_data.biometric_type.capitalize()} biometric enrolled successfully"
    )

@app.post("/biometric/verify", response_model=BiometricResponse)
async def verify_biometric(
    biometric_verify: BiometricVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if biometric is enrolled
    biometric = db.query(BiometricData).filter(
        BiometricData.user_id == current_user.id,
        BiometricData.biometric_type == biometric_verify.biometric_type
    ).first()
    
    if not biometric or not biometric.is_enrolled:
        return BiometricResponse(
            success=False,
            message=f"{biometric_verify.biometric_type.capitalize()} biometric not enrolled"
        )
    
    if biometric_verify.biometric_type == "face":
        if not biometric_verify.verification_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face image data is required for verification"
            )
        try:
            result = face_service.verify_face(
                biometric_verify.verification_data,
                biometric.enrollment_data
            )
            if result["success"]:
                access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                new_token = create_access_token(
                    data={"sub": current_user.username},
                    expires_delta=access_token_expires,
                    biometric_verified=True
                )
                return BiometricResponse(
                    success=True,
                    message=f"Face verification successful (confidence: {result['confidence']:.1f}%)",
                    token=new_token
                )
            return BiometricResponse(
                success=False,
                message=f"Face verification failed (confidence: {result['confidence']:.1f}%)"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    elif biometric_verify.biometric_type == "voice":
        if not biometric_verify.verification_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voice audio data is required for verification"
            )
        try:
            result = voice_service.verify_voice(
                biometric_verify.verification_data,
                biometric.enrollment_data
            )
            if result["success"]:
                access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                new_token = create_access_token(
                    data={"sub": current_user.username},
                    expires_delta=access_token_expires,
                    biometric_verified=True
                )
                return BiometricResponse(
                    success=True,
                    message=f"Voice verification successful (confidence: {result['confidence']:.1f}%)",
                    token=new_token
                )
            return BiometricResponse(
                success=False,
                message=f"Voice verification failed (confidence: {result['confidence']:.1f}%)"
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    else:
        await asyncio.sleep(2)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        new_token = create_access_token(
            data={"sub": current_user.username},
            expires_delta=access_token_expires,
            biometric_verified=True
        )
        return BiometricResponse(
            success=True,
            message=f"{biometric_verify.biometric_type.capitalize()} verification successful",
            token=new_token
        )


@app.put("/biometric/toggle", response_model=BiometricResponse)
async def toggle_biometric(
    biometric_toggle: BiometricToggle,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    biometric = db.query(BiometricData).filter(
        BiometricData.user_id == current_user.id,
        BiometricData.biometric_type == biometric_toggle.biometric_type
    ).first()
    
    if not biometric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{biometric_toggle.biometric_type.capitalize()} biometric not found"
        )
    
    biometric.is_enrolled = biometric_toggle.enabled
    db.commit()
    
    action = "enabled" if biometric_toggle.enabled else "disabled"
    return BiometricResponse(
        success=True,
        message=f"{biometric_toggle.biometric_type.capitalize()} biometric {action}"
    )

@app.post("/biometric/detect-face")
async def detect_face(
    data: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Detect if there's a face in the image (for preview/validation)"""
    if "image" not in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image data is required"
        )
    
    try:
        result = face_service.detect_face_in_image(data["image"])
        return result
    except Exception as e:
        return {
            "face_detected": False,
            "face_count": 0,
            "message": f"Error: {str(e)}"
        }

# ============= COMMAND ENDPOINTS =============

@app.get("/commands", response_model=List[CommandResponse])
async def get_commands(
    current_user: User = Depends(get_biometric_verified_user),
    db: Session = Depends(get_db)
):
    commands = db.query(Command).filter(Command.is_enabled == True).all()
    return commands

@app.post("/commands", response_model=CommandResponse)
async def create_command(
    command_data: CommandCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Create new command
    new_command = Command(
        name=command_data.name,
        description=command_data.description,
        command=command_data.command,
        category=command_data.category,
        is_enabled=command_data.is_enabled
    )
    db.add(new_command)
    db.commit()
    db.refresh(new_command)
    return new_command

@app.post("/commands/execute", response_model=CommandLogResponse)
async def execute_command(
    command_exec: CommandExecute,
    current_user: User = Depends(get_biometric_verified_user),
    db: Session = Depends(get_db)
):
    command = db.query(Command).filter(Command.id == command_exec.command_id).first()
    if not command:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Command not found"
        )
    
    if not command.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Command is disabled"
        )
    
    # Create command log
    command_log = CommandLog(
        command_id=command.id,
        user_id=current_user.id,
        status="running"
    )
    db.add(command_log)
    db.commit()
    db.refresh(command_log)
    
    # Simulate command execution
    asyncio.create_task(execute_command_async(command_log.id, db))
    
    return command_log

async def execute_command_async(log_id: int, db: Session):
    # Simulate command execution
    await asyncio.sleep(2)
    
    # Get the log
    command_log = db.query(CommandLog).filter(CommandLog.id == log_id).first()
    if command_log:
        # Mock success/failure (80% success rate)
        import random
        success = random.random() > 0.2
        command_log.status = "success" if success else "failed"
        command_log.output = "Command completed successfully" if success else "Error: Command failed"
        db.commit()

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Secure DevSecOps Console API",
        "version": "1.0.0",
        "status": "running"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
