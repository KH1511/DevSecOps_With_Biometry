# DevSecOps with Biometry

A comprehensive secure console application with **multi-modal biometric authentication** (face and voice recognition) built with FastAPI, React, and SQLite. This project demonstrates DevSecOps best practices with integrated security scanning, encrypted biometric data storage, and role-based access control.

## 🌟 Features

### Security
- 🔐 Multi-factor authentication (Password + Biometrics)
- 👤 **Face Recognition** using OpenCV and facial encodings
- 🎙️ **Voice Recognition** with spectral signature analysis
- 🔒 **AES-256-GCM encryption** for all biometric data
- 🔑 JWT token-based authentication with secure refresh
- 🛡️ Role-based access control (Admin/User)
- 📝 Complete audit logging for all operations

### Biometric Technology
- **Face Recognition:** 128-dimensional facial encoding vectors with cosine similarity matching
- **Voice Recognition:** Spectral signature extraction (195 features: frequency bins, energy, zero-crossing rate, spectral centroid)
- **WAV Audio Support:** 16kHz mono audio processing with RecordRTC
- **Flexible Enrollment:** Optional biometric enrollment with individual control
- **Real-time Verification:** Sub-second biometric verification response

### Development & Operations
- 🐳 Fully containerized with Docker & Docker Compose
- 🚀 Hot-reload development environment
- 📊 RESTful API with automatic documentation (Swagger/OpenAPI)
- 🎨 Modern responsive UI with TailwindCSS and shadcn/ui
- 🔍 Built-in command execution system with audit trails

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.9+)
- **Database:** SQLite with SQLAlchemy ORM
- **Authentication:** JWT (JSON Web Tokens) with passlib + bcrypt
- **Face Recognition:** OpenCV (`cv2`), `face_recognition` library (dlib-based)
- **Voice Recognition:** NumPy, SciPy (signal processing and FFT)
- **Encryption:** `cryptography` library (AES-256-GCM)
- **Audio Processing:** WAV file parsing with `scipy.io.wavfile` and `wave` module
- **CORS:** Enabled for cross-origin requests

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite (fast HMR and optimized builds)
- **Styling:** TailwindCSS 3.x
- **UI Components:** shadcn/ui + Radix UI primitives
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Audio Recording:** RecordRTC (WAV encoder with StereoAudioRecorder)
- **Notifications:** Sonner (toast notifications)
- **Icons:** Lucide React

### DevOps & Infrastructure
- **Containerization:** Docker & Docker Compose
- **Web Server:** Nginx (production frontend serving + reverse proxy)
- **Development:** Hot-reload for both frontend and backend
- **Database:** File-based SQLite (easy deployment, no separate DB server)

## 📋 Prerequisites

- **Docker Desktop** (Windows/Mac) or Docker + Docker Compose (Linux)
- **Git** for version control
- **Node.js 18+** and **npm** (for local frontend development)
- **Python 3.9+** and **pip** (for local backend development)

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd DevSecOps_With_Biometry
```

#### 2. Start All Services

```bash
docker compose up -d --build
```

This will:
- Build and start the FastAPI backend on port 8000
- Build and serve the React frontend via Nginx on port 80
- Initialize the SQLite database with default admin user

#### 3. Access the Application

- **Frontend (Web UI):** http://localhost
- **Backend API:** http://localhost:8000
- **API Documentation (Swagger):** http://localhost:8000/docs
- **Alternative API Docs (ReDoc):** http://localhost:8000/redoc

#### 4. Default Admin Credentials

```
Username: admin
Password: admin123
```

⚠️ **IMPORTANT:** Change these credentials immediately in production!

### Option 2: Local Development (Hot Reload)

#### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server with auto-reload
uvicorn main:app --reload --port 8000
```

Backend will be available at http://localhost:8000

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server with HMR
npm run dev
```

Frontend will be available at http://localhost:5173 (Vite default port)

**Note:** Update API base URL in `frontend/src/lib/api.ts` if backend is on different port.

## 📚 Usage Guide

### 1. Initial Login

1. Navigate to http://localhost (or http://localhost:5173 in dev mode)
2. Enter default admin credentials
3. System will prompt to change password on first login (recommended)

### 2. Biometric Enrollment

#### Face Recognition Enrollment

1. Click on **Profile** or **Biometric Settings**
2. Select **Enroll Face Recognition**
3. Allow browser camera access when prompted
4. Position your face in the camera frame
5. Click **Capture** when ready
6. System will extract 128-dimensional facial encoding
7. Encoding is encrypted with AES-256-GCM and stored

#### Voice Recognition Enrollment

1. Navigate to **Biometric Settings** or **Voice Storage** page
2. Select **Enroll Voice Recognition**
3. Allow browser microphone access when prompted
4. Click **Start Recording**
5. Speak naturally for 3-10 seconds (recommended: say a passphrase)
6. Click **Stop Recording**
7. System extracts 195-element spectral signature (FFT-based)
8. Signature is normalized and encrypted before storage

**Best Practices:**
- Enroll in good lighting (face) and quiet environment (voice)
- Use consistent passphrase for voice (improves accuracy)
- Re-enroll if changing camera/microphone hardware
- Test verification immediately after enrollment

### 3. Biometric Verification

Once enrolled, you can verify your identity using biometrics:

#### Face Verification
1. Go to **Biometric Verification** page
2. Select **Face Recognition**
3. Allow camera access
4. Capture your face
5. System compares against stored encoding (cosine similarity ≥ 0.6)

#### Voice Verification
1. Go to **Biometric Verification** page
2. Select **Voice Recognition**
3. Allow microphone access
4. Record audio (same passphrase recommended)
5. System compares spectral signature (cosine similarity ≥ 0.65)

**Verification Thresholds:**
- Face: 60% similarity required (distance-based matching)
- Voice: 65% similarity required (spectral signature matching)

### 4. Command Execution (Admin Only)

Admins can create and execute system commands with audit logging:

1. Navigate to **Command Dashboard**
2. Click **Create New Command**
3. Enter command name and system command
4. Execute commands with full audit trail
5. View execution logs with timestamps and results

### 5. User Management (Admin Only)

1. Go to **Admin Panel**
2. View all registered users
3. Create new users with role assignment
4. Monitor biometric enrollment status
5. Manage user permissions

## 🏗️ Project Structure

```
DevSecOps_With_Biometry/
├── backend/
│   ├── main.py                          # FastAPI app & API routes
│   ├── database.py                      # SQLAlchemy engine & session
│   ├── models.py                        # Database models (User, Command, etc.)
│   ├── schemas.py                       # Pydantic schemas for validation
│   ├── auth.py                          # JWT authentication & password hashing
│   ├── requirements.txt                 # Python dependencies
│   ├── Dockerfile                       # Backend container image
│   ├── README.md                        # Backend-specific documentation
│   ├── config/
│   │   ├── __init__.py
│   │   └── config.py                    # App configuration & settings
│   └── services/
│       ├── encryption_service.py        # AES-256-GCM encryption for biometrics
│       ├── face_recognition_service.py  # Face encoding & verification
│       └── voice_recognition_service.py # Voice signature extraction & matching
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                     # React app entry point
│   │   ├── App.tsx                      # Root component & routing
│   │   ├── index.css                    # Global styles & Tailwind imports
│   │   ├── components/
│   │   │   ├── Header.tsx               # Navigation header
│   │   │   ├── LoginForm.tsx            # Authentication form
│   │   │   ├── BiometricEnrollment.tsx  # Face/voice enrollment UI
│   │   │   ├── BiometricVerification.tsx # Face/voice verification UI
│   │   │   ├── ForcedBiometricEnrollment.tsx # Enrollment modal
│   │   │   ├── WebcamCapture.tsx        # Camera capture component
│   │   │   ├── AudioCapture.tsx         # Microphone recording with RecordRTC
│   │   │   ├── VoiceStoragePage.tsx     # Voice enrollment debugging page
│   │   │   ├── CommandDashboard.tsx     # Command execution interface
│   │   │   ├── AdminPanel.tsx           # User management
│   │   │   └── ui/                      # shadcn/ui components (40+ components)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx          # Global auth state management
│   │   ├── hooks/
│   │   │   ├── use-toast.ts             # Toast notification hook
│   │   │   └── use-mobile.tsx           # Responsive breakpoint detection
│   │   ├── lib/
│   │   │   ├── api.ts                   # Axios HTTP client configuration
│   │   │   └── utils.ts                 # Utility functions (cn, etc.)
│   │   ├── pages/
│   │   │   ├── Index.tsx                # Home page / dashboard
│   │   │   └── NotFound.tsx             # 404 error page
│   │   └── types/
│   │       └── auth.ts                  # TypeScript type definitions
│   ├── public/
│   │   └── robots.txt                   # SEO configuration
│   ├── Dockerfile                       # Multi-stage frontend build
│   ├── nginx.conf                       # Nginx reverse proxy config
│   ├── package.json                     # npm dependencies & scripts
│   ├── vite.config.ts                   # Vite build configuration
│   ├── tailwind.config.ts               # Tailwind CSS customization
│   ├── tsconfig.json                    # TypeScript compiler options
│   └── README.md                        # Frontend-specific documentation
│
├── docker-compose.yml                    # Multi-container orchestration
├── README.md                            # This file - complete project documentation
└── .github/
    └── instructions/
        └── snyk_rules.instructions.md   # Security scanning rules
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/token` | Login with username/password, returns JWT access token | No |
| `POST` | `/register` | Register new user (admin only) | Yes (Admin) |
| `GET` | `/users/me` | Get current authenticated user info | Yes |

**Example Login Request:**
```bash
curl -X POST http://localhost:8000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Biometric Enrollment & Verification

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/biometric/enroll` | Enroll face or voice biometric | Yes |
| `POST` | `/biometric/verify` | Verify face or voice biometric | Yes |
| `POST` | `/biometric/toggle` | Enable/disable biometric authentication | Yes |
| `GET` | `/biometric/status` | Check biometric enrollment status | Yes |

**Example Face Enrollment:**
```bash
curl -X POST http://localhost:8000/biometric/enroll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "biometric_type": "face",
    "biometric_data": "base64_encoded_image_data"
  }'
```

**Example Voice Verification:**
```bash
curl -X POST http://localhost:8000/biometric/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "biometric_type": "voice",
    "biometric_data": "base64_encoded_wav_audio"
  }'
```

**Response:**
```json
{
  "verified": true,
  "confidence": 72.5,
  "message": "Voice verification successful"
}
```

### Command Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/commands` | List all available commands | Yes |
| `POST` | `/commands` | Create new command | Yes (Admin) |
| `POST` | `/commands/execute` | Execute a command | Yes |
| `GET` | `/commands/logs` | View command execution logs | Yes |
| `DELETE` | `/commands/{id}` | Delete a command | Yes (Admin) |

**Example Command Creation:**
```bash
curl -X POST http://localhost:8000/commands \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "List Files",
    "command": "ls -la",
    "description": "List all files in directory"
  }'
```

### User Management (Admin Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/users` | List all users | Yes (Admin) |
| `GET` | `/users/{user_id}` | Get specific user details | Yes (Admin) |
| `PUT` | `/users/{user_id}` | Update user information | Yes (Admin) |
| `DELETE` | `/users/{user_id}` | Delete user | Yes (Admin) |

## 🔐 Security Architecture

### 1. Authentication Flow

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Client    │         │   Backend    │         │   Database   │
└──────┬──────┘         └──────┬───────┘         └──────┬───────┘
       │                       │                        │
       │  POST /token          │                        │
       │  (username/password)  │                        │
       ├──────────────────────>│                        │
       │                       │  Query user            │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │  User + hashed pwd     │
       │                       │<───────────────────────┤
       │                       │                        │
       │                       │  Verify password       │
       │                       │  (bcrypt compare)      │
       │                       │                        │
       │  JWT access token     │                        │
       │<──────────────────────┤                        │
       │                       │                        │
       │  Subsequent requests  │                        │
       │  (Authorization:      │                        │
       │   Bearer <token>)     │                        │
       ├──────────────────────>│                        │
       │                       │                        │
```

### 2. Biometric Data Encryption

All biometric data (face encodings and voice signatures) is encrypted before database storage:

**Encryption Method:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2-HMAC-SHA256 with user-specific salt
- **Iterations:** 100,000 (OWASP recommended)
- **Key Size:** 256 bits
- **IV/Nonce:** Randomly generated per encryption operation
- **Authentication:** GCM provides built-in authentication tag

**Storage Format:**
```
<base64(salt)>:<base64(nonce)>:<base64(ciphertext_with_tag)>
```

**Decryption Flow:**
1. Split stored data by `:` delimiter
2. Base64 decode salt, nonce, and ciphertext
3. Derive decryption key using PBKDF2 with stored salt
4. Decrypt using AES-GCM with derived key and stored nonce
5. Verify authentication tag (prevents tampering)

### 3. Face Recognition Technology

**Algorithm:** dlib-based facial recognition (68-point landmark detection)

**Process:**
1. **Image Preprocessing:** Convert to RGB, normalize brightness
2. **Face Detection:** HOG (Histogram of Oriented Gradients) or CNN detector
3. **Landmark Detection:** Identify 68 facial landmarks (eyes, nose, mouth, jaw)
4. **Encoding Generation:** Extract 128-dimensional feature vector (ResNet-based)
5. **Encryption:** AES-256-GCM encryption of encoding array
6. **Storage:** Encrypted encoding stored in database

**Verification:**
1. Capture new image and extract encoding
2. Decrypt stored encoding
3. Compute Euclidean distance between encodings
4. **Threshold:** Distance ≤ 0.6 considered a match (configurable)
5. Return confidence score: `(1 - distance) * 100`

**Accuracy:** ~99.38% on Labeled Faces in the Wild (LFW) benchmark

### 4. Voice Recognition Technology

**Algorithm:** Custom spectral signature analysis using FFT (Fast Fourier Transform)

**Feature Extraction (195 dimensions):**
- **Frequency Bins (192 features):** 96 bins × 2 (mean + std deviation)
  - Captures frequency distribution of voice
  - Provides robustness to amplitude variations
- **Energy (1 feature):** Total signal energy
- **Zero-Crossing Rate (1 feature):** Voice periodicity measure
- **Spectral Centroid (1 feature):** "Center of mass" of spectrum

**Process:**
1. **Audio Preprocessing:** Convert to 16kHz mono WAV
2. **Signal Normalization:** Zero-mean normalization
3. **FFT Analysis:** Compute frequency spectrum
4. **Feature Computation:** Extract 195-element feature vector
5. **Normalization:** Convert to unit vector (L2 norm)
6. **Encryption:** AES-256-GCM encryption of signature
7. **Storage:** Encrypted signature in database

**Verification:**
1. Record new audio sample (WAV format required)
2. Extract spectral signature
3. Decrypt stored signature
4. **Similarity Metric:** Cosine similarity
5. **Threshold:** Similarity ≥ 0.65 considered a match (65% threshold)
6. Return confidence: `(similarity + 1) / 2 * 100`

**Audio Requirements:**
- Format: WAV (RIFF header required)
- Sample Rate: 16kHz (resampled if different)
- Channels: Mono (converted if stereo)
- Duration: 3-10 seconds recommended
- Recording Library: RecordRTC with StereoAudioRecorder

### 5. Security Best Practices Implemented

✅ **Password Security:**
- Bcrypt hashing with automatic salt generation
- Configurable work factor (default: 12 rounds)
- No plain-text password storage

✅ **Token Security:**
- JWT with HS256 signing algorithm
- Configurable expiration (default: 30 minutes)
- Secret key loaded from environment variables
- Token validation on every protected endpoint

✅ **CORS Protection:**
- Configurable allowed origins
- Credentials support enabled
- Preflight request handling

✅ **Input Validation:**
- Pydantic schemas for all API inputs
- Type checking and coercion
- Automatic request validation

✅ **SQL Injection Prevention:**
- SQLAlchemy ORM (parameterized queries)
- No raw SQL execution
- Input sanitization

✅ **Audit Logging:**
- All command executions logged with:
  - User ID and username
  - Timestamp
  - Command executed
  - Exit code
  - Output/error messages

## 🐳 Docker Configuration

### docker-compose.yml Services

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app  # Hot-reload in dev
    environment:
      - DATABASE_URL=sqlite:///./secure_console.db
    
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

### Container Management

### View Container Status

```bash
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Stop Services

```bash
# Graceful stop
docker compose stop

# Stop and remove containers
docker compose down

# Stop and remove volumes (deletes database!)
docker compose down -v
```

### Rebuild Services

```bash
# Rebuild all services
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend
docker compose up -d --build frontend

# Force rebuild without cache
docker compose build --no-cache
```

### Execute Commands in Containers

```bash
# Open shell in backend container
docker compose exec backend bash

# Run Python commands
docker compose exec backend python -c "print('Hello')"

# Open shell in frontend container
docker compose exec frontend sh
```

### Database Management

```bash
# Backup SQLite database
docker compose exec backend sqlite3 secure_console.db .dump > backup.sql

# Restore database
docker compose exec -T backend sqlite3 secure_console.db < backup.sql

# Access database shell
docker compose exec backend sqlite3 secure_console.db
```

## ⚙️ Configuration

### Environment Variables

#### Backend Configuration

Create a `.env` file in the `backend/` directory:

```env
# Application Settings
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (SQLite - file-based)
DATABASE_URL=sqlite:///./secure_console.db

# CORS Settings
ALLOWED_ORIGINS=http://localhost,http://localhost:5173,http://localhost:80

# Biometric Settings
FACE_RECOGNITION_TOLERANCE=0.6
VOICE_RECOGNITION_TOLERANCE=0.35

# Security
ENCRYPTION_ITERATIONS=100000
```

#### Frontend Configuration

Update `frontend/src/lib/api.ts` for API base URL:

```typescript
const api = axios.create({
  baseURL: 'http://localhost:8000', // Change for production
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Nginx Configuration (Production)

The `frontend/nginx.conf` file configures:
- Static file serving
- Reverse proxy to backend API
- Gzip compression
- Security headers
- SPA routing (fallback to index.html)

**Key settings:**
```nginx
location /api/ {
    proxy_pass http://backend:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## 🧪 Testing

### Manual Testing

#### Test Face Recognition

1. Open browser developer tools (F12)
2. Navigate to Biometric Enrollment
3. Capture face image
4. Check console for:
   - Base64 image encoding
   - API request/response
   - Error messages

5. Navigate to Biometric Verification
6. Capture face again
7. Verify success/failure response

#### Test Voice Recognition

1. Navigate to Voice Storage page (`/voice-storage`)
2. Click "Start Recording"
3. Speak for 5-10 seconds
4. Click "Stop Recording"
5. Check console for:
   ```
   First bytes: RIFF  (confirms WAV format)
   Audio size: XXXXX bytes
   ```
6. Click "Store Voice"
7. Verify enrollment success message

8. Navigate to Biometric Verification
9. Select "Voice Recognition"
10. Record same passphrase
11. Verify match success

#### Test API Endpoints

```bash
# Test backend health
curl http://localhost:8000/

# Test authentication
curl -X POST http://localhost:8000/token \
  -d "username=admin&password=admin123"

# Test protected endpoint (replace TOKEN)
curl http://localhost:8000/users/me \
  -H "Authorization: Bearer TOKEN"
```

### Automated Testing (Future Enhancement)

Consider adding:
- **Backend:** pytest for API endpoint testing
- **Frontend:** Vitest + React Testing Library for component tests
- **E2E:** Playwright or Cypress for end-to-end flows
- **Security:** Snyk or OWASP ZAP for vulnerability scanning

## 🔧 Troubleshooting

### Backend Issues

#### Database Connection Error

**Error:** `sqlite3.OperationalError: unable to open database file`

**Solution:**
```bash
# Ensure backend directory has write permissions
cd backend
chmod 755 .
python -c "import database; database.init_db()"
```

#### Face Recognition Import Error

**Error:** `ModuleNotFoundError: No module named 'face_recognition'`

**Solution:**
```bash
# Ensure dlib is installed (may require cmake)
pip install cmake
pip install dlib
pip install face_recognition
```

**Windows specific:**
```bash
# Download pre-built wheel from:
# https://github.com/z-mahmud22/Dlib_Windows_Python3.x
pip install dlib-19.22.99-cp39-cp39-win_amd64.whl
pip install face_recognition
```

#### Port Already in Use

**Error:** `OSError: [Errno 98] Address already in use`

**Solution:**
```bash
# Find process using port 8000 (Linux/Mac)
lsof -i :8000
kill -9 <PID>

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or change port in uvicorn command
uvicorn main:app --reload --port 8001
```

### Frontend Issues

#### Camera Access Denied

**Error:** Browser blocks camera access

**Solution:**
1. Check browser permissions (chrome://settings/content/camera)
2. Ensure HTTPS in production (HTTP only works on localhost)
3. Grant permission when browser prompts
4. Try different browser (Chrome recommended)

#### Microphone Recording Fails

**Error:** "Invalid audio data: file does not start with RIFF id"

**Solution:**
- Ensure RecordRTC is installed: `npm install recordrtc`
- Check AudioCapture.tsx uses RecordRTC (not MediaRecorder)
- Verify WAV format with:
  ```javascript
  console.log('First bytes:', base64Data.substring(0, 20));
  // Should show: RIFF
  ```

#### Build Errors

**Error:** `Failed to resolve import`

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Vite HMR Issues

**Error:** Hot Module Replacement not working

**Solution:**
```bash
# Clear Vite cache
rm -rf frontend/.vite
rm -rf frontend/node_modules/.vite

# Restart dev server
npm run dev
```

### Docker Issues

#### Container Won't Start

**Error:** Container exits immediately

**Solution:**
```bash
# Check logs for errors
docker compose logs backend
docker compose logs frontend

# Rebuild with no cache
docker compose build --no-cache
docker compose up -d
```

#### Permission Denied Errors

**Error:** Permission denied when mounting volumes

**Solution:**
```bash
# Linux: Fix file permissions
sudo chown -R $USER:$USER .

# Or run containers with current user
docker compose run --user $(id -u):$(id -g) backend
```

#### Network Issues Between Containers

**Error:** Backend can't connect to frontend or vice versa

**Solution:**
```bash
# Check network
docker network ls
docker network inspect devsecops_default

# Recreate network
docker compose down
docker compose up -d
```

### Biometric Issues

#### Face Not Recognized

**Possible causes:**
- Poor lighting during enrollment/verification
- Different camera angles
- Glasses/facial accessories changed
- Encoding corruption

**Solutions:**
- Re-enroll face in consistent lighting
- Face camera directly (avoid extreme angles)
- Increase tolerance threshold (edit backend config)
- Check stored encoding: query database directly

#### Voice Verification Always Fails

**Possible causes:**
- Different recording device (laptop mic vs headset)
- Background noise
- Different speaking volume/speed
- Spectral signature mismatch

**Solutions:**
- Use same microphone for enrollment and verification
- Record in quiet environment
- Speak at consistent volume
- Use same passphrase
- Lower threshold to 0.3 (30% tolerance) in `voice_recognition_service.py`:
  ```python
  tolerance = 0.3  # Line ~145
  ```

## 📊 Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment user ID |
| `username` | VARCHAR(50) | Unique username |
| `email` | VARCHAR(100) | User email |
| `hashed_password` | VARCHAR(255) | Bcrypt hashed password |
| `role` | VARCHAR(20) | User role (admin/user) |
| `is_active` | BOOLEAN | Account active status |
| `biometric_enabled` | BOOLEAN | Biometric auth enabled |
| `face_encoding` | TEXT | Encrypted face encoding |
| `voice_signature` | TEXT | Encrypted voice signature |
| `created_at` | DATETIME | Account creation timestamp |
| `last_login` | DATETIME | Last login timestamp |

### Commands Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment command ID |
| `name` | VARCHAR(100) | Command display name |
| `command` | TEXT | Actual system command |
| `description` | TEXT | Command description |
| `created_by` | INTEGER (FK) | Creator user ID |
| `created_at` | DATETIME | Creation timestamp |

### Command Logs Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment log ID |
| `command_id` | INTEGER (FK) | Executed command ID |
| `user_id` | INTEGER (FK) | Executor user ID |
| `executed_at` | DATETIME | Execution timestamp |
| `exit_code` | INTEGER | Command exit code |
| `output` | TEXT | Command output |
| `error` | TEXT | Error messages |

## 🚀 Deployment

### Production Deployment Checklist

- [ ] Change default admin password
- [ ] Generate strong SECRET_KEY (use `openssl rand -hex 32`)
- [ ] Update ALLOWED_ORIGINS for production domains
- [ ] Enable HTTPS (use Let's Encrypt + Nginx)
- [ ] Set secure cookie flags (SameSite, Secure, HttpOnly)
- [ ] Configure firewall (allow only 80/443)
- [ ] Set up database backups (automated cron job)
- [ ] Enable application logging (Winston/Python logging)
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Implement rate limiting (prevent brute force)
- [ ] Add CSP headers (Content Security Policy)
- [ ] Review and minimize attack surface
- [ ] Perform security audit (Snyk, OWASP ZAP)
- [ ] Document disaster recovery procedures

### Production Docker Compose

Update `docker-compose.yml` for production:

```yaml
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      target: production  # Multi-stage build
    restart: always
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    volumes:
      - ./data:/app/data  # Persistent data directory
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      target: production
    restart: always
    ports:
      - "443:443"  # HTTPS
      - "80:80"    # HTTP redirect
    volumes:
      - ./ssl:/etc/nginx/ssl:ro  # SSL certificates
    depends_on:
      backend:
        condition: service_healthy

  # Optional: Add Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - backend
      - frontend
```

### Cloud Deployment Options

#### AWS (Amazon Web Services)
- **Compute:** ECS (Elastic Container Service) or EC2
- **Database:** RDS (managed PostgreSQL/MySQL) or DynamoDB
- **Storage:** S3 for backups
- **CDN:** CloudFront for static assets
- **SSL:** ACM (Certificate Manager)

#### Azure
- **Compute:** Azure Container Instances or App Service
- **Database:** Azure Database for PostgreSQL
- **Storage:** Azure Blob Storage
- **CDN:** Azure CDN
- **SSL:** Azure SSL certificates

#### Google Cloud Platform
- **Compute:** Cloud Run or GKE (Kubernetes)
- **Database:** Cloud SQL
- **Storage:** Cloud Storage
- **CDN:** Cloud CDN
- **SSL:** Google-managed SSL

#### DigitalOcean (Budget-friendly)
- **Compute:** Droplets or App Platform
- **Database:** Managed PostgreSQL
- **Storage:** Spaces (S3-compatible)
- **SSL:** Let's Encrypt (free)

### Nginx SSL Configuration Example

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/DevSecOps_With_Biometry.git
   cd DevSecOps_With_Biometry
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and test**
   - Write clean, documented code
   - Follow existing code style
   - Test thoroughly (manual + automated)

4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add voice recognition threshold configuration"
   ```

5. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style

**Python (Backend):**
- Follow PEP 8 style guide
- Use type hints where possible
- Document functions with docstrings
- Max line length: 100 characters

**TypeScript (Frontend):**
- Use ESLint configuration
- Prefer functional components with hooks
- Use TypeScript strict mode
- Follow React best practices

### Commit Message Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(backend): add voice recognition tolerance configuration
fix(frontend): resolve camera permission error on Safari
docs(readme): update deployment instructions for AWS
```

## 📜 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 DevSecOps Biometry Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📧 Support & Contact

### Documentation
- **API Documentation:** http://localhost:8000/docs (when running)
- **Backend README:** [backend/README.md](backend/README.md)
- **Frontend README:** [frontend/README.md](frontend/README.md)

### Issues & Bug Reports
- Open an issue on GitHub with:
  - Clear description of the problem
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details (OS, Python version, Node version)
  - Relevant logs/screenshots

### Feature Requests
- Use GitHub Issues with `enhancement` label
- Describe the feature and use case
- Explain why it would be valuable

### Community
- **Discussions:** GitHub Discussions (Q&A, ideas, showcases)
- **Pull Requests:** Welcome! See Contributing section

## � Team

This project was realized by:

- **AMOUHAL Nouhayla**
- **AMECHATE Khadija**
- **ALLALI Houda**
- **ALOUI Bilal**

## �🙏 Acknowledgments

- **FastAPI:** Excellent Python web framework by Sebastián Ramírez
- **face_recognition:** Adam Geitgey's face recognition library (dlib wrapper)
- **RecordRTC:** Muaz Khan's WebRTC audio/video recording library
- **shadcn/ui:** Beautifully designed component library
- **Radix UI:** Unstyled, accessible UI primitives
- **OpenCV:** Computer vision library
- **NumPy/SciPy:** Scientific computing libraries

## 🗺️ Roadmap

### v1.1 (Planned)
- [ ] Multi-factor authentication (TOTP/SMS)
- [ ] Biometric template updates (re-enrollment reminders)
- [ ] Advanced audit logging with query filters
- [ ] Export audit logs to CSV/JSON

### v1.2 (Future)
- [ ] PostgreSQL/MySQL support (in addition to SQLite)
- [ ] Redis caching for improved performance
- [ ] WebSocket support for real-time notifications
- [ ] Mobile app (React Native)

### v2.0 (Long-term)
- [ ] Fingerprint biometric support
- [ ] Behavioral biometrics (typing patterns)
- [ ] AI-powered anomaly detection
- [ ] Kubernetes deployment manifests
- [ ] Multi-tenant support

---

**Built with ❤️ for DevSecOps practitioners**

*Last Updated: January 2026*
