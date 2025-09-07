"""
Quiz Generation and Management Routes
"""

from flask import Blueprint, request, jsonify, Response
import json
import threading
import time
import logging
from datetime import datetime, timedelta
from threading import Lock

logger = logging.getLogger(__name__)

quiz_blueprint = Blueprint('quiz', __name__)

# Global quiz agent instance and caching
quiz_agent = None
question_cache = {}  # Simple in-memory cache for generated questions
quiz_progress = {}  # Track quiz generation progress by session ID

# Thread-safe locks for progress tracking
progress_lock = Lock()
cache_lock = Lock()

def cleanup_old_sessions():
    """Clean up old quiz sessions from memory and handle hanging sessions"""
    current_time = datetime.now()
    cutoff_time = current_time - timedelta(hours=1)  # Remove sessions older than 1 hour
    hanging_cutoff = current_time - timedelta(minutes=10)  # Mark hanging sessions after 10 minutes
    
    with progress_lock:
        sessions_to_remove = []
        hanging_sessions = []
        
        for session_id, session_data in quiz_progress.items():
            try:
                session_start = datetime.fromisoformat(session_data.get('start_time', ''))
                status = session_data.get('status', '')
                
                # Remove very old sessions
                if session_start < cutoff_time:
                    sessions_to_remove.append(session_id)
                # Mark hanging sessions as timed out
                elif session_start < hanging_cutoff and status == 'generating':
                    hanging_sessions.append(session_id)
                    
            except (ValueError, KeyError):
                # Remove sessions with invalid timestamps
                sessions_to_remove.append(session_id)
        
        # Remove old sessions
        for session_id in sessions_to_remove:
            del quiz_progress[session_id]
            logger.info(f"Cleaned up old session: {session_id}")
        
        # Mark hanging sessions as timed out with partial + fallback completion
        for session_id in hanging_sessions:
            logger.warning(f"⚠️ Marking hanging session as timed out: {session_id}")
            quiz_progress[session_id].update({
                'status': 'timeout_fallback',
                'message': 'Generation timed out - completing with available questions + templates',
                'end_time': current_time.isoformat(),
                'fallback_reason': 'thread_hanging'
            })
            
            # Generate fallback quiz data for hanging session
            try:
                topics = quiz_progress[session_id].get('topics', ['General'])
                from services.agentic.quiz_generation import EvaluationQuizAgent
                temp_agent = EvaluationQuizAgent()
                fallback_data = temp_agent._generate_fallback_questions(topics)
                
                # Check if there are any partial results from the AI generation
                partial_results = quiz_progress[session_id].get('partial_questions', [])
                if partial_results:
                    # Combine partial AI results with fallback questions
                    combined_questions = partial_results + fallback_data['questions']
                    fallback_data['questions'] = combined_questions
                    fallback_data['total_questions'] = len(combined_questions)
                    fallback_data['mixed_generation'] = True
                    fallback_data['ai_questions'] = len(partial_results)
                    fallback_data['template_questions'] = len(fallback_data['questions']) - len(partial_results)
                    logger.info(f"✅ Combined {len(partial_results)} AI + {len(fallback_data['questions']) - len(partial_results)} template questions")
                
                quiz_progress[session_id]['quiz_data'] = fallback_data
                quiz_progress[session_id]['status'] = 'completed'
                quiz_progress[session_id]['message'] = 'Quiz completed using mixed AI + template questions (partial timeout)'
                logger.info(f"✅ Generated mixed quiz for hanging session: {session_id}")
            except Exception as e:
                logger.error(f"❌ Failed to generate fallback for hanging session {session_id}: {e}")
        
        if sessions_to_remove:
            logger.info(f"Cleaned up {len(sessions_to_remove)} old quiz sessions")

# Start background cleanup thread
def start_cleanup_thread():
    """Start background thread for session cleanup"""
    def cleanup_loop():
        while True:
            try:
                cleanup_old_sessions()
                time.sleep(300)  # Run cleanup every 5 minutes
            except Exception as e:
                logger.error(f"Error in cleanup thread: {e}")
                time.sleep(60)  # Wait 1 minute before retry
    
    cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True, name="SessionCleanup")
    cleanup_thread.start()
    logger.info("Started session cleanup background thread")

# Start cleanup thread when module is loaded
start_cleanup_thread()

def init_quiz_agent():
    """Initialize the agentic RAG quiz agent globally with quick fallback"""
    global quiz_agent
    from services.agentic import EvaluationQuizAgent, TIME_LIMITED_AVAILABLE
    
    if quiz_agent is None:
        if TIME_LIMITED_AVAILABLE and EvaluationQuizAgent is not None:
            try:
                logger.info("🧠 Attempting quick Agentic RAG Quiz Agent initialization...")
                # Quick initialization with timeout
                import time
                start_time = time.time()
                quiz_agent = EvaluationQuizAgent()
                elapsed = time.time() - start_time
                
                if elapsed > 5:  # If initialization takes more than 5 seconds, something is wrong
                    logger.warning(f"⚠️ Agent initialization took {elapsed:.1f}s - may be unstable")
                
                logger.info("✅ Agentic RAG Quiz Agent initialized - ready for quiz generation")
                return quiz_agent
            except Exception as e:
                logger.warning(f"⚠️ Quick agent initialization failed: {e}")
                logger.info("🔄 Using fallback quiz generation")
                quiz_agent = "fallback"  # Mark as fallback mode
        else:
            logger.info("ℹ️ Using fallback quiz generation (Strands SDK not available)")
            quiz_agent = "fallback"
    
    return quiz_agent if quiz_agent != "fallback" else None

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
        
        # Check cache first (CACHING OPTIMIZATION) - Thread safe
        with cache_lock:
            if cache_key in question_cache:
                logger.info(f"Returning cached quiz for topics: {selected_topics}")
                return jsonify({
                    'quiz_data': question_cache[cache_key],
                    'status': 'success',
                    'message': f'Quiz loaded from cache with {question_cache[cache_key]["total_questions"]} questions',
                    'cached': True,
                    'session_id': session_id
                })
        
        # PRIMARY METHOD: Initialize Agentic RAG Quiz Agent
        agent = init_quiz_agent()
        from services.agentic import TIME_LIMITED_AVAILABLE
        
        if agent and TIME_LIMITED_AVAILABLE:
            logger.info(f"🧠 Agent available, proceeding with AI generation")
        else:
            logger.info("🔄 No AI agent available, using immediate fallback")
            # Immediate fallback to static questions using agent's fallback method
            try:
                from services.agentic.quiz_generation import EvaluationQuizAgent
                temp_agent = EvaluationQuizAgent()
                fallback_data = temp_agent._generate_fallback_questions(selected_topics)
            except Exception as e:
                logger.error(f"Failed to create fallback agent: {e}")
                # Manual fallback data if agent creation fails
                fallback_data = {
                    'questions': [
                        {
                            'id': 'fallback_1',
                            'topic': selected_topics[0] if selected_topics else 'General',
                            'subject': 'General',
                            'difficulty': 'easy',
                            'type': 'mcq',
                            'question': 'What is 2 + 2?',
                            'options': ['3', '4', '5', '6'],
                            'correct_answer': '4',
                            'explanation': 'Basic arithmetic: 2 + 2 = 4'
                        }
                    ],
                    'total_questions': 1,
                    'topics': selected_topics,
                    'fallback_used': True,
                    'generation_timestamp': datetime.now().isoformat()
                }
            
            # Format as proper response
            fallback_quiz = {
                'quiz_data': fallback_data,
                'status': 'success',
                'message': f'Fallback quiz loaded with {fallback_data["total_questions"]} questions',
                'session_id': session_id,
                'fallback_used': True
            }
            
            # Cache the fallback quiz
            with cache_lock:
                question_cache[cache_key] = fallback_data
            return jsonify(fallback_quiz)
        
        if agent and TIME_LIMITED_AVAILABLE:
            logger.info(f"🧠 Using AGENTIC RAG for quiz generation - topics: {selected_topics}")
            logger.info("🚀 Starting AI-powered question generation with real PDF content fetching...")
            
            # Use the sophisticated agentic RAG system for question generation
            try:
                # Initialize progress tracking for agentic RAG generation - Thread safe
                with progress_lock:
                    quiz_progress[session_id] = {
                        'status': 'initializing_agents',
                        'message': 'Initializing AI agents for content generation...',
                        'current_batch': 0,
                        'total_batches': 3,  # 3 batches (easy, medium, hard)
                        'topics': selected_topics,
                        'start_time': datetime.now().isoformat(),
                        'method': 'agentic_rag'
                    }
                
                # Start agentic quiz generation in background thread for real-time updates
                def generate_agentic_quiz():
                    try:
                        logger.info(f"🧠 Starting agentic quiz generation thread for session: {session_id}")
                        
                        # SIMPLIFIED APPROACH: Use fast timeout and immediate fallback
                        # The Strands SDK has issues with async calls in background threads
                        import threading
                        import time
                        
                        # Update progress to show generation started - CRITICAL FIX
                        with progress_lock:
                            quiz_progress[session_id].update({
                                'status': 'generating',
                                'message': 'AI agents generating questions using RAG...',
                                'current_batch': 1,
                                'method': 'agentic_rag'
                            })
                        
                        # Generate quiz using full agentic RAG (no timeout limits)
                        quiz_data = agent.start_quiz(selected_topics)
                        
                        # Store successful agentic generation in cache - Thread safe
                        cache_key = '_'.join(sorted(selected_topics))
                        with cache_lock:
                            question_cache[cache_key] = quiz_data
                        logger.info(f"✅ Agentic RAG quiz cached for key: {cache_key}")
                        
                        # Update final progress - Thread safe
                        with progress_lock:
                            quiz_progress[session_id].update({
                                'status': 'completed',
                                'message': 'AI-powered quiz generation completed successfully!',
                                'quiz_data': quiz_data,
                                'end_time': datetime.now().isoformat(),
                                'method': 'agentic_rag'
                            })
                        logger.info(f"✅ Agentic RAG completed successfully for session: {session_id}")
                        
                    except Exception as e:
                        logger.error(f"❌ Agentic RAG generation failed: {e}")
                        # Update progress with detailed error info  
                        with progress_lock:
                            quiz_progress[session_id].update({
                                'status': 'ai_error',
                                'message': f'AI generation failed: {str(e)[:100]}...',
                                'error_type': 'ai_failure',
                                'ai_system': 'AWS Strands SDK'
                            })
                        # Let the outer exception handler deal with fallbacks
                        raise e
                        
                        try:
                            # Fallback to static questions on agentic failure
                            from app import generate_fallback_quiz_data
                            fallback_data = generate_fallback_quiz_data(selected_topics)
                            
                            with progress_lock:
                                error_details = quiz_progress[session_id].get('error_type', 'unknown')
                                quiz_progress[session_id].update({
                                    'status': 'completed',
                                    'message': f'Quiz generated using template system (AI {error_details})',
                                    'quiz_data': fallback_data,
                                    'end_time': datetime.now().isoformat(),
                                    'method': 'fallback_after_agentic_failure',
                                    'warning': f'AI generation failed due to {error_details}, using template questions'
                                })
                            logger.info(f"✅ Fallback quiz generated for session: {session_id}")
                            
                        except Exception as fallback_error:
                            logger.error(f"❌ Even fallback failed: {fallback_error}")
                            with progress_lock:
                                quiz_progress[session_id].update({
                                    'status': 'error',
                                    'message': f'Quiz generation failed completely: {str(e)}',
                                    'end_time': datetime.now().isoformat(),
                                    'method': 'complete_failure'
                                })
                
                # Start background agentic generation with proper thread naming
                thread = threading.Thread(target=generate_agentic_quiz, daemon=True, name=f"QuizGen-{session_id}")
                thread.start()
                logger.info(f"🚀 Started background thread: {thread.name}")
                
                return jsonify({
                    'session_id': session_id,
                    'status': 'generating_with_agentic_rag',
                    'message': 'AI agents are generating personalized quiz content using RAG...',
                    'progress_url': f'/api/quiz/progress/{session_id}',
                    'stream_url': f'/api/quiz/progress-stream/{session_id}',
                    'method': 'agentic_rag',
                    'agentic_system': 'AWS Strands SDK with Claude Sonnet 4.0'
                })
                
            except Exception as e:
                logger.error(f"❌ Failed to start agentic RAG generation: {e}")
                logger.info("🔄 Immediate fallback to static questions")
                return generate_fallback_quiz(selected_topics, session_id)
        
        else:
            # FALLBACK: Only when agentic RAG is completely unavailable
            logger.warning("⚠️ Agentic RAG unavailable - using fallback static questions")
            logger.info(f"📝 Generating static quiz for topics: {selected_topics}")
            return generate_fallback_quiz(selected_topics, session_id)
        
    except Exception as e:
        logger.error(f"Error starting quiz: {e}")
        return jsonify({'error': str(e)}), 500

@quiz_blueprint.route('/api/quiz/progress/<session_id>', methods=['GET'])
def get_quiz_progress(session_id):
    """Get quiz generation progress for a session - Thread safe"""
    try:
        with progress_lock:
            progress_data = quiz_progress.get(session_id, {
                'status': 'not_found',
                'message': 'Session not found'
            })
            # Create a copy to avoid modification during response
            progress_copy = progress_data.copy()
        return jsonify(progress_copy)
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

@quiz_blueprint.route('/api/quiz/fallback/<session_id>', methods=['POST'])
def get_fallback_quiz(session_id):
    """Generate fallback quiz when frontend times out"""
    try:
        # Get the session data to find original topics
        with progress_lock:
            session_data = quiz_progress.get(session_id, {})
        
        selected_topics = session_data.get('topics', ['Kinematics'])  # Default fallback
        
        logger.info(f"🔄 Generating fallback quiz for timed-out session: {session_id}")
        logger.info(f"📝 Topics: {selected_topics}")
        
        # Generate fallback questions using the agent's method
        from services.agentic.quiz_generation import EvaluationQuizAgent
        temp_agent = EvaluationQuizAgent()
        fallback_data = temp_agent._generate_fallback_questions(selected_topics)
        
        # Update session progress to show fallback was used
        with progress_lock:
            if session_id in quiz_progress:
                quiz_progress[session_id].update({
                    'status': 'completed',
                    'message': 'Quiz completed using template questions (AI timed out)',
                    'quiz_data': fallback_data,
                    'method': 'frontend_timeout_fallback',
                    'end_time': datetime.now().isoformat()
                })
        
        return jsonify({
            'quiz_data': fallback_data,
            'status': 'success',
            'message': f'Fallback quiz generated with {fallback_data["total_questions"]} template questions',
            'session_id': session_id,
            'fallback_reason': 'frontend_timeout'
        })
        
    except Exception as e:
        logger.error(f"❌ Fallback quiz generation failed for session {session_id}: {e}")
        return jsonify({'error': str(e)}), 500

def generate_fallback_quiz(selected_topics, session_id):
    """Generate fallback quiz when Strands SDK is not available"""
    
    # Import the fallback quiz data from the main app
    from app import generate_fallback_quiz as app_fallback_quiz
    return app_fallback_quiz(selected_topics, session_id)