#!/bin/bash

# Nurture App Development Startup Script
echo "🌱 Starting Nurture Development Environment..."

# Store the root directory
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

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
cd "$ROOT_DIR/backend"
python3 -m venv venv 2>/dev/null || echo "Virtual environment already exists"
source venv/bin/activate
pip install -r requirements.txt --quiet
export FLASK_ENV=development
export FLASK_RUN_PORT=8000
export FLASK_DEBUG=1

# Add debug logging
BACKEND_PORT=8000 python app.py 2>&1 | tee backend.log &
BACKEND_PID=$!

# Wait for backend with health check
echo "⏳ Waiting for backend to initialize..."
for i in {1..30}; do
    if curl -s http://localhost:8000/ >/dev/null; then
        echo "✅ Backend API responding"
        break
    fi
    sleep 1
    echo -n "."
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to respond after 30 seconds"
        echo "Check backend.log for details"
        cleanup
    fi
done

# Start React Frontend
echo "⚛️  Starting React Frontend..."
cd "$ROOT_DIR/nurture-app"
npm start &
FRONTEND_PID=$!

echo ""
echo "🚀 Nurture App Development Environment Started!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "🧠 Agentic System: AWS Strands SDK + Claude Sonnet 4.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop the script
wait