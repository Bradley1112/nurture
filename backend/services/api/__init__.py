"""
API Route Handlers
Organized Flask route blueprints for different service endpoints
"""

from .quiz_routes import quiz_blueprint
from .evaluation_routes import evaluation_blueprint
from .health_routes import health_blueprint

__all__ = [
    'quiz_blueprint',
    'evaluation_blueprint', 
    'health_blueprint'
]