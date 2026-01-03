# Secure DevSecOps Console - Backend

FastAPI-based backend microservice with JWT authentication and SQLite database.

## Features

- JWT-based authentication
- User management with role-based access (admin/user)
- biometric enrollment and verification (face, fingerprint, voice)
- Command execution and logging
- SQLite database

## Setup

0. Initialize a venv

```bash
cd backend
python -m venv venv

# macOS / Linux
source venv/bin/activate

#Windows (CMD)
venv\Scripts\activate

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1 

```
1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## Default Credentials

- Username: `admin`
- Password: `admin123`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

### Authentication
- `POST /auth/login` - Login with username/password
- `GET /auth/me` - Get current user information
- `POST /auth/logout` - Logout

### Biometric
- `POST /biometric/enroll` - Enroll biometric data
- `POST /biometric/verify` - Verify biometric (mock)
- `PUT /biometric/toggle` - Enable/disable biometric

### Commands
- `GET /commands` - Get all available commands
- `POST /commands/execute` - Execute a command

## Database Schema

### Users
- id, username, hashed_password, role, is_active, created_at

### BiometricData
- id, user_id, biometric_type, is_enrolled, enrollment_data, created_at, updated_at

### Commands
- id, name, description, command, category, is_enabled, created_at

### CommandLogs
- id, command_id, user_id, status, output, executed_at
