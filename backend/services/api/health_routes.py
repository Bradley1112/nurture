"""
Health Check and System Status Routes
"""

from flask import Blueprint, jsonify
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

health_blueprint = Blueprint('health', __name__)

@health_blueprint.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        from services.agentic import TIME_LIMITED_AVAILABLE
        agent_status = 'AWS Strands SDK Ready' if TIME_LIMITED_AVAILABLE else 'Fallback Mode'
        
        return jsonify({
            'status': 'healthy',
            'service': 'Nurture Backend API',
            'timestamp': datetime.now().isoformat(),
            'agentic_system': agent_status,
            'strands_available': TIME_LIMITED_AVAILABLE,
            'version': '1.0.0'
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@health_blueprint.route('/api/subjects', methods=['GET'])
def get_subjects():
    """Get available subjects and topics for quiz selection"""
    try:
        from services.agentic import EvaluationQuizAgent, TIME_LIMITED_AVAILABLE
        
        if TIME_LIMITED_AVAILABLE:
            try:
                quiz_agent = EvaluationQuizAgent()
                subjects_data = []
                for subject in quiz_agent.subjects:
                    subjects_data.append({
                        'name': subject.name,
                        'syllabus': subject.syllabus,
                        'icon': subject.icon,
                        'topics': subject.topics,
                        'description': subject.description
                    })
            except Exception as e:
                logger.warning(f"Failed to initialize quiz agent: {e}")
                subjects_data = get_fallback_subjects()
        else:
            subjects_data = get_fallback_subjects()
        
        return jsonify({
            'subjects': subjects_data,
            'status': 'success',
            'using_strands': TIME_LIMITED_AVAILABLE
        })
        
    except Exception as e:
        logger.error(f"Error getting subjects: {e}")
        return jsonify({'error': str(e)}), 500

def get_fallback_subjects():
    """Fallback subjects when Strands SDK is not available"""
    return [
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