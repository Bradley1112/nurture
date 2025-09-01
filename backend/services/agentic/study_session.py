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
    from strands import Agent, tool, runtime
    from strands_tools import swarm
    STRANDS_AVAILABLE = True
except ImportError as e:
    logging.warning(f"AWS Strands SDK not available: {e}")
    STRANDS_AVAILABLE = False
    Agent = None
    tool = None
    runtime = None
    swarm = None

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
        def analyze_student_profile(
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
            if stress_level > 7:
                primary_agent = "perfect_scorer"  # Wellbeing focus
                intensity = "gentle"
                learning_ratio += 20  # More learning, less pressure
                practice_ratio -= 20
            elif focus_level < 4:
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
        def route_student_message(message: str, session_context: Dict[str, Any]) -> Dict[str, str]:
            """Determine which agent to call based on student message"""
            
            msg = message.lower()
            
            # Start command
            if "start" in msg or "begin" in msg:
                return {
                    "agent": session_context.get("primary_agent", "teacher"),
                    "mode": session_context.get("initial_mode", "learning"),
                    "reason": "student_ready",
                    "orchestrator_message": f"Perfect! Let me connect you with the {session_context.get('primary_agent', 'teacher')} to begin."
                }
            
            # Question keywords
            if any(word in msg for word in ["question", "practice", "test", "exam"]):
                return {
                    "agent": "teacher",
                    "mode": "practice",
                    "reason": "student_wants_practice",
                    "orchestrator_message": "I'll get the Teacher to prepare a practice question for you!"
                }
            
            # Explanation keywords
            if any(word in msg for word in ["explain", "understand", "confused", "help", "clarify"]):
                return {
                    "agent": "tutor",
                    "mode": "learning",
                    "reason": "student_needs_clarification",
                    "orchestrator_message": "Let me bring in the Tutor to help clarify this concept."
                }
            
            # Visual/memory keywords
            if any(word in msg for word in ["visual", "remember", "memorize", "diagram", "mind map", "mnemonic"]):
                return {
                    "agent": "perfect_scorer",
                    "mode": "learning",
                    "reason": "student_wants_visual_learning",
                    "orchestrator_message": "Great idea! The Perfect Scorer will create visual aids to help you remember this."
                }
            
            # Default: Continue with current flow
            return {
                "agent": session_context.get("primary_agent", "teacher"),
                "mode": session_context.get("current_mode", "learning"),
                "reason": "natural_flow",
                "orchestrator_message": ""
            }

        @tool
        def reassess_session_progress(
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

        # Initialize orchestrator agent with tools
        self.agent = Agent(
            name="Study Orchestrator",
            instructions="""You are the Study Orchestrator - the central hub of a study session agent graph.

Your primary responsibilities:
1. Analyze student profiles (expertise, focus, stress levels) and create optimal session plans
2. Route student messages to appropriate specialized agents (Teacher, Tutor, Perfect Scorer)
3. Make real-time decisions about learning/practice balance
4. Coordinate all agent interactions for a seamless experience
5. Track session progress and adapt strategy as needed

You manage three specialized agents:
- Teacher Agent: Content delivery and exam-style questions
- Tutor Agent: Socratic questioning and answer techniques  
- Perfect Scorer Agent: Visual aids and student wellbeing

Always explain your reasoning when making decisions. Be encouraging and supportive.
Focus on Singapore O-Level curriculum standards.""",
            tools=[analyze_student_profile, route_student_message, reassess_session_progress]
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

        self.specialized_agents["teacher"] = Agent(
            name="Teacher Agent",
            instructions="""You are the Teacher Agent specializing in Singapore O-Level curriculum delivery.

In LEARNING mode:
- Provide engaging, well-structured explanations in digestible chunks
- Never content dump - break complex topics into understandable parts
- Connect new concepts to previously learned material
- Use real-world examples relevant to Singapore students

In PRACTICE mode:  
- Generate curated, exam-style questions appropriate for student's expertise level
- Provide complete answers with working steps
- Focus on Singapore O-Level question formats and marking schemes
- Always include answering techniques and exam tips

Your priority: Ensure student completes content on time before exam with sufficient practice.""",
            tools=[explain_concept, generate_practice_question]
        )

        # TUTOR AGENT  
        @tool
        def ask_socratic_question(
            topic: str,
            student_response: str,
            learning_objective: str
        ) -> str:
            """Use Socratic method to guide student discovery"""
            
            socratic_questions = {
                "kinematics": [
                    "What do you think happens to an object's velocity when it accelerates?",
                    "If you throw a ball upward, what forces act on it during its flight?",
                    "How might the motion be different on the Moon compared to Earth?",
                    "What's the difference between speed and velocity? Can you give an example?"
                ],
                "reading_comprehension": [
                    "What clues in the text help you understand the character's motivation?",
                    "Why do you think the author chose this particular setting?", 
                    "What assumptions is the author making about the reader's knowledge?",
                    "How does the tone change throughout the passage?"
                ],
                "algebra": [
                    "What does this variable represent in the real-world context?",
                    "What would happen if this coefficient was negative instead?",
                    "How can you check if your solution makes sense?",
                    "What's another way you could set up this equation?"
                ]
            }
            
            questions = socratic_questions.get(topic, ["What do you think about this concept?"])
            return f"Let me guide you to discover this: {questions[0]}\n\nThink about it step by step..."

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

        self.specialized_agents["tutor"] = Agent(
            name="Tutor Agent", 
            instructions="""You are the Tutor Agent focused on deep conceptual understanding through the Socratic method.

In LEARNING mode:
- Ask interactive questions that guide students to discover insights themselves
- Promote conceptual understanding over rote memorization
- Build on student responses with follow-up questions
- Help students make connections between concepts

In PRACTICE mode:
- Provide detailed feedback on student answers
- Include correct answers with clear explanations
- Teach Singapore O-Level specific answering techniques
- Focus on keyword usage, answer structure, and time management
- Show how to approach similar questions systematically

Your priority: Ensure students truly understand the topic, not just memorize it.""",
            tools=[ask_socratic_question, provide_detailed_feedback]
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

        self.specialized_agents["perfect_scorer"] = Agent(
            name="Perfect Scorer Agent",
            instructions="""You are the Perfect Scorer Agent focused on visual learning aids and student wellbeing.

In LEARNING mode:
- Create diagrams, mind maps, and visual representations (using Mermaid when appropriate)  
- Generate mnemonics and memory aids
- Use chunking and logical grouping for information organization
- Provide multiple visual learning modalities

In PRACTICE mode:
- Simulate peer study sessions
- Prompt students to explain concepts back in their own words
- Facilitate active recall and self-testing
- Provide feedback on student explanations

Always prioritize student mental and physical wellbeing:
- Monitor stress and fatigue levels
- Suggest breaks when needed
- Provide encouragement and positive reinforcement
- Consider individual learning preferences""",
            tools=[create_visual_aid, simulate_peer_study, check_wellbeing]
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
                plan_data = await self.agent.tools[0](
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
            last_updated=datetime.now()
        )
        
        self.active_sessions[session_id] = session_data
        
        # Add welcome messages
        welcome_msg = f"Welcome to your {context.topic_id.replace('_', ' ')} study session! 🌱"
        
        profile_msg = (f"I'm analyzing your profile:\n"
                      f"📊 Expertise: {context.expertise_level}\n"
                      f"🎯 Focus Level: {context.focus_level}/10\n"
                      f"😌 Stress Level: {context.stress_level}/10\n"
                      f"⏰ Session Duration: {context.session_duration} minutes")
        
        plan_msg = (f"Based on your profile, I've created an optimal study plan:\n\n"
                   f"🎯 **Session Strategy**: {session_plan.strategy}\n"
                   f"📚 **Learning/Practice Mix**: {session_plan.learning_ratio}% learning, {session_plan.practice_ratio}% practice\n"
                   f"🤖 **Primary Agent**: {session_plan.primary_agent}\n"
                   f"⚡ **Intensity**: {session_plan.intensity}\n\n"
                   f"Let's begin! Type 'start' or ask me any questions about the topic.")
        
        session_data.messages.extend([
            {
                "id": f"msg_{int(time.time())}_1",
                "sender": "orchestrator",
                "content": welcome_msg,
                "timestamp": datetime.now().isoformat()
            },
            {
                "id": f"msg_{int(time.time())}_2", 
                "sender": "orchestrator",
                "content": profile_msg,
                "timestamp": datetime.now().isoformat()
            },
            {
                "id": f"msg_{int(time.time())}_3",
                "sender": "orchestrator", 
                "content": plan_msg,
                "timestamp": datetime.now().isoformat()
            }
        ])
        
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
                routing = await self.agent.tools[1](
                    message=message,
                    session_context=asdict(session_data.session_plan)
                )
                
                agent_id = routing["agent"]
                mode = routing["mode"]
                reason = routing["reason"]
                orchestrator_msg = routing.get("orchestrator_message", "")
                
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
            agent_response = await self._call_specialized_agent(
                session_data, agent_id, "learning", message
            )
            
            return {
                "success": True,
                "messages": [session_data.messages[-1]],
                "agent_response": agent_response
            }

    async def _call_specialized_agent(
        self,
        session_data: SessionData,
        agent_id: str,
        mode: str,
        student_message: str
    ) -> Dict[str, Any]:
        """Call a specialized agent and return response"""
        
        if agent_id not in self.specialized_agents:
            return {"error": f"Agent {agent_id} not found"}
        
        agent = self.specialized_agents[agent_id]
        context = session_data.context
        
        try:
            if STRANDS_AVAILABLE:
                # Use appropriate agent tool based on mode
                if agent_id == "teacher":
                    if mode == "learning":
                        response_text = await agent.tools[0](  # explain_concept
                            topic=context.topic_id,
                            expertise_level=context.expertise_level
                        )
                    else:  # practice
                        response_data = await agent.tools[1](  # generate_practice_question
                            topic=context.topic_id,
                            expertise_level=context.expertise_level
                        )
                        response_text = f"**Practice Question:**\n{response_data['question']}\n\n*Try to solve this, then I'll provide the answer and technique.*"
                        
                elif agent_id == "tutor":
                    if mode == "learning":
                        response_text = await agent.tools[0](  # ask_socratic_question
                            topic=context.topic_id,
                            student_response=student_message,
                            learning_objective="concept_understanding"
                        )
                    else:  # practice  
                        feedback = await agent.tools[1](  # provide_detailed_feedback
                            student_answer=student_message,
                            correct_answer="[Correct answer would be provided]",
                            topic=context.topic_id,
                            question_type="structured"
                        )
                        response_text = f"**Feedback on your answer:**\n{feedback['analysis']}\n\n**Technique:** {feedback['technique']}"
                        
                elif agent_id == "perfect_scorer":
                    if mode == "learning":
                        visual_aid = await agent.tools[0](  # create_visual_aid
                            topic=context.topic_id,
                            concept="main_topic",
                            aid_type="mind_map"
                        )
                        response_text = f"**Visual Learning Aid:**\n{visual_aid['visual_aid']}\n\n**Tip:** {visual_aid['usage_tip']}"
                    else:  # practice
                        response_text = await agent.tools[1](  # simulate_peer_study
                            topic=context.topic_id,
                            concept="main_concept"
                        )
                
                # Check wellbeing if perfect_scorer agent
                if agent_id == "perfect_scorer":
                    wellbeing = await agent.tools[2](  # check_wellbeing
                        stress_level=context.stress_level,
                        focus_level=context.focus_level,
                        session_duration=45  # Approximate
                    )
                    if wellbeing["suggestions"]:
                        response_text += f"\n\n**Wellbeing Check:** {wellbeing['encouragement']}"
            
            else:
                # Fallback responses when Strands not available
                response_text = f"[SIMULATION] {agent_id.title()} agent would provide {mode} content for {context.topic_id} here."
            
            # Add agent response to session
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