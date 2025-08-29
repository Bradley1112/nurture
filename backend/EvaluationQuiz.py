import json
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from strands import Agent, tool
from strands_tools import http_request
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Subject:
    name: str
    syllabus: str
    icon: str
    topics: List[str]
    description: str

@dataclass
class Question:
    id: str
    topic: str
    subject: str
    difficulty: str
    type: str
    question: str
    options: Optional[List[str]]
    correct_answer: str
    explanation: str

class EvaluationQuizAgent:
    def __init__(self):
        # Singapore official sources
        self.sources = {
            'MOE_SYLLABUS_BASE': 'https://www.seab.gov.sg/docs/default-source/national-examinations/syllabus',
            'PHYSICS_SYLLABUS': 'https://www.seab.gov.sg/docs/default-source/national-examinations/syllabus/olevel/2024syllabus/6091_y24_sy.pdf',
            'MATH_SYLLABUS': 'https://www.seab.gov.sg/docs/default-source/national-examinations/syllabus/olevel/2024syllabus/4048_y24_sy.pdf',
            'ENGLISH_SYLLABUS': 'https://www.seab.gov.sg/docs/default-source/national-examinations/syllabus/olevel/2024syllabus/1128_y24_sy.pdf',
            'MOE_CURRICULUM': 'https://www.moe.gov.sg/education-in-sg/our-programmes/express-course-secondary',
            'PHYSICS_RESOURCES': 'https://www.physicstutoronline.com/singapore-o-level-physics/',
            'MATH_RESOURCES': 'https://www.exammaths.com/singapore-o-level-mathematics/',
            'ENGLISH_RESOURCES': 'https://www.englishgrammar.org/singapore-english/'
        }
        
        self.subjects = [
            Subject(
                name='Physics',
                syllabus='6091',
                icon='⚡',
                topics=['Kinematics'],
                description='Test your understanding of motion, velocity, and acceleration'
            ),
            Subject(
                name='Elementary Mathematics',
                syllabus='4048',
                icon='📐',
                topics=['Algebra: Solving linear/quadratic equations', 'Algebra: simplifying expressions'],
                description='Master algebraic problem-solving and expression simplification'
            ),
            Subject(
                name='English Language',
                syllabus='1128',
                icon='📚',
                topics=['Reading Comprehension'],
                description='Develop critical reading and analytical thinking skills'
            )
        ]
        
        # Initialize agents
        self.setup_agents()
        
        # Create agent pool for reuse
        self.agent_pool = []
        self.pool_size = 3  # Create 3 agents for concurrent use
        self._initialize_agent_pool()

    def _initialize_agent_pool(self):
        """Initialize a pool of reusable agents for question generation"""
        for i in range(self.pool_size):
            agent = Agent(
                tools=self.agent_tools,
                model=self.model_id
            )
            self.agent_pool.append(agent)
    
    def _get_agent_from_pool(self, index: int) -> Agent:
        """Get an agent from the pool based on index"""
        return self.agent_pool[index % len(self.agent_pool)]
    
    def _reset_agent_conversation(self, agent: Agent):
        """Reset agent conversation history if needed"""
        # Clear conversation history to prevent accumulation
        if hasattr(agent, '_conversation_history'):
            agent._conversation_history = []
        # Or if Strands has a different method to clear history
        # agent.clear_history() # Check Strands documentation for actual method

    def _get_fallback_content(self, syllabus_code: str, topic: str) -> str:
        """Fallback content when HTTP requests fail"""
        if syllabus_code == '6091' and 'Kinematics' in topic:
            return """
            PHYSICS KINEMATICS SYLLABUS CONTENT:
            - Distance and displacement
            - Speed and velocity
            - Acceleration
            - Equations of motion
            - Motion graphs (distance-time, velocity-time)
            - Free fall and projectile motion
            
            Learning Objectives:
            - Define and distinguish between distance and displacement
            - Calculate average speed and velocity
            - Apply equations of motion to solve problems
            - Interpret motion graphs
            """
        elif syllabus_code == '4048' and 'Algebra' in topic:
            return """
            MATHEMATICS ALGEBRA SYLLABUS CONTENT:
            - Linear equations in one variable
            - Quadratic equations and factorization
            - Simultaneous equations
            - Algebraic manipulation
            - Word problems involving equations
            
            Learning Objectives:
            - Solve linear and quadratic equations
            - Factorize algebraic expressions
            - Apply algebraic methods to real-world problems
            """
        elif syllabus_code == '1128' and 'Reading Comprehension' in topic:
            return """
            ENGLISH READING COMPREHENSION SYLLABUS CONTENT:
            - Understanding main ideas and supporting details
            - Making inferences and drawing conclusions
            - Analyzing author's purpose and tone
            - Vocabulary in context
            - Critical evaluation of texts
            
            Learning Objectives:
            - Demonstrate understanding of explicit and implicit meanings
            - Analyze literary and non-literary texts
            - Evaluate effectiveness of language use
            """
        return f"Fallback content for {syllabus_code} - {topic}"
    
    def setup_agents(self):
        """Setup specialized agents for different tasks"""
        
        # Syllabus Retrieval Agent
        @tool
        def fetch_syllabus_content(syllabus_code: str, topic: str) -> str:
            """
            Fetch Singapore GCE O-Level syllabus content for specific topics.
            
            Args:
                syllabus_code (str): The syllabus code (e.g., '6091', '4048', '1128')
                topic (str): The specific topic to retrieve content for
            
            Returns:
                str: Retrieved syllabus content and educational resources
            """
            try:
                # Map syllabus codes to URLs
                syllabus_urls = {
                    '6091': self.sources['PHYSICS_SYLLABUS'],
                    '4048': self.sources['MATH_SYLLABUS'],
                    '1128': self.sources['ENGLISH_SYLLABUS']
                }
                
                resource_urls = {
                    '6091': [self.sources['PHYSICS_RESOURCES'], self.sources['MOE_CURRICULUM']],
                    '4048': [self.sources['MATH_RESOURCES'], self.sources['MOE_CURRICULUM']],
                    '1128': [self.sources['ENGLISH_RESOURCES'], self.sources['MOE_CURRICULUM']]
                }
                
                content = f"Syllabus Content for {syllabus_code} - Topic: {topic}\n\n"
                
                # Use http_request tool to fetch actual content
                if syllabus_code in resource_urls:
                    for url in resource_urls[syllabus_code]:
                        try:
                            # Use http_request to get content
                            response_content = http_request(url)
                            content += f"\n--- Content from {url} ---\n"
                            content += str(response_content)[:1500]  # Limit content length
                            content += "\n" + "="*50 + "\n"
                        except Exception as e:
                            content += f"\nFailed to fetch {url}: {str(e)}\n"
                
                # Add fallback content if HTTP requests didn't provide enough content
                if len(content.strip()) < 200:
                    content += self._get_fallback_content(syllabus_code, topic)
                
                return content
                
            except Exception as e:
                return f"Error retrieving syllabus content: {str(e)}\n\n" + self._get_fallback_content(syllabus_code, topic)
    
        # Question Generation Agent
        @tool
        def generate_adaptive_questions(topic: str, difficulty: str, question_type: str, syllabus_content: str) -> Dict[str, Any]:
            """
            Generate questions with adaptive difficulty based on Singapore O-Level syllabus.
            
            Args:
                topic (str): The academic topic
                difficulty (str): Question difficulty level
                question_type (str): Type of question (mcq, structured, etc.)
                syllabus_content (str): Retrieved syllabus content for context
            
            Returns:
                Dict: Generated question with all required fields
            """
            
            # Question templates based on difficulty and subject
            question_templates = {
                'Physics': {
                    'easy': {
                        'mcq': "What is the SI unit for velocity and which equation represents displacement?",
                        'options': ["m/s and s = ut + ½at²", "m/s² and v = u + at", "m and d = vt", "km/h and a = v/t"]
                    },
                    'medium': {
                        'structured': "A car accelerates from rest at 2 m/s² for 5 seconds. Calculate the final velocity and distance traveled."
                    },
                    'hard': {
                        'structured': "A projectile is launched at 30° to the horizontal with initial velocity 20 m/s. Find the maximum height and range."
                    },
                    'very_hard': {
                        'structured_explanation': "Analyze the motion of a ball thrown vertically upward, including energy transformations and real-world factors."
                    }
                },
                'Mathematics': {
                    'easy': {
                        'mcq': "Solve x + 5 = 12 and identify which method can solve x² - 5x + 6 = 0",
                        'options': ["x = 7; Factoring only", "x = 7; All algebraic methods", "x = 17; Quadratic formula only", "x = 5; Completing square only"]
                    },
                    'medium': {
                        'structured': "Solve the simultaneous equations: 2x + 3y = 7 and x - y = 1"
                    },
                    'hard': {
                        'structured': "A rectangular garden has perimeter 24m. If length is 2m more than width, find dimensions and area."
                    },
                    'very_hard': {
                        'structured_explanation': "Design a cost optimization problem involving quadratic functions and explain your mathematical reasoning."
                    }
                },
                'English': {
                    'easy': {
                        'mcq': "What does 'comprehension' mean and what is the main idea when the author's tone is optimistic?",
                        'options': ["Understanding; positive perspective on the topic", "Speed; negative view of events", "Writing; neutral stance", "Speaking; critical analysis"]
                    },
                    'medium': {
                        'structured': "Explain the difference between the author's explicit and implicit messages in the given passage."
                    },
                    'hard': {
                        'structured': "Analyze how the writer uses literary devices to convey the central theme."
                    },
                    'very_hard': {
                        'structured_explanation': "Critically evaluate the effectiveness of the writer's argument, considering evidence, reasoning, and potential counterarguments."
                    }
                }
            }
            
            # Determine subject from topic
            subject = "Physics" if "Kinematics" in topic else "Mathematics" if "Algebra" in topic else "English"
            
            # Get appropriate template
            template = question_templates.get(subject, {}).get(difficulty, {})
            
            question_data = {
                'id': f"{topic.replace(' ', '_').lower()}_{difficulty}_{question_type}",
                'topic': topic,
                'subject': subject,
                'difficulty': difficulty,
                'type': question_type,
                'question': template.get(question_type, f"Sample {difficulty} question for {topic}"),
                'options': template.get('options') if question_type == 'mcq' else None,
                'correct_answer': template.get('options', ['Sample answer'])[0] if question_type == 'mcq' else "Sample structured answer",
                'explanation': f"This {difficulty} question tests understanding of {topic} concepts from the Singapore O-Level {subject} syllabus."
            }
            
            return question_data
        
        # Main RAG Agent
        self.rag_agent = Agent(
            tools=[http_request, fetch_syllabus_content, generate_adaptive_questions],
            model="anthropic.claude-sonnet-4-20250514-v1:0"  # Corrected model ID
        )
        
        # Agent configuration for pool creation
        self.model_id = "anthropic.claude-sonnet-4-20250514-v1:0"  # Corrected model ID
        self.agent_tools = [generate_adaptive_questions]
    
    async def start_quiz_async(self, selected_topics: List[str]) -> Dict[str, Any]:
        """
        Async method to start quiz with agentic RAG integration
        """
        if not selected_topics:
            raise ValueError("No topics selected")
        
        try:
            # Get selected syllabi
            selected_syllabi = self.get_selected_syllabi(selected_topics)
            
            logger.info(f"Starting quiz for topics: {selected_topics}")
            logger.info(f"Using syllabi: {selected_syllabi}")
            
            # Step 1: Retrieve syllabus content using RAG agent
            syllabus_content = {}
            for topic in selected_topics:
                subject = self.get_subject_by_topic(topic)
                if subject:
                    content_query = f"Retrieve detailed syllabus content for {topic} from Singapore O-Level {subject.name} syllabus {subject.syllabus}"
                    
                    # Use the agent to fetch content
                    result = await self.rag_agent.invoke_async(content_query)
                    syllabus_content[topic] = result.message
            
            # Step 2: Generate questions with ramped difficulty (PARALLEL OPTIMIZATION)
            generated_questions = []
            
            # Define difficulty progression (9 questions total)
            difficulty_config = [
                {'level': 'easy', 'count': 2, 'type': 'mcq'},
                {'level': 'medium', 'count': 3, 'type': 'structured'},
                {'level': 'hard', 'count': 3, 'type': 'structured'},
                {'level': 'very_hard', 'count': 1, 'type': 'structured_explanation'}
            ]
            
            # Collect question metadata for batch processing
            question_metadata = []
            
            for topic in selected_topics:
                topic_content = syllabus_content.get(topic, "")
                
                for diff_config in difficulty_config:
                    for i in range(diff_config['count']):
                        # Store metadata for agent pool batch processing
                        question_metadata.append({
                            'topic': topic,
                            'difficulty': diff_config['level'],
                            'type': diff_config['type'],
                            'index': i + 1,
                            'subject': self.get_subject_by_topic(topic).name
                        })
            
            # RATE-LIMITED BATCHED EXECUTION: Generate questions in batches of 3
            batch_size = 3
            question_results = []
            
            logger.info(f"Generating {len(question_metadata)} questions in batches of {batch_size}...")
            
            for i in range(0, len(question_metadata), batch_size):
                batch_metadata = question_metadata[i:i + batch_size]
                logger.info(f"Processing batch {i//batch_size + 1}/{(len(question_metadata) + batch_size - 1)//batch_size} ({len(batch_metadata)} questions)")
                
                # Function to create new tasks for this batch using agent pool
                def create_batch_tasks():
                    batch_tasks = []
                    for idx, metadata in enumerate(batch_metadata):
                        question_prompt = f"""
                        Generate a concise {metadata['difficulty']} difficulty {metadata['type']} question for '{metadata['topic']}' ({metadata['subject']}).
                        
                        Format: Question text + options (if MCQ) + correct answer.
                        Keep it focused on Singapore O-Level standards.
                        Difficulty: {metadata['difficulty']}
                        """
                        # Use agent from pool instead of creating fresh ones
                        agent_index = idx % len(self.agent_pool)
                        agent = self._get_agent_from_pool(agent_index)
                        
                        # Reset conversation history to prevent accumulation
                        self._reset_agent_conversation(agent)
                        
                        task = agent.invoke_async(question_prompt)
                        batch_tasks.append(task)
                    return batch_tasks
                
                try:
                    batch_tasks = create_batch_tasks()
                    batch_results = await asyncio.gather(*batch_tasks)
                    question_results.extend(batch_results)
                    
                    # Add delay between batches to prevent rate limiting
                    if i + batch_size < len(question_metadata):
                        await asyncio.sleep(2)  # 2 second delay between batches
                        
                except Exception as e:
                    logger.error(f"Batch failed, retrying with exponential backoff: {e}")
                    # Exponential backoff retry for failed batch
                    for retry in range(3):
                        wait_time = 2 ** retry  # 2, 4, 8 seconds
                        logger.info(f"Retrying batch after {wait_time} seconds (attempt {retry + 1}/3)")
                        await asyncio.sleep(wait_time)
                        
                        try:
                            # Create NEW tasks for retry (can't reuse awaited coroutines)
                            retry_batch_tasks = create_batch_tasks()
                            batch_results = await asyncio.gather(*retry_batch_tasks)
                            question_results.extend(batch_results)
                            break
                        except Exception as retry_error:
                            if retry == 2:  # Last attempt
                                logger.error(f"Batch failed after all retries: {retry_error}")
                                raise
                            continue
            
            # Process results into Question objects
            for result, metadata in zip(question_results, question_metadata):
                # Extract text content from the AI response
                if hasattr(result, 'message'):
                    if isinstance(result.message, dict) and 'content' in result.message:
                        question_text = result.message['content'][0]['text'] if result.message['content'] else str(result.message)
                    else:
                        question_text = str(result.message)
                else:
                    question_text = str(result)
                
                # Clean up the question text to extract just the question part
                if '**Question:**' in question_text:
                    # Extract the question part only
                    parts = question_text.split('**Question:**')
                    if len(parts) > 1:
                        question_part = parts[1].split('**Correct Answer:**')[0].split('**Solution:**')[0].strip()
                        question_text = question_part
                
                question = Question(
                    id=f"{metadata['topic']}_{metadata['difficulty']}_{metadata['index']}",
                    topic=metadata['topic'],
                    subject=metadata['subject'],
                    difficulty=metadata['difficulty'],
                    type=metadata['type'],
                    question=question_text,
                    options=['Option A', 'Option B', 'Option C', 'Option D'] if metadata['type'] == 'mcq' else None,
                    correct_answer='Option A' if metadata['type'] == 'mcq' else 'Structured answer',
                    explanation=f"AI-generated explanation for {metadata['topic']} question"
                )
                generated_questions.append(question)
            
            # Prepare quiz session data
            quiz_data = {
                'questions': [q.__dict__ for q in generated_questions],
                'topics': selected_topics,
                'syllabi': selected_syllabi,
                'start_time': datetime.now().isoformat(),
                'syllabus_content': syllabus_content,
                'total_questions': len(generated_questions)
            }
            
            logger.info(f"Generated {len(generated_questions)} questions for quiz session")
            return quiz_data
            
        except Exception as e:
            logger.error(f"Failed to start quiz: {str(e)}")
            raise
    
    def start_quiz(self, selected_topics: List[str]) -> Dict[str, Any]:
        """
        Synchronous wrapper for starting quiz
        """
        return asyncio.run(self.start_quiz_async(selected_topics))
    
    def start_quiz_with_progress(self, selected_topics: List[str], session_id: str, progress_store: dict) -> Dict[str, Any]:
        """
        Synchronous wrapper for starting quiz with progress tracking
        """
        return asyncio.run(self.start_quiz_async_with_progress(selected_topics, session_id, progress_store))
    
    async def start_quiz_async_with_progress(self, selected_topics: List[str], session_id: str, progress_store: dict) -> Dict[str, Any]:
        """
        Async method to start quiz with progress tracking
        """
        try:
            # Update progress
            progress_store[session_id].update({
                'status': 'initializing',
                'message': 'Setting up quiz parameters...',
                'current_batch': 0,
                'total_batches': 3
            })
            
            # Use the existing quiz generation logic but with progress updates
            if not selected_topics:
                raise ValueError("No topics selected")
            
            # Get selected syllabi
            selected_syllabi = []
            for topic in selected_topics:
                subject = self.get_subject_by_topic(topic)
                if subject:
                    selected_syllabi.append(subject.syllabus)
            
            # Fetch syllabus content
            syllabus_content = {}
            for syllabus in set(selected_syllabi):
                try:
                    content_result = await self.rag_agent.invoke_async(f"fetch_syllabus_content('{syllabus}')")
                    syllabus_content[syllabus] = content_result.message
                except Exception as e:
                    logger.warning(f"Failed to fetch syllabus {syllabus}: {e}")
                    syllabus_content[syllabus] = ""
            
            # Question distribution configuration (9 questions total)
            difficulty_config = [
                {'level': 'easy', 'count': 2, 'type': 'mcq'},
                {'level': 'medium', 'count': 3, 'type': 'structured'},
                {'level': 'hard', 'count': 3, 'type': 'structured'},
                {'level': 'very_hard', 'count': 1, 'type': 'structured_explanation'}
            ]
            
            # Collect question metadata for batch processing
            question_metadata = []
            
            for topic in selected_topics:
                topic_content = syllabus_content.get(topic, "")
                
                for diff_config in difficulty_config:
                    for i in range(diff_config['count']):
                        # Store metadata for agent pool batch processing
                        question_metadata.append({
                            'topic': topic,
                            'difficulty': diff_config['level'],
                            'type': diff_config['type'],
                            'index': i + 1,
                            'subject': self.get_subject_by_topic(topic).name
                        })
            
            # RATE-LIMITED BATCHED EXECUTION: Generate questions in batches of 3
            batch_size = 3
            question_results = []
            
            total_batches = (len(question_metadata) + batch_size - 1) // batch_size
            
            # Update progress with correct total batches
            progress_store[session_id].update({
                'status': 'generating',
                'message': 'Generating quiz questions...',
                'total_batches': total_batches
            })
            
            logger.info(f"Generating {len(question_metadata)} questions in batches of {batch_size}...")
            
            for i in range(0, len(question_metadata), batch_size):
                batch_metadata = question_metadata[i:i + batch_size]
                current_batch = i//batch_size + 1
                
                # Update progress for current batch
                progress_store[session_id].update({
                    'current_batch': current_batch,
                    'message': f'Processing batch {current_batch}/{total_batches} ({len(batch_metadata)} questions)...'
                })
                
                logger.info(f"Processing batch {current_batch}/{total_batches} ({len(batch_metadata)} questions)")
                
                # Function to create new tasks for this batch using agent pool
                def create_batch_tasks():
                    batch_tasks = []
                    for idx, metadata in enumerate(batch_metadata):
                        question_prompt = f"""
                        Generate a concise {metadata['difficulty']} difficulty {metadata['type']} question for '{metadata['topic']}' ({metadata['subject']}).
                        
                        Format: Question text + options (if MCQ) + correct answer.
                        Keep it focused on Singapore O-Level standards.
                        Difficulty: {metadata['difficulty']}
                        """
                        # Use agent from pool instead of creating fresh ones
                        agent_index = idx % len(self.agent_pool)
                        agent = self._get_agent_from_pool(agent_index)
                        
                        # Reset conversation history to prevent accumulation
                        self._reset_agent_conversation(agent)
                        
                        task = agent.invoke_async(question_prompt)
                        batch_tasks.append(task)
                    return batch_tasks
                
                try:
                    batch_tasks = create_batch_tasks()
                    batch_results = await asyncio.gather(*batch_tasks)
                    question_results.extend(batch_results)
                    
                    # Update progress after successful batch
                    progress_store[session_id].update({
                        'message': f'Completed batch {current_batch}/{total_batches}'
                    })
                    
                    # Add delay between batches to prevent rate limiting
                    if i + batch_size < len(question_metadata):
                        await asyncio.sleep(2)  # 2 second delay between batches
                        
                except Exception as e:
                    logger.error(f"Batch failed, retrying with exponential backoff: {e}")
                    # Exponential backoff retry for failed batch
                    for retry in range(3):
                        wait_time = 2 ** retry  # 2, 4, 8 seconds
                        logger.info(f"Retrying batch after {wait_time} seconds (attempt {retry + 1}/3)")
                        
                        progress_store[session_id].update({
                            'message': f'Retrying batch {current_batch}/{total_batches} (attempt {retry + 1}/3)...'
                        })
                        
                        await asyncio.sleep(wait_time)
                        
                        try:
                            # Create NEW tasks for retry (can't reuse awaited coroutines)
                            retry_batch_tasks = create_batch_tasks()
                            batch_results = await asyncio.gather(*retry_batch_tasks)
                            question_results.extend(batch_results)
                            break
                        except Exception as retry_error:
                            if retry == 2:  # Last attempt
                                logger.error(f"Batch failed after all retries: {retry_error}")
                                raise
                            continue
            
            # Update progress for final processing
            progress_store[session_id].update({
                'status': 'finalizing',
                'message': 'Finalizing quiz data...',
                'current_batch': total_batches
            })
            
            # Process results into Question objects
            generated_questions = []
            for result, metadata in zip(question_results, question_metadata):
                question = Question(
                    id=f"{metadata['topic']}_{metadata['difficulty']}_{metadata['index']}",
                    topic=metadata['topic'],
                    subject=metadata['subject'],
                    difficulty=metadata['difficulty'],
                    type=metadata['type'],
                    question=result.message,
                    options=['Option A', 'Option B', 'Option C', 'Option D'] if metadata['type'] == 'mcq' else None,
                    correct_answer='Option A' if metadata['type'] == 'mcq' else 'Structured answer',
                    explanation=f"AI-generated explanation for {metadata['topic']} question"
                )
                generated_questions.append(question)
            
            # Prepare quiz session data
            quiz_data = {
                'questions': [q.__dict__ for q in generated_questions],
                'topics': selected_topics,
                'syllabi': selected_syllabi,
                'start_time': datetime.now().isoformat(),
                'syllabus_content': syllabus_content,
                'total_questions': len(generated_questions)
            }
            
            logger.info(f"Generated {len(generated_questions)} questions for quiz session")
            return quiz_data
            
        except Exception as e:
            logger.error(f"Failed to start quiz: {str(e)}")
            # Update progress with error
            if session_id in progress_store:
                progress_store[session_id].update({
                    'status': 'error',
                    'message': f'Quiz generation failed: {str(e)}'
                })
            raise
    
    def get_subject_by_topic(self, topic: str) -> Optional[Subject]:
        """Find subject that contains the given topic"""
        for subject in self.subjects:
            if topic in subject.topics:
                return subject
        return None
    
    def get_selected_syllabi(self, selected_topics: List[str]) -> List[str]:
        """Get unique syllabi codes for selected topics"""
        unique_syllabi = set()
        for topic in selected_topics:
            subject = self.get_subject_by_topic(topic)
            if subject:
                unique_syllabi.add(subject.syllabus)
        return list(unique_syllabi)
    
    def display_subject_selection(self) -> None:
        """Display available subjects and topics for selection"""
        print("🧠 Assessment Time")
        print("Choose subjects to discover your current expertise level and build your personalized learning path\n")
        
        for i, subject in enumerate(self.subjects, 1):
            print(f"{subject.icon} {subject.name}")
            print(f"   Syllabus: {subject.syllabus}")
            print(f"   Description: {subject.description}")
            print("   Topics:")
            for j, topic in enumerate(subject.topics):
                print(f"     {j+1}. {topic}")
            print()
    
    def get_user_topic_selection(self) -> List[str]:
        """Interactive topic selection"""
        self.display_subject_selection()
        
        available_topics = []
        for subject in self.subjects:
            available_topics.extend(subject.topics)
        
        print("Available topics:")
        for i, topic in enumerate(available_topics, 1):
            print(f"{i}. {topic}")
        
        print("\nEnter topic numbers separated by commas (e.g., 1,2,3):")
        selection = input().strip()
        
        selected_topics = []
        try:
            indices = [int(x.strip()) - 1 for x in selection.split(',')]
            selected_topics = [available_topics[i] for i in indices if 0 <= i < len(available_topics)]
        except (ValueError, IndexError):
            print("Invalid selection. Please try again.")
            return self.get_user_topic_selection()
        
        return selected_topics

# Main execution
async def main():
    """Main function to run the evaluation quiz system"""
    quiz_system = EvaluationQuizAgent()
    
    # Interactive topic selection
    selected_topics = quiz_system.get_user_topic_selection()
    
    if not selected_topics:
        print("No topics selected. Exiting...")
        return
    
    print(f"\n🌱 {len(selected_topics)} topic(s) selected: {', '.join(selected_topics)}")
    print("🚀 Starting quiz generation...")
    
    try:
        # Generate quiz using agentic RAG system
        quiz_data = await quiz_system.start_quiz_async(selected_topics)
        
        print(f"\n✅ Quiz generated successfully!")
        print(f"📊 Total questions: {quiz_data['total_questions']}")
        print(f"📚 Topics covered: {', '.join(quiz_data['topics'])}")
        print(f"📋 Syllabi: {', '.join(quiz_data['syllabi'])}")
        
        # Display sample questions
        print("\n📝 Sample Questions:")
        for i, question in enumerate(quiz_data['questions'][:3], 1):
            print(f"\n{i}. [{question['difficulty'].upper()}] {question['question']}")
            if question['options']:
                for j, option in enumerate(question['options'], 1):
                    print(f"   {chr(64+j)}. {option}")
        
        # Save quiz data
        with open('quiz_session.json', 'w') as f:
            json.dump(quiz_data, f, indent=2)
        
        print(f"\n💾 Quiz data saved to 'quiz_session.json'")
        print("🎯 Ready to begin assessment!")
        
    except Exception as e:
        print(f"❌ Failed to generate quiz: {str(e)}")

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())