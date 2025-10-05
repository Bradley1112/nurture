#!/bin/bash

# ===============================================
# Nurture Development Environment - tmux Mode
# ===============================================
# 
# Professional development setup with split-screen:
# Left pane:  Backend (Flask API + AWS Strands SDK)
# Right pane: Frontend (React Development Server)
#
# Usage: ./start-dev-tmux.sh
# Exit:  Ctrl+C in either pane, or 'tmux kill-session -t nurture'
# ===============================================

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Session name
SESSION_NAME="nurture"

echo -e "${BLUE}🌱 Starting Nurture Development Environment (tmux mode)...${NC}"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}❌ tmux is not installed. Installing via Homebrew...${NC}"
    brew install tmux
fi

# Kill existing session if it exists
tmux has-session -t $SESSION_NAME 2>/dev/null && {
    echo -e "${YELLOW}⚠️  Existing tmux session found. Killing it...${NC}"
    tmux kill-session -t $SESSION_NAME
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found. Please copy .env.example to .env and configure it.${NC}"
    exit 1
fi

# Verify backend dependencies
if [ ! -d "backend/venv" ] && [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Python virtual environment not found. Creating one...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r backend/requirements.txt
fi

# Verify frontend dependencies
if [ ! -d "nurture-app/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Node modules not found. Installing frontend dependencies...${NC}"
    cd nurture-app
    npm install
    cd ..
fi

echo -e "${GREEN}✅ All dependencies verified${NC}"

# Create new tmux session with proper layout
echo -e "${BLUE}🚀 Creating tmux session with split layout...${NC}"

# Create session and first window
tmux new-session -d -s $SESSION_NAME -n "nurture-dev"

# Split the window vertically (left and right panes)
tmux split-window -h -t $SESSION_NAME:0

# Configure left pane (Backend)
tmux send-keys -t $SESSION_NAME:0.0 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.0 "echo '🐍 Starting Backend (Flask + AWS Strands SDK)...'" Enter
tmux send-keys -t $SESSION_NAME:0.0 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
tmux send-keys -t $SESSION_NAME:0.0 "cd backend" Enter

# Activate virtual environment and start backend
if [ -d "../.venv" ]; then
    tmux send-keys -t $SESSION_NAME:0.0 "source ../.venv/bin/activate" Enter
elif [ -d "../venv" ]; then
    tmux send-keys -t $SESSION_NAME:0.0 "source ../venv/bin/activate" Enter
elif [ -d "venv" ]; then
    tmux send-keys -t $SESSION_NAME:0.0 "source venv/bin/activate" Enter
fi

tmux send-keys -t $SESSION_NAME:0.0 "BACKEND_PORT=8000 python3 app.py" Enter

# Configure right pane (Frontend) 
tmux send-keys -t $SESSION_NAME:0.1 "clear" Enter
tmux send-keys -t $SESSION_NAME:0.1 "echo '⚛️  Starting Frontend (React Development Server)...'" Enter
tmux send-keys -t $SESSION_NAME:0.1 "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'" Enter
tmux send-keys -t $SESSION_NAME:0.1 "cd nurture-app" Enter
tmux send-keys -t $SESSION_NAME:0.1 "PORT=3000 npm start" Enter

# Set pane titles
tmux select-pane -t $SESSION_NAME:0.0 -T "Backend (Flask + Strands)"
tmux select-pane -t $SESSION_NAME:0.1 -T "Frontend (React)"

# Wait a moment for services to start
sleep 2

# Display success message
echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Nurture Development Environment Started Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 TMUX SESSION LAYOUT:"
echo "┌─────────────────────────────────┬─────────────────────────────────┐"
echo "│ 🐍 Backend (Flask + Strands)   │ ⚛️  Frontend (React)            │"
echo "│ Port: 8000                      │ Port: 3000                      │"
echo "│ AWS Strands SDK + Claude 4.0    │ Live Reload Enabled             │"
echo "└─────────────────────────────────┴─────────────────────────────────┘"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo ""
echo "🎮 TMUX CONTROLS:"
echo "   • Attach to session:  tmux attach -t nurture"
echo "   • Switch panes:       Ctrl-b + Arrow Keys"
echo "   • Scroll in pane:     Ctrl-b + [ (then arrow keys, 'q' to exit)"
echo "   • Kill session:       tmux kill-session -t nurture"
echo "   • Detach session:     Ctrl-b + d"
echo ""
echo "🛑 TO STOP:"
echo "   • Press Ctrl+C in any pane, or"
echo "   • Run: tmux kill-session -t nurture"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

# Attach to the session
echo -e "${BLUE}🔗 Attaching to tmux session...${NC}"
tmux attach -t $SESSION_NAME