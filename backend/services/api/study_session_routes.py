"""
Flask API routes for AWS Strands Study Session - Part 7

These routes handle the chatbot interface for study sessions powered by
the AWS Strands Agent Graph with Star Topology.

Endpoints:
- POST /api/study-session/initialize - Initialize new session  
- POST /api/study-session/chat - Process student chat messages
- GET /api/study-session/<session_id>/status - Get session status
- POST /api/study-session/<session_id>/end - End session and get final data
"""

import asyncio
import logging
from flask import Blueprint, request, jsonify
from typing import Dict, Any

# Import the AWS Strands study session service
try:
    from services.agentic.study_session import (
        initialize_study_session,
        process_chat_message, 
        get_session_status,
        end_study_session
    )
    STUDY_SESSION_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Study session service not available: {e}")
    STUDY_SESSION_AVAILABLE = False

logger = logging.getLogger(__name__)

# Create blueprint
study_session_blueprint = Blueprint('study_session', __name__, url_prefix='/api/study-session')

def run_async(coro):
    """Helper to run async functions in Flask"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)

@study_session_blueprint.route('/initialize', methods=['POST'])
def initialize_session():
    """
    Initialize a new study session with AWS Strands Agent Graph
    
    Expected JSON payload:
    {
        "user_id": "string",
        "topic_id": "string", 
        "subject_id": "string",
        "expertise_level": "beginner|apprentice|pro|grandmaster",
        "focus_level": 1-10,
        "stress_level": 1-10,
        "session_duration": 60,
        "exam_date": "2024-05-15" (optional)
    }
    
    Returns:
    {
        "success": true,
        "session_id": "session_12345",
        "messages": [...],
        "session_plan": {...}
    }
    """
    
    if not STUDY_SESSION_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "Study session service not available. Please check AWS Strands configuration."
        }), 503
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ["user_id", "topic_id", "subject_id", "expertise_level", "focus_level", "stress_level", "session_duration"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Missing required fields: {missing_fields}"
            }), 400
        
        # Validate field values
        if data["expertise_level"] not in ["beginner", "apprentice", "pro", "grandmaster"]:
            return jsonify({
                "success": False,
                "error": "expertise_level must be one of: beginner, apprentice, pro, grandmaster"
            }), 400
        
        if not (1 <= data["focus_level"] <= 10):
            return jsonify({
                "success": False,
                "error": "focus_level must be between 1 and 10"
            }), 400
            
        if not (1 <= data["stress_level"] <= 10):
            return jsonify({
                "success": False,
                "error": "stress_level must be between 1 and 10" 
            }), 400
        
        # Initialize session using AWS Strands orchestrator
        logger.info(f"Initializing study session for user {data['user_id']} - topic: {data['topic_id']}")
        
        result = run_async(initialize_study_session(data))
        
        if result["success"]:
            logger.info(f"Session initialized successfully: {result['session_id']}")
            return jsonify(result), 200
        else:
            logger.error(f"Session initialization failed: {result.get('error')}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Session initialization error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@study_session_blueprint.route('/chat', methods=['POST'])
def process_chat():
    """
    Process student chat message through AWS Strands Agent Graph
    
    The orchestrator will:
    1. Analyze the student message
    2. Route to appropriate agent (Teacher, Tutor, Perfect Scorer)
    3. Return agent response with orchestrator coordination
    
    Expected JSON payload:
    {
        "session_id": "session_12345",
        "message": "I want to practice kinematics questions"
    }
    
    Returns:
    {
        "success": true,
        "messages": [...],
        "agent_response": {
            "agent_id": "teacher",
            "mode": "practice"
        }
    }
    """
    
    if not STUDY_SESSION_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "Study session service not available"
        }), 503
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get("session_id") or not data.get("message"):
            return jsonify({
                "success": False,
                "error": "session_id and message are required"
            }), 400
        
        session_id = data["session_id"]
        message = data["message"].strip()
        
        if not message:
            return jsonify({
                "success": False, 
                "error": "Message cannot be empty"
            }), 400
        
        # Process message through AWS Strands orchestrator
        logger.info(f"Processing message for session {session_id}: {message[:50]}...")
        
        result = run_async(process_chat_message(session_id, message))
        
        if result.get("success"):
            logger.info(f"Message processed successfully - Agent: {result.get('agent_response', {}).get('agent_id', 'unknown')}")
            return jsonify(result), 200
        else:
            logger.error(f"Message processing failed: {result.get('error')}")
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Chat processing error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@study_session_blueprint.route('/<session_id>/status', methods=['GET'])
def get_status(session_id):
    """
    Get current status of study session
    
    Returns:
    {
        "success": true,
        "session_id": "session_12345",
        "status": "active",
        "messages_count": 15,
        "progress": {...},
        "last_updated": "2024-01-15T10:30:00"
    }
    """
    
    if not STUDY_SESSION_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "Study session service not available"
        }), 503
    
    try:
        logger.info(f"Getting status for session {session_id}")
        
        result = get_session_status(session_id)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@study_session_blueprint.route('/<session_id>/end', methods=['POST'])
def end_session(session_id):
    """
    End study session and return final data for Part 8 re-evaluation
    
    Returns:
    {
        "success": true,
        "final_summary": {
            "session_id": "session_12345",
            "duration_minutes": 45,
            "total_messages": 25,
            "agent_interactions": 12,
            "orchestrator_decisions": 8,
            "student_progress": {...},
            "performance_data": {...}
        },
        "ready_for_part8_evaluation": true
    }
    """
    
    if not STUDY_SESSION_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "Study session service not available"
        }), 503
    
    try:
        logger.info(f"Ending session {session_id}")
        
        result = end_study_session(session_id)
        
        if result["success"]:
            logger.info(f"Session ended successfully - Duration: {result['final_summary']['duration_minutes']}min")
            return jsonify(result), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        logger.error(f"Session end error: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@study_session_blueprint.route('/health', methods=['GET'])
def health_check():
    """Health check for study session service"""
    
    try:
        # Check if AWS Strands is available
        if not STUDY_SESSION_AVAILABLE:
            return jsonify({
                "service": "study_session",
                "status": "degraded",
                "strands_available": False,
                "message": "Running in simulation mode - AWS Strands not available"
            }), 200
        
        return jsonify({
            "service": "study_session", 
            "status": "healthy",
            "strands_available": True,
            "message": "AWS Strands Agent Graph ready"
        }), 200
        
    except Exception as e:
        return jsonify({
            "service": "study_session",
            "status": "unhealthy", 
            "error": str(e)
        }), 500

# Error handlers
@study_session_blueprint.errorhandler(400)
def bad_request(error):
    return jsonify({
        "success": False,
        "error": "Bad request - check your input data"
    }), 400

@study_session_blueprint.errorhandler(404) 
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Session not found"
    }), 404

@study_session_blueprint.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        "success": False,
        "error": "Internal server error - please try again"
    }), 500

# Development/testing endpoints
@study_session_blueprint.route('/test/agents', methods=['GET'])
def test_agents():
    """Test endpoint to verify agent availability"""
    
    try:
        from services.agentic.study_session import study_session_orchestrator
        
        agents_status = {
            "orchestrator": study_session_orchestrator.agent is not None,
            "specialized_agents": {
                "teacher": "teacher" in study_session_orchestrator.specialized_agents,
                "tutor": "tutor" in study_session_orchestrator.specialized_agents, 
                "perfect_scorer": "perfect_scorer" in study_session_orchestrator.specialized_agents
            },
            "strands_available": STUDY_SESSION_AVAILABLE
        }
        
        return jsonify({
            "success": True,
            "agents_status": agents_status,
            "message": "Agent status check complete"
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Agent test failed: {str(e)}"
        }), 500

logger.info("Study Session API routes loaded successfully")