"""
Agentic AI Services
Multi-agent collaboration for educational evaluation and content generation
"""

from .evaluation import MeshAgenticEvaluationService
from .quiz_generation import EvaluationQuizAgent

# Import TimeLimitedStrandsEvaluationService from the original location
try:
    import sys
    import os
    # Add parent directory to path to import from original agenticEvaluation.py
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from agenticEvaluation import TimeLimitedStrandsEvaluationService
    TIME_LIMITED_AVAILABLE = True
except ImportError as e:
    print(f"Warning: TimeLimitedStrandsEvaluationService not available: {e}")
    TimeLimitedStrandsEvaluationService = None
    TIME_LIMITED_AVAILABLE = False

__all__ = [
    'MeshAgenticEvaluationService',
    'EvaluationQuizAgent', 
    'TimeLimitedStrandsEvaluationService',
    'TIME_LIMITED_AVAILABLE'
]