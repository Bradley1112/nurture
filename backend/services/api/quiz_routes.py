"""
Quiz Generation and Management Routes
"""

from flask import Blueprint, request, jsonify, Response
import json
import threading
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

quiz_blueprint = Blueprint('quiz', __name__)

# Global quiz agent instance and caching
quiz_agent = None
question_cache = {}  # Simple in-memory cache for generated questions
quiz_progress = {}  # Track quiz generation progress by session ID

def init_quiz_agent():
    """Initialize the quiz agent globally"""
    global quiz_agent
    from services.agentic import EvaluationQuizAgent, TIME_LIMITED_AVAILABLE
    
    if quiz_agent is None and TIME_LIMITED_AVAILABLE and EvaluationQuizAgent is not None:
        try:
            quiz_agent = EvaluationQuizAgent()
            logger.info("✅ Quiz agent initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize quiz agent: {e}")
            return None
    return quiz_agent

@quiz_blueprint.route('/api/quiz/start', methods=['POST'])
def start_quiz():
    """Start quiz with selected topics using agentic RAG (with caching optimization)"""
    try:
        data = request.get_json()
        selected_topics = data.get('topics', [])
        
        if not selected_topics:
            return jsonify({'error': 'No topics selected'}), 400
        
        # Generate unique session ID
        session_id = f"quiz_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(str(selected_topics)) % 10000}"
        
        # Create cache key from sorted topics
        cache_key = '_'.join(sorted(selected_topics))
        
        # Check cache first (CACHING OPTIMIZATION)
        if cache_key in question_cache:
            logger.info(f"Returning cached quiz for topics: {selected_topics}")
            return jsonify({
                'quiz_data': question_cache[cache_key],
                'status': 'success',
                'message': f'Quiz loaded from cache with {question_cache[cache_key]["total_questions"]} questions',
                'cached': True,
                'session_id': session_id
            })
        
        agent = init_quiz_agent()
        from services.agentic import TIME_LIMITED_AVAILABLE
        
        if not TIME_LIMITED_AVAILABLE:
            # Fallback: Generate simple mock quiz data
            return generate_fallback_quiz(selected_topics, session_id)
        
        if not agent:
            return jsonify({'error': 'Quiz agent not available'}), 500
        
        # Initialize progress tracking
        quiz_progress[session_id] = {
            'status': 'starting',
            'message': 'Initializing quiz generation...',
            'current_batch': 0,
            'total_batches': 4,
            'topics': selected_topics,
            'start_time': datetime.now().isoformat()
        }
        
        logger.info(f"Generating new quiz for topics: {selected_topics}")
        
        # Start quiz generation in background thread
        def generate_quiz_with_progress():
            try:
                # Use the sophisticated agentic RAG system with progress tracking
                quiz_data = agent.start_quiz_with_progress(selected_topics, session_id, quiz_progress)
                
                # Store in cache for future use
                question_cache[cache_key] = quiz_data
                logger.info(f"Quiz cached for future use with key: {cache_key}")
                
                # Update final progress
                quiz_progress[session_id].update({
                    'status': 'completed',
                    'message': 'Quiz generation completed successfully!',
                    'quiz_data': quiz_data,
                    'end_time': datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Error in background quiz generation: {e}")
                quiz_progress[session_id].update({
                    'status': 'error',
                    'message': f'Quiz generation failed: {str(e)}',
                    'end_time': datetime.now().isoformat()
                })
        
        # Start background generation
        threading.Thread(target=generate_quiz_with_progress, daemon=True).start()
        
        return jsonify({
            'session_id': session_id,
            'status': 'generating',
            'message': 'Quiz generation started. Use session_id to track progress.',
            'progress_url': f'/api/quiz/progress/{session_id}',
            'stream_url': f'/api/quiz/progress-stream/{session_id}'
        })
        
    except Exception as e:
        logger.error(f"Error starting quiz: {e}")
        return jsonify({'error': str(e)}), 500

@quiz_blueprint.route('/api/quiz/progress/<session_id>', methods=['GET'])
def get_quiz_progress(session_id):
    """Get quiz generation progress for a session"""
    try:
        progress_data = quiz_progress.get(session_id, {
            'status': 'not_found',
            'message': 'Session not found'
        })
        return jsonify(progress_data)
    except Exception as e:
        logger.error(f"Error getting quiz progress: {e}")
        return jsonify({'error': str(e)}), 500

@quiz_blueprint.route('/api/quiz/progress-stream/<session_id>', methods=['GET'])
def stream_quiz_progress(session_id):
    """Stream quiz generation progress updates"""
    def generate_progress():
        try:
            # Stream progress updates until completion
            while session_id in quiz_progress:
                progress = quiz_progress[session_id]
                yield f"data: {json.dumps(progress)}\\n\\n"
                
                if progress.get('status') in ['completed', 'error']:
                    break
                    
                time.sleep(1)  # Check every second
                
        except Exception as e:
            logger.error(f"Error streaming progress: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\\n\\n"
    
    return Response(generate_progress(), mimetype='text/plain')

def generate_fallback_quiz(selected_topics, session_id):
    """Generate fallback quiz when Strands SDK is not available"""
    
    # Import the fallback quiz data from the main app
    from app import generate_fallback_quiz as app_fallback_quiz
    return app_fallback_quiz(selected_topics, session_id)