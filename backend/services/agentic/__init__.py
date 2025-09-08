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
    from .optimized_evaluation import OptimizedMeshEvaluationService
except Exception:
    OptimizedMeshEvaluationService = None

try:
    from .quiz_generation import EvaluationQuizAgent
except Exception:
    EvaluationQuizAgent = None

# Use optimized evaluation service as TimeLimitedStrandsEvaluationService
try:
    from .optimized_evaluation import OptimizedMeshEvaluationService as TimeLimitedStrandsEvaluationService
    TIME_LIMITED_AVAILABLE = True
except Exception as e:
    print(f"Warning: TimeLimitedStrandsEvaluationService not available: {e}")
    TimeLimitedStrandsEvaluationService = None
    TIME_LIMITED_AVAILABLE = False

__all__ = [
    'MeshAgenticEvaluationService',
    'OptimizedMeshEvaluationService',
    'EvaluationQuizAgent', 
    'TimeLimitedStrandsEvaluationService',
    'TIME_LIMITED_AVAILABLE'
]