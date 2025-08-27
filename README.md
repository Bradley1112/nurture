You are to code out the app below part by part. Before you code each part, check in with me if I’m ready for you to develop it. After each part, run through with me what u did. Do not proceed on to the next parts.

Part 1: App set-up 
 Use react, html, javascript etc. as u deem fit
Set up the firebase database (follow the rough flow below)
users
|--- {userId}
     |--- name: "Alex"
     |--- dateToNextExam: Timestamp
     |--- level: "Sec 2"
     |
     |--- subjects
     |    |--- math
     |         |--- topics
     |              |--- algebraic_techniques
     |                   |--- expertiseLevel: "Apprentice"
     |                   |--- lastStudied: Timestamp
     |
     |--- studyPlan (new sub-collection)
          |--- {session_auto_id_1} (A document for each planned session)
          |    |--- scheduledDate: Timestamp        // The date and time the session is for
          |    |--- subjectId: "math"
          |    |--- topicId: "algebraic_techniques"
          |    |--- status: "scheduled"             // "scheduled", "completed", "missed"
          |    |--- sessionType: "learning"         // "learning", "review", "practice"
          |    |--- durationMinutes: 60              // Planned duration
          |    |--- performanceSummary: null        // To be filled after completion
          |
          |--- {session_auto_id_2}
          |    |--- scheduledDate: Timestamp
          |    |--- subjectId: "physics"
          |    |--- topicId: "kinematics"
          |    |--- status: "scheduled"
          |    |--- sessionType: "review"          // Based on spaced repetition
          |    |--- durationMinutes: 30
          |    |--- performanceSummary: null
Theme: Visuals of plants and greenery; give the vibe of growth.
Name of the app: Nurture
Vision: Education is about nurture.
Colour theme:
Background: #1A241B For main page backgrounds and dark mode surfaces.
Primary Actions: #49B85B For main buttons (e.g., "Submit"), active links, headlines, and important icons.
Text & Icons: #F5F5F5 For all body text, labels, and default state icons.
Secondary Elements: #386641 For secondary buttons (e.g., "Cancel"), card backgrounds, info banners, and input field borders.

Ask me any clarifications you have.

Part 2: Onboarding process
Login page
Create account
Ask for name, email address
Ask for secondary school level (i.e 1,2,3,4), nearest exam date (dd/mm/yyyy), target O-level year (i.e 2025, 2026, 2027, 2028)
Alt flow: login with previously created account -> go to dashboard
Evaluation quiz
Upon creating new account
Allow student to pick one or more topics from: 
Physics (SEAB Syllabus 6091) 
Kinematics
Elementary Mathematics (SEAB Syllabus 4048) 
Algebra: Solving linear/quadratic equations (Numerical Answer)
English Language (SEAB Syllabus 1128) 
Reading Comprehension: Test understanding of a given passage with questions on inference, main idea, and author's purpose (MCQ and Open-ended Questions).
Each of this subject must follow the Singapore GCE O level Syllabus
Retrieve the information using agentic RAG (leave a placeholder for this code, I will fill it in. Put in comments information I need to fill in for this code to integrate with the rest of the code)
Generate questions using the information retrieved by agentic RAG, according to the subject and topic format, and ramped difficulty format below:
Subject and topic format:
Physics (SEAB Syllabus 6091) The goal is to test both conceptual understanding and the application of formulas.
Kinematics: Definitions of speed/velocity/acceleration (MCQ), solving problems using kinematic equations (Structured Questions).
Test Format: A mix of Multiple-Choice Questions (MCQs) for core concepts and short, structured questions requiring numerical answers and explanations for problem-solving.
Elementary Mathematics (SEAB Syllabus 4048) Emphasis is on procedural fluency and the ability to apply mathematical concepts to solve problems.
Algebra: Solving linear/quadratic equations (Numerical Answer), simplifying expressions (Numerical Answer).
Test Format: Primarily numerical and structured questions where the student must provide a final answer, often after showing their work.
English Language (SEAB Syllabus 1128) This subject tests a broader range of skills beyond simple right/wrong answers.
Reading Comprehension: Test understanding of a given passage with questions on inference, main idea, and author's purpose (MCQ and Open-ended Questions).
Test Format: A combination of MCQs, fill-in-the-blanks, and open-ended text responses. Comprehension and writing components are key to assessing functional language skills.
Ramped difficulty question format:
Physics (SEAB Syllabus 6091) 
This structure uses MCQs for conceptual testing and Structured Questions for application, matching the required format.
Very Easy (2 questions): Definition Recall
Format: Multiple-Choice Question (MCQ)
Example: "Which of the following best defines acceleration?"
Easy (2 questions): Concept Identification
Format: Multiple-Choice Question (MCQ)
Example: "A car moving at a constant speed in a circle is accelerating. Which statement explains why?"
Medium (3 questions): Single-Formula Application
Format: Structured Question (requiring a numerical answer)
Example: "A ball is dropped from rest. Calculate its velocity after falling for 3.0 s, assuming g = 9.81 ms−2."
Hard (3 questions): Multi-Step Application
Format: Structured Question (requiring a numerical answer and working)
Example: "A car accelerates from 10 m/s to 30 m/s over a distance of 150 m. Calculate the time taken for this acceleration." (Requires finding 'a' first, then 't').
Very Hard (1-2 questions): Complex Synthesis
Format: Structured Question (requiring explanation and calculation)
Example: "A rocket expels gas to accelerate in deep space. Given the force and mass, calculate its displacement after 10 s, and explain how this relates to Newton's Third Law."
Elementary Mathematics (SEAB Syllabus 4048)
This ramp focuses entirely on Numerical and Structured Questions, emphasizing procedural fluency and problem-solving as required.
Very Easy (2 questions): Single-Step Procedure
Format: Numerical Answer
Example: "Solve for x: 5x−2=18."
Easy (2 questions): Standard Multi-Step Procedure
Format: Numerical Answer (showing work)
Example: "Simplify the expression: (2x+3)2−4x."
Medium (2-3 questions): Direct Application Problem
Format: Structured Question
Example: "The sum of two consecutive odd numbers is 56. Form a linear equation to find the two numbers."
Hard (1-2 questions): Interpretative Problem
Format: Structured Question
Example: "A rectangular garden has a perimeter of 44 m and an area of 120 m2. Find the dimensions of the garden by forming and solving a quadratic equation."
Very Hard (1 question): Non-Routine Problem
Format: Structured Question
Example: "Find all integer values of 'k' for which the quadratic equation x2−kx+(k+3)=0 has two distinct integer roots."

English Language (SEAB Syllabus 1128) 📚
For Reading Comprehension, the difficulty ramp is built into the questions for a single passage, using a mix of MCQs and Open-ended Questions to assess different levels of understanding.
Easy (2 questions): Literal Comprehension
Format: MCQ or Fill-in-the-Blank
Purpose: Test the ability to locate information explicitly stated in the text.
Example: "According to paragraph 2, what was the primary reason the expedition failed?"
Medium (2-3 questions): Inferential Comprehension
Format: MCQ or short Open-ended Question
Purpose: Test the ability to understand what is implied but not directly stated.
Example: "What does the author's use of the word 'surprisingly' in line 15 suggest about the team's expectations?"
Hard (1-2 questions): Analysis of Purpose and Tone
Format: Open-ended Text Response
Purpose: Test higher-order understanding of the author's craft and intent.
Example: "Explain, with evidence from the passage, how the author creates a mood of suspense in the final paragraph.”
Create new entries or link the entries to the firebase database based on what you have coded in this part . Output the new database.

Part 3: Agentic evaluation of the quiz
Each question will be marked using AWS bedrock's Sonnet 4.0 - IMPLEMENTED with full integration
After marking all the questions, store the correct/wrong score for each topic the student did for the evaluation quiz.
I want to have 3 agents with different roles here to evaluate the student according to a expertise level metric. AWS Strands SDK has been fully implemented for multi-agent collaboration.
You should use the collaborative swarm pattern. Your goal is to get a single, unified, and nuanced assessment of the student's expertise. The collaborative pattern allows the agents—MOE Teacher, perfect score student, and Tutor—to build upon each other's insights to form a holistic evaluation by seeing whether the student fits into the performance indicator and swarm analysis focus of each expertise level.
The MOE Teacher agent can analyze the student's responses from a pedagogical perspective, identifying common misconceptions.
The Tutor agent can focus on the specific errors made and relate them to gaps in foundational knowledge.
The Perfect Score Student agent can evaluate the efficiency and speed of the student's problem-solving methods.
Expertise level metric:
Expertise level
Performance Indicator (Based on Quiz Difficulty)
Swarm Analysis Focus
Beginner
Struggles to consistently answer Easy questions. Cannot solve Medium questions.
The student is missing core foundational knowledge. Agents should identify the specific fundamental concepts that are misunderstood.
Apprentice
Can answer Easy and most Medium questions, but fails at Hard questions.
The student understands the concepts but cannot apply them in complex, multi-step scenarios. Agents should focus on this "theory-to-application" gap.
Pro
Can consistently solve Hard questions but makes mistakes or fails on Very Hard questions.
The student is competent but lacks deep mastery or efficiency. Agents should look for inefficient methods or gaps in handling non-routine problems.
Grand Master
Consistently and efficiently solves Very Hard questions.
The student demonstrates full mastery. Agents should confirm the student's ability to synthesize information and solve creative, unfamiliar problems.


Display all 3 agents discussing the evaluation in a chat. Limit the discussion to 1 minute.
The expertise level should be displayed after the 1minute, along with a justification of maximum 100 characters.
Create new entries or link the entries to the firebase database based on what you have coded in this part . Output the new database.

Part 4: Personalised study plan
Personalize a study plan based on the student’s expertise level and the topic in question using spaced repetition. 
The Three AI Study Agents (leave a placeholder if you are unsure how to implement this)
These three AI agents are designed to generate a personalized study plan for the next month using the principle of spaced repetition. Spaced repetition is a learning technique that involves reviewing information at increasing intervals over time. The optimal intervals are determined by a student's expertise and the topic's difficulty, maximizing long-term retention.

Agent 1: The Strategist (MOE Teacher Persona)
Core Philosophy: "Syllabus coverage is paramount. We operate on deadlines and clear, structured goals. Mastery is achieved by ensuring every topic is covered and revised systematically before each key assessment."
Description: The Strategist functions like an experienced MOE teacher who knows the syllabus inside and out. Its primary goal is to ensure the student has learned and reviewed every required topic before the Mid-Year exams, the Preliminary exams, and ultimately, the O-Level examinations. It is pragmatic, efficient, and results-oriented. The plan it generates is structured, non-negotiable, and optimized for exam readiness.
How it Implements Spaced Repetition: The Strategist uses a "deadline-anchored" model. It calculates the latest possible date a student must learn a new topic to fit in a minimum number of review cycles before the next exam. If a student falls behind, the AI will prioritize catching up on new content over extending review intervals for older, better-understood topics. The goal is 100% syllabus exposure before the final sprint.

Agent 2: The Mentor (Tutor Persona)
Core Philosophy: "True understanding is the foundation of success. Let's not rush; let's build confidence one concept at a time. A house built on a weak foundation will crumble under pressure."
Description: The Mentor embodies the patience and encouragement of a dedicated private tutor. It prioritizes deep conceptual understanding over speed. This AI believes that moving on to a new topic before mastering the prerequisite is inefficient and leads to anxiety. It creates a flexible, responsive plan that adapts to the student's pace of learning.
How it Implements Spaced Repetition: The Mentor uses a "competency-based" model. The AI will actively postpone the introduction of new, more advanced topics until the foundational concepts are solidified. Its timeline is fluid and can be re-projected weekly based on the student's progress and self-reported confidence.

Agent 3: The Optimizer (Perfect Scorer Student Persona)
Core Philosophy: "Peak performance is a marathon, not a sprint. Burnout is the enemy of excellence. We will achieve top results by integrating effective study with strategic rest, ensuring mental and physical well-being."
Description: Coming from the perspective of a top student who understands the immense pressure Singaporean students face, The Optimizer focuses on sustainable high performance. It treats rest, sleep, and hobbies as critical components of a successful study plan, not as obstacles. It uses data to find the student's optimal study rhythms and builds a holistic schedule that prevents burnout while maximizing efficiency.
How it Implements Spaced Repetition: The Optimizer takes into consideration rest timings.
Display all 3 agents discussing the timeline in a chat. Limit the discussion to 1 minute.
Create new entries or link the entries to the firebase database based on what you have coded in this part . Output the new database.

Part 5: Dashboard
The dashboard should be minimalistic
Using the timeline from part 4, display the study plan timeline for the next month, along with the date of the next exam and O level exam date. (Make this timeline minimalistic and fit the colour themes of the app)
Have a section below the timeline to display the subjects and its topics:
Physics (SEAB Syllabus 6091) 
Kinematics
Elementary Mathematics (SEAB Syllabus 4048) 
Algebra: Solving linear/quadratic equations (Numerical Answer), simplifying expressions (Numerical Answer).
English Language (SEAB Syllabus 1128) 
Reading Comprehension: Test understanding of a given passage with questions on inference, main idea, and author's purpose (MCQ and Open-ended Questions).
If a topic was evaluated during the evaluation quiz in part 3, display a “continue studying” button.
If a topic has not been evaluated yet or started yet, display a “begin studying” button
For all topics that have been evaluated/studied, display the expertise level next to the topic
Create new entries or link the entries to the firebase database based on what you have coded in this part. Output the new database.

Part 6: Study session setup
When a student selects which subject he wants to start/continue a study session on, he can select how much time he has to study (e.g. 30 mins, 1 hour, 2 hours), as well as which subject and topic he wants to study. Based on his time to study, come up with a pomodoro clock (eg. 60min study, 15min rest). Display the pomodoro clock when he studies. 
When study time is up display a peaceful background of nature, play calming music and have a countdown timer till rest is over. Once rest time is over, go back to the study session.
Beside each topic, also indicate which level he has, with colour indicators (eg red for beginner…). He will then be prompted with a quick question asking him for his “focus level”, and his “ stress” he is. Based on that, determine the length of the study session, frequency of breaks, intensity of study session, which study method to use (choose something thats a bit less brain intensive if the student is tired ), and how much content to cover.  
For each study session, change the duration of session depending on his focus and stress level.
Create new entries or link the entries to the firebase database based on what you have coded in this part . Output the new database.
Part 7: Within the study session (leave a placeholder if you are unsure how to code this using AWS Strands SDK)
Within the study session, use the following agent configuration:  The system is implemented as an Agent Graph using a Star Topology.
Central Hub (Orchestrating Agent): At the center of the architecture is the Orchestrating Agent. Its primary role is to manage the entire study session. It retrieves the student’s expertise level, directs them to the appropriate learning or practice session, and coordinates the actions of all specialized agents to create a seamless experience.
Specialized Nodes (Agents with Learning & Practice Tools): Connected to the orchestrator are several specialized agents, each with a distinct role and set of tools. These agents are the functional heart of the platform, delivering the educational content and interactions.
The role of the orchestrating agent is also to determine the appropriate mixture of learning and practice modes. (eg. Beginner / apprentice / pro / grandmaster), choose an appropriate blend of learning and practice modes within each study session. For instance, if the student has studied sufficient content within a session, and the agent feels like he has a good mastery, he can move on to doing practice questions. 
Teacher agent: 
In learning session mode, he will Functions as a lecturer, providing engaging, well-structured explanations of core concepts to build foundational knowledge. Do not just content dump but explain content in digestible chunks.
In practice session mode, he Functions as an examiner, providing curated, exam-style questions according to the Singapore GCE O level curriculum that are appropriate for the student's current expertise level. Also provide the answer after each question answered.
Whenever planning a study plan, his priority should be to make sure the student can finish content on time before exam, with sufficient time for doing practice papers. 
Tutor agent: 
In learning session mode, Adopt the Socratic method, prompting the student with interactive questions to guide them toward discovering insights on their own. This promotes deep conceptual understanding over rote memorization.
In practice session mode, after each question answered when appropriate include the 1. Correct answer 2. Explanation 3. Subject-specific answering technique (how to structure your answers, using keywords, time management (at the question level), and other skills
Whenever planning a study plan, his priority should be to ensure the student understands the topic.
Perfect scorer student agent
In learning session mode, consists  a visual and memory assistant agent. It can create diagrams and mind maps (by generating Mermaid code), flashcards, and memory aids like mnemonics and chunking information into logical groups. (Maybe have a tool for each of these features which the visual and memory assistant decides to call base on the topic).
In practice session mode, he simulates a peer study session. This agent prompts the user to explain concepts back in their own words, a powerful technique for reinforcing knowledge. At the end of the interaction, it provides feedback and re-evaluates the student's understanding, completing the active-recall loop.
Whenever planning a study plan, his priority should be the mental and physical wellbeing of te student. He should take into consideration things like stress level, physical fatigue, other commmitmets that may be present at certain points of time etc. 
Create new entries or link the entries to the firebase database based on what you have coded in this part . Output the new database.
Part 8: After the study session
After each session, re-evalaute the expertise of the student based on how well he did for each session using the same agentic method as part 3 (leave placeholder if you are unsure how to implement the code)
Adjust the one month study plan timeline based on that by removing or adding scheduled sessions for that topic using the same agentic method as part 4 (leave placeholder if you are unsure how to implement the code)
Create new entries or link the entries to the firebase database based on what you have coded in this part. Output the new database.