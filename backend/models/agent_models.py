"""
AI agent and evaluation data models
"""
from dataclasses import dataclass


@dataclass
class AgentPersona:
    """AI agent persona definition"""
    name: str
    persona: str
    focus: str
    icon: str


@dataclass
class ExpertiseLevel:
    """Student expertise level definition"""
    level: str
    criteria: str
    focus: str
    color: str
    icon: str