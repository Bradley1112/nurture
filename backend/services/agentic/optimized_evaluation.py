"""
Optimized Mesh Agentic Evaluation Service
Combines full 3-phase mesh evaluation with time optimization and streaming
"""

import asyncio
import json
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Generator
from dataclasses import dataclass
import logging

# AWS credentials will be loaded from ~/.aws/credentials or environment variables
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
class QuizAnswer:
    topic: str
    difficulty: str
    is_correct: bool
    time_spent: int
    question_id: str
    answer_given: str
    correct_answer: str

class OptimizedMeshEvaluationService:
    """
    Time-optimized mesh evaluation with full 3-phase process and streaming support
    """
    
    def __init__(self, time_limit_minutes: int = 5, enable_streaming: bool = True):
        self.time_limit_minutes = time_limit_minutes
        self.time_limit_seconds = time_limit_minutes * 60
        self.enable_streaming = enable_streaming
        self.start_time = None
        self.chat_log = []
        self.current_phase = "initialization"
        
        # Optimized phase timing for 5-minute completion
        self.phase_time_budget = {
            'initialization': 10,    # 10s setup
            'phase_1_assessments': 90,  # 90s individual (30s each, concurrent)
            'phase_2_discussions': 120, # 2min peer discussions (concurrent pairs)
            'phase_3_consensus': 60,    # 1min consensus + rich recommendations
            'finalization': 20       # 20s final processing
        }
        
        self.agent_personas = {
            'moe_teacher': AgentPersona(
                name="MOE Teacher",
                persona="""You are an experienced MOE teacher who knows Singapore O-Level syllabus inside out. 
                Provide CONCISE but thorough analysis. You have limited time, so focus on the most critical 
                insights about curriculum alignment and common misconceptions. Build on other agents' insights efficiently.""",
                focus="Singapore O-Level standards, misconceptions, syllabus compliance",
                icon="👩‍🏫"
            ),
            'perfect_student': AgentPersona(
                name="Perfect Score Student",
                persona="""You are a top-performing O-Level student. Analyze efficiency and optimization quickly. 
                Focus on strategic improvements and time management. Provide key insights concisely. 
                Work within time constraints while maintaining quality.""",
                focus="Efficiency, optimization, strategic problem-solving",
                icon="🏆"
            ),
            'tutor': AgentPersona(
                name="Private Tutor",
                persona="""You are a patient private tutor who specializes in identifying gaps. 
                Quickly assess foundational weaknesses and provide targeted remediation strategies. 
                Be concise but specific about learning needs.""",
                focus="Knowledge gaps, targeted remediation, foundational concepts",
                icon="🎓"
            )
        }
        
        # Initialize optimized agents
        if STRANDS_AVAILABLE:
            self.setup_optimized_agents()
        
    def setup_optimized_agents(self):
        """Setup agents optimized for time-constrained evaluation"""
        
        # Shared tools for mesh communication
        @tool
        def time_aware_analysis(analysis_type: str, data: str, time_budget_seconds: int) -> str:
            """
            Perform time-aware analysis with specified budget
            
            Args:
                analysis_type (str): Type of analysis to perform
                data (str): Data to analyze
                time_budget_seconds (int): Time budget for this analysis
            
            Returns:
                str: Concise analysis results
            """
            return f"Time-aware {analysis_type} analysis (budget: {time_budget_seconds}s): {data}"
        
        @tool
        def collaborative_insight(insight: str, supporting_evidence: str, confidence: str) -> str:
            """
            Share collaborative insight with confidence level
            
            Args:
                insight (str): Key insight to share
                supporting_evidence (str): Evidence supporting the insight
                confidence (str): Confidence level (high/medium/low)
                
            Returns:
                str: Formatted insight for mesh collaboration
            """
            return f"Mesh Insight [{confidence} confidence]: {insight} | Evidence: {supporting_evidence}"
        
        # Initialize agents with time-aware tools
        base_tools = [time_aware_analysis, collaborative_insight, swarm]
        
        self.moe_teacher_agent = Agent(
            tools=base_tools,
            model="us.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        
        self.perfect_student_agent = Agent(
            tools=base_tools,
            model="us.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        
        self.tutor_agent = Agent(
            tools=base_tools,
            model="us.anthropic.claude-sonnet-4-20250514-v1:0"
        )
        
        self.agents = {
            'moe_teacher': self.moe_teacher_agent,
            'perfect_student': self.perfect_student_agent,
            'tutor': self.tutor_agent
        }

    def emit_chat_message(self, agent: str, icon: str, message: str, phase: str, chat_type: str = "analysis"):
        """Emit chat message for streaming"""
        chat_message = {
            'type': 'chat_message',
            'chat': {
                'agent': agent,
                'icon': icon,
                'message': message,
                'timestamp': datetime.now().isoformat(),
                'chat_type': chat_type,
                'target': None,
                'phase': phase,
                'time_remaining': max(0, self.time_limit_seconds - int(time.time() - self.start_time)) if self.start_time else self.time_limit_seconds,
                'elapsed_time': int(time.time() - self.start_time) if self.start_time else 0
            }
        }
        
        self.chat_log.append(chat_message)
        return chat_message

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

    async def phase_1_concurrent_assessments(self, metrics: Dict[str, Any], topics: List[str]) -> List[Dict[str, Any]]:
        """Phase 1: Concurrent individual assessments (90s budget)"""
        
        self.emit_chat_message("System", "⚙️", "🔄 Phase 1: Individual Agent Assessments (90s)", "phase_1_assessments", "system")
        
        phase_start = time.time()
        assessments = []
        
        # Create concurrent assessment tasks with time pressure prompts
        async def assess_moe_teacher():
            prompt = f"""
            URGENT ASSESSMENT - 30 SECOND LIMIT
            
            As MOE Teacher, provide rapid O-Level assessment:
            Performance: {json.dumps(metrics, indent=1)}
            Topics: {', '.join(topics)}
            
            Focus ONLY on:
            - Syllabus compliance (2 key points)
            - Critical misconceptions (1-2 items)  
            - Learning objective status (pass/needs work)
            
            Be direct and actionable. Time pressure: 30s limit.
            """
            
            self.emit_chat_message("MOE Teacher", "👩‍🏫", "Starting rapid O-Level standards assessment...", "phase_1_assessments")
            result = await self.moe_teacher_agent.invoke_async(prompt)
            return {
                'agent': 'MOE Teacher',
                'icon': '👩‍🏫',
                'message': result.message,
                'timestamp': datetime.now().isoformat(),
                'phase': 'phase_1_assessments'
            }
        
        async def assess_perfect_student():
            prompt = f"""
            RAPID EFFICIENCY ANALYSIS - 30 SECOND LIMIT
            
            As Perfect Student, quick performance optimization review:
            Metrics: {json.dumps(metrics, indent=1)}
            
            Identify TOP 2:
            - Efficiency improvements needed
            - Strategic optimization opportunities
            - Time management issues
            
            Concise, direct recommendations only. 30s time limit.
            """
            
            self.emit_chat_message("Perfect Student", "🏆", "Analyzing efficiency patterns...", "phase_1_assessments")
            result = await self.perfect_student_agent.invoke_async(prompt)
            return {
                'agent': 'Perfect Student',
                'icon': '🏆',
                'message': result.message,
                'timestamp': datetime.now().isoformat(),
                'phase': 'phase_1_assessments'
            }
        
        async def assess_tutor():
            prompt = f"""
            QUICK GAP ANALYSIS - 30 SECOND LIMIT
            
            As Private Tutor, identify critical gaps:
            Performance: {json.dumps(metrics, indent=1)}
            Errors: {json.dumps(metrics.get('error_patterns', [])[:3], indent=1)}
            
            Prioritize TOP 2:
            - Most critical knowledge gaps
            - Specific remediation needs
            - Foundational weaknesses
            
            Direct, actionable insights only. 30s limit.
            """
            
            self.emit_chat_message("Tutor", "🎓", "Identifying critical knowledge gaps...", "phase_1_assessments")
            result = await self.tutor_agent.invoke_async(prompt)
            return {
                'agent': 'Tutor',
                'icon': '🎓',
                'message': result.message,
                'timestamp': datetime.now().isoformat(),
                'phase': 'phase_1_assessments'
            }
        
        # Run assessments concurrently
        assessment_tasks = [assess_moe_teacher(), assess_perfect_student(), assess_tutor()]
        assessments = await asyncio.gather(*assessment_tasks)
        
        phase_duration = time.time() - phase_start
        self.emit_chat_message("System", "⚙️", f"✅ Phase 1 completed in {phase_duration:.1f}s", "phase_1_assessments", "system")
        
        return assessments

    async def phase_2_peer_discussions(self, metrics: Dict[str, Any], assessments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Phase 2: Optimized peer discussions (120s budget)"""
        
        self.emit_chat_message("System", "⚙️", "🤝 Phase 2: Peer Mesh Discussions (120s)", "phase_2_discussions", "system")
        
        phase_start = time.time()
        discussions = []
        
        # Extract assessment insights for context
        moe_insight = next(a['message'] for a in assessments if a['agent'] == 'MOE Teacher')
        student_insight = next(a['message'] for a in assessments if a['agent'] == 'Perfect Student')
        tutor_insight = next(a['message'] for a in assessments if a['agent'] == 'Tutor')
        
        async def moe_student_discussion():
            prompt = f"""
            RAPID PEER DISCUSSION - 40 SECOND LIMIT
            
            MOE Teacher perspective: {moe_insight}
            Perfect Student perspective: {student_insight}
            
            As MOE Teacher, respond to Perfect Student's efficiency focus:
            - Where do curriculum standards align/conflict with optimization?
            - Key trade-offs between deep learning vs. speed?
            - 2 most important points for discussion.
            
            Direct dialogue format. 40s limit.
            """
            
            self.emit_chat_message("MOE Teacher", "👩‍🏫↔️🏆", "Discussing standards vs efficiency trade-offs...", "phase_2_discussions")
            result = await self.moe_teacher_agent.invoke_async(prompt)
            return {
                'agent': 'MOE Teacher ↔ Perfect Student',
                'icon': '👩‍🏫↔️🏆',
                'message': result.message,
                'timestamp': datetime.now().isoformat(),
                'phase': 'phase_2_discussions'
            }
        
        async def student_tutor_discussion():
            prompt = f"""
            FAST PEER EXCHANGE - 40 SECOND LIMIT
            
            Perfect Student view: {student_insight}
            Tutor assessment: {tutor_insight}
            
            As Perfect Student, address Tutor's gap findings:
            - Which gaps most impact performance optimization?
            - Fastest high-impact improvements?
            - Strategic learning priorities?
            
            Collaborative tone. 40s limit.
            """
            
            self.emit_chat_message("Perfect Student", "🏆↔️🎓", "Prioritizing high-impact gap fixes...", "phase_2_discussions")
            result = await self.perfect_student_agent.invoke_async(prompt)
            return {
                'agent': 'Perfect Student ↔ Tutor',
                'icon': '🏆↔️🎓',
                'message': result.message,
                'timestamp': datetime.now().isoformat(),
                'phase': 'phase_2_discussions'
            }
        
        async def tutor_moe_discussion():
            prompt = f"""
            QUICK COLLABORATION - 40 SECOND LIMIT
            
            Tutor findings: {tutor_insight}
            MOE Teacher view: {moe_insight}
            
            As Tutor, align with MOE Teacher's standards:
            - How do identified gaps relate to syllabus requirements?
            - Most efficient remediation for O-Level success?
            - Critical intervention points?
            
            Professional dialogue. 40s limit.
            """
            
            self.emit_chat_message("Tutor", "🎓↔️👩‍🏫", "Aligning gap remediation with syllabus...", "phase_2_discussions")
            result = await self.tutor_agent.invoke_async(prompt)
            return {
                'agent': 'Tutor ↔ MOE Teacher',
                'icon': '🎓↔️👩‍🏫',
                'message': result.message,
                'timestamp': datetime.now().isoformat(),
                'phase': 'phase_2_discussions'
            }
        
        # Run peer discussions concurrently
        discussion_tasks = [moe_student_discussion(), student_tutor_discussion(), tutor_moe_discussion()]
        discussions = await asyncio.gather(*discussion_tasks)
        
        phase_duration = time.time() - phase_start
        self.emit_chat_message("System", "⚙️", f"✅ Phase 2 completed in {phase_duration:.1f}s", "phase_2_discussions", "system")
        
        return discussions

    async def phase_3_consensus_and_recommendations(self, metrics: Dict[str, Any], all_discussions: List[Dict[str, Any]], topics: List[str]) -> Dict[str, Any]:
        """Phase 3: Final consensus with rich recommendations (60s budget)"""
        
        self.emit_chat_message("System", "⚙️", "🎯 Phase 3: Consensus & Rich Recommendations (60s)", "phase_3_consensus", "system")
        
        phase_start = time.time()
        
        # Compile discussion context
        discussion_context = "\n".join([f"{d['agent']}: {d['message']}" for d in all_discussions])
        
        # Rapid consensus generation
        consensus_prompt = f"""
        FINAL CONSENSUS - 60 SECOND LIMIT
        
        Complete mesh discussion context:
        {discussion_context[:1000]}  # Truncate for speed
        
        Performance metrics: {json.dumps(metrics, indent=1)}
        Topics: {', '.join(topics)}
        
        Generate RAPID consensus on:
        1. Expertise level (beginner/apprentice/pro/grandmaster) with justification
        2. TOP 3 priority recommendations per topic
        3. Immediate next steps (3 actions)
        4. Key insights from mesh collaboration
        
        Be comprehensive but concise. Generate rich recommendations efficiently.
        """
        
        self.emit_chat_message("System", "🧠", "Synthesizing mesh insights into final assessment...", "phase_3_consensus", "system")
        
        # Use swarm for rapid consensus across all agents
        consensus_tasks = []
        for agent_name, agent in self.agents.items():
            persona = self.agent_personas[agent_name]
            task = agent.invoke_async(f"""
            {consensus_prompt}
            
            As {persona.name}, contribute your final perspective incorporating all mesh discussions.
            Focus on your expertise: {persona.focus}
            """)
            consensus_tasks.append(task)
        
        consensus_results = await asyncio.gather(*consensus_tasks)
        
        # Process consensus and generate final assessment
        final_assessment = self.determine_expertise_level_optimized(all_discussions, metrics, topics, consensus_results)
        
        phase_duration = time.time() - phase_start
        self.emit_chat_message("System", "⚙️", f"🎉 Phase 3 completed in {phase_duration:.1f}s - Assessment ready!", "phase_3_consensus", "system")
        
        return final_assessment

    def determine_expertise_level_optimized(self, discussions: List[Dict[str, Any]], metrics: Dict[str, Any], topics: List[str], consensus_results: List[Any]) -> Dict[str, Any]:
        """Optimized expertise determination with rich recommendations"""
        
        difficulty_breakdown = metrics['difficulty_breakdown']
        
        # Quick expertise calculation
        easy_success = (difficulty_breakdown['easy']['correct'] / max(difficulty_breakdown['easy']['total'], 1))
        medium_success = (difficulty_breakdown['medium']['correct'] / max(difficulty_breakdown['medium']['total'], 1))
        hard_success = (difficulty_breakdown['hard']['correct'] / max(difficulty_breakdown['hard']['total'], 1))
        very_hard_success = (difficulty_breakdown['very_hard']['correct'] / max(difficulty_breakdown['very_hard']['total'], 1))
        
        # Determine expertise level
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
        
        # Generate rich recommendations quickly
        rich_recommendations = self.generate_fast_rich_recommendations(discussions, metrics, topics)
        
        return {
            'level': expertise_level,
            'justification': justification,
            'confidence': min(95, max(75, metrics['total_questions'] * 5)),  # Quick confidence calc
            'rich_recommendations': rich_recommendations,
            'mesh_discussion': discussions,
            'consensus_insights': [r.message for r in consensus_results],
            'evaluation_method': 'optimized_mesh_3_phase',
            'total_evaluation_time': time.time() - self.start_time if self.start_time else 0
        }

    def generate_fast_rich_recommendations(self, discussions: List[Dict[str, Any]], metrics: Dict[str, Any], topics: List[str]) -> Dict[str, Any]:
        """Generate rich recommendations quickly"""
        
        topic_performance = metrics.get('topic_performance', {})
        error_patterns = metrics.get('error_patterns', [])
        
        # Quick topic recommendations
        topic_recommendations = {}
        for topic in topics:
            topic_data = topic_performance.get(topic, {'total': 0, 'correct': 0})
            accuracy = (topic_data['correct'] / topic_data['total']) if topic_data['total'] > 0 else 0
            
            topic_recommendations[topic] = {
                'topic': topic,
                'accuracy': round(accuracy * 100),
                'total_questions': topic_data['total'],
                'correct_answers': topic_data['correct'],
                'next_steps': self.generate_quick_next_steps(topic, accuracy),
                'study_focus': 'Foundation Building' if accuracy < 0.6 else 'Problem Solving' if accuracy < 0.8 else 'Mastery & Speed',
                'time_estimate': f"{2 if accuracy < 0.5 else 1}-{3 if accuracy < 0.5 else 2} hours/week"
            }
        
        return {
            'overall_level': metrics.get('expertise_level', 'beginner'),
            'confidence': min(95, max(75, metrics['total_questions'] * 5)),
            'summary': self.create_quick_summary(metrics, topics),
            'topic_recommendations': topic_recommendations,
            'agent_perspectives': {
                'moe_teacher': {'recommendation': 'Focus on Singapore O-Level syllabus alignment'},
                'perfect_student': {'recommendation': 'Optimize problem-solving speed and accuracy'},
                'tutor': {'recommendation': 'Address fundamental knowledge gaps systematically'}
            },
            'immediate_actions': self.generate_immediate_actions(metrics),
            'evaluation_completed_at': datetime.now().isoformat()
        }
    
    def generate_quick_next_steps(self, topic: str, accuracy: float) -> List[str]:
        """Generate quick next steps for a topic"""
        if accuracy < 0.5:
            return [f"Review {topic} fundamentals", f"Practice basic {topic} problems", "Seek additional support"]
        elif accuracy < 0.7:
            return [f"Apply {topic} concepts in varied contexts", "Practice medium-difficulty problems", "Review mistake patterns"]
        else:
            return [f"Challenge yourself with advanced {topic} problems", "Practice under time pressure", "Teach concepts to others"]
    
    def create_quick_summary(self, metrics: Dict, topics: List[str]) -> str:
        """Create quick recommendation summary"""
        accuracy = (metrics['total_correct'] / metrics['total_questions']) * 100
        topic_list = ", ".join(topics)
        
        if accuracy >= 80:
            return f"Strong performance across {topic_list}. Focus on advanced techniques."
        elif accuracy >= 60:
            return f"Good foundation in {topic_list}. Work on application skills."
        else:
            return f"Needs improvement in {topic_list}. Strengthen fundamentals first."
    
    def generate_immediate_actions(self, metrics: Dict) -> List[str]:
        """Generate immediate action items"""
        accuracy = (metrics['total_correct'] / metrics['total_questions']) * 100
        
        if accuracy < 50:
            return ["Review fundamental concepts", "Practice basic problems daily", "Create summary notes"]
        elif accuracy < 75:
            return ["Practice medium-difficulty problems", "Review incorrect answers", "Create concept maps"]
        else:
            return ["Take timed practice tests", "Teach concepts to others", "Attempt past exam papers"]

    def stream_evaluation_with_chat(self, quiz_results: Dict[str, Any]) -> Generator[str, None, None]:
        """Stream the complete optimized mesh evaluation with chat"""
        
        self.start_time = time.time()
        
        try:
            # Convert answers to QuizAnswer objects
            answers = []
            for answer_data in quiz_results.get('answers', []):
                answers.append(QuizAnswer(
                    topic=answer_data.get('topic', 'Unknown'),
                    difficulty=answer_data.get('difficulty', 'medium'),
                    is_correct=answer_data.get('isCorrect', False),
                    time_spent=answer_data.get('timeSpent', 0),
                    question_id=answer_data.get('questionId', ''),
                    answer_given=str(answer_data.get('userAnswer', '')),
                    correct_answer=str(answer_data.get('correctAnswer', ''))
                ))
            
            topics = quiz_results.get('topics', [])
            
            # Emit initial status
            initial_msg = self.emit_chat_message("System", "⚙️", f"🚀 Optimized Mesh Evaluation starting ({self.time_limit_minutes}m limit)", "initialization", "system")
            yield f"data: {json.dumps(initial_msg)}\n\n"
            
            # Calculate metrics
            metrics = self.calculate_performance_metrics(answers)
            
            # Run the evaluation asynchronously and yield chat messages
            async def run_evaluation():
                try:
                    # Phase 1: Individual assessments (90s)
                    assessments = await self.phase_1_concurrent_assessments(metrics, topics)
                    
                    # Phase 2: Peer discussions (120s)  
                    discussions = await self.phase_2_peer_discussions(metrics, assessments)
                    
                    # Phase 3: Consensus and recommendations (60s)
                    all_discussions = assessments + discussions
                    final_assessment = await self.phase_3_consensus_and_recommendations(metrics, all_discussions, topics)
                    
                    return {
                        'evaluation': final_assessment,
                        'mesh_discussion': all_discussions,
                        'total_time': time.time() - self.start_time
                    }
                    
                except Exception as e:
                    error_msg = self.emit_chat_message("System", "❌", f"Evaluation error: {str(e)}", "error", "system")
                    return {'error': str(e), 'chat_log': self.chat_log}
            
            # Run evaluation and stream chat messages
            def run_async():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(run_evaluation())
                    return result
                finally:
                    loop.close()
            
            # Start evaluation in background thread
            result_container = {}
            
            def evaluation_worker():
                result_container['result'] = run_async()
            
            eval_thread = threading.Thread(target=evaluation_worker)
            eval_thread.start()
            
            # Stream chat messages while evaluation runs
            last_message_count = 0
            while eval_thread.is_alive() or len(self.chat_log) > last_message_count:
                # Emit new chat messages
                while last_message_count < len(self.chat_log):
                    message = self.chat_log[last_message_count]
                    yield f"data: {json.dumps(message)}\n\n"
                    last_message_count += 1
                
                time.sleep(0.1)  # Small delay to prevent overwhelming
            
            # Wait for thread completion
            eval_thread.join(timeout=30)  # 30 second safety timeout
            
            # Send final results
            if 'result' in result_container:
                final_result = result_container['result']
                if 'error' not in final_result:
                    completion_msg = {
                        'type': 'evaluation_complete',
                        'evaluation': final_result['evaluation'],
                        'total_time': final_result['total_time']
                    }
                    yield f"data: {json.dumps(completion_msg)}\n\n"
                else:
                    error_msg = {'type': 'error', 'error': final_result['error']}
                    yield f"data: {json.dumps(error_msg)}\n\n"
            else:
                timeout_msg = self.emit_chat_message("System", "⚠️", "Evaluation timed out", "timeout", "system")
                yield f"data: {json.dumps(timeout_msg)}\n\n"
            
        except Exception as e:
            error_msg = self.emit_chat_message("System", "❌", f"Stream error: {str(e)}", "error", "system")
            yield f"data: {json.dumps(error_msg)}\n\n"

    def format_evaluation_results(self, evaluation_results: Dict[str, Any]) -> Dict[str, Any]:
        """Format results for frontend display"""
        if not evaluation_results or 'evaluation' not in evaluation_results:
            return {'error': 'No evaluation results available'}
        
        eval_data = evaluation_results['evaluation']
        
        return {
            'summary': {
                'totalQuestions': len(evaluation_results.get('answers', [])),
                'totalCorrect': sum(1 for a in evaluation_results.get('answers', []) if a.get('isCorrect', False)),
                'accuracy': round((eval_data.get('confidence', 75))),  # Quick approximation
            },
            'expertiseLevel': eval_data.get('level', 'beginner'),
            'justification': eval_data.get('justification', ''),
            'confidence': eval_data.get('confidence', 75),
            'rich_recommendations': eval_data.get('rich_recommendations', {}),
            'mesh_discussion': eval_data.get('mesh_discussion', []),
            'evaluation_method': 'optimized_mesh_3_phase',
            'total_evaluation_time': eval_data.get('total_evaluation_time', 0)
        }