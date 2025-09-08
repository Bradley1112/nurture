"""
Validation utilities for Nurture Backend
"""
import re
from typing import Dict, Any, List


def validate_quiz_answer(answer: Dict[str, Any]) -> bool:
    """Validate quiz answer structure"""
    required_fields = ['topic', 'difficulty', 'isCorrect', 'timeSpent', 'questionId']
    return all(field in answer for field in required_fields)


def validate_quiz_results(quiz_results: Dict[str, Any]) -> bool:
    """Validate quiz results structure"""
    if 'answers' not in quiz_results or not isinstance(quiz_results['answers'], list):
        return False
    
    return all(validate_quiz_answer(answer) for answer in quiz_results['answers'])


def validate_topic_name(topic: str) -> bool:
    """Validate topic name format"""
    if not topic or not isinstance(topic, str):
        return False
    
    # Allow alphanumeric, spaces, colons, and hyphens
    pattern = r'^[A-Za-z0-9\s:\-]+$'
    return bool(re.match(pattern, topic))


def validate_difficulty_level(difficulty: str) -> bool:
    """Validate difficulty level"""
    valid_levels = ['very_easy', 'easy', 'medium', 'hard', 'very_hard']
    return difficulty.lower() in valid_levels