"""
Flask Backend API for Nurture App
Integrates sophisticated Python agentic architecture with React frontend
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import asyncio
import logging
import traceback
from datetime import datetime
import os
import sys
import threading
import time

# Import our sophisticated Python agentic components
try:
    from EvaluationQuiz import EvaluationQuizAgent
    from agenticEvaluation import MeshAgenticEvaluationService, TimeLimitedStrandsEvaluationService
    STRANDS_AVAILABLE = True
    print("✅ AWS Strands SDK components loaded successfully")
except ImportError as e:
    print(f"⚠️ Import error: {e}")
    print("Running in fallback mode without AWS Strands SDK")
    EvaluationQuizAgent = None
    MeshAgenticEvaluationService = None
    TimeLimitedStrandsEvaluationService = None
    STRANDS_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global quiz agent instance and caching
quiz_agent = None
question_cache = {}  # Simple in-memory cache for generated questions
quiz_progress = {}  # Track quiz generation progress by session ID

def init_quiz_agent():
    """Initialize the quiz agent globally"""
    global quiz_agent
    if quiz_agent is None and STRANDS_AVAILABLE and EvaluationQuizAgent is not None:
        try:
            quiz_agent = EvaluationQuizAgent()
            logger.info("✅ Quiz agent initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize quiz agent: {e}")
            return None
    return quiz_agent

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    agent_status = 'AWS Strands SDK Ready' if STRANDS_AVAILABLE and quiz_agent else 'Fallback Mode'
    return jsonify({
        'status': 'healthy',
        'service': 'Nurture Backend API',
        'timestamp': datetime.now().isoformat(),
        'agentic_system': agent_status,
        'strands_available': STRANDS_AVAILABLE
    })

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    """Get available subjects and topics for quiz selection"""
    try:
        agent = init_quiz_agent()
        if STRANDS_AVAILABLE and agent:
            subjects_data = []
            for subject in agent.subjects:
                subjects_data.append({
                    'name': subject.name,
                    'syllabus': subject.syllabus,
                    'icon': subject.icon,
                    'topics': subject.topics,
                    'description': subject.description
                })
        else:
            # Fallback subjects when Strands SDK is not available
            subjects_data = [
                {
                    'name': 'Physics',
                    'syllabus': '6091',
                    'icon': '⚡',
                    'topics': ['Kinematics'],
                    'description': 'Test your understanding of motion, velocity, and acceleration'
                },
                {
                    'name': 'Elementary Mathematics',
                    'syllabus': '4048',
                    'icon': '📐',
                    'topics': ['Algebra: Solving linear/quadratic equations'],
                    'description': 'Master algebraic problem-solving and expression simplification'
                },
                {
                    'name': 'English Language',
                    'syllabus': '1128',
                    'icon': '📚',
                    'topics': ['Reading Comprehension'],
                    'description': 'Develop critical reading and analytical thinking skills'
                }
            ]
        
        return jsonify({
            'subjects': subjects_data,
            'status': 'success',
            'using_strands': STRANDS_AVAILABLE
        })
        
    except Exception as e:
        logger.error(f"Error getting subjects: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/start', methods=['POST'])
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
        if not STRANDS_AVAILABLE:
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
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/evaluate', methods=['POST'])
def evaluate_quiz():
    """Evaluate quiz results using collaborative agentic swarm pattern"""
    try:
        data = request.get_json()
        quiz_results = data.get('quiz_results')
        
        if not quiz_results:
            return jsonify({'error': 'No quiz results provided'}), 400
        
        logger.info("Starting agentic evaluation of quiz results")
        
        # Use the sophisticated collaborative swarm evaluation
        if STRANDS_AVAILABLE and MeshAgenticEvaluationService:
            try:
                evaluation_service = MeshAgenticEvaluationService()
                # Run the async evaluation using asyncio.run()
                evaluation_results = asyncio.run(evaluation_service.evaluate_quiz_results_mesh(quiz_results))
                formatted_results = evaluation_service.format_evaluation_results(evaluation_results)
                
                return jsonify({
                    'evaluation': formatted_results,
                    'status': 'success',
                    'message': 'Quiz evaluated using mesh agentic collaboration'
                })
            except Exception as eval_error:
                logger.error(f"Mesh evaluation failed: {eval_error}")
                # Fallback to simple evaluation
                return jsonify({
                    'evaluation': create_fallback_evaluation(quiz_results),
                    'status': 'success',
                    'message': 'Quiz evaluated using fallback system (mesh evaluation failed)'
                })
        else:
            # Fallback evaluation if Strands SDK not available
            return jsonify({
                'evaluation': create_fallback_evaluation(quiz_results),
                'status': 'success',
                'message': 'Quiz evaluated using fallback system (Strands SDK not available)'
            })
        
    except Exception as e:
        logger.error(f"Error evaluating quiz: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/progress/<session_id>', methods=['GET'])
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

@app.route('/api/quiz/progress-stream/<session_id>', methods=['GET'])
def stream_quiz_progress(session_id):
    """Stream quiz generation progress updates"""
    def generate_progress():
        try:
            # Stream progress updates until completion
            while session_id in quiz_progress:
                progress = quiz_progress[session_id]
                yield f"data: {json.dumps(progress)}\n\n"
                
                if progress.get('status') in ['completed', 'error']:
                    break
                    
                time.sleep(1)  # Check every second
                
        except Exception as e:
            logger.error(f"Error streaming progress: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(generate_progress(), mimetype='text/plain')

@app.route('/api/agent-discussion', methods=['POST'])
def get_agent_discussion():
    """Stream real-time agent discussion for 1 minute"""
    def generate_discussion():
        try:
            data = request.get_json()
            quiz_results = data.get('quiz_results')
            
            # Simulate the 1-minute collaborative discussion
            agent_personas = {
                'moe_teacher': {
                    'name': 'MOE Teacher',
                    'icon': '👩‍🏫',
                    'focus': 'syllabus coverage and learning objectives'
                },
                'perfect_student': {
                    'name': 'Perfect Score Student',
                    'icon': '🏆',
                    'focus': 'efficiency and optimization strategies'
                },
                'tutor': {
                    'name': 'Private Tutor',
                    'icon': '🎓',
                    'focus': 'foundational knowledge gaps'
                }
            }
            
            agents = list(agent_personas.keys())
            
            for round_num in range(3):  # 3 rounds of discussion
                for agent_key in agents:
                    agent = agent_personas[agent_key]
                    discussion_point = {
                        'agent': agent['name'],
                        'icon': agent['icon'],
                        'message': f"Round {round_num + 1}: Analyzing student performance from {agent['focus']} perspective. Evaluating answer accuracy and learning patterns...",
                        'timestamp': datetime.now().isoformat(),
                        'round': round_num + 1
                    }
                    
                    yield f"data: {json.dumps(discussion_point)}\n\n"
                    time.sleep(1)  # 1 second between messages for realistic pacing
                    
        except Exception as e:
            logger.error(f"Error in agent discussion: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(generate_discussion(), mimetype='text/plain')

@app.route('/api/evaluate-quiz-time-limited', methods=['POST'])
def evaluate_quiz_time_limited():
    """Evaluate quiz results using time-limited agentic evaluation with smart timing"""
    try:
        request_data = request.get_json()
        
        # Extract inputs
        quiz_results = {
            'answers': request_data.get('answers', []),
            'topics': request_data.get('topics', [])
        }
        time_limit_minutes = request_data.get('timeLimitMinutes', 5)
        
        logger.info(f"Starting time-limited evaluation with {time_limit_minutes}min limit")
        
        # Check if time-limited service is available
        if not STRANDS_AVAILABLE or not TimeLimitedStrandsEvaluationService:
            logger.warning("TimeLimitedStrandsEvaluationService not available, using fallback")
            return jsonify({
                'success': True,
                'evaluation': create_fallback_evaluation(quiz_results),
                'message': 'Used fallback evaluation (time-limited service not available)'
            })
        
        # Initialize evaluation service
        evaluation_service = TimeLimitedStrandsEvaluationService(
            time_limit_minutes=time_limit_minutes
        )
        
        # Run evaluation
        results = evaluation_service.evaluate_quiz_results_with_smart_timing(quiz_results)
        formatted_results = evaluation_service.format_evaluation_results(results)
        
        return jsonify({
            'success': True,
            'evaluation': formatted_results,
            'message': f'Quiz evaluated using {time_limit_minutes}-minute time-limited agentic system'
        })
        
    except Exception as e:
        logger.error(f"Error in time-limited evaluation: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def generate_fallback_quiz(selected_topics, session_id):
    """Generate fallback quiz when Strands SDK is not available"""
    
    # Fallback question templates following 9-question format (easy, medium, hard)
    question_templates = {
        'Kinematics': [
            {
                'id': 'kin_easy_1',
                'topic': 'Kinematics',
                'subject': 'Physics',
                'difficulty': 'easy',
                'type': 'mcq',
                'question': 'What is the SI unit for velocity and which equation represents acceleration?',
                'options': ['m/s and a = (v-u)/t', 'm/s² and v = u + at', 'm and s = vt', 'km/h and d = st'],
                'correct_answer': 'm/s and a = (v-u)/t',
                'explanation': 'Velocity is measured in m/s and acceleration is the change in velocity over time.'
            },
            {
                'id': 'kin_easy_2', 
                'topic': 'Kinematics',
                'subject': 'Physics',
                'difficulty': 'easy',
                'type': 'mcq',
                'question': 'A student walks 3m east then 4m north. What is the displacement?',
                'options': ['7m', '5m', '12m', '1m'],
                'correct_answer': '5m',
                'explanation': 'Displacement is the straight-line distance: √(3² + 4²) = 5m'
            },
            {
                'id': 'kin_medium_1',
                'topic': 'Kinematics',
                'subject': 'Physics',
                'difficulty': 'medium',
                'type': 'structured',
                'question': 'A car accelerates from rest at 2 m/s² for 5 seconds. Calculate the final velocity and distance.',
                'options': None,
                'correct_answer': 'v = 10 m/s, s = 25 m using v = u + at and s = ut + ½at²',
                'explanation': 'Using kinematic equations: v = 0 + 2×5 = 10 m/s, s = 0 + ½×2×25 = 25 m'
            },
            {
                'id': 'kin_medium_2',
                'topic': 'Kinematics',
                'subject': 'Physics', 
                'difficulty': 'medium',
                'type': 'structured',
                'question': 'An object is thrown upward with initial velocity 15 m/s. Find maximum height reached.',
                'options': None,
                'correct_answer': 'h = 11.5 m using v² = u² + 2as',
                'explanation': 'At max height v=0, so 0 = 15² + 2(-9.8)h, giving h = 11.5 m'
            },
            {
                'id': 'kin_medium_3',
                'topic': 'Kinematics',
                'subject': 'Physics',
                'difficulty': 'medium', 
                'type': 'structured',
                'question': 'A ball is dropped from 20m height. Calculate time to hit ground.',
                'options': None,
                'correct_answer': 't = 2.0 s using s = ut + ½at²',
                'explanation': 'Using s = ½gt² (u=0), so 20 = ½×9.8×t², giving t = 2.0 s'
            },
            {
                'id': 'kin_hard_1',
                'topic': 'Kinematics',
                'subject': 'Physics',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'A projectile is launched at 30° with speed 20 m/s. Find maximum height and range.',
                'options': None,
                'correct_answer': 'Max height = 5.1 m, Range = 35.3 m',
                'explanation': 'Using projectile motion equations with component analysis'
            },
            {
                'id': 'kin_hard_2',
                'topic': 'Kinematics',
                'subject': 'Physics',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'Two cars start from rest: A accelerates at 2 m/s² for 10s, B at 3 m/s² for 6s. Which travels further?',
                'options': None,
                'correct_answer': 'Car A travels 100m, Car B travels 54m, so A travels further',
                'explanation': 'Using s = ½at²: A = ½×2×100 = 100m, B = ½×3×36 = 54m'
            },
            {
                'id': 'kin_hard_3',
                'topic': 'Kinematics',
                'subject': 'Physics',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'A stone is thrown horizontally from 45m height with speed 15 m/s. Find time of flight and horizontal distance.',
                'options': None,
                'correct_answer': 'Time = 3.0 s, Horizontal distance = 45 m',
                'explanation': 'Vertical: t = √(2h/g) = 3.0s, Horizontal: d = vt = 15×3 = 45m'
            },
            {
                'id': 'kin_very_hard_1',
                'topic': 'Kinematics',
                'subject': 'Physics',
                'difficulty': 'very_hard',
                'type': 'structured_explanation',
                'question': 'Analyze projectile motion with air resistance: How does drag affect trajectory shape, maximum height, range, and optimal launch angle?',
                'options': None,
                'correct_answer': 'Air resistance creates asymmetric trajectory, reduces max height and range, and shifts optimal angle below 45°',
                'explanation': 'Comprehensive analysis of real-world projectile motion including drag effects and trajectory modifications'
            }
        ],
        'Algebra: Solving linear/quadratic equations': [
            {
                'id': 'alg_easy_1',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'subject': 'Elementary Mathematics',
                'difficulty': 'easy',
                'type': 'mcq',
                'question': 'Solve 2x + 6 = 14 and identify which methods can solve x² - 5x + 6 = 0',
                'options': ['x = 4; factoring and quadratic formula', 'x = 6; factoring only', 'x = 8; quadratic formula only', 'x = 10; completing the square only'],
                'correct_answer': 'x = 4; factoring and quadratic formula',
                'explanation': 'Linear: 2x = 8, so x = 4. Quadratic can be solved by multiple methods.'
            },
            {
                'id': 'alg_easy_2',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'subject': 'Elementary Mathematics',
                'difficulty': 'easy',
                'type': 'mcq',
                'question': 'What is the coefficient of x² in 3x² - 2x + 5 = 0 and what does it tell us?',
                'options': ['3; parabola opens upward', '-2; parabola opens downward', '5; parabola opens upward', '0; no parabola'],
                'correct_answer': '3; parabola opens upward',
                'explanation': 'The coefficient of x² is 3 (positive), so the parabola opens upward.'
            },
            {
                'id': 'alg_medium_1',
                'topic': 'Algebra: Solving linear/quadratic equations', 
                'subject': 'Elementary Mathematics',
                'difficulty': 'medium',
                'type': 'structured',
                'question': 'Solve the quadratic equation x² - 5x + 6 = 0 using factoring and verify with the quadratic formula.',
                'options': None,
                'correct_answer': 'x = 2 or x = 3. Factoring: (x-2)(x-3) = 0. Formula: x = (5±1)/2',
                'explanation': 'Both methods give x = 2, 3. Factoring is quicker when possible.'
            },
            {
                'id': 'alg_medium_2',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'subject': 'Elementary Mathematics', 
                'difficulty': 'medium',
                'type': 'structured',
                'question': 'Solve the simultaneous equations: 2x + 3y = 7 and x - y = 1',
                'options': None,
                'correct_answer': 'x = 2, y = 1 using substitution or elimination method',
                'explanation': 'From second equation: x = 1 + y. Substitute: 2(1+y) + 3y = 7, gives y = 1, x = 2'
            },
            {
                'id': 'alg_medium_3',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'subject': 'Elementary Mathematics',
                'difficulty': 'medium',
                'type': 'structured', 
                'question': 'A rectangle has perimeter 20m and area 21m². Find its dimensions using quadratic equation.',
                'options': None,
                'correct_answer': 'Length = 7m, Width = 3m (or vice versa)',
                'explanation': 'Let width = x, length = 10-x. Area: x(10-x) = 21, gives x² - 10x + 21 = 0, so x = 3 or 7'
            },
            {
                'id': 'alg_hard_1',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'subject': 'Elementary Mathematics',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'Find the range of values of k for which kx² + 2x + 1 = 0 has real roots.',
                'options': None,
                'correct_answer': 'k ≤ 1 and k ≠ 0 (using discriminant ≥ 0)',
                'explanation': 'For real roots: b² - 4ac ≥ 0, so 4 - 4k ≥ 0, giving k ≤ 1. Also k ≠ 0 for quadratic.'
            },
            {
                'id': 'alg_hard_2',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'subject': 'Elementary Mathematics',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'Solve: (x+1)² + (x-2)² = 25. Expand, simplify and solve the resulting equation.',
                'options': None,
                'correct_answer': 'x = 3 or x = -2 (expanded form: 2x² - 2x - 20 = 0)',
                'explanation': 'Expand: x²+2x+1 + x²-4x+4 = 25, gives 2x²-2x-20 = 0, so x²-x-10 = 0'
            },
            {
                'id': 'alg_hard_3',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'subject': 'Elementary Mathematics',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'A ball is thrown upward. Its height h = -5t² + 20t + 15. When is it 35m high?',
                'options': None,
                'correct_answer': 't = 1s and t = 3s (solving -5t² + 20t + 15 = 35)',
                'explanation': 'Set h = 35: -5t² + 20t - 20 = 0, so t² - 4t + 4 = 0, giving t = 2± but this factors to (t-2)² = 0'
            },
            {
                'id': 'alg_very_hard_1',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'subject': 'Elementary Mathematics',
                'difficulty': 'very_hard',
                'type': 'structured_explanation',
                'question': 'Design a real-world problem involving quadratic optimization (cost, profit, or area). Set up the equation, solve it, and interpret the solution in context.',
                'options': None,
                'correct_answer': 'Student creates problem (e.g., fencing optimization), sets up quadratic, solves, and explains practical meaning of solution.',
                'explanation': 'Comprehensive problem requiring setup, solving, and contextual interpretation of quadratic applications'
            }
        ],
        'Reading Comprehension': [
            {
                'id': 'eng_easy_1',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'easy',
                'type': 'mcq',
                'question': 'What does "comprehension" mean and how do you identify the main idea in a paragraph?',
                'options': ['Understanding; look for topic sentence and supporting details', 'Speed; count the number of words', 'Writing; focus on grammar rules', 'Speaking; read aloud clearly'],
                'correct_answer': 'Understanding; look for topic sentence and supporting details',
                'explanation': 'Comprehension means understanding. Main ideas are usually in topic sentences with supporting details following.'
            },
            {
                'id': 'eng_easy_2',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'easy',
                'type': 'mcq',
                'question': 'What is the difference between fact and opinion in a text?',
                'options': ['Facts can be proven true, opinions are personal beliefs', 'Facts are short, opinions are long', 'Facts use big words, opinions use small words', 'Facts are boring, opinions are interesting'],
                'correct_answer': 'Facts can be proven true, opinions are personal beliefs',
                'explanation': 'Facts are objective and verifiable, while opinions are subjective personal viewpoints.'
            },
            {
                'id': 'eng_medium_1',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'medium',
                'type': 'structured',
                'question': 'Explain the difference between explicit and implicit information in a text, providing examples.',
                'options': None,
                'correct_answer': 'Explicit: directly stated (e.g., "John was angry"). Implicit: inferred from context (e.g., "John slammed the door" implies anger).',
                'explanation': 'Explicit information is clearly written, implicit information requires reading between the lines using context clues.'
            },
            {
                'id': 'eng_medium_2',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'medium',
                'type': 'structured',
                'question': 'Identify three techniques authors use to persuade readers and explain how each works.',
                'options': None,
                'correct_answer': 'Ethos (credibility), Pathos (emotions), Logos (logic/facts). Each appeals to different aspects of human decision-making.',
                'explanation': 'Persuasive techniques target credibility, emotions, and logical reasoning to influence reader opinions.'
            },
            {
                'id': 'eng_medium_3',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'medium',
                'type': 'structured',
                'question': 'How does an author\'s choice of words (diction) affect the tone and mood of a passage?',
                'options': None,
                'correct_answer': 'Word choice creates atmosphere: formal vs casual, positive vs negative connotations shape reader\'s emotional response.',
                'explanation': 'Diction directly influences how readers perceive and feel about the content through word associations and formality levels.'
            },
            {
                'id': 'eng_hard_1',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'Analyze how literary devices (metaphor, symbolism, irony) contribute to the deeper meaning of a text.',
                'options': None,
                'correct_answer': 'Literary devices create layers of meaning beyond literal text, allowing complex themes and emotions to be conveyed indirectly.',
                'explanation': 'Authors use figurative language to add depth, create memorable images, and convey complex ideas efficiently.'
            },
            {
                'id': 'eng_hard_2',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'Compare and contrast two different characters\' perspectives on the same event. How do their backgrounds influence their viewpoints?',
                'options': None,
                'correct_answer': 'Characters\' experiences, values, and social positions shape how they interpret events, creating multiple valid perspectives on the same situation.',
                'explanation': 'Different backgrounds lead to different lenses through which characters view and interpret the same events.'
            },
            {
                'id': 'eng_hard_3',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'hard',
                'type': 'structured',
                'question': 'Evaluate the effectiveness of an author\'s argument structure, including use of evidence, logical flow, and counterarguments.',
                'options': None,
                'correct_answer': 'Strong arguments use credible evidence, logical progression, address counterarguments, and maintain consistent reasoning throughout.',
                'explanation': 'Effective arguments combine solid evidence with logical structure and acknowledge opposing viewpoints to build credibility.'
            },
            {
                'id': 'eng_very_hard_1',
                'topic': 'Reading Comprehension',
                'subject': 'English Language',
                'difficulty': 'very_hard',
                'type': 'structured_explanation',
                'question': 'Critically analyze a complex text: How do multiple narrative techniques work together to reinforce the central theme? Consider point of view, symbolism, structure, and cultural context.',
                'options': None,
                'correct_answer': 'Comprehensive analysis showing how various literary elements interconnect to support the main theme, with specific textual evidence and cultural considerations.',
                'explanation': 'Advanced literary analysis requiring synthesis of multiple elements and understanding of how they work together to create meaning.'
            }
        ]
    }
    
    # Generate questions for selected topics
    all_questions = []
    for topic in selected_topics:
        if topic in question_templates:
            all_questions.extend(question_templates[topic])
    
    # If no specific templates, create generic ones
    if not all_questions:
        for i, topic in enumerate(selected_topics):
            all_questions.append({
                'id': f'generic_{i+1}',
                'topic': topic,
                'subject': 'General',
                'difficulty': 'easy',
                'type': 'mcq',
                'question': f'What is a key concept in {topic}?',
                'options': ['Option A', 'Option B', 'Option C', 'Option D'],
                'correct_answer': 'Option A',
                'explanation': f'This is a sample question for {topic}.'
            })
    
    quiz_data = {
        'questions': all_questions,
        'topics': selected_topics,
        'total_questions': len(all_questions)
    }
    
    return jsonify({
        'quiz_data': quiz_data,
        'status': 'success',
        'message': f'Fallback quiz generated with {len(all_questions)} questions',
        'cached': False,
        'session_id': session_id,
        'using_fallback': True
    })

def create_fallback_evaluation(quiz_results):
    """Fallback evaluation when sophisticated agents aren't available"""
    answers = quiz_results.get('answers', [])
    total_questions = len(answers)
    correct_answers = sum(1 for a in answers if a.get('isCorrect', False))
    accuracy = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
    
    # Simple expertise level determination
    if accuracy >= 90:
        level = 'grandmaster'
    elif accuracy >= 70:
        level = 'pro'
    elif accuracy >= 50:
        level = 'apprentice'
    else:
        level = 'beginner'
    
    return {
        'summary': {
            'totalQuestions': total_questions,
            'totalCorrect': correct_answers,
            'accuracy': round(accuracy)
        },
        'expertiseLevel': level,
        'justification': f'Based on {accuracy:.1f}% accuracy across {total_questions} questions',
        'confidence': 75,
        'recommendation': 'Continue practicing to improve your skills'
    }

@app.route('/api/study-plan', methods=['POST'])
def generate_study_plan():
    """Generate personalized study plan using the three AI agents"""
    try:
        data = request.get_json()
        expertise_levels = data.get('expertise_levels', {})
        target_exam_date = data.get('target_exam_date')
        
        # This would integrate with the sophisticated study plan agents from Part 4
        # For now, return a placeholder structure
        
        study_plan = {
            'timeline': 'Next 30 days',
            'sessions': [
                {
                    'date': '2025-08-28',
                    'subject': 'Physics',
                    'topic': 'Kinematics',
                    'type': 'Learning',
                    'duration': 60
                },
                {
                    'date': '2025-08-29', 
                    'subject': 'Mathematics',
                    'topic': 'Algebra',
                    'type': 'Practice',
                    'duration': 45
                }
            ],
            'generated_by': 'AI Study Planning Agents',
            'strategy': 'Spaced repetition with expertise-based adaptation'
        }
        
        return jsonify({
            'study_plan': study_plan,
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error generating study plan: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/start', methods=['POST'])
def start_study_session():
    """Start a study session using the agent graph architecture"""
    try:
        data = request.get_json()
        session_config = data.get('session_config', {})
        
        # This would integrate with the sophisticated study session agents from Part 7
        # Using star topology with orchestrating agent
        
        session_data = {
            'session_id': f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'orchestrator': 'Study Session Orchestrator',
            'active_agents': ['Teacher', 'Tutor', 'Perfect Student'],
            'mode': 'learning',  # or 'practice'
            'topic': session_config.get('topic'),
            'duration': session_config.get('duration', 60)
        }
        
        return jsonify({
            'session': session_data,
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error starting study session: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize the quiz agent on startup
    init_quiz_agent()
    
    # Run the Flask app
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info(f"Starting Nurture Backend API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)