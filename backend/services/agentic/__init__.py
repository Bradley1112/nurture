"""
Agentic AI Services
Multi-agent collaboration for educational evaluation and content generation
"""

# Conditional imports to avoid hanging on missing dependencies
try:
    from .evaluation import MeshAgenticEvaluationService
except Exception:
    MeshAgenticEvaluationService = None

try:
    from .quiz_generation import EvaluationQuizAgent
except Exception:
    EvaluationQuizAgent = None

# Import TimeLimitedStrandsEvaluationService from the original location
try:
    import sys
    import os
    # Add parent directory to path to import from original agenticEvaluation.py
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from agenticEvaluation import TimeLimitedStrandsEvaluationService
    TIME_LIMITED_AVAILABLE = True
except Exception as e:
    print(f"Warning: TimeLimitedStrandsEvaluationService not available: {e}")
    TimeLimitedStrandsEvaluationService = None
    TIME_LIMITED_AVAILABLE = False

__all__ = [
    'MeshAgenticEvaluationService',
    'EvaluationQuizAgent', 
    'TimeLimitedStrandsEvaluationService',
    'TIME_LIMITED_AVAILABLE'
]