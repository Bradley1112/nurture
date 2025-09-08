"""
Study session and learning data models
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Any, Optional


@dataclass 
class StudySession:
    """Study session metadata"""
    session_id: str
    user_id: str
    topic: str
    start_time: datetime
    end_time: Optional[datetime] = None
    performance_score: Optional[float] = None
    
    
@dataclass
class LearningObjective:
    """Learning objective with progress tracking"""
    objective_id: str
    description: str
    topic: str
    difficulty: str
    completed: bool = False
    mastery_level: float = 0.0