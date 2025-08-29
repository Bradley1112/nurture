import json
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from strands import Agent, tool
from strands_tools import swarm, agent_graph
import logging

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

class TimeLimitedStrandsEvaluationService:
    """
    Time-limited evaluation service with 5-minute discussion limit and adaptive behavior
    """
    
    def __init__(self, time_limit_minutes: int = 5, chat_callback=None):
        self.time_limit_minutes = time_limit_minutes
        self.time_limit_seconds = time_limit_minutes * 60
        self.start_time = None
        self.chat_log = []
        self.current_phase = "initialization"
        self.chat_callback = chat_callback  # Callback for real-time streaming
        
        # Phase time allocation (adaptive)
        self.phase_time_budget = {
            'setup': 30,           # 30 seconds for network setup
            'agent_analysis': 180, # 3 minutes for agent discussions  
            'swarm_consensus': 90, # 1.5 minutes for swarm
            'final_synthesis': 20  # 20 seconds for final assessment
        }
        
        # Adaptive response lengths based on time pressure
        self.response_length_limits = {
            'high_time': 300,      # Relaxed: 300 words max
            'medium_time': 150,    # Moderate: 150 words max  
            'low_time': 50,        # Urgent: 50 words max
            'critical_time': 20    # Emergency: 20 words max
        }
        
        self.agent_personas = {
            'moe_teacher': AgentPersona(
                name="MOE Teacher",
                persona="""You are an experienced MOE teacher. Provide CONCISE analysis focused on Singapore O-Level standards. 
                Work efficiently within time constraints. Build upon other agents' insights quickly.""",
                focus="Syllabus coverage, learning objectives, common misconceptions",
                icon="👩‍🏫"
            ),
            'perfect_student': AgentPersona(
                name="Perfect Score Student",
                persona="""You are a top-performing student. Provide QUICK efficiency analysis and optimization insights.
                Work within time limits. Focus on key performance improvements.""",
                focus="Problem-solving efficiency, method optimization, time management",
                icon="🏆"
            ),
            'tutor': AgentPersona(
                name="Private Tutor", 
                persona="""You are a patient private tutor. Provide FOCUSED gap analysis and remediation strategies.
                Work efficiently. Prioritize most critical knowledge gaps.""",
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
        
        # Initialize coordinator agent
        self.coordinator_agent = Agent(tools=[agent_graph, swarm])
        self.graph_id = f"evaluation_mesh_{int(time.time())}"
    
    def get_time_remaining(self) -> int:
        """Get remaining time in seconds"""
        if not self.start_time:
            return self.time_limit_seconds
        
        elapsed = (datetime.now() - self.start_time).total_seconds()
        remaining = max(0, self.time_limit_seconds - elapsed)
        return int(remaining)
    
    def is_time_up(self) -> bool:
        """Check if time limit has been reached"""
        return self.get_time_remaining() <= 0
    
    def get_time_pressure_level(self) -> str:
        """Determine current time pressure for adaptive behavior"""
        remaining = self.get_time_remaining()
        total_budget = sum(self.phase_time_budget.values())
        
        if remaining > total_budget * 0.7:
            return 'high_time'      # >70% time left - relaxed
        elif remaining > total_budget * 0.4: 
            return 'medium_time'    # 40-70% time left - moderate
        elif remaining > total_budget * 0.15:
            return 'low_time'       # 15-40% time left - urgent
        else:
            return 'critical_time'  # <15% time left - emergency
    
    def get_phase_time_allocation(self, phase: str) -> int:
        """Get time allocation for specific phase based on remaining time"""
        remaining = self.get_time_remaining()
        
        if phase == 'setup':
            return min(self.phase_time_budget['setup'], remaining * 0.1)  # Max 10% on setup
        elif phase == 'agent_analysis':
            return min(self.phase_time_budget['agent_analysis'], remaining * 0.6)  # 60% on analysis
        elif phase == 'swarm_consensus': 
            return min(self.phase_time_budget['swarm_consensus'], remaining * 0.3)  # 30% on consensus
        else:  # final_synthesis
            return min(self.phase_time_budget['final_synthesis'], remaining)
    
    def log_agent_chat(self, agent_name: str, message: str, chat_type: str = "analysis", target: str = None):
        """Log agent communications with timestamp"""
        time_remaining = self.get_time_remaining()
        
        chat_entry = {
            'agent': agent_name,
            'icon': self.get_agent_icon(agent_name),
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'chat_type': chat_type,
            'target': target,
            'phase': self.current_phase,
            'time_remaining': time_remaining,
            'elapsed_time': self.time_limit_seconds - time_remaining
        }
        
        self.chat_log.append(chat_entry)
        print(f"[{time_remaining}s remaining] {chat_entry['icon']} {agent_name}: {message}")
        
        # Stream chat entry in real-time if callback is provided
        if self.chat_callback:
            try:
                self.chat_callback(chat_entry)
            except Exception as e:
                logger.error(f"Chat streaming callback failed: {e}")
        
        return chat_entry
    
    def get_agent_icon(self, agent_name: str) -> str:
        """Get agent icon by name"""
        icon_map = {
            'MOE Teacher': '👩‍🏫',
            'Perfect Student': '🏆', 
            'Tutor': '🎓',
            'Swarm Coordinator': '🐝',
            'Swarm Collective': '✨',
            'System': '⚙️'
        }
        
        # Handle swarm agents
        if 'Swarm Agent' in agent_name:
            return '🐝'
        
        return icon_map.get(agent_name, '🤖')
    
    def create_adaptive_prompt(self, base_prompt: str, agent_type: str, time_allocation: int) -> str:
        """Create prompts that adapt to time constraints"""
        
        time_pressure = self.get_time_pressure_level()
        word_limit = self.response_length_limits[time_pressure]
        
        time_instructions = {
            'high_time': f"You have {time_allocation}s for thorough analysis. Provide comprehensive insights.",
            'medium_time': f"You have {time_allocation}s for focused analysis. Be concise but complete.", 
            'low_time': f"URGENT: Only {time_allocation}s remaining! Provide key insights only.",
            'critical_time': f"EMERGENCY: {time_allocation}s left! One paragraph maximum!"
        }
        
        adaptive_prompt = f"""
        TIME CONSTRAINT: {time_instructions[time_pressure]}
        RESPONSE LIMIT: Maximum {word_limit} words
        REMAINING TIME: {self.get_time_remaining()} seconds total
        
        {base_prompt}
        
        ADAPTATION REQUIRED:
        - Focus on MOST CRITICAL insights only
        - Skip lengthy explanations if time is short
        - Prioritize actionable conclusions
        - Build efficiently on peer insights
        """
        
        return adaptive_prompt
    
    def setup_agent_graph_mesh(self) -> Dict[str, Any]:
        """Setup mesh topology with time awareness"""
        
        self.log_agent_chat(
            "System",
            f"🚀 Setting up mesh network with {self.time_limit_minutes}-minute time limit",
            "system"
        )
        
        result = self.coordinator_agent.tool.agent_graph(
            action="create",
            graph_id=self.graph_id,
            topology={
                "type": "mesh",
                "nodes": [
                    {
                        "id": "moe_teacher",
                        "role": "educational_assessor", 
                        "system_prompt": self.agent_personas['moe_teacher'].persona
                    },
                    {
                        "id": "perfect_student",
                        "role": "performance_optimizer",
                        "system_prompt": self.agent_personas['perfect_student'].persona
                    },
                    {
                        "id": "tutor",
                        "role": "foundation_builder",
                        "system_prompt": self.agent_personas['tutor'].persona
                    }
                ],
                "edges": [
                    {"from": "moe_teacher", "to": "perfect_student"},
                    {"from": "moe_teacher", "to": "tutor"},
                    {"from": "perfect_student", "to": "moe_teacher"},
                    {"from": "perfect_student", "to": "tutor"},
                    {"from": "tutor", "to": "moe_teacher"},
                    {"from": "tutor", "to": "perfect_student"}
                ]
            }
        )
        
        self.log_agent_chat(
            "System",
            f"✅ Mesh network created successfully",
            "system"
        )
        
        return result
    
    def calculate_performance_metrics(self, answers: List[QuizAnswer]) -> Dict[str, Any]:
        """Calculate performance metrics quickly"""
        
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
    
    def conduct_adaptive_agent_analysis(self, metrics: Dict[str, Any], topics: List[str]) -> List[Dict[str, Any]]:
        """Agent analysis with adaptive time management"""
        
        self.current_phase = "agent_analysis"
        phase_time_budget = self.get_phase_time_allocation('agent_analysis')
        
        self.log_agent_chat(
            "System",
            f"📊 Phase 1: Agent Analysis ({phase_time_budget}s allocated)",
            "system"
        )
        
        # Divide time equally among agents
        time_per_agent = phase_time_budget // 3  # 3 agents
        
        performance_summary = f"""
        Student Performance Analysis:
        - Questions: {metrics['total_questions']} 
        - Accuracy: {(metrics['total_correct']/metrics['total_questions']*100):.1f}%
        - Key Topics: {', '.join(topics[:2])}
        - Error Count: {len(metrics['error_patterns'])}
        """
        
        agents_config = [
            {
                'id': 'moe_teacher',
                'name': 'MOE Teacher', 
                'focus': 'O-Level standards compliance and misconceptions',
                'time_budget': time_per_agent
            },
            {
                'id': 'perfect_student',
                'name': 'Perfect Student',
                'focus': 'Efficiency optimization and strategic improvements', 
                'time_budget': time_per_agent
            },
            {
                'id': 'tutor', 
                'name': 'Tutor',
                'focus': 'Critical knowledge gaps and remediation priorities',
                'time_budget': time_per_agent
            }
        ]
        
        for agent_config in agents_config:
            agent_start_time = time.time()
            
            # Check if we still have time for this agent
            if self.get_time_remaining() < 10:  # Emergency exit
                self.log_agent_chat(
                    agent_config['name'],
                    "⏰ Skipping analysis - insufficient time remaining",
                    "system"
                )
                continue
            
            # Create adaptive prompt based on time pressure
            adaptive_prompt = self.create_adaptive_prompt(
                f"""Analyze student performance focusing on {agent_config['focus']}:
                
                {performance_summary}
                
                Your specialized assessment is needed for final consensus.""",
                agent_config['id'],
                agent_config['time_budget']
            )
            
            self.log_agent_chat(
                agent_config['name'],
                f"🎯 Starting {agent_config['focus']} analysis ({agent_config['time_budget']}s)",
                "thinking"
            )
            
            try:
                result = self.coordinator_agent.tool.agent_graph(
                    action="message",
                    graph_id=self.graph_id,
                    message={
                        "target": agent_config['id'],
                        "content": adaptive_prompt
                    }
                )
                
                analysis_time = int(time.time() - agent_start_time)
                
                # Extract actual agent analysis content (like question generation does)
                agent_analysis = "Analysis completed"  # Default fallback
                
                if hasattr(result, 'message'):
                    if isinstance(result.message, dict) and 'content' in result.message:
                        # Extract from nested content structure
                        if result.message['content'] and len(result.message['content']) > 0:
                            agent_analysis = result.message['content'][0].get('text', str(result.message))
                    else:
                        agent_analysis = str(result.message)
                elif hasattr(result, 'content') and result.content:
                    # Try direct content attribute
                    if isinstance(result.content, list) and len(result.content) > 0:
                        agent_analysis = result.content[0].get('text', str(result.content[0]))
                    else:
                        agent_analysis = str(result.content)
                else:
                    # Last resort: try to extract from string representation
                    result_str = str(result)
                    if 'content' in result_str and 'text' in result_str:
                        try:
                            import json
                            if result_str.startswith("{'") or result_str.startswith('{"'):
                                result_dict = eval(result_str) if result_str.startswith("{'") else json.loads(result_str)
                                if 'content' in result_dict and result_dict['content']:
                                    agent_analysis = result_dict['content'][0].get('text', result_str)
                        except:
                            agent_analysis = result_str
                
                self.log_agent_chat(
                    agent_config['name'],
                    agent_analysis,
                    "analysis"
                )
                
                self.log_agent_chat(
                    agent_config['name'], 
                    f"⏱️ Analysis completed in {analysis_time}s (budget: {agent_config['time_budget']}s)",
                    "timing"
                )
                
            except Exception as e:
                self.log_agent_chat(
                    agent_config['name'],
                    f"⚠️ Analysis interrupted: {str(e)}",
                    "error"
                )
        
        phase_duration = phase_time_budget - self.get_time_remaining()
        self.log_agent_chat(
            "System",
            f"📊 Phase 1 completed in {abs(phase_duration)}s (budget: {phase_time_budget}s)",
            "system"
        )
        
        return self.chat_log
    
    def parse_meaningful_analysis(self, swarm_output: str) -> str:
        """Parse meaningful analysis content from swarm output"""
        import re
        
        # Look for content between ** markers (like **EFFICIENCY ANALYSIS**)
        meaningful_sections = re.findall(r'\*\*[^*]+\*\*.*?(?=\*\*|$)', swarm_output, re.DOTALL)
        
        # Look for structured content with clear educational value
        if meaningful_sections:
            # Take the first substantial analysis section
            for section in meaningful_sections:
                if len(section) > 50:  # Filter out short titles
                    # Clean up the content
                    cleaned = section.strip()
                    if cleaned:
                        return cleaned[:500]  # Limit length for display
        
        # Fallback: look for any substantial paragraph
        lines = swarm_output.split('\n')
        substantial_lines = [line.strip() for line in lines if len(line.strip()) > 30]
        
        if substantial_lines:
            return substantial_lines[0][:200]
        
        return "Analysis completed"

    def extract_swarm_content(self, swarm_result: Any) -> str:
        """Extract meaningful content from swarm execution results"""
        if isinstance(swarm_result, dict):
            if 'content' in swarm_result:
                return swarm_result['content']
            elif 'text' in swarm_result:
                text_data = swarm_result['text']
                if isinstance(text_data, list) and len(text_data) > 0:
                    if isinstance(text_data[0], dict) and 'text' in text_data[0]:
                        return text_data[0]['text']
                    else:
                        return str(text_data[0])
                elif isinstance(text_data, str):
                    return text_data
        return "Analysis generated"

    def conduct_adaptive_swarm_consensus(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Swarm consensus with intelligent time management"""
        
        self.current_phase = "swarm_consensus"
        phase_time_budget = self.get_phase_time_allocation('swarm_consensus')
        
        if phase_time_budget < 30:  # Not enough time for meaningful consensus
            self.log_agent_chat(
                "System",
                f"⏰ Insufficient time ({phase_time_budget}s) for swarm consensus - using algorithmic assessment",
                "system"
            )
            return self.chat_log
        
        self.log_agent_chat(
            "Swarm Coordinator",
            f"🐝 Phase 2: Swarm Consensus ({phase_time_budget}s allocated)",
            "system"
        )
        
        # Adaptive swarm configuration based on time
        time_pressure = self.get_time_pressure_level()
        
        swarm_config = {
            'high_time': {'competitive_size': 4, 'collaborative_size': 3, 'rounds': 2},
            'medium_time': {'competitive_size': 3, 'collaborative_size': 2, 'rounds': 2}, 
            'low_time': {'competitive_size': 2, 'collaborative_size': 2, 'rounds': 1},
            'critical_time': {'competitive_size': 2, 'collaborative_size': 1, 'rounds': 1}
        }
        
        config = swarm_config[time_pressure]
        
        # Time allocation within swarm phase
        competitive_time = phase_time_budget * 0.6  # 60% for competitive analysis
        collaborative_time = phase_time_budget * 0.4  # 40% for final synthesis
        
        try:
            # Competitive Analysis with Time Budget
            competitive_start = time.time()
            
            agent_insights = "\n".join([
                f"- {c['agent']}: {c['message'][:100]}..." 
                for c in self.chat_log if c['chat_type'] == 'analysis'
            ])
            
            competitive_prompt = self.create_adaptive_prompt(
                f"""Quick competitive analysis of student expertise level:
                
                Agent Insights: {agent_insights}
                Performance: {metrics['total_correct']}/{metrics['total_questions']} correct
                
                Each swarm member: Provide expertise level assessment (Beginner/Apprentice/Pro/GrandMaster) 
                with ONE key supporting reason.""",
                "swarm_competitive",
                int(competitive_time)
            )
            
            # Capture stdout to get the actual agent analysis content
            import io
            import sys
            from contextlib import redirect_stdout
            
            captured_output = io.StringIO()
            with redirect_stdout(captured_output):
                competitive_result = self.coordinator_agent.tool.swarm(
                    task=competitive_prompt,
                    agents=[
                        {"role": "competitive_evaluator", "focus": "expertise_assessment"} 
                        for _ in range(config['competitive_size'])
                    ]
                )
            
            # Extract meaningful content from captured output
            swarm_output = captured_output.getvalue()
            meaningful_content = self.parse_meaningful_analysis(swarm_output)
            
            competitive_duration = time.time() - competitive_start
            
            # Log the meaningful content from captured output
            self.log_agent_chat(
                "Competitive Agents", 
                meaningful_content,
                "swarm_analysis"
            )
            
            # Collaborative Synthesis if time allows
            remaining_swarm_time = phase_time_budget - competitive_duration
            
            if remaining_swarm_time > 15:  # At least 15 seconds for synthesis
                collaborative_start = time.time()
                
                synthesis_prompt = self.create_adaptive_prompt(
                    f"""Final consensus synthesis:
                    
                    Competitive Perspectives: {competitive_result.get('content', 'Various assessments')}
                    
                    Synthesize into single expertise level determination with confidence rating.""",
                    "swarm_collaborative", 
                    int(remaining_swarm_time)
                )
                
                # Capture collaborative output
                captured_collaborative = io.StringIO()
                with redirect_stdout(captured_collaborative):
                    collaborative_result = self.coordinator_agent.tool.swarm(
                        task=synthesis_prompt,
                        agents=[
                            {"role": "consensus_synthesizer", "focus": "collaborative_assessment"}
                            for _ in range(config['collaborative_size'])
                        ]
                    )
                
                collaborative_output = captured_collaborative.getvalue()
                collaborative_content = self.parse_meaningful_analysis(collaborative_output)
                self.log_agent_chat(
                    "Collaborative Agents",
                    collaborative_content,
                    "consensus"
                )
            else:
                self.log_agent_chat(
                    "System",
                    f"⏰ Skipping collaborative synthesis - only {remaining_swarm_time:.1f}s remaining",
                    "system"
                )
                
        except Exception as e:
            self.log_agent_chat(
                "Swarm Coordinator",
                f"⚠️ Swarm consensus error: {str(e)}",
                "error"
            )
        
        return self.chat_log
    
    def generate_smart_final_assessment(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Generate final assessment incorporating all agent insights"""
        
        self.current_phase = "final_assessment"
        
        # Extract insights from chat log
        agent_insights = [c for c in self.chat_log if c['chat_type'] in ['analysis', 'swarm_analysis', 'consensus']]
        swarm_consensus = [c for c in self.chat_log if c['chat_type'] == 'consensus']
        
        # Algorithmic baseline assessment
        difficulty_breakdown = metrics['difficulty_breakdown']
        easy_success = difficulty_breakdown['easy']['correct'] / max(difficulty_breakdown['easy']['total'], 1)
        medium_success = difficulty_breakdown['medium']['correct'] / max(difficulty_breakdown['medium']['total'], 1) 
        hard_success = difficulty_breakdown['hard']['correct'] / max(difficulty_breakdown['hard']['total'], 1)
        very_hard_success = difficulty_breakdown['very_hard']['correct'] / max(difficulty_breakdown['very_hard']['total'], 1)
        
        # Determine level with agent insight enhancement
        if very_hard_success >= 0.8 and hard_success >= 0.9:
            base_level = 'grandmaster'
            justification = 'Consistently solves complex problems with efficiency'
        elif hard_success >= 0.7 and medium_success >= 0.8: 
            base_level = 'pro'
            justification = 'Strong problem-solving skills, minor gaps in advanced topics'
        elif medium_success >= 0.6 and easy_success >= 0.8:
            base_level = 'apprentice'
            justification = 'Good conceptual understanding, needs application practice'
        else:
            base_level = 'beginner'
            justification = 'Foundational concepts need strengthening'
        
        # Adjust based on agent insights if available
        final_level = base_level
        confidence_boost = 0
        
        if swarm_consensus:
            # Use swarm consensus if available
            last_consensus = swarm_consensus[-1]['message']
            consensus_text = str(last_consensus).lower() if last_consensus else ''
            if 'grandmaster' in consensus_text or 'grand master' in consensus_text:
                final_level = 'grandmaster'
                confidence_boost = 10
            elif 'pro' in consensus_text:
                final_level = 'pro' 
                confidence_boost = 10
            elif 'apprentice' in consensus_text:
                final_level = 'apprentice'
                confidence_boost = 10
            elif 'beginner' in consensus_text:
                final_level = 'beginner'
                confidence_boost = 10
        
        base_confidence = min(90, max(50, metrics['total_questions'] * 5))
        final_confidence = min(95, base_confidence + confidence_boost)
        
        # Ensure justification is within 100 characters
        if len(justification) > 100:
            justification = justification[:97] + '...'
        
        final_assessment = {
            'level': final_level,
            'level_info': self.expertise_levels[final_level],
            'justification': justification,
            'confidence': final_confidence,
            'recommendation': self.generate_recommendation(final_level, metrics),
            'agent_insights_used': len(agent_insights),
            'swarm_consensus_available': len(swarm_consensus) > 0
        }
        
        self.log_agent_chat(
            "System",
            f"🎯 FINAL ASSESSMENT: {final_level.upper()} (confidence: {final_confidence}%)",
            "final_assessment"
        )
        
        return final_assessment
    
    def generate_recommendation(self, level: str, metrics: Dict[str, Any]) -> str:
        """Generate study recommendation based on expertise level"""
        recommendations = {
            'beginner': "Focus on mastering fundamental concepts through guided practice and interactive lessons.",
            'apprentice': "Practice application-based problems and multi-step reasoning exercises.",
            'pro': "Challenge yourself with advanced problems and optimize your problem-solving techniques.",
            'grandmaster': "Explore creative problem-solving and mentor others to solidify your expertise."
        }
        return recommendations.get(level, recommendations['beginner'])
    
    def evaluate_quiz_results_with_smart_timing(self, quiz_results: Dict[str, Any]) -> Dict[str, Any]:
        """Main evaluation with intelligent phase timing"""
        
        self.start_time = datetime.now()
        
        self.log_agent_chat(
            "System",
            f"🚀 Smart-timed evaluation starting ({self.time_limit_minutes}m limit)",
            "system"
        )
        
        try:
            # Quick input processing
            answers = []
            for a in quiz_results.get('answers', []):
                answers.append(QuizAnswer(
                    topic=a.get('topic', 'Unknown'),
                    difficulty=a.get('difficulty', 'medium'),
                    is_correct=a.get('isCorrect', False),
                    time_spent=a.get('timeSpent', 0),
                    question_id=a.get('questionId', ''),
                    answer_given=a.get('userAnswer', a.get('answerGiven', '')),
                    correct_answer=a.get('correctAnswer', '')
                ))
            
            topics = quiz_results.get('topics', [])
            metrics = self.calculate_performance_metrics(answers)
            
            # Phase 1: Setup (Adaptive: 10-30s)
            setup_time_budget = self.get_phase_time_allocation('setup')
            graph_setup = self.setup_agent_graph_mesh()
            
            # Phase 2: Agent Analysis (Adaptive: 60-180s) 
            if self.get_time_remaining() > 60:
                self.conduct_adaptive_agent_analysis(metrics, topics)
            
            # Phase 3: Swarm Consensus (Adaptive: 30-90s)
            if self.get_time_remaining() > 30:
                self.conduct_adaptive_swarm_consensus(metrics)
            
            # Phase 4: Final Assessment (Adaptive: 10-20s)
            final_assessment = self.generate_smart_final_assessment(metrics)
            
            # Cleanup
            try:
                self.coordinator_agent.tool.agent_graph(action="stop", graph_id=self.graph_id)
                self.log_agent_chat("System", "🧹 Cleanup completed", "system")
            except:
                pass
            
            total_duration = (datetime.now() - self.start_time).total_seconds()
            
            return {
                'metrics': metrics,
                'chat_log': self.chat_log,
                'complete_discussion': self.chat_log,
                'final_assessment': final_assessment,
                'evaluation_timestamp': datetime.now().isoformat(),
                'evaluation_method': 'adaptive_time_managed_hybrid',
                'time_info': {
                    'limit_minutes': self.time_limit_minutes,
                    'actual_duration_seconds': total_duration,
                    'completed_within_limit': total_duration <= self.time_limit_seconds,
                    'phase_time_budgets': self.phase_time_budget,
                    'adaptive_adjustments': len([c for c in self.chat_log if 'time pressure' in c.get('message', '').lower()])
                },
                'network_info': {
                    'total_messages': len(self.chat_log),
                    'agents_participated': len(set(c['agent'] for c in self.chat_log)),
                    'phases_completed': len(set(c['phase'] for c in self.chat_log))
                }
            }
            
        except Exception as e:
            # Emergency cleanup
            try:
                self.coordinator_agent.tool.agent_graph(action="stop", graph_id=self.graph_id)
            except:
                pass
            logger.error(f"Smart-timed evaluation failed: {str(e)}")
            raise
    
    def format_evaluation_results(self, evaluation_results: Dict[str, Any]) -> Dict[str, Any]:
        """Format results with time information"""
        metrics = evaluation_results['metrics']
        final_assessment = evaluation_results['final_assessment']
        
        return {
            'summary': {
                'total_questions': metrics['total_questions'],
                'total_correct': metrics['total_correct'],
                'accuracy': round((metrics['total_correct'] / metrics['total_questions']) * 100),
                'average_time': round(metrics['average_time_per_question'] / 1000)
            },
            'expertiseLevel': final_assessment['level'],
            'levelInfo': {
                'level': final_assessment['level_info'].level,
                'criteria': final_assessment['level_info'].criteria,
                'focus': final_assessment['level_info'].focus,
                'color': final_assessment['level_info'].color,
                'icon': final_assessment['level_info'].icon
            },
            'justification': final_assessment['justification'],
            'confidence': final_assessment['confidence'],
            'recommendation': final_assessment['recommendation'],
            
            # Enhanced chat information
            'chat_log': evaluation_results['chat_log'],
            'complete_discussion': evaluation_results['chat_log'],
            'agentDiscussion': evaluation_results['chat_log'],  # Legacy compatibility
            
            # Performance breakdowns
            'breakdown': metrics['difficulty_breakdown'],
            'topic_performance': metrics['topic_performance'],
            'topicPerformance': metrics['topic_performance'],  # Legacy compatibility
            
            # Time and network information
            'time_info': evaluation_results['time_info'],
            'network_info': evaluation_results['network_info'],
            'evaluation_method': evaluation_results['evaluation_method']
        }
    
    def stream_evaluation_with_chat(self, quiz_results: Dict[str, Any]):
        """
        Stream evaluation results with real-time chat messages.
        This method yields SSE-formatted data for direct HTTP streaming.
        """
        import queue
        import json
        
        # Create queue for collecting chat messages
        chat_queue = queue.Queue()
        evaluation_result = {}
        evaluation_complete = threading.Event()
        evaluation_error = None
        
        def chat_callback(chat_entry):
            """Callback to receive and queue chat messages"""
            chat_queue.put(chat_entry)
        
        def run_evaluation():
            """Run evaluation in background thread"""
            nonlocal evaluation_result, evaluation_error
            try:
                # Use current service instance with updated chat callback
                original_callback = self.chat_callback
                self.chat_callback = chat_callback
                
                result = self.evaluate_quiz_results_with_smart_timing(quiz_results)
                evaluation_result = self.format_evaluation_results(result)
                
                # Restore original callback
                self.chat_callback = original_callback
                evaluation_complete.set()
            except Exception as e:
                logger.error(f"Evaluation thread error: {e}")
                evaluation_error = str(e)
                evaluation_complete.set()
        
        # Start evaluation in background thread
        eval_thread = threading.Thread(target=run_evaluation, daemon=True)
        eval_thread.start()
        
        # Stream chat messages as they arrive
        while not evaluation_complete.is_set():
            try:
                # Get next chat message with timeout
                chat_entry = chat_queue.get(timeout=5)
                
                # Send chat message as SSE event
                chat_data = {
                    'type': 'chat_message',
                    'chat': chat_entry
                }
                yield f"data: {json.dumps(chat_data)}\n\n"
                
            except queue.Empty:
                # Send heartbeat to keep connection alive
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
                continue
            except Exception as e:
                logger.error(f"Stream generator error: {e}")
                break
        
        # Send final result or error
        if evaluation_error:
            yield f"data: {json.dumps({'type': 'error', 'error': evaluation_error})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'evaluation_complete', 'evaluation': evaluation_result})}\n\n"

# Demo function for testing
def demo_smart_timed_evaluation():
    """Demo with smart adaptive timing"""
    
    sample_quiz_results = {
        'answers': [
            {
                'topic': 'Kinematics',
                'difficulty': 'easy',
                'isCorrect': True,
                'timeSpent': 45000,
                'questionId': 'kin_easy_1',
                'answerGiven': 'B',
                'correctAnswer': 'B'
            },
            {
                'topic': 'Algebra',
                'difficulty': 'medium',
                'isCorrect': False,
                'timeSpent': 120000,
                'questionId': 'alg_med_1',
                'answerGiven': 'C', 
                'correctAnswer': 'A'
            },
            {
                'topic': 'Reading Comprehension',
                'difficulty': 'hard',
                'isCorrect': True,
                'timeSpent': 240000,
                'questionId': 'eng_hard_1',
                'answerGiven': 'Correct analysis',
                'correctAnswer': 'Correct analysis'
            }
        ],
        'topics': ['Kinematics', 'Algebra', 'Reading Comprehension']
    }
    
    # Initialize with 5-minute limit
    evaluation_service = TimeLimitedStrandsEvaluationService(time_limit_minutes=5)
    
    print("🚀 Starting SMART adaptive 5-minute evaluation...")
    print("⚡ Agents will adapt their behavior based on time pressure")
    print("=" * 80)
    
    results = evaluation_service.evaluate_quiz_results_with_smart_timing(sample_quiz_results)
    formatted_results = evaluation_service.format_evaluation_results(results)
    
    print("\n" + "=" * 80)
    print("📋 TIME-LIMITED EVALUATION RESULTS")
    print("=" * 80)
    
    time_info = formatted_results['time_info']
    print(f"⏰ Time Limit: {time_info['limit_minutes']} minutes")
    print(f"⏱️  Actual Duration: {time_info['actual_duration_seconds']:.1f} seconds")
    print(f"✅ Completed Within Limit: {time_info['completed_within_limit']}")
    print(f"📊 Chat Messages: {formatted_results['network_info']['total_messages']}")
    
    print(f"\n🎯 Final Assessment: {formatted_results['expertiseLevel'].upper()}")
    print(f"📈 Confidence: {formatted_results['confidence']}%")
    print(f"💡 Recommendation: {formatted_results['recommendation']}")
    
    print(f"\n🗨️ Agent Chat Log ({len(formatted_results['chat_log'])} messages):")
    for chat in formatted_results['chat_log'][-10:]:  # Show last 10 messages
        time_remaining = chat.get('time_remaining', 0)
        message_preview = chat['message'][:80] + "..." if len(chat['message']) > 80 else chat['message']
        print(f"[{time_remaining}s] {chat['icon']} {chat['agent']}: {message_preview}")
    
    # Save detailed results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"time_limited_evaluation_results_{timestamp}.json"
    
    try:
        with open(filename, 'w') as f:
            # Convert dataclass objects to dictionaries for JSON serialization
            json_results = results.copy()
            json_results['final_assessment']['level_info'] = json_results['final_assessment']['level_info'].__dict__
            json.dump(json_results, f, indent=2, default=str)
        print(f"\n💾 Detailed results saved to: {filename}")
    except Exception as e:
        print(f"\n⚠️ Could not save results file: {e}")
    
    print("🎉 Smart time-limited evaluation demonstration completed!")
    
    return results

# Main execution for testing
if __name__ == "__main__":
    demo_smart_timed_evaluation()