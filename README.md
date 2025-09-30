# Nurture - AI-Powered Educational Platform

<div align="center">

![Nurture Logo](https://img.shields.io/badge/Nurture-Education%20Platform-49B85B?style=for-the-badge&logo=leaf&logoColor=white)

*Education is about nurture*

[![Node.js](https://img.shields.io/badge/Node.js-16.x+-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org/)
[![React](https://img.shields.io/badge/React-18.x+-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Latest-FFA611?style=flat&logo=firebase&logoColor=white)](https://firebase.google.com/)
[![AWS](https://img.shields.io/badge/AWS-Bedrock-FF9900?style=flat&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/bedrock/)

</div>

## 🌱 Overview

Nurture is a comprehensive AI-powered educational platform designed specifically for Singapore O-Level students. Built with modern web technologies and advanced AI capabilities, it provides personalized learning experiences through intelligent agents that collaborate to deliver optimal education outcomes.

### 🎯 Key Features

- **🤖 Multi-Agent AI System**: Collaborative AI agents using AWS Strands SDK for personalized learning
- **📊 Adaptive Assessment**: Dynamic quiz generation with difficulty ramping based on student performance  
- **📅 Smart Study Planning**: Spaced repetition algorithms for optimal learning retention
- **⏰ Pomodoro Integration**: Focus and stress level adaptation with built-in study timers
- **🔥 Real-time Collaboration**: Firebase-powered real-time data synchronization
- **📱 Responsive Design**: Modern, plant-themed UI optimized for all devices

### 🎨 Design Theme

Inspired by **growth and nurture**, featuring:
- 🌿 **Background**: `#1A241B` - Rich, dark green for main surfaces
- 🌲 **Primary Actions**: `#49B85B` - Vibrant green for buttons and key elements
- 💡 **Text & Icons**: `#F5F5F5` - Clean white for optimal readability
- 🌾 **Secondary Elements**: `#386641` - Muted green for supporting elements

## 🏗️ Architecture

### Frontend (React Application)
```
nurture-app/
├── src/
│   ├── components/          # React components
│   │   ├── Login.js         # Authentication interface
│   │   ├── Dashboard.js     # Main user dashboard
│   │   ├── EvaluationQuiz.js # Assessment interface
│   │   └── StudySession.js   # Learning session management
│   ├── firebase/            # Firebase configuration & services
│   ├── services/            # API integration & agent services
│   └── App.js              # Main application component
└── package.json
```

### Backend (Python Flask API)
```
backend/
├── app.py                   # Main Flask application entry point
├── config/
│   └── settings.py          # Environment-based configuration
├── services/
│   ├── api/                 # REST API route handlers
│   │   ├── health_routes.py # Health check endpoints
│   │   ├── quiz_routes.py   # Quiz generation & management
│   │   └── evaluation_routes.py # Assessment endpoints
│   ├── agentic/             # AI agent implementations
│   │   ├── quiz_generation.py   # Quiz generation agents
│   │   ├── evaluation.py        # Assessment agents
│   │   └── study_session.py     # Study session orchestration
│   └── core/                # Core business logic
└── requirements.txt         # Python dependencies
```

### 🧠 AI Agent Architecture

#### Multi-Agent Collaboration System
- **Star Topology**: Central orchestrating agent coordinating specialized agents
- **Collaborative Swarm Pattern**: Agents build upon each other's insights
- **AWS Strands SDK**: Production-ready multi-agent framework

#### Specialized Agents

**🎓 Teacher Agent**
- **Learning Mode**: Structured content delivery and explanations
- **Practice Mode**: Curated exam-style questions aligned with O-Level curriculum
- **Priority**: Syllabus coverage and exam readiness

**🤝 Tutor Agent**  
- **Learning Mode**: Socratic method questioning for deep understanding
- **Practice Mode**: Detailed explanations and answering techniques
- **Priority**: Conceptual mastery and confidence building

**⭐ Perfect Scorer Student Agent**
- **Learning Mode**: Visual aids, mind maps, and memory techniques
- **Practice Mode**: Peer simulation and active recall exercises
- **Priority**: Sustainable performance and well-being

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16.x or higher
- **Python** 3.8 or higher
- **AWS Account** with Bedrock access
- **Firebase Project** with Authentication and Firestore
- **Git** for version control

### One-Command Setup

#### Quick Start (Mixed Logs)
```bash
# Clone and start the entire development environment
git clone https://github.com/your-username/nurture.git
cd nurture
./start-dev.sh
```

#### Professional Development Setup (Split Screen)
```bash
# Start with tmux for separated backend/frontend logs
./start-dev.sh tmux
# OR directly:
./start-dev-tmux.sh
```

**🎯 Why use tmux mode?**
- ✨ **Professional Layout**: Split-screen with backend logs on left, frontend on right
- 🔍 **Clear Debugging**: See backend logs without frontend noise
- 🎥 **Perfect for Demos**: Clean, organized display for presentations
- ⚡ **Easy Navigation**: Switch between panes with simple key combinations

Both commands automatically:
- Install all dependencies (frontend + backend)
- Set up environment variables  
- Start both React dev server (port 3000) and Flask API (port 8000)

### Manual Setup

#### 1. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Configure your credentials in .env
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
STRANDS_API_KEY=your_strands_key
FLASK_SECRET_KEY=your_flask_secret

# Firebase configuration (frontend)
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
BACKEND_PORT=8000 python app.py
```

#### 3. Frontend Setup
```bash
cd nurture-app

# Install dependencies
npm install

# Start React development server
npm start
```

## 🧪 Testing

### Backend Integration Tests
```bash
# Test backend startup and core functionality
python test-app.py

# Test full application flow
python test-integration.py
```

### Frontend Testing
```bash
cd nurture-app

# Run Jest test suite
npm test

# Run tests in watch mode
npm test -- --watch
```

### Test Coverage
- ✅ Backend API endpoints and agent functionality
- ✅ Firebase integration and authentication
- ✅ AI agent collaboration and quiz generation
- ✅ Study plan algorithms and spaced repetition
- ✅ Frontend component integration

## 📊 Database Schema

### Firebase Firestore Structure
```
users/
├── {userId}/
│   ├── name: "Alex Chen"
│   ├── level: "Sec 2"
│   ├── dateToNextExam: Timestamp
│   ├── targetOLevelYear: 2026
│   │
│   ├── subjects/
│   │   ├── physics/
│   │   │   └── topics/
│   │   │       └── kinematics/
│   │   │           ├── expertiseLevel: "Apprentice"
│   │   │           ├── lastStudied: Timestamp
│   │   │           └── performanceHistory: []
│   │   │
│   │   ├── mathematics/
│   │   │   └── topics/
│   │   │       └── algebra/
│   │   │           ├── expertiseLevel: "Pro"
│   │   │           └── lastStudied: Timestamp
│   │   │
│   │   └── english/
│   │       └── topics/
│   │           └── reading_comprehension/
│   │               ├── expertiseLevel: "Beginner"
│   │               └── lastStudied: Timestamp
│   │
│   └── studyPlan/
│       ├── {session_id_1}/
│       │   ├── scheduledDate: Timestamp
│       │   ├── subjectId: "physics"
│       │   ├── topicId: "kinematics"
│       │   ├── status: "completed"
│       │   ├── sessionType: "learning"
│       │   ├── durationMinutes: 60
│       │   ├── focusLevel: 8
│       │   ├── stressLevel: 3
│       │   └── performanceSummary: {
│       │       "conceptsLearned": 5,
│       │       "questionsAttempted": 8,
│       │       "correctAnswers": 6,
│       │       "timeSpent": 58
│       │   }
│       │
│       └── {session_id_2}/
│           ├── scheduledDate: Timestamp
│           ├── subjectId: "mathematics"
│           ├── topicId: "algebra"
│           ├── status: "scheduled"
│           └── sessionType: "practice"
```

## 📋 Supported Subjects & Topics

### 🔬 Physics (SEAB Syllabus 6091)
- **Kinematics**: Motion, velocity, acceleration equations
- **Format**: MCQ for concepts + Structured questions for problem-solving

### 📐 Elementary Mathematics (SEAB Syllabus 4048)  
- **Algebra**: Linear/quadratic equations, expression simplification
- **Format**: Numerical answers with working shown

### 📚 English Language (SEAB Syllabus 1128)
- **Reading Comprehension**: Inference, main ideas, author's purpose
- **Format**: MCQ + Open-ended responses

## 🎯 Expertise Level System

| Level | Performance Indicator | Focus Areas |
|-------|----------------------|-------------|
| **🔴 Beginner** | Struggles with Easy questions | Core foundational knowledge gaps |
| **🟡 Apprentice** | Masters Easy/Medium, fails Hard | Theory-to-application bridge |
| **🔵 Pro** | Solves Hard, struggles with Very Hard | Efficiency and deep mastery |
| **🟢 Grand Master** | Consistently solves Very Hard | Creative synthesis and optimization |

## 🔧 Development Commands

### Full Stack Development

#### Standard Mode (Mixed Logs)
```bash
./start-dev.sh                    # Start everything (original mode)
```

#### Professional Mode (Split Screen) 🌟
```bash
./start-dev.sh tmux              # Split-screen with separated logs
./start-dev-tmux.sh              # Direct tmux mode
```

**tmux Controls:**
- **Attach session**: `tmux attach -t nurture`
- **Switch panes**: `Ctrl-b + Arrow Keys`
- **Scroll logs**: `Ctrl-b + [` (then arrow keys, 'q' to exit)
- **Kill session**: `tmux kill-session -t nurture`
- **Detach**: `Ctrl-b + d`

### Individual Services

#### Backend Only
```bash
cd backend
source venv/bin/activate
BACKEND_PORT=8000 python app.py   # Flask API on port 8000
```

#### Frontend Only
```bash
cd nurture-app
npm start                         # React dev server on port 3000
```

### Production Build
```bash
cd nurture-app
npm run build                     # Create production build
```

## 🌐 API Endpoints

### Health & Status
- `GET /api/health` - Service health check
- `GET /api/subjects` - Available subjects and topics

### Authentication & User Management
- `POST /api/auth/register` - User registration
- `GET /api/user/{userId}` - User profile and progress

### Quiz & Assessment
- `POST /api/quiz/generate` - Generate adaptive quiz
- `POST /api/quiz/evaluate` - Submit quiz for evaluation
- `GET /api/evaluation/{sessionId}` - Get evaluation results

### Study Sessions
- `POST /api/session/create` - Create new study session
- `GET /api/session/{sessionId}` - Get session details
- `POST /api/session/complete` - Complete study session

### Study Planning
- `GET /api/study-plan/{userId}` - Get personalized study plan
- `POST /api/study-plan/update` - Update plan based on progress

## 🚢 Deployment

### Environment Setup
1. **AWS Configuration**: Set up Bedrock access and Strands SDK credentials
2. **Firebase Setup**: Configure authentication and Firestore security rules
3. **Environment Variables**: Ensure all production variables are set

### Production Deployment
```bash
# Build frontend
cd nurture-app && npm run build

# Deploy backend
cd backend
pip install -r requirements.txt
gunicorn --bind 0.0.0.0:8000 app:app
```

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **Python**: Follow PEP 8, use `black` for formatting
- **JavaScript**: Use Prettier and ESLint configurations
- **Testing**: Write tests for new features
- **Documentation**: Update README and inline docs

## 📈 Performance & Monitoring

### Key Metrics
- **Response Time**: API endpoints < 200ms average
- **Quiz Generation**: < 3 seconds for adaptive questions  
- **Agent Collaboration**: < 60 seconds for evaluation consensus
- **Real-time Sync**: < 100ms Firebase updates

### Monitoring Tools
- **AWS CloudWatch**: Backend performance and errors
- **Firebase Analytics**: User engagement and retention
- **Custom Metrics**: Study session effectiveness and learning outcomes

## 🔒 Security

### Data Protection
- **Firebase Security Rules**: Strict user data access controls
- **API Authentication**: JWT tokens for secure endpoints
- **AWS IAM**: Minimal required permissions for Bedrock access
- **Input Validation**: Comprehensive sanitization of all user inputs

### Privacy Compliance
- **Data Minimization**: Only collect necessary learning data
- **User Consent**: Clear opt-in for data processing
- **Right to Deletion**: Complete user data removal on request

## 📚 Additional Resources

### Documentation
- [Firebase Setup Guide](docs/firebase-setup.md)
- [AWS Strands SDK Documentation](docs/aws-strands-guide.md)
- [Agent Architecture Deep Dive](docs/agent-architecture.md)
- [API Reference](docs/api-reference.md)

### Educational Resources
- [Singapore O-Level Syllabus](https://www.seab.gov.sg/home/examinations/gce-o-level)
- [Spaced Repetition Research](docs/spaced-repetition.md)
- [Multi-Agent Learning Systems](docs/multi-agent-learning.md)

## 📞 Support & Contact

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/your-username/nurture/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/nurture/discussions)
- **Email**: support@nurture-education.com

### Community
- **Discord**: [Nurture Community](https://discord.gg/nurture)
- **Twitter**: [@NurtureEdu](https://twitter.com/nurtureedu)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with 💚 for Singapore O-Level Students**

*Empowering the next generation through personalized AI education*

</div>