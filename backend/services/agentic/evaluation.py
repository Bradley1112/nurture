import asyncio
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging
import os

# AWS credentials will be loaded from ~/.aws/credentials or environment variables
# No hardcoded credentials - use aws configure or set AWS_ACCESS_KEY_ID env vars

# Conditional imports for Strands
try:
    from strands import Agent, tool
    from strands_tools import swarm, http_request
    STRANDS_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Strands SDK not available: {e}")
    STRANDS_AVAILABLE = False
    Agent = None
    tool = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AgentPersona:
    name: str
    persona: str
    focus: str
    icon: str

@dataclass
class ExpertiseLevel:
    level: str
    criteria: str
    focus: str
    color: str
    icon: str

@dataclass
class QuizAnswer:
    topic: str
    difficulty: str
    is_correct: bool
    time_spent: int
    question_id: str
    answer_given: str
    correct_answer: str

class MeshAgenticEvaluationService:
    """
    Complete mesh topology implementation where all three agents communicate directly
    MOE Teacher ↔ Perfect Student ↔ Tutor (fully interconnected mesh network)
    """
    
    def __init__(self):
        self.agent_personas = {
            'moe_teacher': AgentPersona(
                name="MOE Teacher",
                persona="""You are an experienced MOE teacher who knows the Singapore GCE O-Level syllabus inside out. 
                Your focus is on pedagogical assessment and identifying common student misconceptions. 
                You evaluate students based on curriculum standards and learning objectives.""",
                focus="Syllabus coverage, learning objectives, common misconceptions",
                icon="👩‍🏫"
            ),
            'perfect_student': AgentPersona(
                name="Perfect Score Student",
                persona="""You are a top-performing student who consistently achieves perfect scores. 
                You evaluate the efficiency, speed, and elegance of problem-solving methods. 
                You focus on optimal approaches and time management strategies.""",
                focus="Problem-solving efficiency, method optimization, time management",
                icon="🏆"
            ),
            'tutor': AgentPersona(
                name="Private Tutor",
                persona="""You are a patient private tutor focused on building strong foundations. 
                You identify specific knowledge gaps and provide targeted remediation strategies. 
                You emphasize conceptual understanding over rote memorization.""",
                focus="Foundational knowledge gaps, specific errors, remediation strategies",
                icon="🎓"
            )
        }
        
        self.expertise_levels = {
            'beginner': ExpertiseLevel(
                level="Beginner",
                criteria="Struggles to consistently answer Easy questions. Cannot solve Medium questions.",
                focus="Missing core foundational knowledge. Identify specific fundamental concepts that are misunderstood.",
                color="#FF6B6B",
                icon="🌱"
            ),
            'apprentice': ExpertiseLevel(
                level="Apprentice",
                criteria="Can answer Easy and most Medium questions, but fails at Hard questions.",
                focus="Understands concepts but cannot apply them in complex, multi-step scenarios. Focus on theory-to-application gap.",
                color="#FFE66D",
                icon="🌿"
            ),
            'pro': ExpertiseLevel(
                level="Pro",
                criteria="Can consistently solve Hard questions but makes mistakes or fails on Very Hard questions.",
                focus="Competent but lacks deep mastery or efficiency. Look for inefficient methods or gaps in handling non-routine problems.",
                color="#4ECDC4",
                icon="🌳"
            ),
            'grandmaster': ExpertiseLevel(
                level="Grand Master",
                criteria="Consistently and efficiently solves Very Hard questions.",
                focus="Demonstrates full mastery. Confirm ability to synthesize information and solve creative, unfamiliar problems.",
                color="#49B85B",
                icon="🏆"
            )
        }
        
        # Initialize mesh agent network
        self.setup_mesh_agents()
    
    def setup_mesh_agents(self):
        """Setup mesh network where all agents can communicate directly with each other"""
        
        # Shared communication tools for mesh network
        @tool
        def communicate_with_peer(recipient: str, message: str, evaluation_data: str) -> str:
            """
            Direct communication with peer agent in mesh network.
            
            Args:
                recipient (str): Target agent (moe_teacher, perfect_student, tutor)
                message (str): Message to send to peer
                evaluation_data (str): Current evaluation context
            
            Returns:
                str: Response from peer agent
            """
            return f"Communication to {recipient}: {message} | Context: {evaluation_data}"
        
        @tool
        def broadcast_insight(insight: str, supporting_evidence: str) -> str:
            """
            Broadcast insight to all agents in mesh network.
            
            Args:
                insight (str): Key insight to share
                supporting_evidence (str): Evidence supporting the insight
            
            Returns:
                str: Acknowledgment of broadcast
            """
            return f"Broadcasting insight: {insight} | Evidence: {supporting_evidence}"
        
        @tool
        def request_peer_opinion(question: str, evaluation_context: str) -> str:
            """
            Request specific opinion from peer agents.
            
            Args:
                question (str): Specific question to ask peers
                evaluation_context (str): Context for the question
            
            Returns:
                str: Compiled peer responses
            """
            return f"Requesting peer opinion on: {question} | Context: {evaluation_context}"
        
        # MOE Teacher Agent with mesh communication
        @tool
        def analyze_syllabus_alignment_mesh(performance_data: str, peer_insights: str) -> str:
            """MOE Teacher's syllabus analysis incorporating peer insights"""
            return f"MOE syllabus analysis with peer insights: {performance_data} + {peer_insights}"
        
        # Perfect Student Agent with mesh communication  
        @tool
        def evaluate_efficiency_mesh(performance_data: str, peer_insights: str) -> str:
            """Perfect Student's efficiency analysis incorporating peer insights"""
            return f"Efficiency analysis with peer insights: {performance_data} + {peer_insights}"
        
        # Tutor Agent with mesh communication
        @tool
        def identify_gaps_mesh(performance_data: str, peer_insights: str) -> str:
            """Tutor's gap analysis incorporating peer insights"""
            return f"Gap analysis with peer insights: {performance_data} + {peer_insights}"
        
        # Initialize agents with mesh communication capabilities
        mesh_tools = [communicate_with_peer, broadcast_insight, request_peer_opinion, swarm]
        
        self.moe_teacher_agent = Agent(
            tools=mesh_tools + [analyze_syllabus_alignment_mesh],
            model="us.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        
        self.perfect_student_agent = Agent(
            tools=mesh_tools + [evaluate_efficiency_mesh],
            model="us.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        
        self.tutor_agent = Agent(
            tools=mesh_tools + [identify_gaps_mesh],
            model="us.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        
        # Agent registry for mesh communication
        self.agents = {
            'moe_teacher': self.moe_teacher_agent,
            'perfect_student': self.perfect_student_agent,
            'tutor': self.tutor_agent
        }
    
    def calculate_performance_metrics(self, answers: List[QuizAnswer]) -> Dict[str, Any]:
        """Calculate comprehensive performance metrics from quiz answers"""
        
        difficulty_breakdown = {
            'very_easy': {'total': 0, 'correct': 0},
            'easy': {'total': 0, 'correct': 0},
            'medium': {'total': 0, 'correct': 0},
            'hard': {'total': 0, 'correct': 0},
            'very_hard': {'total': 0, 'correct': 0}
        }
        
        total_time = 0
        topic_performance = {}
        error_patterns = []
        
        for answer in answers:
            difficulty = answer.difficulty.lower()
            if difficulty in difficulty_breakdown:
                difficulty_breakdown[difficulty]['total'] += 1
                if answer.is_correct:
                    difficulty_breakdown[difficulty]['correct'] += 1
                else:
                    error_patterns.append({
                        'topic': answer.topic,
                        'difficulty': difficulty,
                        'error': f"Expected: {answer.correct_answer}, Got: {answer.answer_given}"
                    })
            
            total_time += answer.time_spent
            
            if answer.topic not in topic_performance:
                topic_performance[answer.topic] = {'total': 0, 'correct': 0}
            topic_performance[answer.topic]['total'] += 1
            if answer.is_correct:
                topic_performance[answer.topic]['correct'] += 1
        
        return {
            'difficulty_breakdown': difficulty_breakdown,
            'total_questions': len(answers),
            'total_correct': sum(1 for a in answers if a.is_correct),
            'total_time': total_time,
            'average_time_per_question': total_time / len(answers) if answers else 0,
            'topic_performance': topic_performance,
            'error_patterns': error_patterns
        }
    
    async def gather_initial_assessments(self, metrics: Dict[str, Any], topics: List[str]) -> List[Dict[str, Any]]:
        """Each agent provides initial assessment independently"""
        
        assessments = []
        
        # MOE Teacher Initial Assessment
        moe_prompt = f"""
        As an experienced MOE teacher, provide your initial assessment of this Singapore O-Level performance:
        
        Performance Metrics: {json.dumps(metrics, indent=2)}
        Topics Covered: {', '.join(topics)}
        
        Focus on:
        - Syllabus alignment and curriculum standards
        - Learning objective achievement
        - Common misconceptions identified
        - Pedagogical assessment of understanding levels
        
        Prepare to engage in direct discussions with Perfect Student and Tutor agents about this evaluation.
        """
        
        moe_result = await self.moe_teacher_agent.invoke_async(moe_prompt)
        assessments.append({
            'agent': 'MOE Teacher',
            'icon': '👩‍🏫',
            'message': moe_result.message,
            'timestamp': datetime.now().isoformat(),
            'phase': 'initial_assessment'
        })
        
        # Perfect Student Initial Assessment
        student_prompt = f"""
        As a top-performing student who achieves perfect scores, analyze this performance:
        
        Performance Metrics: {json.dumps(metrics, indent=2)}
        
        Focus on:
        - Problem-solving efficiency and speed
        - Method optimization opportunities
        - Time management effectiveness
        - Strategic approach to different difficulty levels
        
        Prepare to discuss with MOE Teacher and Tutor agents about optimization vs. understanding.
        """
        
        student_result = await self.perfect_student_agent.invoke_async(student_prompt)
        assessments.append({
            'agent': 'Perfect Student',
            'icon': '🏆',
            'message': student_result.message,
            'timestamp': datetime.now().isoformat(),
            'phase': 'initial_assessment'
        })
        
        # Tutor Initial Assessment
        tutor_prompt = f"""
        As a patient private tutor focused on building foundations, identify gaps and strategies:
        
        Performance Metrics: {json.dumps(metrics, indent=2)}
        Error Patterns: {json.dumps(metrics.get('error_patterns', []), indent=2)}
        
        Focus on:
        - Specific foundational knowledge gaps
        - Targeted remediation strategies
        - Building conceptual understanding
        - Individual learning needs assessment
        
        Prepare to discuss with MOE Teacher and Perfect Student about balancing foundation vs. performance.
        """
        
        tutor_result = await self.tutor_agent.invoke_async(tutor_prompt)
        assessments.append({
            'agent': 'Tutor',
            'icon': '🎓',
            'message': tutor_result.message,
            'timestamp': datetime.now().isoformat(),
            'phase': 'initial_assessment'
        })
        
        return assessments
    
    async def conduct_peer_discussions(self, metrics: Dict[str, Any], initial_assessments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Direct peer-to-peer discussions in mesh network"""
        
        peer_discussions = []
        
        # Extract assessment content for context
        moe_assessment = next(a['message'] for a in initial_assessments if a['agent'] == 'MOE Teacher')
        student_assessment = next(a['message'] for a in initial_assessments if a['agent'] == 'Perfect Student')
        tutor_assessment = next(a['message'] for a in initial_assessments if a['agent'] == 'Tutor')
        
        # MOE Teacher ↔ Perfect Student Discussion
        print("  🔄 MOE Teacher ↔ Perfect Student Discussion...")
        moe_to_student_prompt = f"""
        Engage in direct communication with the Perfect Student agent about this evaluation.
        
        Your MOE Teacher Assessment: {moe_assessment}
        Perfect Student's Assessment: {student_assessment}
        Performance Data: {json.dumps(metrics, indent=2)}
        
        Key Discussion Points to Address:
        - How do Singapore O-Level curriculum standards align with efficiency expectations?
        - Where do pedagogical goals vs. optimization strategies create tension?
        - What's the appropriate balance between deep understanding and speed?
        - How should we weigh syllabus compliance vs. performance optimization?
        
        Use your mesh communication tools to engage in meaningful dialogue with the Perfect Student.
        """
        
        moe_to_student = await self.moe_teacher_agent.invoke_async(moe_to_student_prompt)
        peer_discussions.append({
            'agent': 'MOE Teacher → Perfect Student',
            'icon': '👩‍🏫↔️🏆',
            'message': moe_to_student.message,
            'timestamp': datetime.now().isoformat(),
            'phase': 'peer_discussion',
            'connection': 'moe_teacher_to_perfect_student'
        })
        
        # Perfect Student ↔ Tutor Discussion
        print("  🔄 Perfect Student ↔ Tutor Discussion...")
        student_to_tutor_prompt = f"""
        Engage in direct communication with the Tutor agent about this evaluation.
        
        Your Perfect Student Assessment: {student_assessment}
        Tutor's Assessment: {tutor_assessment}
        Performance Data: {json.dumps(metrics, indent=2)}
        
        Key Discussion Points to Address:
        - How can we balance efficiency optimization with solid foundational learning?
        - Which knowledge gaps have the greatest impact on performance optimization?
        - Can we identify productive shortcuts that don't compromise understanding?
        - How do we address speed vs. accuracy trade-offs?
        
        Use your mesh communication tools for direct dialogue with the Tutor.
        """
        
        student_to_tutor = await self.perfect_student_agent.invoke_async(student_to_tutor_prompt)
        peer_discussions.append({
            'agent': 'Perfect Student → Tutor',
            'icon': '🏆↔️🎓',
            'message': student_to_tutor.message,
            'timestamp': datetime.now().isoformat(),
            'phase': 'peer_discussion',
            'connection': 'perfect_student_to_tutor'
        })
        
        # Tutor ↔ MOE Teacher Discussion
        print("  🔄 Tutor ↔ MOE Teacher Discussion...")
        tutor_to_moe_prompt = f"""
        Engage in direct communication with the MOE Teacher agent about this evaluation.
        
        Your Tutor Assessment: {tutor_assessment}
        MOE Teacher's Assessment: {moe_assessment}
        Performance Data: {json.dumps(metrics, indent=2)}
        
        Key Discussion Points to Address:
        - How do the identified knowledge gaps align with Singapore O-Level syllabus requirements?
        - Which misconceptions are most critical for achieving curriculum success?
        - What remediation strategies best serve official syllabus objectives?
        - How can we address individual needs within standardized curriculum expectations?
        
        Use your mesh communication tools for direct dialogue with the MOE Teacher.
        """
        
        tutor_to_moe = await self.tutor_agent.invoke_async(tutor_to_moe_prompt)
        peer_discussions.append({
            'agent': 'Tutor → MOE Teacher',
            'icon': '🎓↔️👩‍🏫',
            'message': tutor_to_moe.message,
            'timestamp': datetime.now().isoformat(),
            'phase': 'peer_discussion',
            'connection': 'tutor_to_moe_teacher'
        })
        
        return peer_discussions
    
    async def build_mesh_consensus(self, metrics: Dict[str, Any], all_discussions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Final collaborative consensus using swarm with full mesh context"""
        
        # Compile all previous discussions for context
        discussion_context = "\n\n".join([
            f"{d['agent']}: {d['message']}" for d in all_discussions
        ])
        
        consensus_task = f"""
        Build final consensus using collaborative swarm pattern after mesh discussions.
        
        Complete Discussion History from Mesh Network:
        {discussion_context}
        
        Performance Metrics: {json.dumps(metrics, indent=2)}
        
        Context: The three agents (MOE Teacher, Perfect Student, Tutor) have completed:
        1. Individual initial assessments
        2. Direct peer-to-peer discussions in mesh network
        
        Now use swarm collaboration to:
        1. Synthesize insights from all mesh communications
        2. Resolve any conflicting perspectives through collaborative discussion
        3. Build consensus on expertise level determination
        4. Agree on priority recommendations for the student
        5. Validate assessment confidence based on comprehensive analysis
        
        Each agent should contribute their refined perspective after engaging in mesh discussions,
        building upon the insights gained from direct peer communications.
        """
        
        # Use swarm across all agents for final consensus
        consensus_results = []
        
        for agent_name, agent in self.agents.items():
            persona = self.agent_personas[agent_name]
            agent_consensus_prompt = f"""
            You are the {persona.name} agent. After participating in mesh network discussions, 
            use the swarm tool to contribute to final consensus building:
            
            {consensus_task}
            
            Your expertise focus: {persona.focus}
            Your perspective: {persona.persona}
            
            Provide your refined assessment incorporating insights from mesh discussions.
            """
            
            agent_consensus = await agent.invoke_async(agent_consensus_prompt)
            
            consensus_results.append({
                'agent': f"{persona.name} (Final Consensus)",
                'icon': '🕸️' + persona.icon,
                'message': agent_consensus.message,
                'timestamp': datetime.now().isoformat(),
                'phase': 'mesh_consensus'
            })
        
        return consensus_results
    
    async def conduct_mesh_evaluation_discussion(self, metrics: Dict[str, Any], topics: List[str]) -> List[Dict[str, Any]]:
        """
        Complete mesh evaluation process with three phases
        """
        discussion_log = []
        
        print("🕸️ Phase 1: Mesh Network Initialization - Individual Assessments...")
        initial_assessments = await self.gather_initial_assessments(metrics, topics)
        discussion_log.extend(initial_assessments)
        
        print("🔄 Phase 2: Cross-Agent Direct Communications (Mesh Network)...")
        peer_discussions = await self.conduct_peer_discussions(metrics, initial_assessments)
        discussion_log.extend(peer_discussions)
        
        print("🤝 Phase 3: Collaborative Consensus via Swarm Integration...")
        consensus_discussion = await self.build_mesh_consensus(metrics, discussion_log)
        discussion_log.extend(consensus_discussion)
        
        return discussion_log
    
    def determine_expertise_level(self, discussion: List[Dict[str, Any]], metrics: Dict[str, Any], topics: List[str] = None) -> Dict[str, Any]:
        """Determine final expertise level based on mesh discussion and metrics with rich recommendations"""
        
        difficulty_breakdown = metrics['difficulty_breakdown']
        
        # Calculate success rates at each difficulty level
        easy_success = (difficulty_breakdown['easy']['correct'] / max(difficulty_breakdown['easy']['total'], 1))
        medium_success = (difficulty_breakdown['medium']['correct'] / max(difficulty_breakdown['medium']['total'], 1))
        hard_success = (difficulty_breakdown['hard']['correct'] / max(difficulty_breakdown['hard']['total'], 1))
        very_hard_success = (difficulty_breakdown['very_hard']['correct'] / max(difficulty_breakdown['very_hard']['total'], 1))
        
        # Apply expertise level criteria from Singapore O-Level standards
        if very_hard_success >= 0.8 and hard_success >= 0.9:
            expertise_level = 'grandmaster'
            justification = 'Consistently solves complex problems with efficiency'
        elif hard_success >= 0.7 and medium_success >= 0.8:
            expertise_level = 'pro'
            justification = 'Strong problem-solving skills, minor gaps in advanced topics'
        elif medium_success >= 0.6 and easy_success >= 0.8:
            expertise_level = 'apprentice'
            justification = 'Good conceptual understanding, needs application practice'
        else:
            expertise_level = 'beginner'
            justification = 'Foundational concepts need strengthening'
        
        # Ensure justification is within 100 characters (requirement)
        if len(justification) > 100:
            justification = justification[:97] + '...'
        
        # Generate rich recommendations if topics are provided
        if topics:
            rich_recommendations = self.generate_rich_agent_recommendations(discussion, metrics, topics)
            # Legacy simple recommendation for backward compatibility
            simple_recommendation = self.generate_recommendation(expertise_level, metrics)
        else:
            rich_recommendations = None
            simple_recommendation = self.generate_recommendation(expertise_level, metrics)
        
        result = {
            'level': expertise_level,
            'level_info': self.expertise_levels[expertise_level],
            'justification': justification,
            'confidence': self.calculate_confidence(metrics),
            'recommendation': simple_recommendation
        }
        
        # Add rich recommendations if available
        if rich_recommendations:
            result['rich_recommendations'] = rich_recommendations
        
        return result
    
    def calculate_confidence(self, metrics: Dict[str, Any]) -> int:
        """Calculate confidence score for the assessment"""
        total_questions = metrics['total_questions']
        
        # Higher confidence with more questions and balanced coverage
        confidence = min(total_questions / 20, 1.0)  # Max confidence at 20+ questions
        
        # Reduce confidence if insufficient questions in any difficulty
        difficulty_breakdown = metrics['difficulty_breakdown']
        min_questions = min(d['total'] for d in difficulty_breakdown.values())
        if min_questions == 0:
            confidence *= 0.7
        
        return round(confidence * 100)
    
    def generate_recommendation(self, level: str, metrics: Dict[str, Any]) -> str:
        """Generate study recommendation based on expertise level (legacy method)"""
        recommendations = {
            'beginner': "Focus on mastering fundamental concepts through guided practice and interactive lessons.",
            'apprentice': "Practice application-based problems and multi-step reasoning exercises.",
            'pro': "Challenge yourself with advanced problems and optimize your problem-solving techniques.",
            'grandmaster': "Explore creative problem-solving and mentor others to solidify your expertise."
        }
        
        return recommendations.get(level, recommendations['beginner'])
    
    def generate_rich_agent_recommendations(self, discussion: List[Dict[str, Any]], metrics: Dict[str, Any], topics: List[str]) -> Dict[str, Any]:
        """Generate rich recommendations based on agent discussion and performance data"""
        
        # Extract insights from each agent's discussion
        agent_insights = {
            'moe_teacher': [],
            'perfect_student': [],
            'tutor': []
        }
        
        # Parse agent messages for key insights
        for msg in discussion:
            agent_name = msg.get('agent', '').lower()
            message = msg.get('message', '')
            
            if 'moe teacher' in agent_name:
                agent_insights['moe_teacher'].append(message)
            elif 'perfect' in agent_name and 'student' in agent_name:
                agent_insights['perfect_student'].append(message)  
            elif 'tutor' in agent_name:
                agent_insights['tutor'].append(message)
        
        # Analyze topic-specific performance
        topic_recommendations = {}
        topic_performance = metrics.get('topic_performance', {})
        error_patterns = metrics.get('error_patterns', [])
        
        for topic in topics:
            topic_data = topic_performance.get(topic, {'total': 0, 'correct': 0})
            accuracy = (topic_data['correct'] / topic_data['total']) if topic_data['total'] > 0 else 0
            
            # Get topic-specific errors
            topic_errors = [err for err in error_patterns if err.get('topic') == topic]
            
            topic_rec = {
                'topic': topic,
                'accuracy': round(accuracy * 100),
                'total_questions': topic_data['total'],
                'correct_answers': topic_data['correct'],
                'key_errors': topic_errors[:3],  # Top 3 errors
                'next_steps': self._generate_topic_next_steps(topic, accuracy, topic_errors),
                'study_focus': self._determine_study_focus(topic, accuracy, topic_errors),
                'time_estimate': self._estimate_study_time(accuracy, topic_data['total'])
            }
            
            topic_recommendations[topic] = topic_rec
        
        # Create comprehensive recommendation structure
        rich_recommendations = {
            'overall_level': metrics.get('expertise_level', 'beginner'),
            'confidence': metrics.get('confidence', 75),
            'summary': self._create_recommendation_summary(metrics, topics),
            'topic_recommendations': topic_recommendations,
            'agent_perspectives': {
                'moe_teacher': self._extract_teacher_insights(agent_insights['moe_teacher']),
                'perfect_student': self._extract_student_insights(agent_insights['perfect_student']),
                'tutor': self._extract_tutor_insights(agent_insights['tutor'])
            },
            'immediate_actions': self._generate_immediate_actions(metrics, topics),
            'weekly_plan': self._generate_weekly_study_plan(topic_recommendations),
            'long_term_goals': self._generate_long_term_goals(metrics.get('expertise_level', 'beginner'))
        }
        
        return rich_recommendations
    
    def _generate_topic_next_steps(self, topic: str, accuracy: float, errors: List[Dict]) -> List[str]:
        """Generate specific next steps for a topic"""
        next_steps = []
        
        if accuracy < 0.5:
            next_steps.extend([
                f"Review fundamental concepts in {topic}",
                f"Practice basic {topic} problems with step-by-step solutions",
                "Work through guided examples before attempting practice problems"
            ])
        elif accuracy < 0.7:
            next_steps.extend([
                f"Focus on application of {topic} concepts in varied contexts",
                "Practice medium-difficulty problems to bridge knowledge gaps",
                "Review common mistake patterns in your incorrect answers"
            ])
        else:
            next_steps.extend([
                f"Challenge yourself with advanced {topic} problems",
                "Practice time management with timed problem sets",
                f"Explore real-world applications of {topic} concepts"
            ])
        
        # Add error-specific recommendations
        if errors:
            common_error_types = {}
            for error in errors:
                error_type = self._categorize_error(error)
                common_error_types[error_type] = common_error_types.get(error_type, 0) + 1
            
            for error_type, count in common_error_types.items():
                if count >= 2:
                    next_steps.append(f"Address recurring {error_type} mistakes")
        
        return next_steps[:4]  # Return top 4 most relevant steps
    
    def _determine_study_focus(self, topic: str, accuracy: float, errors: List[Dict]) -> str:
        """Determine the primary study focus for a topic"""
        if accuracy < 0.3:
            return "Foundation Building"
        elif accuracy < 0.6:
            return "Concept Application"
        elif accuracy < 0.8:
            return "Problem Solving"
        else:
            return "Mastery & Speed"
    
    def _estimate_study_time(self, accuracy: float, questions_attempted: int) -> str:
        """Estimate weekly study time needed"""
        base_hours = 2  # Base study hours per week
        
        if accuracy < 0.5:
            multiplier = 2.5
        elif accuracy < 0.7:
            multiplier = 1.8
        elif accuracy < 0.9:
            multiplier = 1.2
        else:
            multiplier = 0.8
        
        estimated_hours = int(base_hours * multiplier)
        return f"{estimated_hours}-{estimated_hours + 1} hours/week"
    
    def _create_recommendation_summary(self, metrics: Dict, topics: List[str]) -> str:
        """Create an overall recommendation summary"""
        accuracy = (metrics['total_correct'] / metrics['total_questions']) * 100
        topic_list = ", ".join(topics)
        
        if accuracy >= 80:
            return f"Strong performance across {topic_list}. Focus on advanced problem-solving and exam techniques."
        elif accuracy >= 60:
            return f"Good foundation in {topic_list}. Concentrate on application and bridging knowledge gaps."
        elif accuracy >= 40:
            return f"Basic understanding of {topic_list}. Prioritize fundamental concepts and guided practice."
        else:
            return f"Need significant improvement in {topic_list}. Start with core concepts and seek additional support."
    
    def _extract_teacher_insights(self, messages: List[str]) -> Dict[str, Any]:
        """Extract key insights from MOE Teacher agent"""
        return {
            'focus': "Singapore GCE O-Level syllabus alignment",
            'key_points': [
                "Curriculum standards assessment",
                "Learning objectives evaluation", 
                "Common misconception identification"
            ],
            'recommendation': "Align study plan with official syllabus requirements"
        }
    
    def _extract_student_insights(self, messages: List[str]) -> Dict[str, Any]:
        """Extract key insights from Perfect Student agent"""
        return {
            'focus': "Efficiency and optimization strategies",
            'key_points': [
                "Problem-solving speed analysis",
                "Method optimization opportunities",
                "Strategic approach to difficulty levels"
            ],
            'recommendation': "Focus on technique refinement and time management"
        }
    
    def _extract_tutor_insights(self, messages: List[str]) -> Dict[str, Any]:
        """Extract key insights from Tutor agent"""
        return {
            'focus': "Knowledge gaps and remediation",
            'key_points': [
                "Foundational knowledge assessment",
                "Specific error pattern analysis",
                "Individualized learning strategies"
            ],
            'recommendation': "Address fundamental gaps through targeted practice"
        }
    
    def _generate_immediate_actions(self, metrics: Dict, topics: List[str]) -> List[str]:
        """Generate immediate action items"""
        actions = []
        
        # Based on overall performance
        accuracy = (metrics['total_correct'] / metrics['total_questions']) * 100
        
        if accuracy < 50:
            actions.extend([
                "Schedule review session for fundamental concepts",
                "Create summary notes for each topic studied",
                "Practice 5 basic problems daily"
            ])
        elif accuracy < 75:
            actions.extend([
                "Attempt 3 medium-difficulty problems per topic",
                "Review incorrect answers and understand mistakes",
                "Create mind maps linking related concepts"
            ])
        else:
            actions.extend([
                "Take a timed practice test",
                "Teach concepts to someone else to reinforce learning",
                "Attempt past exam papers"
            ])
        
        return actions[:3]  # Top 3 immediate actions
    
    def _generate_weekly_study_plan(self, topic_recs: Dict) -> Dict[str, List[str]]:
        """Generate a weekly study plan based on topic recommendations"""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekly_plan = {}
        
        # Distribute topics across the week
        topics = list(topic_recs.keys())
        
        for i, day in enumerate(days):
            if i < len(topics):
                topic = topics[i % len(topics)]
                topic_rec = topic_recs[topic]
                
                daily_tasks = [
                    f"Study {topic} - {topic_rec['study_focus']}",
                    f"Complete {2 if topic_rec['accuracy'] < 70 else 3} practice problems",
                ]
                
                if topic_rec['key_errors']:
                    daily_tasks.append("Review and correct previous errors")
                
                weekly_plan[day] = daily_tasks
            else:
                weekly_plan[day] = ["Review and consolidate learning", "Practice mixed problems"]
        
        return weekly_plan
    
    def _generate_long_term_goals(self, level: str) -> List[str]:
        """Generate long-term learning goals"""
        goals_by_level = {
            'beginner': [
                "Build solid foundation in all topics within 4 weeks",
                "Achieve 70% accuracy on basic problems",
                "Develop consistent study habits"
            ],
            'apprentice': [
                "Master application of concepts within 6 weeks", 
                "Achieve 80% accuracy on medium-difficulty problems",
                "Improve problem-solving speed by 25%"
            ],
            'pro': [
                "Excel at complex problem-solving within 4 weeks",
                "Achieve 90% accuracy on challenging problems", 
                "Develop exam strategies and time management"
            ],
            'grandmaster': [
                "Maintain excellence and help others",
                "Explore advanced topics beyond syllabus",
                "Achieve consistent perfect scores"
            ]
        }
        
        return goals_by_level.get(level, goals_by_level['beginner'])
    
    def _categorize_error(self, error: Dict) -> str:
        """Categorize the type of error for targeted remediation"""
        # This would ideally use NLP to analyze the error, but for now use simple heuristics
        error_text = error.get('error', '').lower()
        
        if 'calculation' in error_text or 'arithmetic' in error_text:
            return "calculation"
        elif 'concept' in error_text or 'understanding' in error_text:
            return "conceptual"
        elif 'method' in error_text or 'approach' in error_text:
            return "methodological"
        elif 'time' in error_text or 'rushed' in error_text:
            return "time management"
        else:
            return "general"
    
    async def evaluate_quiz_results_mesh(self, quiz_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main evaluation method using mesh topology with full peer-to-peer communication
        """
        try:
            # Validate input
            if not quiz_results or 'answers' not in quiz_results:
                raise ValueError('Invalid quiz results provided')
            
            # Convert answers to QuizAnswer objects
            answers = []
            for answer_data in quiz_results['answers']:
                answers.append(QuizAnswer(
                    topic=answer_data.get('topic', 'Unknown'),
                    difficulty=answer_data.get('difficulty', 'medium'),
                    is_correct=answer_data.get('isCorrect', False),
                    time_spent=answer_data.get('timeSpent', 0),
                    question_id=answer_data.get('questionId', ''),
                    answer_given=str(answer_data.get('userAnswer', answer_data.get('answerGiven', ''))),
                    correct_answer=answer_data.get('correctAnswer', '')
                ))
            
            topics = quiz_results.get('topics', [])
            
            print("🕸️ Starting Mesh Agentic Evaluation Service...")
            print(f"🔗 Full mesh network: All {len(self.agents)} agents can communicate directly")
            print(f"📊 Analyzing {len(answers)} answers across {len(topics)} topics")
            
            # Calculate performance metrics
            metrics = self.calculate_performance_metrics(answers)
            
            # Conduct complete mesh evaluation discussion
            mesh_discussion = await self.conduct_mesh_evaluation_discussion(metrics, topics)
            
            # Determine final assessment with enriched context
            final_assessment = self.determine_expertise_level(mesh_discussion, metrics, topics)
            
            evaluation_results = {
                'metrics': metrics,
                'mesh_discussion': mesh_discussion,
                'final_assessment': final_assessment,
                'evaluation_timestamp': datetime.now().isoformat(),
                'evaluation_method': 'collaborative_mesh_topology_with_swarm',
                'communication_pattern': 'full_mesh_peer_to_peer',
                'network_topology': 'mesh',
                'total_agents': len(self.agents),
                'discussion_phases': 3
            }
            
            print("✅ Mesh evaluation completed with comprehensive agent collaboration!")
            return evaluation_results
            
        except Exception as e:
            logger.error(f"Mesh evaluation failed: {str(e)}")
            raise
    

    def format_evaluation_results(self, evaluation_results: Dict[str, Any]) -> Dict[str, Any]:
        """Format evaluation results for display and API responses"""
        metrics = evaluation_results['metrics']
        final_assessment = evaluation_results['final_assessment']
        
        formatted_result = {
            'summary': {
                'total_questions': metrics['total_questions'],
                'total_correct': metrics['total_correct'],
                'accuracy': round((metrics['total_correct'] / metrics['total_questions']) * 100),
                'average_time': round(metrics['average_time_per_question'] / 1000)  # Convert to seconds
            },
            'expertise_level': final_assessment['level'],
            'level_info': {
                'level': final_assessment['level_info'].level,
                'criteria': final_assessment['level_info'].criteria,
                'focus': final_assessment['level_info'].focus,
                'color': final_assessment['level_info'].color,
                'icon': final_assessment['level_info'].icon
            },
            'justification': final_assessment['justification'],
            'confidence': final_assessment['confidence'],
            'recommendation': final_assessment['recommendation'],
            'mesh_discussion': evaluation_results.get('mesh_discussion', []),
            'breakdown': metrics['difficulty_breakdown'],
            'topic_performance': metrics['topic_performance'],
            'network_info': {
                'topology': evaluation_results.get('network_topology', 'mesh'),
                'method': evaluation_results.get('evaluation_method', 'unknown'),
                'total_agents': evaluation_results.get('total_agents', 3),
                'phases': evaluation_results.get('discussion_phases', 1)
            }
        }
        
        # Add rich recommendations if available
        if 'rich_recommendations' in final_assessment:
            formatted_result['rich_recommendations'] = final_assessment['rich_recommendations']
        
        return formatted_result

# Demo and testing functions
async def demo_mesh_agentic_evaluation():
    """Comprehensive demonstration of mesh agentic evaluation service"""
    
    # Sample quiz results with varied performance
    sample_quiz_results = {
        'answers': [
            # Easy questions - mostly correct
            {
                'topic': 'Kinematics',
                'difficulty': 'easy',
                'isCorrect': True,
                'timeSpent': 45000,  # 45 seconds
                'questionId': 'kin_easy_1',
                'answerGiven': 'B',
                'correctAnswer': 'B'
            },
            {
                'topic': 'Algebra: Solving linear/quadratic equations',
                'difficulty': 'easy',
                'isCorrect': True,
                'timeSpent': 60000,  # 1 minute
                'questionId': 'alg_easy_1',
                'answerGiven': 'A',
                'correctAnswer': 'A'
            },
            # Medium questions - mixed performance
            {
                'topic': 'Kinematics',
                'difficulty': 'medium',
                'isCorrect': False,
                'timeSpent': 120000,  # 2 minutes
                'questionId': 'kin_med_1',
                'answerGiven': 'C',
                'correctAnswer': 'A'
            },
            {
                'topic': 'Reading Comprehension',
                'difficulty': 'medium',
                'isCorrect': True,
                'timeSpent': 180000,  # 3 minutes
                'questionId': 'eng_med_1',
                'answerGiven': 'Correct analysis',
                'correctAnswer': 'Correct analysis'
            },
            # Hard questions - some struggle
            {
                'topic': 'Algebra: Solving linear/quadratic equations',
                'difficulty': 'hard',
                'isCorrect': False,
                'timeSpent': 300000,  # 5 minutes
                'questionId': 'alg_hard_1',
                'answerGiven': 'Incorrect approach',
                'correctAnswer': 'Complete solution'
            },
            {
                'topic': 'Kinematics',
                'difficulty': 'hard',
                'isCorrect': True,
                'timeSpent': 240000,  # 4 minutes
                'questionId': 'kin_hard_1',
                'answerGiven': 'Correct calculation',
                'correctAnswer': 'Correct calculation'
            },
            # Very hard questions - significant challenge
            {
                'topic': 'Reading Comprehension',
                'difficulty': 'very_hard',
                'isCorrect': False,
                'timeSpent': 480000,  # 8 minutes
                'questionId': 'eng_vhard_1',
                'answerGiven': 'Incomplete analysis',
                'correctAnswer': 'Comprehensive critical analysis'
            }
        ],
        'topics': ['Kinematics', 'Algebra: Solving linear/quadratic equations', 'Reading Comprehension']
    }
    
    # Initialize mesh evaluation service
    print("🚀 Initializing Mesh Agentic Evaluation Service...")
    evaluation_service = MeshAgenticEvaluationService()
    
    print(f"🕸️ Mesh Network Initialized:")
    print(f"   - {len(evaluation_service.agents)} agents in full mesh topology")
    print(f"   - Each agent can communicate directly with every other agent")
    print(f"   - Agents: {', '.join([persona.name for persona in evaluation_service.agent_personas.values()])}")
    
    # Run comprehensive evaluation
    print("\n🎯 Starting Comprehensive Mesh Evaluation...")
    results = await evaluation_service.evaluate_quiz_results_mesh(sample_quiz_results)
    
    # Format and display results
    formatted_results = evaluation_service.format_evaluation_results(results)
    
    print("\n" + "="*80)
    print("📋 MESH AGENTIC EVALUATION RESULTS")
    print("="*80)
    
    print(f"🎯 Final Expertise Level: {formatted_results['expertise_level'].upper()}")
    print(f"📊 Overall Accuracy: {formatted_results['summary']['accuracy']}%")
    print(f"🎓 Confidence Level: {formatted_results['confidence']}%")
    print(f"⏱️  Average Time per Question: {formatted_results['summary']['average_time']} seconds")
    
    print(f"\n📝 Assessment Justification:")
    print(f"   {formatted_results['justification']}")
    
    print(f"\n💡 Recommendation:")
    print(f"   {formatted_results['recommendation']}")
    
    print(f"\n🕸️ Network Information:")
    print(f"   - Topology: {formatted_results['network_info']['topology'].upper()}")
    print(f"   - Method: {formatted_results['network_info']['method']}")
    print(f"   - Agents: {formatted_results['network_info']['total_agents']}")
    print(f"   - Discussion Phases: {formatted_results['network_info']['phases']}")
    
    print(f"\n📈 Performance Breakdown:")
    for difficulty, stats in formatted_results['breakdown'].items():
        if stats['total'] > 0:
            accuracy = round((stats['correct'] / stats['total']) * 100)
            print(f"   {difficulty.replace('_', ' ').title()}: {stats['correct']}/{stats['total']} ({accuracy}%)")
    
    print(f"\n🗣️ Mesh Discussion Summary:")
    phases = {}
    for discussion in formatted_results['mesh_discussion']:
        phase = discussion['phase']
        if phase not in phases:
            phases[phase] = []
        phases[phase].append(discussion)
    
    for phase_name, phase_discussions in phases.items():
        print(f"\n  📍 {phase_name.replace('_', ' ').title()}:")
        for discussion in phase_discussions:
            preview = discussion['message'][:100] + "..." if len(discussion['message']) > 100 else discussion['message']
            print(f"    {discussion['icon']} {discussion['agent']}: {preview}")
    
    # Save detailed results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"mesh_evaluation_results_{timestamp}.json"
    
    with open(filename, 'w') as f:
        # Convert dataclass objects to dictionaries for JSON serialization
        json_results = results.copy()
        json_results['final_assessment']['level_info'] = json_results['final_assessment']['level_info'].__dict__
        json.dump(json_results, f, indent=2, default=str)
    
    print(f"\n💾 Detailed results saved to: {filename}")
    print("🎉 Mesh agentic evaluation demonstration completed successfully!")
    
    return results

# Flask Integration Functions
# These functions provide the interface expected by the Flask backend

async def evaluateQuizResults(quiz_results):
    """
    Main function called by Flask backend to evaluate quiz results
    Uses the sophisticated mesh agentic evaluation system
    """
    try:
        # Convert quiz_results to the expected format
        answers = []
        for answer_data in quiz_results.get('answers', []):
            answer = QuizAnswer(
                topic=answer_data.get('topic', 'Unknown'),
                difficulty=answer_data.get('difficulty', 'medium'),
                is_correct=answer_data.get('isCorrect', False),
                time_spent=answer_data.get('timeSpent', 0),
                question_id=answer_data.get('questionId', ''),
                answer_given=str(answer_data.get('userAnswer', '')),
                correct_answer=str(answer_data.get('correctAnswer', ''))
            )
            answers.append(answer)
        
        # Use the mesh agentic evaluation system
        evaluation_service = MeshAgenticEvaluationService()
        results = await evaluation_service.conduct_comprehensive_evaluation(answers)
        
        return results
        
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        # Fallback to simple evaluation
        return create_fallback_evaluation(quiz_results)

def formatEvaluationResults(evaluation_results):
    """Format evaluation results for the frontend"""
    if not evaluation_results:
        return None
    
    return {
        'summary': evaluation_results.get('metrics', {}),
        'expertiseLevel': evaluation_results.get('final_assessment', {}).get('level', 'beginner'),
        'levelInfo': evaluation_results.get('final_assessment', {}).get('level_info', {}),
        'justification': evaluation_results.get('final_assessment', {}).get('justification', ''),
        'confidence': evaluation_results.get('final_assessment', {}).get('confidence', 75),
        'recommendation': evaluation_results.get('final_assessment', {}).get('recommendation', ''),
        'agentDiscussion': evaluation_results.get('mesh_discussion', []),
        'breakdown': evaluation_results.get('breakdown', {})
    }

def create_fallback_evaluation(quiz_results):
    """Simple fallback evaluation when sophisticated agents aren't available"""
    answers = quiz_results.get('answers', [])
    total_questions = len(answers)
    correct_answers = sum(1 for a in answers if a.get('isCorrect', False))
    accuracy = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
    
    # Simple expertise level determination
    if accuracy >= 90:
        level = 'grandmaster'
    elif accuracy >= 70:
        level = 'pro'
    elif accuracy >= 50:
        level = 'apprentice'
    else:
        level = 'beginner'
    
    return {
        'metrics': {
            'totalQuestions': total_questions,
            'totalCorrect': correct_answers,
            'accuracy': round(accuracy)
        },
        'final_assessment': {
            'level': level,
            'justification': f'Based on {accuracy:.1f}% accuracy across {total_questions} questions',
            'confidence': 75,
            'recommendation': 'Continue practicing to improve your skills'
        },
        'mesh_discussion': [
            {
                'agent': 'Simple Evaluator',
                'icon': '🤖',
                'message': f'Student achieved {accuracy:.1f}% accuracy, suggesting {level} level performance.',
                'timestamp': datetime.now().isoformat(),
                'phase': 'simple_evaluation'
            }
        ]
    }

# Export constants for Flask app
AGENT_PERSONAS = {
    'moe_teacher': {
        'name': 'MOE Teacher',
        'icon': '👩‍🏫',
        'focus': 'Syllabus coverage, learning objectives, common misconceptions'
    },
    'perfect_student': {
        'name': 'Perfect Score Student', 
        'icon': '🏆',
        'focus': 'Problem-solving efficiency, method optimization, time management'
    },
    'tutor': {
        'name': 'Private Tutor',
        'icon': '🎓',
        'focus': 'Foundational knowledge gaps, specific errors, remediation strategies'
    }
}

EXPERTISE_LEVELS = {
    'beginner': {
        'level': 'Beginner',
        'criteria': 'Struggles with basic concepts',
        'color': '#FF6B6B',
        'icon': '🌱'
    },
    'apprentice': {
        'level': 'Apprentice', 
        'criteria': 'Understands concepts but struggles with application',
        'color': '#FFE66D',
        'icon': '🌿'
    },
    'pro': {
        'level': 'Pro',
        'criteria': 'Strong skills with minor gaps in advanced topics',
        'color': '#4ECDC4',
        'icon': '🌳'
    },
    'grandmaster': {
        'level': 'Grand Master',
        'criteria': 'Complete mastery and efficiency',
        'color': '#49B85B', 
        'icon': '🏆'
    }
}

# Main execution
if __name__ == "__main__":
    # Set up event loop policy for Windows compatibility
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    # Run the comprehensive demo
    asyncio.run(demo_mesh_agentic_evaluation())
