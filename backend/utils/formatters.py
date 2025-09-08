"""
Data formatting utilities for Nurture Backend
"""
from typing import Dict, Any, List
from datetime import datetime


def format_timestamp(timestamp: datetime) -> str:
    """Format timestamp for API responses"""
    return timestamp.isoformat()


def format_quiz_question(question_data: Dict[str, Any]) -> Dict[str, Any]:
    """Format question data for API response"""
    return {
        'id': question_data.get('id', ''),
        'question': question_data.get('question', ''),
        'options': question_data.get('options'),
        'difficulty': question_data.get('difficulty', 'medium'),
        'topic': question_data.get('topic', ''),
        'type': question_data.get('type', 'mcq')
    }


def format_evaluation_summary(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Format evaluation metrics for API response"""
    return {
        'total_questions': metrics.get('total_questions', 0),
        'total_correct': metrics.get('total_correct', 0),
        'accuracy': round((metrics.get('total_correct', 0) / max(metrics.get('total_questions', 1), 1)) * 100),
        'average_time': round(metrics.get('average_time_per_question', 0) / 1000)  # Convert to seconds
    }


def format_error_response(error_message: str, status_code: int = 500) -> Dict[str, Any]:
    """Format error response for API"""
    return {
        'error': True,
        'message': error_message,
        'status_code': status_code,
        'timestamp': format_timestamp(datetime.now())
    }