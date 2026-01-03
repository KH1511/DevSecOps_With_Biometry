# DevSecOps with Biometry

A secure console application with biometric authentication (face recognition) built with FastAPI, React, and PostgreSQL.

## Features

- 🔐 Secure authentication with password and biometric verification
- 👤 Face recognition for enhanced security
- 🎯 Role-based access control (Admin/User)
- 🚀 Command execution with audit logging
- 🐳 Fully containerized with Docker
- 🔒 End-to-end encryption for biometric data

## Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy
- OpenCV (Face Recognition)
- JWT Authentication

**Frontend:**
- React + TypeScript
- Vite
- TailwindCSS
- Shadcn/ui Components

**Infrastructure:**
- Docker & Docker Compose
- Nginx

## Prerequisites

- Docker Desktop (or Docker + Docker Compose)
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DevSecOps_With_Biometry
```

### 2. Start the Application

Build and start all services (PostgreSQL, Backend, Frontend):

```bash
docker compose up -d --build
```

This will:
- Start PostgreSQL database on port 5432
- Start FastAPI backend on port 8000
- Build and serve React frontend on port 80

### 3. Access the Application

- **Frontend (Web UI):** http://localhost
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **API via Proxy:** http://localhost/api/

### 4. Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important:** Change the default password in production!

## Development Setup

### Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend dev server will run on http://localhost:8080

## Docker Commands

### View Running Containers

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
docker compose logs -f postgres
```

### Stop Services

```bash
docker compose down
```

### Stop and Remove Volumes

```bash
docker compose down -v
```

### Rebuild Specific Service

```bash
docker compose up -d --build backend
docker compose up -d --build frontend
```

## Environment Variables

### Backend (database.py)

- `DATABASE_USER` - PostgreSQL username (default: `devsecops_user`)
- `DATABASE_PASSWORD` - PostgreSQL password (default: `devsecops_password`)
- `DATABASE_HOST` - Database host (default: `localhost`, in Docker: `postgres`)
- `DATABASE_PORT` - Database port (default: `5432`)
- `DATABASE_NAME` - Database name (default: `secure_console`)

## Project Structure

```
DevSecOps_With_Biometry/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── database.py             # Database configuration
│   ├── models.py               # SQLAlchemy models
│   ├── schemas.py              # Pydantic schemas
│   ├── auth.py                 # Authentication logic
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend container
│   └── services/
│       ├── face_recognition_service.py
│       └── encryption_service.py
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── contexts/           # React contexts
│   │   └── lib/                # Utilities
│   ├── Dockerfile              # Frontend container
│   ├── nginx.conf              # Nginx configuration
│   └── package.json            # Node dependencies
└── docker-compose.yml          # Docker orchestration
```

## API Endpoints

### Authentication
- `POST /token` - Login and get access token
- `POST /register` - Register new user (admin only)

### Biometric
- `POST /enroll-biometric` - Enroll face biometric
- `POST /verify-biometric` - Verify face biometric
- `POST /toggle-biometric` - Enable/disable biometric auth
- `GET /biometric-status` - Check biometric enrollment status

### Commands
- `GET /commands` - List available commands
- `POST /commands` - Create new command (admin only)
- `POST /execute-command` - Execute a command
- `GET /command-logs` - View command execution logs

## Security Features

- Password hashing with Argon2
- JWT token-based authentication
- Biometric data encryption
- Role-based access control (RBAC)
- Command execution audit logging
- CORS protection
- Security headers in nginx

## Troubleshooting

### Database Connection Issues

If backend can't connect to PostgreSQL:

```bash
# Check if postgres is healthy
docker compose ps

# Restart services
docker compose restart
```

### Port Already in Use

If port 80, 8000, or 5432 is already in use:

```bash
# Check what's using the port (Windows)
netstat -ano | findstr :80

# Modify ports in docker-compose.yml
# Example: Change "80:80" to "3000:80"
```

### Frontend Build Issues

```bash
# Rebuild frontend only
docker compose build --no-cache frontend
docker compose up -d frontend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add your license here]

## Support

For issues and questions, please open an issue in the repository.
