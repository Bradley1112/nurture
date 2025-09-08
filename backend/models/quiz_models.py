"""
Quiz and question data models
"""
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class Subject:
    """Singapore O-Level subject definition"""
    name: str
    syllabus: str
    icon: str
    topics: List[str]
    description: str


@dataclass
class Question:
    """Quiz question with metadata"""
    id: str
    topic: str
    subject: str
    difficulty: str
    type: str
    question: str
    options: Optional[List[str]]
    correct_answer: str
    explanation: str


@dataclass
class QuizAnswer:
    """Student's answer to a quiz question"""
    topic: str
    difficulty: str
    is_correct: bool
    time_spent: int
    question_id: str
    answer_given: str
    correct_answer: str