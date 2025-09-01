"""
Nurture Backend API - Reorganized and Clean
Main Flask application with organized service architecture
"""

from flask import Flask
from flask_cors import CORS
import logging
import os

# AWS credentials will be loaded from environment variables or AWS credentials file
# Remove hardcoded credentials for security

# Import configuration
from config import get_config

# Import API blueprints
from services.api import health_blueprint, quiz_blueprint, evaluation_blueprint

# Import study session blueprint
try:
    from services.api.study_session_routes import study_session_blueprint
    STUDY_SESSION_ROUTES_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Study session routes not available: {e}")
    STUDY_SESSION_ROUTES_AVAILABLE = False
    study_session_blueprint = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    """Application factory pattern"""
    
    # Initialize Flask app
    app = Flask(__name__)
    
    # Load configuration
    config = get_config()
    app.config.from_object(config)
    
    # Validate configuration
    try:
        config.validate_config()
    except ValueError as e:
        logger.warning(f"Configuration validation warning: {e}")
    
    # Enable CORS for React frontend
    CORS(app, origins=config.CORS_ORIGINS)
    
    # Register blueprints
    app.register_blueprint(health_blueprint)
    app.register_blueprint(quiz_blueprint)
    app.register_blueprint(evaluation_blueprint)
    
    # Register study session blueprint if available
    if STUDY_SESSION_ROUTES_AVAILABLE:
        app.register_blueprint(study_session_blueprint)
        logger.info("✅ Study session routes registered (AWS Strands Agent Graph)")
    else:
        logger.warning("⚠️ Study session routes not available - running without Part 7 functionality")
    
    # Add additional routes
    register_additional_routes(app)
    
    logger.info(f"✅ Nurture Backend API initialized in {config.ENV} mode")
    return app

def register_additional_routes(app):
    """Register additional routes that don't fit into blueprints"""
    
    @app.route('/api/study-plan', methods=['POST'])
    def generate_study_plan():
        """Generate personalized study plan using the three AI agents"""
        from flask import request, jsonify
        
        try:
            data = request.get_json()
            expertise_levels = data.get('expertise_levels', {})
            target_exam_date = data.get('target_exam_date')
            
            # This would integrate with the sophisticated study plan agents
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
        from flask import request, jsonify
        from datetime import datetime
        
        try:
            data = request.get_json()
            session_config = data.get('session_config', {})
            
            # This would integrate with the sophisticated study session agents
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

# Fallback quiz generation function for backward compatibility
def generate_fallback_quiz(selected_topics, session_id):
    """Generate fallback quiz when Strands SDK is not available"""
    from flask import jsonify
    
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
            # Add more questions as needed...
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
            # Add more questions as needed...
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
            # Add more questions as needed...
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

# Create the Flask app
app = create_app()

if __name__ == '__main__':
    # Run the Flask app
    config = get_config()
    
    logger.info(f"Starting Nurture Backend API on {config.HOST}:{config.PORT}")
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )