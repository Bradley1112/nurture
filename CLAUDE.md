# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Nurture is an AI-powered educational platform for Singapore O-Level students featuring:
- **Frontend**: React app (`nurture-app/`) with Firebase authentication and real-time features
- **Backend**: Python Flask API (`backend/`) with AWS Strands SDK for multi-agent AI collaboration
- **Architecture**: Full-stack application with AI agents for quiz generation, evaluation, and personalized study plans

## Development Commands

### Quick Start

#### Standard Mode (Mixed Logs)
```bash
# Start full development environment (frontend + backend)
./start-dev.sh
```

#### Professional Mode (Split Screen) - Recommended ⭐
```bash
# Split-screen with separated backend/frontend logs
./start-dev.sh tmux
# OR directly:
./start-dev-tmux.sh
```

**Benefits of tmux mode:**
- Clean backend logs on left pane (perfect for debugging)
- Frontend logs on right pane
- Professional layout for demos and development
- Easy pane switching with Ctrl-b + Arrow Keys

### Individual Services
```bash
# Backend only (Flask API on port 8000)
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
BACKEND_PORT=8000 python app.py

# Frontend only (React on port 3000)  
cd nurture-app
npm install
npm start

# Run tests
python test-app.py              # Backend integration tests
python test-integration.py     # Full app flow tests
```

### tmux Session Management
```bash
# View active sessions
tmux list-sessions

# Attach to nurture session
tmux attach -t nurture

# Kill nurture session
tmux kill-session -t nurture

# Detach from session (keep it running)
Ctrl-b + d
```

### Frontend (React)
- `npm start` - Development server (port 3000)
- `npm run build` - Production build
- `npm test` - Jest test suite

### Backend (Python Flask)
- `python app.py` - Start Flask server
- `pytest` - Run tests (if configured)
- `python test-app.py` - Custom integration tests

## Architecture

### Backend Structure (`backend/`)
```
├── app.py                    # Main Flask application 
├── config/settings.py        # Environment-based configuration
├── services/
│   ├── api/                  # REST API routes
│   │   ├── health_routes.py
│   │   ├── quiz_routes.py
│   │   └── evaluation_routes.py
│   ├── agentic/              # AI agent implementations
│   │   ├── quiz_generation.py
│   │   ├── evaluation.py
│   │   └── study_session.py
│   └── core/                 # Core business logic
└── requirements.txt
```

### Frontend Structure (`nurture-app/`)
```
├── src/
│   ├── components/           # React components
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── EvaluationQuiz.js
│   │   └── StudySession.js
│   ├── firebase/             # Firebase configuration and services
│   ├── services/             # API integration and agent services
│   └── App.js
└── package.json
```

### AI Agent Architecture
- **Multi-agent system** using AWS Strands SDK with collaborative swarm patterns
- **Star topology** with orchestrating agent coordinating specialized agents:
  - **Teacher Agent**: Content delivery and exam-style questions
  - **Tutor Agent**: Socratic method guidance and detailed explanations  
  - **Perfect Scorer Student Agent**: Visual aids, memory techniques, peer simulation
- **Expertise evaluation** using 3-agent collaboration (MOE Teacher, Tutor, Perfect Scorer)
- **Study plan generation** with spaced repetition algorithms

### Key Technologies
- **AWS Strands SDK**: Multi-agent collaboration framework
- **AWS Bedrock**: Claude Sonnet 4.0 for AI processing
- **Firebase**: User authentication, real-time database, and data persistence
- **React Router**: Client-side routing
- **Flask-CORS**: Cross-origin resource sharing for API communication

## Configuration

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure required variables:
   - **AWS credentials**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - **Strands API**: `STRANDS_API_KEY` 
   - **Firebase**: `REACT_APP_FIREBASE_*` variables
   - **Flask**: `FLASK_SECRET_KEY`

### Development vs Production
- Development: Uses local Flask server (port 8000) with React proxy
- Configuration managed via `backend/config/settings.py` with environment-specific classes

## Testing

### Integration Tests
- `test-app.py`: Tests backend startup, subjects loading, quiz generation, and evaluation
- `test-integration.py`: Full application flow testing
- Tests verify AI agent functionality and API endpoints

### Test Data
Tests use sample quiz data with Physics (Kinematics) and Math (Algebra) topics following Singapore GCE O-Level curriculum structure.

## Firebase Integration

### Database Structure
```
users/
├── {userId}/
│   ├── name, level, dateToNextExam
│   ├── subjects/
│   │   └── {subject}/topics/{topic}/
│   │       ├── expertiseLevel
│   │       └── lastStudied
│   └── studyPlan/
│       └── {sessionId}/
│           ├── scheduledDate, status
│           └── performanceSummary
```

### Authentication Flow
- Firebase Auth for user management
- Protected routes using `PrivateRoute` component
- Real-time data synchronization for study progress

## AI Features

### Quiz Generation
- Difficulty-ramped questions (Very Easy → Very Hard)
- Subject-specific formats (MCQ, Structured Questions, Open-ended)
- Real-time generation using collaborative agents

### Expertise Evaluation  
- 4-level system: Beginner → Apprentice → Pro → Grand Master
- Multi-agent analysis of student responses
- Performance-based study plan adjustments

### Study Session Management
- Pomodoro timer integration with focus/stress level adaptation
- Agent graph coordination for learning vs practice modes
- Real-time expertise re-evaluation after sessions