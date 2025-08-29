#!/bin/bash

# Nurture App Development Startup Script
# Starts both Python Flask backend and React frontend

echo "🌱 Starting Nurture Development Environment..."

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start Python Flask Backend
echo "🐍 Starting Python Agentic Backend..."
cd backend
python3 -m venv venv 2>/dev/null || echo "Virtual environment already exists"
source venv/bin/activate
pip install -r requirements.txt --quiet
export FLASK_ENV=development
python app.py &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend running on PID $BACKEND_PID"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start React Frontend
echo "⚛️  Starting React Frontend..."
cd ../nurture-app
export REACT_APP_API_URL=http://localhost:5000
npm start &
FRONTEND_PID=$!

echo ""
echo "🚀 Nurture App Development Environment Started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "🧠 Agentic System: AWS Strands SDK + Claude Sonnet 4.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop the script
wait