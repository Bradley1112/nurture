"""
AWS Strands Study Session Service - Part 7 Implementation

This service implements the Star Topology Agent Graph for study sessions:
- Central Orchestrator Agent: Makes decisions about learning/practice blend
- Specialized Agents: Teacher, Tutor, Perfect Scorer
- Real-time chat interface powered by AWS Strands SDK

Architecture:
1. Student enters chatbot interface
2. Orchestrator analyzes profile and creates session plan
3. Orchestrator calls appropriate agents dynamically based on student input
4. Agents provide specialized responses using their tools
5. Session data tracked for Part 8 re-evaluation
"""

import json
import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, AsyncGenerator
from dataclasses import dataclass, asdict
import os

# AWS Strands SDK imports
try:
    from strands import Agent, tool
    from strands.models import BedrockModel  # For non-streaming configuration
    from strands_tools import use_aws  # Available AWS tools
    STRANDS_AVAILABLE = True
except ImportError as e:
    logging.warning(f"AWS Strands SDK not available: {e}")
    STRANDS_AVAILABLE = False
    Agent = None
    tool = None
    runtime = None
    swarm = None
    BedrockModel = None

logger = logging.getLogger(__name__)

@dataclass
class SessionContext:
    """Context passed to all agents"""
    user_id: str
    topic_id: str
    subject_id: str
    expertise_level: str
    focus_level: int
    stress_level: int
    session_duration: int
    exam_date: Optional[str] = None
    session_id: Optional[str] = None
    topic_progress: Optional[Dict[str, Any]] = None  # ADDED: Topic progression context (accepts topicProgress from frontend)

@dataclass
class SessionPlan:
    """Orchestrator's session strategy"""
    strategy: str
    learning_ratio: int
    practice_ratio: int
    primary_agent: str
    intensity: str
    initial_mode: str
    time_to_exam: int
    adaptive_factors: Dict[str, bool]

@dataclass
class AgentMessage:
    """Message from an agent"""
    agent_id: str
    content: str
    metadata: Dict[str, Any]
    timestamp: datetime
    agent_tools_used: List[str] = None

@dataclass
class SessionData:
    """Complete session tracking data"""
    session_id: str
    context: SessionContext
    session_plan: SessionPlan
    messages: List[Dict[str, Any]]
    agent_interactions: List[Dict[str, Any]]
    orchestrator_decisions: List[Dict[str, Any]]
    student_progress: Dict[str, Any]
    start_time: datetime
    last_updated: datetime
    current_agent: Optional[str] = None
    current_mode: Optional[str] = None

class StudySessionOrchestrator:
    """
    Central Orchestrator Agent - Star Topology Hub
    
    Responsibilities:
    - Analyze student profile and create optimal session plan
    - Route student messages to appropriate specialized agents
    - Make real-time decisions about learning/practice blend
    - Coordinate all agent interactions
    - Track session progress for expertise re-evaluation
    """
    
    def __init__(self):
        self.agent = None
        self.specialized_agents = {}
        self.active_sessions = {}
        
        if STRANDS_AVAILABLE:
            self._initialize_orchestrator_agent()
            self._initialize_specialized_agents()
        else:
            logger.warning("AWS Strands not available - running in simulation mode")

    def _initialize_orchestrator_agent(self):
        """Initialize the central orchestrator agent"""
        
        @tool
        async def analyze_student_profile(
            expertise_level: str,
            focus_level: int,
            stress_level: int,
            time_to_exam: int
        ) -> Dict[str, Any]:
            """Analyze student profile and create optimal session strategy"""
            
            # Decision matrix based on multiple factors
            strategy = ""
            learning_ratio = 50
            practice_ratio = 50
            primary_agent = "teacher"
            intensity = "moderate"
            initial_mode = "learning"

            # Expertise-based decisions
            if expertise_level == "beginner":
                strategy = "Foundation Building"
                learning_ratio = 80
                practice_ratio = 20
                primary_agent = "tutor"  # Socratic method for beginners
                initial_mode = "learning"
            elif expertise_level == "apprentice":
                strategy = "Concept Application"
                learning_ratio = 60
                practice_ratio = 40
                primary_agent = "teacher"
                initial_mode = "learning"
            elif expertise_level == "pro":
                strategy = "Skill Refinement"
                learning_ratio = 40
                practice_ratio = 60
                primary_agent = "teacher"  # More practice questions
                initial_mode = "practice"
            else:  # grandmaster
                strategy = "Mastery Validation"
                learning_ratio = 20
                practice_ratio = 80
                primary_agent = "perfect_scorer"  # Peer simulation
                initial_mode = "practice"

            # Stress/Focus adjustments
            if stress_level > 4:
                primary_agent = "perfect_scorer"  # Wellbeing focus
                intensity = "gentle"
                learning_ratio += 20  # More learning, less pressure
                practice_ratio -= 20
            elif focus_level < 2:
                primary_agent = "perfect_scorer"  # Visual aids help
                intensity = "engaging"

            # Time pressure adjustments
            if time_to_exam < 30:  # Less than 30 days
                strategy += " (Exam Focused)"
                practice_ratio += 20  # More practice
                learning_ratio -= 20
                intensity = "intensive"

            # Ensure ratios are valid
            practice_ratio = 100 - learning_ratio

            return {
                "strategy": strategy,
                "learning_ratio": learning_ratio,
                "practice_ratio": practice_ratio,
                "primary_agent": primary_agent,
                "intensity": intensity,
                "initial_mode": initial_mode,
                "time_to_exam": time_to_exam,
                "adaptive_factors": {
                    "expertise_based": True,
                    "stress_considered": stress_level > 7,
                    "focus_optimized": focus_level < 4,
                    "exam_pressure": time_to_exam < 30
                }
            }

        @tool
        async def route_student_message(message: str, session_context: Dict[str, Any]) -> Dict[str, str]:
            """Determine which agent to call based on student message"""
            
            msg = message.lower()
            current_agent = session_context.get("current_agent")
            current_mode = session_context.get("current_mode", "learning")
            
            # Start command
            if "start" in msg or "begin" in msg:
                return {
                    "agent": session_context.get("primary_agent", "teacher"),
                    "mode": session_context.get("initial_mode", "learning"),
                    "reason": "student_ready",
                    "orchestrator_message": f"Perfect! Let me connect you with the {session_context.get('primary_agent', 'teacher')} to begin."
                }
            
            # Check for explicit agent switching keywords
            # Question keywords - switch to teacher
            if any(word in msg for word in ["question", "practice", "test", "exam"]):
                if current_agent != "teacher" or current_mode != "practice":
                    return {
                        "agent": "teacher",
                        "mode": "practice",
                        "reason": "student_wants_practice",
                        "orchestrator_message": "I'll get the Teacher to prepare a practice question for you!"
                    }
                else:
                    # Already with teacher in practice mode, continue
                    return {
                        "agent": "teacher",
                        "mode": "practice",
                        "reason": "continue_conversation",
                        "orchestrator_message": ""
                    }
            
            # Explanation keywords - switch to tutor (but respect stress-level agent selection)
            if any(word in msg for word in ["explain", "understand", "confused", "help", "clarify"]):
                # If student has high stress (primary agent is perfect_scorer), keep them with perfect_scorer
                # for wellbeing-focused explanations instead of switching to tutor
                if session_context.get("primary_agent") == "perfect_scorer":
                    if current_agent != "perfect_scorer" or current_mode != "learning":
                        return {
                            "agent": "perfect_scorer",
                            "mode": "learning", 
                            "reason": "high_stress_student_needs_gentle_clarification",
                            "orchestrator_message": "Let me keep you with the Perfect Scorer for gentle, visual explanations that won't add to your stress."
                        }
                    else:
                        return {
                            "agent": "perfect_scorer",
                            "mode": "learning",
                            "reason": "continue_conversation",
                            "orchestrator_message": ""
                        }
                # For non-stressed students, use tutor as normal
                elif current_agent != "tutor" or current_mode != "learning":
                    return {
                        "agent": "tutor",
                        "mode": "learning",
                        "reason": "student_needs_clarification",
                        "orchestrator_message": "Let me bring in the Tutor to help clarify this concept."
                    }
                else:
                    # Already with tutor in learning mode, continue
                    return {
                        "agent": "tutor",
                        "mode": "learning",
                        "reason": "continue_conversation",
                        "orchestrator_message": ""
                    }
            
            # Visual/memory keywords - switch to perfect_scorer
            if any(word in msg for word in ["visual", "remember", "memorize", "diagram", "mind map", "mnemonic"]):
                if current_agent != "perfect_scorer" or current_mode != "learning":
                    return {
                        "agent": "perfect_scorer",
                        "mode": "learning",
                        "reason": "student_wants_visual_learning",
                        "orchestrator_message": "Great idea! The Perfect Scorer will create visual aids to help you remember this."
                    }
                else:
                    # Already with perfect_scorer in learning mode, continue
                    return {
                        "agent": "perfect_scorer",
                        "mode": "learning",
                        "reason": "continue_conversation",
                        "orchestrator_message": ""
                    }
            
            # Default: Continue with current agent and mode (AGENT CONTINUITY)
            return {
                "agent": current_agent or session_context.get("primary_agent", "teacher"),
                "mode": current_mode,
                "reason": "continue_conversation",
                "orchestrator_message": ""
            }

        @tool   
        async def reassess_session_progress(
            student_progress: Dict[str, Any],
            session_plan: Dict[str, Any]
        ) -> Dict[str, Any]:
            """Reassess session and make adaptive decisions"""
            
            concepts_learned = student_progress.get("concepts_learned", 0)
            accuracy = student_progress.get("accuracy", 0)
            engagement = student_progress.get("engagement_score", 100)
            
            decisions = []
            
            # Switch to practice if student has learned enough concepts
            if concepts_learned >= 3 and session_plan.get("current_mode") == "learning":
                decisions.append({
                    "type": "mode_switch",
                    "from": "learning",
                    "to": "practice",
                    "reason": "sufficient_concept_mastery"
                })
            
            # Switch agents if engagement is low
            if engagement < 60:
                decisions.append({
                    "type": "agent_switch", 
                    "reason": "low_engagement",
                    "suggested_agent": "perfect_scorer"  # More engaging visuals
                })
            
            # Increase practice if accuracy is high
            if accuracy > 80:
                decisions.append({
                    "type": "difficulty_increase",
                    "reason": "high_performance",
                    "action": "more_challenging_content"
                })
            
            return {
                "decisions": decisions,
                "should_adapt": len(decisions) > 0,
                "confidence": min(100, max(0, (accuracy + engagement) / 2))
            }

        # ORIGINAL CODE - COMMENTED OUT DUE TO STRANDS SDK COMPATIBILITY
        # @Agent
        # class StudyOrchestrator:
        #     """Study Orchestrator - the central hub of a study session agent graph.
        #     
        #     Primary responsibilities:
        #     1. Analyze student profiles (expertise, focus, stress levels) and create optimal session plans
        #     2. Route student messages to appropriate specialized agents (Teacher, Tutor, Perfect Scorer)
        #     3. Make real-time decisions about learning/practice balance
        #     4. Coordinate all agent interactions for a seamless experience
        #     5. Track session progress and adapt strategy as needed
        #     
        #     Manages three specialized agents:
        #     - Teacher Agent: Content delivery and exam-style questions
        #     - Tutor Agent: Socratic questioning and answer techniques  
        #     - Perfect Scorer Agent: Visual aids and student wellbeing
        #     
        #     Always explain your reasoning when making decisions. Be encouraging and supportive.
        #     Focus on Singapore O-Level curriculum standards.
        #     """
        #     
        #     def __init__(self):
        #         self.analyze_student_profile = analyze_student_profile
        #         self.route_student_message = route_student_message 
        #         self.reassess_session_progress = reassess_session_progress
        # 
        # self.agent = StudyOrchestrator()

        # Store tool references for later use
        self.analyze_student_profile = analyze_student_profile
        self.route_student_message = route_student_message
        self.reassess_session_progress = reassess_session_progress

        # WORKING VERSION - Compatible with current Strands SDK
        # Use BedrockModel with streaming explicitly disabled for inference profile models
        from strands.models import BedrockModel
        orchestrator_bedrock_model = BedrockModel(
            model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
            streaming=False  # CRITICAL: Inference profile models don't support ConverseStream
        )
        self.agent = Agent(
            tools=[analyze_student_profile, route_student_message, reassess_session_progress],
            model=orchestrator_bedrock_model,
            name="Study Orchestrator"
        )

    def _initialize_specialized_agents(self):
        """Initialize the three specialized agents"""
        
        # TEACHER AGENT
        @tool
        def explain_concept(
            topic: str,
            expertise_level: str,
            concept_focus: str = ""
        ) -> str:
            """Provide structured explanation of core concepts in digestible chunks"""
            
            # This would integrate with your existing syllabus content
            explanations = {
                "kinematics": """Let me explain kinematics step by step:

1. **What is Kinematics?**
   Kinematics is the study of motion without considering the forces that cause it.

2. **Key Concepts:**
   - Displacement (s): Change in position
   - Velocity (v): Rate of change of displacement
   - Acceleration (a): Rate of change of velocity

3. **Essential Equations:**
   - v = u + at
   - s = ut + ½at²
   - v² = u² + 2as

Let's start with displacement. Can you think of an example where you moved from one position to another?""",
                
                "reading_comprehension": """Reading Comprehension involves three key skills:

1. **Literal Comprehension**: What the text directly states
2. **Inferential Comprehension**: What the text implies
3. **Critical Analysis**: Author's purpose and techniques

For O-Level success, focus on:
- Identifying main ideas vs supporting details
- Understanding context clues for vocabulary
- Recognizing author's tone and purpose

Would you like to practice with a sample passage?""",
                
                "algebra": """Algebraic problem-solving follows these steps:

1. **Identify** what you're solving for
2. **Set up** the equation using given information
3. **Solve** systematically using algebraic rules
4. **Check** your answer makes sense

For linear equations: ax + b = c
- Isolate the variable by undoing operations
- Work backwards from the equals sign

Ready to try a practice problem?"""
            }
            
            return explanations.get(topic, f"Structured explanation for {topic} topic coming up...")

        @tool
        def generate_practice_question(
            topic: str,
            expertise_level: str,
            question_type: str = "structured"
        ) -> Dict[str, str]:
            """Generate Singapore O-Level style practice questions"""
            
            questions = {
                "kinematics": {
                    "beginner": {
                        "question": "A car travels 60 meters in 12 seconds at constant velocity. Calculate the car's velocity.",
                        "answer": "5 m/s",
                        "working": "v = s/t = 60m ÷ 12s = 5 m/s",
                        "technique": "Always identify what's given and what you need to find. Use the appropriate kinematic equation."
                    },
                    "apprentice": {
                        "question": "A ball is dropped from rest and falls for 3.0 seconds. Calculate: (a) its final velocity (b) the distance fallen. (g = 9.81 m/s²)",
                        "answer": "(a) 29.4 m/s (b) 44.1 m",
                        "working": "(a) v = u + at = 0 + 9.81(3) = 29.4 m/s\n(b) s = ut + ½at² = 0 + ½(9.81)(3²) = 44.1 m",
                        "technique": "For free fall: u = 0, a = g. Use appropriate equations for each part."
                    }
                },
                "reading_comprehension": {
                    "beginner": {
                        "question": "Read this passage and answer: 'The expedition failed due to unexpected weather conditions.' What was the primary reason for failure?",
                        "answer": "Unexpected weather conditions",
                        "technique": "Look for explicit statements. The answer is directly stated in the text."
                    }
                }
            }
            
            return questions.get(topic, {}).get(expertise_level, {
                "question": f"O-Level style {topic} question for {expertise_level} level",
                "answer": "Sample answer",
                "technique": "Standard O-Level answering approach"
            })

        # ORIGINAL TEACHER AGENT CODE - COMMENTED OUT DUE TO STRANDS SDK COMPATIBILITY
        # @Agent  
        # class TeacherAgent:
        #     """Teacher Agent specializing in Singapore O-Level curriculum delivery.
        #     
        #     In LEARNING mode:
        #     - Provide engaging, well-structured explanations in digestible chunks
        #     - Never content dump - break complex topics into understandable parts
        #     - Connect new concepts to previously learned material
        #     - Use real-world examples relevant to Singapore students
        #
        #     In PRACTICE mode:  
        #     - Generate curated, exam-style questions appropriate for student's expertise level
        #     - Provide complete answers with working steps
        #     - Focus on Singapore O-Level question formats and marking schemes
        #     - Always include answering techniques and exam tips
        #
        #     Priority: Ensure student completes content on time before exam with sufficient practice.
        #     """
        #     
        #     def __init__(self):
        #         self.explain_concept = explain_concept
        #         self.generate_practice_question = generate_practice_question
        # 
        # self.specialized_agents["teacher"] = TeacherAgent()

        # WORKING VERSION - Compatible with current Strands SDK
        # Pass model string directly (same as optimized_evaluation.py)
        self.specialized_agents["teacher"] = Agent(
            tools=[explain_concept, generate_practice_question],
            model="us.anthropic.claude-sonnet-4-20250514-v1:0",
            name="Teacher Agent"
        )

        # TUTOR AGENT  
        @tool
        async def ask_socratic_question(
            topic: str,
            student_response: str,
            learning_objective: str
        ) -> str:
            """Dynamically generate Socratic questions (AI-driven when possible).
            
            If Strands is available, ask the orchestrator LLM to produce a short,
            progressive set of Socratic prompts tailored to the topic and learning
            objective. Otherwise fall back to a rule-based template generator.
            """
            
            # Build a clear generation prompt
            generation_prompt = f"""
You are an expert Socratic tutor for Singapore O-Level students.
Topic: {topic}
Learning objective: {learning_objective}
Student's recent response: "{student_response}"

Task: Produce 4 concise, progressive Socratic questions that guide the student
from basic understanding to deeper insight. Number them 1-4 and keep each
question short (one sentence). Make them encouraging and scaffolded.
"""
            # Try AI-first generation when Strands/agent available
            try:
                if STRANDS_AVAILABLE and getattr(self, "agent", None):
                    result = await self.agent.invoke_async(generation_prompt)
                    ai_text = self._extract_message_text(result)
                    # Ensure a short guiding prefix similar to prior behaviour
                    return f"Let me guide you to discover this:\n\n{ai_text}"
            except Exception as e:
                logger.debug(f"AI Socratic generation failed, falling back to template: {e}")
            
            # Fallback heuristic generation (template-based)
            templates = [
                f"What do you think is the key idea behind {topic}?",
                f"Can you give a simple example that shows the concept in action?",
                f"What would happen if one of the conditions changed (for example, time or force)?",
                f"How could you check whether your explanation or answer makes sense?"
            ]
            
            # Slightly adapt templates using learning objective or student response when available
            if learning_objective:
                templates[0] = f"What part of '{learning_objective}' do you feel most confident about?"
                templates[1] = f"Can you demonstrate '{learning_objective}' with a short example?"
            
            return "Let me guide you to discover this:\n\n" + "\n".join(f"{i+1}. {q}" for i, q in enumerate(templates))

        @tool
        def provide_detailed_feedback(
            student_answer: str,
            correct_answer: str,
            topic: str,
            question_type: str
        ) -> Dict[str, str]:
            """Provide detailed feedback with O-Level answering techniques"""
            
            feedback = {
                "analysis": f"Your answer: {student_answer}\nCorrect answer: {correct_answer}",
                "explanation": "Let me explain the reasoning behind the correct answer...",
                "technique": "For O-Level success, remember to:",
                "keywords": "Key terms to include in your answer:",
                "time_management": "Exam technique: Spend 2-3 minutes on questions like this."
            }
            
            if topic == "kinematics":
                feedback.update({
                    "technique": "1. Write down given values\n2. Identify what to find\n3. Choose appropriate equation\n4. Substitute and solve\n5. Check units and reasonableness",
                    "keywords": "velocity, acceleration, displacement, time, equations of motion"
                })
            elif topic == "reading_comprehension": 
                feedback.update({
                    "technique": "1. Read question first\n2. Skim passage for relevant sections\n3. Quote directly when asked\n4. Explain inference with evidence\n5. Check word count if specified",
                    "keywords": "according to the passage, the author suggests, this implies, evidence shows"
                })
            
            return feedback

        # ORIGINAL TUTOR AGENT CODE - COMMENTED OUT DUE TO STRANDS SDK COMPATIBILITY
        # @Agent
        # class TutorAgent:
        #     """Tutor Agent focused on deep conceptual understanding through the Socratic method.
        #
        #     In LEARNING mode:
        #     - Ask interactive questions that guide students to discover insights themselves
        #     - Promote conceptual understanding over rote memorization
        #     - Build on student responses with follow-up questions
        #     - Help students make connections between concepts
        #
        #     In PRACTICE mode:
        #     - Provide detailed feedback on student answers
        #     - Include correct answers with clear explanations
        #     - Teach Singapore O-Level specific answering techniques
        #     - Focus on keyword usage, answer structure, and time management
        #     - Show how to approach similar questions systematically
        #
        #     Priority: Ensure students truly understand the topic, not just memorize it.
        #     """
        #     
        #     def __init__(self):
        #         self.ask_socratic_question = ask_socratic_question
        #         self.provide_detailed_feedback = provide_detailed_feedback
        # 
        # self.specialized_agents["tutor"] = TutorAgent()

        # WORKING VERSION - Compatible with current Strands SDK
        # Pass model string directly (same as optimized_evaluation.py)
        self.specialized_agents["tutor"] = Agent(
            tools=[ask_socratic_question, provide_detailed_feedback],
            model="us.anthropic.claude-sonnet-4-20250514-v1:0",
            name="Tutor Agent"
        )

        # PERFECT SCORER AGENT
        @tool  
        def create_visual_aid(
            topic: str,
            concept: str,
            aid_type: str = "diagram"
        ) -> Dict[str, str]:
            """Create visual learning aids including diagrams, mind maps, mnemonics"""
            
            visual_aids = {
                "kinematics": {
                    "mind_map": """
```mermaid
mindmap
  root((Kinematics))
    Motion Concepts
      Displacement (s)
      Velocity (v) 
      Acceleration (a)
    Key Equations
      v = u + at
      s = ut + ½at²
      v² = u² + 2as
    Applications
      Free Fall
      Projectile Motion
      Uniform Motion
```""",
                    "mnemonic": "**SUV-AT** - Remember the kinematic equations with 'SUV AT':\n- **S** = ut + ½at² (displacement)\n- **U** = initial velocity\n- **V** = final velocity  \n- **A** = acceleration\n- **T** = time",
                    "diagram": "Velocity-Time Graph:\n↑ Velocity\n│   /\n│  /  ← slope = acceleration\n│ /\n│/\n└─────→ Time\nArea under curve = displacement"
                },
                "reading_comprehension": {
                    "mind_map": """
```mermaid
mindmap
  root((Reading Comprehension))
    Question Types
      Literal
        Direct facts
        Explicit information
      Inferential  
        Implied meaning
        Context clues
      Critical
        Author's purpose
        Tone analysis
    Answering Strategy
      Read questions first
      Skim for keywords
      Quote with evidence
      Check word limits
```""",
                    "mnemonic": "**RICE** for Reading Comprehension:\n- **R**ead questions first\n- **I**dentify key information\n- **C**onnect evidence to answer\n- **E**xplain with quotes"
                }
            }
            
            aids = visual_aids.get(topic, {})
            return {
                "visual_aid": aids.get(aid_type, f"Visual aid for {concept}"),
                "type": aid_type,
                "topic": topic,
                "usage_tip": "Review this visual aid before practice questions to reinforce understanding."
            }

        @tool
        def simulate_peer_study(
            topic: str,
            concept: str,
            student_explanation: str = ""
        ) -> str:
            """Simulate peer study session for active recall"""
            
            peer_prompts = {
                "kinematics": "Pretend I'm your study buddy who's confused about acceleration. Explain to me the difference between velocity and acceleration using a real-world example.",
                "reading_comprehension": "I'm struggling with inference questions. Explain to me how you identify what the author is implying without directly stating.",
                "algebra": "Walk me through your problem-solving approach. How do you decide which method to use for different equation types?"
            }
            
            return f"""🎓 **Peer Study Mode Activated**

{peer_prompts.get(topic, f"Explain {concept} to me as if I'm your study partner.")}

Remember: Teaching others is the best way to test your own understanding!

After you explain, I'll give you feedback on your explanation and we can discuss any unclear points."""

        @tool
        def check_wellbeing(
            stress_level: int,
            focus_level: int,
            session_duration: int
        ) -> Dict[str, Any]:
            """Monitor student wellbeing and suggest adjustments"""
            
            recommendations = []
            
            if stress_level > 7:
                recommendations.extend([
                    "Take 3 deep breaths before continuing",
                    "Remember: it's okay to make mistakes - that's how we learn",
                    "Focus on understanding, not perfection"
                ])
            
            if focus_level < 4:
                recommendations.extend([
                    "Let's switch to more visual/interactive content",
                    "Take a 2-minute movement break",
                    "Try the Pomodoro technique for better focus"
                ])
            
            if session_duration > 45:
                recommendations.append("Consider taking a longer break soon - your brain needs rest to consolidate learning")
            
            return {
                "wellbeing_score": max(0, min(10, 10 - (stress_level - focus_level))),
                "recommendations": recommendations,
                "suggested_break": stress_level > 6 or focus_level < 3,
                "encouragement": "You're doing great! Learning is a process, and every step counts. 🌱"
            }

        # ORIGINAL PERFECT SCORER AGENT CODE - COMMENTED OUT DUE TO STRANDS SDK COMPATIBILITY
        # @Agent
        # class PerfectScorerAgent:
        #     """Perfect Scorer Agent focused on visual learning aids and student wellbeing.
        #
        #     In LEARNING mode:
        #     - Create diagrams, mind maps, and visual representations (using Mermaid when appropriate)  
        #     - Generate mnemonics and memory aids
        #     - Use chunking and logical grouping for information organization
        #     - Provide multiple visual learning modalities
        #
        #     In PRACTICE mode:
        #     - Simulate peer study sessions
        #     - Prompt students to explain concepts back in their own words
        #     - Facilitate active recall and self-testing
        #     - Provide feedback on student explanations
        #
        #     Always prioritize student mental and physical wellbeing:
        #     - Monitor stress and fatigue levels
        #     - Suggest breaks when needed
        #     - Provide encouragement and positive reinforcement
        #     - Consider individual learning preferences
        #     """
        #     
        #     def __init__(self):
        #         self.create_visual_aid = create_visual_aid
        #         self.simulate_peer_study = simulate_peer_study
        #         self.check_wellbeing = check_wellbeing
        # 
        # self.specialized_agents["perfect_scorer"] = PerfectScorerAgent()

        # WORKING VERSION - Compatible with current Strands SDK
        # Pass model string directly (same as optimized_evaluation.py)
        self.specialized_agents["perfect_scorer"] = Agent(
            tools=[create_visual_aid, simulate_peer_study, check_wellbeing],
            model="us.anthropic.claude-sonnet-4-20250514-v1:0",
            name="Perfect Scorer Agent"
        )

    async def initialize_session(self, context: SessionContext) -> SessionData:
        """Initialize a new study session with orchestrator analysis"""
        
        session_id = f"session_{context.user_id}_{int(time.time())}"
        
        # Calculate time to exam
        time_to_exam = 90  # Default 90 days
        if context.exam_date:
            try:
                exam_date = datetime.fromisoformat(context.exam_date)
                time_to_exam = max(1, (exam_date - datetime.now()).days)
            except:
                pass

        # Use orchestrator to analyze profile and create session plan
        if STRANDS_AVAILABLE and self.agent:
            try:
                # Use orchestrator's analysis tool
                plan_data = await self.analyze_student_profile(
                    expertise_level=context.expertise_level,
                    focus_level=context.focus_level,
                    stress_level=context.stress_level,
                    time_to_exam=time_to_exam
                )
                
                session_plan = SessionPlan(**plan_data)
            except Exception as e:
                logger.error(f"Orchestrator analysis failed: {e}")
                # Fallback plan
                session_plan = self._create_fallback_plan(context)
        else:
            session_plan = self._create_fallback_plan(context)

        # Initialize session data
        session_data = SessionData(
            session_id=session_id,
            context=context,
            session_plan=session_plan,
            messages=[],
            agent_interactions=[],
            orchestrator_decisions=[],
            student_progress={
                "concepts_learned": 0,
                "questions_answered": 0,
                "correct_answers": 0,
                "engagement_score": 100,
                "current_streak": 0
            },
            start_time=datetime.now(),
            last_updated=datetime.now(),
            current_agent=session_plan.primary_agent,
            current_mode=session_plan.initial_mode
        )
        
        self.active_sessions[session_id] = session_data
        
        # Add properly formatted welcome message
        welcome_msg = f"""🎯 Study Session Initialized!

My Analysis:
• Topic: {context.topic_id.replace('_', ' ')} ({context.subject_id})
• Your Level: {context.expertise_level}
• Strategy: {session_plan.strategy}
• Focus: {session_plan.learning_ratio}% learning, {session_plan.practice_ratio}% practice
• Primary Agent: {session_plan.primary_agent.replace('_', ' ').title()}

I'll coordinate between Teacher, Tutor, and Perfect Scorer agents to optimize your learning experience.

Ready to begin? Type 'start' or ask any questions about the topic!"""
        
        session_data.messages.append({
            "id": f"msg_{int(time.time())}_welcome",
            "sender": "orchestrator",
            "content": welcome_msg,
            "timestamp": datetime.now().isoformat()
        })
        
        return session_data

    def _create_fallback_plan(self, context: SessionContext) -> SessionPlan:
        """Create fallback session plan when orchestrator is unavailable"""
        
        if context.expertise_level == "beginner":
            return SessionPlan(
                strategy="Foundation Building",
                learning_ratio=80,
                practice_ratio=20, 
                primary_agent="tutor",
                intensity="gentle",
                initial_mode="learning",
                time_to_exam=90,
                adaptive_factors={"fallback_mode": True}
            )
        else:
            return SessionPlan(
                strategy="Balanced Learning",
                learning_ratio=60,
                practice_ratio=40,
                primary_agent="teacher", 
                intensity="moderate",
                initial_mode="learning",
                time_to_exam=90,
                adaptive_factors={"fallback_mode": True}
            )

    async def process_student_message(
        self, 
        session_id: str, 
        message: str
    ) -> Dict[str, Any]:
        """Process student message and return agent response"""
        
        if session_id not in self.active_sessions:
            return {"error": "Session not found"}
        
        session_data = self.active_sessions[session_id]
        
        # Add student message
        student_msg = {
            "id": f"msg_{int(time.time())}",
            "sender": "student", 
            "content": message,
            "timestamp": datetime.now().isoformat()
        }
        session_data.messages.append(student_msg)
        
        # Use orchestrator to route message
        if STRANDS_AVAILABLE and self.agent:
            try:
                # Get routing decision from orchestrator
                session_context = {
                    **asdict(session_data.session_plan),
                    "current_agent": session_data.current_agent,
                    "current_mode": session_data.current_mode
                }
                routing = await self.route_student_message(
                    message=message,
                    session_context=session_context
                )
                
                agent_id = routing["agent"]
                mode = routing["mode"]
                reason = routing["reason"]
                orchestrator_msg = routing.get("orchestrator_message", "")
                
                # Update current agent and mode tracking
                session_data.current_agent = agent_id
                session_data.current_mode = mode
                
                # Add orchestrator message if provided
                if orchestrator_msg:
                    orch_msg = {
                        "id": f"msg_{int(time.time())}_orch",
                        "sender": "orchestrator",
                        "content": orchestrator_msg, 
                        "timestamp": datetime.now().isoformat()
                    }
                    session_data.messages.append(orch_msg)
                
                # Call the appropriate specialized agent
                agent_response = await self._call_specialized_agent(
                    session_data, agent_id, mode, message
                )
                
                # Log orchestrator decision
                session_data.orchestrator_decisions.append({
                    "timestamp": datetime.now().isoformat(),
                    "type": "agent_routing",
                    "data": {
                        "selected_agent": agent_id,
                        "mode": mode,
                        "reason": reason,
                        "student_message": message
                    }
                })
                
                return {
                    "success": True,
                    "messages": session_data.messages[-2:] if orchestrator_msg else [session_data.messages[-1]],
                    "agent_response": agent_response
                }
                
            except Exception as e:
                logger.error(f"Orchestrator routing failed: {e}")
                return {"error": f"Orchestrator error: {str(e)}"}
        
        else:
            # Fallback routing without orchestrator
            agent_id = "teacher"  # Default fallback
            mode = "learning"
            
            # Update current agent and mode tracking
            session_data.current_agent = agent_id
            session_data.current_mode = mode
            
            agent_response = await self._call_specialized_agent(
                session_data, agent_id, mode, message
            )
            
            return {
                "success": True,
                "messages": [session_data.messages[-1]],
                "agent_response": agent_response
            }

    def _extract_message_text(self, result) -> str:
        """Extract plain text from agent response message"""
        try:
            # Try multiple extraction patterns
            if hasattr(result.message, 'content') and hasattr(result.message.content, 'content'):
                return result.message.content.content[0].text
            elif hasattr(result.message, 'content') and isinstance(result.message.content, list):
                return result.message.content[0].get('text', str(result.message))
            elif hasattr(result.message, 'content') and isinstance(result.message.content, str):
                return result.message.content
            elif isinstance(result.message, dict) and 'content' in result.message:
                content = result.message['content']
                if isinstance(content, list) and len(content) > 0:
                    return content[0].get('text', str(result.message))
                else:
                    return str(content)
            else:
                return str(result.message)
        except Exception as e:
            return f"Response received but could not extract text: {str(result.message)[:200]}..."

    async def _call_specialized_agent(
        self,
        session_data: SessionData,
        agent_id: str,
        mode: str,
        student_message: str
    ) -> Dict[str, Any]:
        """Call a specialized agent and return response"""

        logger.info(f"🤖 Calling specialized agent: {agent_id} in {mode} mode")

        if agent_id not in self.specialized_agents:
            logger.error(f"❌ Agent {agent_id} not found in specialized_agents")
            return {"error": f"Agent {agent_id} not found"}

        agent = self.specialized_agents[agent_id]
        context = session_data.context

        logger.info(f"📋 Agent context: topic={context.topic_id}, expertise={context.expertise_level}")

        try:
            if STRANDS_AVAILABLE:
                logger.info(f"✅ Strands SDK available - using agent tools")
                logger.info(f"🔧 Agent has {len(agent.tools) if hasattr(agent, 'tools') else 0} tools available")

                # Use appropriate agent tool based on mode
                if agent_id == "teacher":
                    if mode == "learning":
                        logger.info(f"📚 Teacher agent: explaining concept for {context.topic_id}")

                        # ADDED: Extract progression context
                        covered_subtopics = []
                        last_subtopic = None

                        logger.info(f"🔍 Checking for topic_progress in context...")
                        logger.info(f"   context.topic_progress = {context.topic_progress}")

                        if context.topic_progress:
                            covered_subtopics = context.topic_progress.get('coveredSubtopics', [])
                            last_subtopic = context.topic_progress.get('lastSubtopic')
                            logger.info(f"✅ Found progression data:")
                            logger.info(f"   - Covered: {covered_subtopics}")
                            logger.info(f"   - Last: {last_subtopic}")
                        else:
                            logger.warning(f"⚠️ No topic_progress found in context!")

                        progression_guidance = ""
                        if covered_subtopics:
                            progression_guidance = f"""
**Previous Learning Progress:**
- Already covered: {', '.join([s.replace('_', ' ') for s in covered_subtopics])}
- Last session ended at: {last_subtopic.replace('_', ' ') if last_subtopic else 'beginning'}

**IMPORTANT**: Continue from where the student left off. Build on these covered concepts and introduce the NEXT subtopic in the natural learning progression. DO NOT restart from the beginning."""

                        # Use LLM to generate explanation instead of hardcoded responses
                        prompt = f"""You are an experienced Singapore O-Level teacher specializing in adaptive content delivery.

Topic: {context.topic_id.replace('_', ' ')}
Student expertise level: {context.expertise_level}
Student message: "{student_message}"
{progression_guidance}

**Teaching Approach:**
- Focus on ONE core concept per response
- Keep explanations concise (2-3 sentences per section)
- Adapt complexity to student's demonstrated understanding
- Address any misconceptions in the student's message first
- {"Continue the natural progression - do NOT restart from basics the student has already learned" if covered_subtopics else "Start with foundational concepts"}

**Response Structure:**
1. **What is this concept?** - One clear definition (1-2 sentences)
2. **Key Points** - Maximum 2 main points with bullet format
3. **Essential for O-Level** - One key formula/rule/fact most relevant to exams
4. **Quick Example** - One simple, worked example with clear steps

**Guidelines:**
- Keep total response under 200 words
- Use simple, clear language appropriate for {context.expertise_level} level
- If student shows confusion, focus on clarifying that specific point
- End with ONE targeted question to check understanding (not multiple questions)
- Avoid overwhelming with too many concepts at once

Keep it engaging and appropriate for {context.expertise_level} level. Use clear formatting with bullet points and bold headings.
End with an encouraging question or prompt to check understanding."""
                        logger.info(f"💬 Sending prompt to teacher agent (learning mode)")
                        result = await agent.invoke_async(prompt)
                        logger.info(f"✅ Teacher agent responded (learning mode)")
                        response_text = self._extract_message_text(result)
                        logger.info(f"📝 Extracted response: {response_text[:100]}...")
                    else:  # practice
                        logger.info(f"📝 Teacher agent: generating practice question for {context.topic_id}")
                        # Use LLM to generate practice questions instead of hardcoded ones
                        prompt = f"""You are an experienced Singapore O-Level teacher specializing in exam preparation.

Topic: {context.topic_id.replace('_', ' ')}
Student expertise level: {context.expertise_level}

Generate a Singapore O-Level style practice question appropriate for {context.expertise_level} level:

**Format:**
**Question:** [Write the question here - make it exam-style]

[If multiple choice, provide options A-D]
[If structured question, provide clear instructions]

**Instructions to student:**
Try to solve this question and type your answer. I'll provide the correct answer, working steps, and O-Level answering techniques.

Make the difficulty appropriate for {context.expertise_level} level."""
                        logger.info(f"💬 Sending prompt to teacher agent (practice mode)")
                        result = await agent.invoke_async(prompt)
                        logger.info(f"✅ Teacher agent responded (practice mode)")
                        response_text = self._extract_message_text(result)
                        logger.info(f"📝 Extracted response: {response_text[:100]}...")
                        
                elif agent_id == "tutor":
                    logger.info(f"🎓 Tutor agent activated in {mode} mode")
                    if mode == "learning":
                        # Get recent conversation history for context
                        recent_messages = session_data.messages[-4:] if len(session_data.messages) >= 4 else session_data.messages
                        conversation_history = []
                        for msg in recent_messages[-3:]:
                            sender = msg.get('sender', 'unknown')
                            content = msg.get('content', '')
                            # Handle nested content structure
                            if isinstance(content, dict) and 'content' in content:
                                if isinstance(content['content'], list) and content['content']:
                                    content = content['content'][0].get('text', str(content))
                            conversation_history.append(f"{sender}: {content}")
                        conversation_context = "\n".join(conversation_history)

                        logger.info(f"📜 Conversation history: {len(conversation_history)} messages")

                        prompt = f"""You are a Socratic tutor having a conversation with a student about '{context.topic_id}'.

IMPORTANT: The student is NOT asking you to generate content. They are answering your previous question or making an observation. DO NOT say they are "asking for content generation."

Recent conversation:
{conversation_context}

The student just responded: "{student_message}"

Your job: Continue this Socratic dialogue naturally by:
1. Acknowledging what they said (e.g., "Excellent observation!" or "That's a good start...")
2. Building on their response
3. Asking a follow-up question that guides them to discover more

Example response format:
"Great thinking! You noticed [acknowledge their response]. Now, building on that... [follow-up question]"

DO NOT mention "content generation" or assume they want you to create materials."""
                        logger.info(f"💬 Sending prompt to tutor agent (learning mode)")
                        result = await agent.invoke_async(prompt)
                        logger.info(f"✅ Tutor agent responded (learning mode)")
                        response_text = self._extract_message_text(result)
                        logger.info(f"📝 Extracted response: {response_text[:100]}...")
                    else:  # practice
                        logger.info(f"💬 Sending feedback prompt to tutor agent (practice mode)")
                        prompt = f"Provide detailed feedback on this student answer: '{student_message}' for the topic '{context.topic_id}'. Include O-Level answering techniques."
                        result = await agent.invoke_async(prompt)
                        logger.info(f"✅ Tutor agent responded (practice mode)")
                        response_text = self._extract_message_text(result)
                        logger.info(f"📝 Extracted response: {response_text[:100]}...")
                        
                elif agent_id == "perfect_scorer":
                    if mode == "learning":
                        prompt = f"Create visual learning aids for the topic '{context.topic_id}'. Generate mind maps, diagrams, or mnemonics to help a {context.expertise_level} student remember and understand the concepts."
                        result = await agent.invoke_async(prompt)
                        response_text = self._extract_message_text(result)
                    else:  # practice
                        prompt = f"Simulate a peer study session for '{context.topic_id}'. Help the student explain the concept back to reinforce learning. Student said: '{student_message}'"
                        result = await agent.invoke_async(prompt)
                        response_text = self._extract_message_text(result)
                
            else:
                # Fallback responses when Strands not available
                response_text = f"[SIMULATION] {agent_id.title()} agent would provide {mode} content for {context.topic_id} here."
            
            # Add agent response to session
            logger.info(f"💾 Creating agent message with content length: {len(response_text)}")
            agent_msg = {
                "id": f"msg_{int(time.time())}_agent",
                "sender": agent_id,
                "content": response_text,
                "timestamp": datetime.now().isoformat(),
                "metadata": {
                    "mode": mode,
                    "tools_used": ["primary_tool"],
                    "confidence": 0.9
                }
            }
            session_data.messages.append(agent_msg)
            logger.info(f"✅ Agent message added to session. Total messages: {len(session_data.messages)}")

            # Log agent interaction
            session_data.agent_interactions.append({
                "timestamp": datetime.now().isoformat(),
                "agent": agent_id,
                "mode": mode,
                "student_message": student_message,
                "response_length": len(response_text),
                "tools_used": ["primary_tool"]
            })

            # Update progress
            session_data.student_progress["concepts_learned"] += 1
            session_data.last_updated = datetime.now()

            logger.info(f"📤 Returning response: agent_id={agent_id}, mode={mode}, content_length={len(response_text)}")

            return {
                "success": True,
                "message": agent_msg,
                "agent_id": agent_id,
                "mode": mode
            }
            
        except Exception as e:
            logger.error(f"Agent {agent_id} call failed: {e}")
            error_msg = {
                "id": f"msg_{int(time.time())}_error",
                "sender": agent_id,
                "content": f"I'm having trouble right now. Let me try a different approach: [FALLBACK RESPONSE for {mode} mode]",
                "timestamp": datetime.now().isoformat()
            }
            session_data.messages.append(error_msg)
            return {"success": False, "message": error_msg, "error": str(e)}

    def get_session_data(self, session_id: str) -> Optional[SessionData]:
        """Retrieve session data"""
        return self.active_sessions.get(session_id)

    def end_session(self, session_id: str) -> Dict[str, Any]:
        """End session and return final data for Part 8 re-evaluation"""
        
        if session_id not in self.active_sessions:
            return {"error": "Session not found"}
        
        session_data = self.active_sessions[session_id]
        
        # Prepare final session summary
        final_summary = {
            "session_id": session_id,
            "duration_minutes": (datetime.now() - session_data.start_time).seconds // 60,
            "total_messages": len(session_data.messages),
            "agent_interactions": len(session_data.agent_interactions),
            "orchestrator_decisions": len(session_data.orchestrator_decisions),
            "student_progress": session_data.student_progress,
            "session_plan": asdict(session_data.session_plan),
            "context": asdict(session_data.context),
            "chat_log": session_data.messages,
            "performance_data": {
                "concepts_covered": session_data.student_progress["concepts_learned"],
                "engagement_level": session_data.student_progress["engagement_score"],
                "primary_agent_used": session_data.session_plan.primary_agent,
                "modes_used": list(set([interaction.get("mode", "learning") for interaction in session_data.agent_interactions])),
                "adaptation_events": len([d for d in session_data.orchestrator_decisions if d["type"] in ["mode_switch", "agent_switch"]])
            }
        }
        
        # Clean up session
        del self.active_sessions[session_id]
        
        return {
            "success": True,
            "final_summary": final_summary,
            "ready_for_part8_evaluation": True
        }

# Global orchestrator instance
study_session_orchestrator = StudySessionOrchestrator()

# Async helper functions for Flask integration
async def initialize_study_session(context_data: Dict[str, Any]) -> Dict[str, Any]:
    """Initialize study session - Flask wrapper"""
    try:
        logger.info(f"📥 RAW context_data received: {list(context_data.keys())}")
        logger.info(f"   Has topicProgress? {'topicProgress' in context_data}")
        logger.info(f"   Has topic_progress? {'topic_progress' in context_data}")

        # Convert camelCase fields from frontend to snake_case for Python dataclass
        field_mappings = {
            'topicProgress': 'topic_progress',
            'userId': 'user_id',
            'topicId': 'topic_id',
            'subjectId': 'subject_id',
            'expertiseLevel': 'expertise_level',
            'focusLevel': 'focus_level',
            'stressLevel': 'stress_level',
            'sessionDuration': 'session_duration',
            'examDate': 'exam_date',
            'sessionId': 'session_id'
        }

        for camel_key, snake_key in field_mappings.items():
            if camel_key in context_data and snake_key not in context_data:
                context_data[snake_key] = context_data.pop(camel_key)
                logger.info(f"   ✅ Converted {camel_key} → {snake_key}")

        logger.info(f"📤 AFTER conversion: {list(context_data.keys())}")

        if 'topic_progress' in context_data:
            logger.info(f"🔄 topic_progress value: {context_data['topic_progress']}")
            if context_data['topic_progress']:
                logger.info(f"   Keys: {list(context_data['topic_progress'].keys())}")

        context = SessionContext(**context_data)
        session_data = await study_session_orchestrator.initialize_session(context)
        return {
            "success": True,
            "session_id": session_data.session_id,
            "messages": session_data.messages,
            "session_plan": asdict(session_data.session_plan)
        }
    except Exception as e:
        logger.error(f"Session initialization failed: {e}")
        return {"success": False, "error": str(e)}

async def process_chat_message(session_id: str, message: str) -> Dict[str, Any]:
    """Process chat message - Flask wrapper"""
    try:
        result = await study_session_orchestrator.process_student_message(session_id, message)
        return result
    except Exception as e:
        logger.error(f"Message processing failed: {e}")
        return {"success": False, "error": str(e)}

def get_session_status(session_id: str) -> Dict[str, Any]:
    """Get session status - Flask wrapper"""
    session_data = study_session_orchestrator.get_session_data(session_id)
    if not session_data:
        return {"success": False, "error": "Session not found"}
    
    return {
        "success": True,
        "session_id": session_id,
        "status": "active",
        "messages_count": len(session_data.messages),
        "progress": session_data.student_progress,
        "last_updated": session_data.last_updated.isoformat()
    }

def end_study_session(session_id: str) -> Dict[str, Any]:
    """End study session - Flask wrapper"""
    return study_session_orchestrator.end_session(session_id)