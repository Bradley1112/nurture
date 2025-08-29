"""
Quiz Evaluation Routes
Agentic evaluation endpoints with time-limited and standard evaluation
"""

from flask import Blueprint, request, jsonify, Response
import json
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

evaluation_blueprint = Blueprint('evaluation', __name__)

@evaluation_blueprint.route('/api/quiz/evaluate', methods=['POST'])
def evaluate_quiz():
    """Evaluate quiz results using collaborative agentic swarm pattern"""
    try:
        data = request.get_json()
        quiz_results = data.get('quiz_results')
        
        if not quiz_results:
            return jsonify({'error': 'No quiz results provided'}), 400
        
        logger.info("Starting agentic evaluation of quiz results")
        
        try:
            from services.agentic import MeshAgenticEvaluationService, TIME_LIMITED_AVAILABLE
        except ImportError as import_error:
            logger.warning(f"Agentic services not available: {import_error}")
            TIME_LIMITED_AVAILABLE = False
            MeshAgenticEvaluationService = None
        
        # Use the sophisticated collaborative swarm evaluation
        if TIME_LIMITED_AVAILABLE and MeshAgenticEvaluationService:
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
        return jsonify({'error': str(e)}), 500

@evaluation_blueprint.route('/api/evaluate-quiz-time-limited', methods=['POST'])
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
        
        try:
            from services.agentic import TimeLimitedStrandsEvaluationService, TIME_LIMITED_AVAILABLE
        except ImportError:
            TimeLimitedStrandsEvaluationService = None
            TIME_LIMITED_AVAILABLE = False
        
        # Check if time-limited service is available
        if not TIME_LIMITED_AVAILABLE or not TimeLimitedStrandsEvaluationService:
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

@evaluation_blueprint.route('/api/agent-discussion-live', methods=['POST'])
def stream_real_agent_discussion():
    """Stream real-time agent discussion during actual evaluation"""
    
    try:
        data = request.get_json()
        quiz_results = {
            'answers': data.get('answers', []),
            'topics': data.get('topics', [])
        }
        time_limit_minutes = data.get('timeLimitMinutes', 7)
        
        logger.info(f"Starting real-time agent discussion stream ({time_limit_minutes}min)")
        
        # Import and create the evaluation service
        try:
            from services.agentic import TimeLimitedStrandsEvaluationService
        except ImportError as import_error:
            logger.error(f"Failed to import TimeLimitedStrandsEvaluationService: {import_error}")
            return jsonify({'error': 'Agentic evaluation service not available'}), 503
        
        # Create service instance and start streaming
        service = TimeLimitedStrandsEvaluationService(time_limit_minutes=time_limit_minutes)
        
        # Create streaming response using the service's streaming method
        response = Response(
            service.stream_evaluation_with_chat(quiz_results), 
            mimetype='text/event-stream'
        )
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['Connection'] = 'keep-alive'
        return response
        
    except Exception as e:
        logger.error(f"Error starting agent discussion stream: {e}")
        return jsonify({'error': str(e)}), 500

@evaluation_blueprint.route('/api/agent-discussion', methods=['POST'])
def get_agent_discussion():
    """Stream real-time agent discussion for 1 minute"""
    import time
    from datetime import datetime as dt
    
    # Get data in the request context before the generator
    try:
        data = request.get_json()
        quiz_results = data.get('quiz_results', {})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
    
    def generate_discussion():
        # Simulate the 1-minute collaborative discussion
        agent_personas = [
            {'name': 'MOE Teacher', 'icon': '👩‍🏫', 'focus': 'syllabus coverage and learning objectives'},
            {'name': 'Perfect Score Student', 'icon': '🏆', 'focus': 'efficiency and optimization strategies'},
            {'name': 'Private Tutor', 'icon': '🎓', 'focus': 'foundational knowledge gaps'}
        ]
        
        for round_num in range(3):  # 3 rounds of discussion
            for agent in agent_personas:
                discussion_point = {
                    'agent': agent['name'],
                    'icon': agent['icon'],
                    'message': f"Round {round_num + 1}: Analyzing student performance from {agent['focus']} perspective. Evaluating answer accuracy and learning patterns...",
                    'timestamp': dt.now().isoformat(),
                    'round': round_num + 1
                }
                
                yield f"data: {json.dumps(discussion_point)}\\n\\n"
                time.sleep(1)  # 1 second between messages for realistic pacing
                    
    return Response(generate_discussion(), mimetype='text/event-stream')

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