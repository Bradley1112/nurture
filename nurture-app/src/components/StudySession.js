import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PomodoroClock from './PomodoroClock';
import { getFirestore, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// AWS Strands integration now handled via backend API

/**
 * Part 7: Study Session with Chatbot Interface & Agent Graph (Star Topology)
 * 
 * Architecture:
 * - Student interacts through a chatbot interface
 * - Orchestrating Agent makes all decisions about learning/practice blend
 * - Orchestrator calls specialized agents (Teacher, Tutor, Perfect Scorer) dynamically
 * - Seamless chat experience powered by AWS Strands SDK Agent Graph
 * 
 * Flow:
 * 1. Student enters empty chatbot interface
 * 2. Orchestrator analyzes: expertise, focus, stress, time, exam dates
 * 3. Orchestrator decides perfect blend of learning/practice
 * 4. Orchestrator calls relevant agents throughout session as needed
 * 5. Student sees unified responses from the orchestrator
 */

const StudySession = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const chatEndRef = useRef(null);
    
    const { 
        studyTime, 
        breakTime, 
        sessionId, 
        topicId, 
        subjectId, 
        expertiseLevel = 'beginner',
        focusLevel = 5,
        stressLevel = 3,
        examDate = null 
    } = location.state || {};

    // Session state
    const [mode, setMode] = useState('Study'); // 'Study' or 'Rest'
    const [totalSeconds, setTotalSeconds] = useState(studyTime * 60);
    const [isActive, setIsActive] = useState(true);
    
    // Chat interface state
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isOrchestratorThinking, setIsOrchestratorThinking] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);
    
    // Agent Graph state
    const [agentGraph, setAgentGraph] = useState(null);
    const [currentAgent, setCurrentAgent] = useState(null);
    const [currentMode, setCurrentMode] = useState('learning');
    
    // Session tracking
    const [sessionData, setSessionData] = useState({
        startTime: new Date(),
        currentMode: null, // Will be determined by orchestrator
        agentInteractions: [],
        studentProgress: {
            conceptsLearned: 0,
            questionsAnswered: 0,
            correctAnswers: 0,
            engagementScore: 100,
            currentStreak: 0
        },
        orchestratorDecisions: []
    });

    // Agent configurations
    const agentProfiles = {
        orchestrator: {
            name: "Study Orchestrator",
            icon: "🎯",
            color: "#49B85B"
        },
        teacher: {
            name: "Teacher",
            icon: "👨‍🏫", 
            color: "#386641",
            specialty: "Content delivery and exam preparation"
        },
        tutor: {
            name: "Tutor",
            icon: "🎓",
            color: "#4ECDC4",
            specialty: "Socratic questioning and deep understanding"
        },
        perfectScorer: {
            name: "Perfect Scorer",
            icon: "🏆",
            color: "#FFE66D",
            specialty: "Visual aids and wellbeing optimization"
        }
    };

    // Initialize session
    useEffect(() => {
        if (!sessionStarted) {
            initializeSession();
            setSessionStarted(true);
        }
    }, []);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Pomodoro timer logic
    useEffect(() => {
        let interval = null;
        if (isActive && totalSeconds > 0 && sessionStarted) {
            interval = setInterval(() => {
                setTotalSeconds(seconds => seconds - 1);
            }, 1000);
        } else if (totalSeconds === 0) {
            if (mode === 'Study') {
                setMode('Rest');
                setTotalSeconds(breakTime * 60);
                addMessage('orchestrator', '⏱️ Study time completed! Time for a well-deserved break.');
            } else {
                setIsActive(false);
                handleSessionEnd();
            }
        }
        return () => clearInterval(interval);
    }, [isActive, totalSeconds, mode, breakTime, sessionStarted]);

    /**
     * AWS STRANDS: Session Initialization with Agent Graph
     */
    const initializeSession = async () => {
        setIsOrchestratorThinking(true);
        
        try {
            // Initialize session with backend AWS Strands Agent Graph
            const sessionContext = {
                user_id: getAuth().currentUser?.uid || 'anonymous',
                topic_id: topicId,
                subject_id: subjectId,
                expertise_level: expertiseLevel,
                focus_level: focusLevel,
                stress_level: stressLevel,
                session_duration: studyTime,
                exam_date: examDate
            };

            console.log('🎯 Initializing session with backend AWS Strands Agent Graph...');
            
            // Call backend API to initialize the session
            const response = await fetch('http://localhost:5000/api/study-session/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sessionContext)
            });

            if (!response.ok) {
                throw new Error(`Backend API error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Create a simple agent graph object for frontend tracking
                const graph = {
                    graphId: result.session_id,
                    sessionContext: sessionContext,
                    primaryAgent: result.session_plan?.primary_agent || 'teacher',
                    initialMode: result.session_plan?.initial_mode || 'learning'
                };
                
                setAgentGraph(graph);
                setCurrentAgent(graph.primaryAgent);
                setCurrentMode(graph.initialMode);
                
                // Store session data
                setSessionData(prev => ({
                    ...prev,
                    agentGraphId: graph.graphId,
                    sessionContext: graph.sessionContext,
                    currentMode: graph.initialMode
                }));

                // Welcome message from orchestrator (from backend)
                addMessage('orchestrator', 
                    `Welcome to your ${topicId.replace(/_/g, ' ')} study session! 🌱\n\n` +
                    `I've analyzed your profile using AWS Strands AI and created the perfect learning strategy for you.\n\n` +
                    `📊 **Your Level**: ${expertiseLevel}\n` +
                    `🎯 **Focus**: ${focusLevel}/10\n` +
                    `😌 **Stress**: ${stressLevel}/10\n\n` +
                    `Ready to start learning? Type 'start' or ask me anything about ${topicId.replace(/_/g, ' ')}!`
                );

                console.log('✅ AWS Strands session initialized successfully:', graph.graphId);
            } else {
                throw new Error(result.error || 'Session initialization failed');
            }
            
        } catch (error) {
            console.error('❌ Agent Graph initialization failed:', error);
            addMessage('orchestrator', 
                `⚠️ I'm having trouble connecting to the AWS Strands system. Running in simulation mode.\n\n` +
                `Welcome to your ${topicId.replace(/_/g, ' ')} study session! I'll do my best to help you learn.`
            );
            
            // Fallback to simulation mode
            setSessionData(prev => ({
                ...prev,
                simulationMode: true,
                sessionPlan: {
                    strategy: 'Simulation Mode',
                    primaryAgent: 'teacher',
                    initialMode: 'learning'
                }
            }));
        }
        
        setIsOrchestratorThinking(false);
    };

    /**
     * ORCHESTRATOR: Core Decision Making Algorithm
     */
    const makeOrchestratorDecisions = () => {
        const timeToExam = examDate ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)) : 90;
        
        // Decision matrix based on multiple factors
        let strategy = '';
        let learningRatio = 50;
        let practiceRatio = 50;
        let primaryAgent = 'teacher';
        let intensity = 'moderate';
        let initialMode = 'learning';

        // Expertise-based decisions
        if (expertiseLevel === 'beginner') {
            strategy = 'Foundation Building';
            learningRatio = 80;
            practiceRatio = 20;
            primaryAgent = 'tutor'; // Socratic method for beginners
            initialMode = 'learning';
        } else if (expertiseLevel === 'apprentice') {
            strategy = 'Concept Application';
            learningRatio = 60;
            practiceRatio = 40;
            primaryAgent = 'teacher';
            initialMode = 'learning';
        } else if (expertiseLevel === 'pro') {
            strategy = 'Skill Refinement';
            learningRatio = 40;
            practiceRatio = 60;
            primaryAgent = 'teacher'; // More practice questions
            initialMode = 'practice';
        } else { // grandmaster
            strategy = 'Mastery Validation';
            learningRatio = 20;
            practiceRatio = 80;
            primaryAgent = 'perfectScorer'; // Peer simulation
            initialMode = 'practice';
        }

        // Stress/Focus adjustments
        if (stressLevel > 7) {
            primaryAgent = 'perfectScorer'; // Wellbeing focus
            intensity = 'gentle';
            learningRatio += 20; // More learning, less pressure
            practiceRatio -= 20;
        } else if (focusLevel < 4) {
            primaryAgent = 'perfectScorer'; // Visual aids help
            intensity = 'engaging';
        }

        // Time pressure adjustments
        if (timeToExam < 30) { // Less than 30 days
            strategy += ' (Exam Focused)';
            practiceRatio += 20; // More practice
            learningRatio -= 20;
            intensity = 'intensive';
        }

        // Ensure ratios are valid
        practiceRatio = 100 - learningRatio;

        return {
            strategy,
            learningRatio,
            practiceRatio,
            primaryAgent,
            intensity,
            initialMode,
            timeToExam,
            adaptiveFactors: {
                expertiseBased: true,
                stressConsidered: stressLevel > 7,
                focusOptimized: focusLevel < 4,
                examPressure: timeToExam < 30
            }
        };
    };

    /**
     * ORCHESTRATOR: Dynamic Agent Calling
     */
    const callAgent = async (agentType, context, studentMessage = '') => {
        setIsOrchestratorThinking(true);
        
        // Log agent interaction
        const interaction = {
            timestamp: new Date(),
            agent: agentType,
            context,
            reason: context.reason || 'orchestrator_decision'
        };
        
        setSessionData(prev => ({
            ...prev,
            agentInteractions: [...prev.agentInteractions, interaction]
        }));

        // Simulate agent processing time
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        
        // PLACEHOLDER: AWS Strands SDK Agent Calls
        const agentResponse = await generateAgentResponse(agentType, context, studentMessage);
        
        // Add agent response to chat
        addMessage(agentType, agentResponse.message, agentResponse.metadata);
        
        // Check if orchestrator needs to make new decisions
        if (agentResponse.triggerReassessment) {
            await reassessSession(agentResponse.progressData);
        }
        
        setIsOrchestratorThinking(false);
        return agentResponse;
    };

    /**
     * PLACEHOLDER: Agent Response Generation
     */
    const generateAgentResponse = async (agentType, context, studentMessage) => {
        // PLACEHOLDER for AWS Strands SDK implementation
        /*
        const response = await strandsSDK.invokeAgent(agentType, {
            context,
            studentMessage,
            sessionData,
            topic: topicId,
            subject: subjectId
        });
        return response;
        */

        const responses = {
            teacher: {
                learning: [
                    "Let me explain this concept step by step. First, let's understand the fundamental principle...",
                    "Here's how this topic connects to what you've learned before...",
                    "I'll break this down into digestible chunks to make it easier to understand..."
                ],
                practice: [
                    "Let's try a Singapore O-Level style question. Here's a typical exam scenario...",
                    "Time for some practice! This question tests your understanding of...",
                    "Here's an exam question that often appears on O-Level papers..."
                ]
            },
            tutor: {
                learning: [
                    "Instead of telling you directly, let me ask: What do you think happens when...?",
                    "Great question! Let's discover this together. If you had to guess, what would be your reasoning?",
                    "I want you to think about this step by step. What's the first thing you notice?"
                ],
                practice: [
                    "Let's analyze your answer. The correct response is... Here's why:",
                    "Good attempt! Here's the O-Level answering technique for this type of question:",
                    "Remember the keyword approach: For this question type, always include..."
                ]
            },
            perfectScorer: {
                learning: [
                    "Let me create a visual representation to help you remember this concept...",
                    "Here's a memory technique: Think of it as... [creates mnemonic]",
                    "I'll help you organize this information with a mind map..."
                ],
                practice: [
                    "Now, explain this concept back to me as if you're teaching a friend.",
                    "Let's do some active recall. Can you walk me through your thinking process?",
                    "Time for peer simulation! Pretend I'm your study buddy and teach me this topic."
                ]
            }
        };

        const mode = context.mode || sessionData.currentMode || 'learning';
        const agentResponses = responses[agentType]?.[mode] || responses[agentType]?.learning || [];
        const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];

        return {
            message: `**${agentProfiles[agentType].specialty}**\n\n${randomResponse}\n\n*PLACEHOLDER: Full ${agentType} agent response will be generated by AWS Strands SDK*`,
            metadata: {
                agentType,
                mode,
                confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
                interactionType: context.interactionType || 'explanation'
            },
            triggerReassessment: Math.random() > 0.7 // Sometimes trigger orchestrator reassessment
        };
    };

    /**
     * ORCHESTRATOR: Session Reassessment
     */
    const reassessSession = async (progressData) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const decision = Math.random();
        if (decision > 0.7) {
            addMessage('orchestrator', 
                "🔄 I notice you're doing well! Let me switch to more practice questions to challenge you."
            );
            logOrchestratorDecision('mode_switch', { from: sessionData.currentMode, to: 'practice' });
        } else if (decision < 0.3) {
            addMessage('orchestrator', 
                "🤔 Let me bring in a different teaching approach to help clarify this concept."
            );
            logOrchestratorDecision('agent_switch', { reason: 'comprehension_support' });
        }
    };

    /**
     * Helper function to determine optimal agent based on message content
     */
    const determineOptimalAgent = (message) => {
        const msg = message.toLowerCase();
        
        // Question/practice keywords
        if (msg.includes('question') || msg.includes('practice') || msg.includes('test') || msg.includes('exam')) {
            return 'teacher';
        }
        
        // Explanation/understanding keywords
        if (msg.includes('explain') || msg.includes('understand') || msg.includes('confused') || msg.includes('help') || msg.includes('clarify')) {
            return 'tutor';
        }
        
        // Visual/memory keywords
        if (msg.includes('visual') || msg.includes('remember') || msg.includes('memorize') || msg.includes('diagram') || msg.includes('mind map') || msg.includes('mnemonic')) {
            return 'perfect_scorer';
        }
        
        // Start command
        if (msg.includes('start') || msg.includes('begin')) {
            return currentAgent || 'teacher';
        }
        
        // Default to current agent or teacher
        return currentAgent || 'teacher';
    };
    
    /**
     * Helper function to determine interaction mode
     */
    const determineInteractionMode = (message) => {
        const msg = message.toLowerCase();
        
        // Practice mode keywords
        if (msg.includes('question') || msg.includes('practice') || msg.includes('test') || msg.includes('quiz')) {
            return 'practice';
        }
        
        // Learning mode is default
        return 'learning';
    };

    /**
     * AWS STRANDS: Message Processing via Agent Graph
     */
    const handleStudentMessage = async (message) => {
        if (!message.trim()) return;

        // Add student message
        addMessage('student', message);
        setInputMessage('');
        setIsOrchestratorThinking(true);

        try {
            if (agentGraph && !sessionData.simulationMode) {
                console.log('💬 Processing message through backend AWS Strands Agent Graph...');
                
                // Call the backend API directly instead of using frontend agent graph
                const response = await fetch('http://localhost:5000/api/study-session/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        session_id: agentGraph.graphId,
                        message: message
                    })
                });

                if (!response.ok) {
                    throw new Error(`Backend API error: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success) {
                    // Add agent response from backend
                    if (result.agent_response && result.agent_response.message) {
                        const agentResponse = result.agent_response;
                        addMessage(agentResponse.agent_id, agentResponse.message.content);
                        
                        // Update current agent and mode
                        setCurrentAgent(agentResponse.agent_id);
                        setCurrentMode(agentResponse.mode);
                        
                        // Log agent interaction
                        setSessionData(prev => ({
                            ...prev,
                            agentInteractions: [...prev.agentInteractions, {
                                timestamp: new Date(),
                                agent: agentResponse.agent_id,
                                mode: agentResponse.mode,
                                message: message,
                                responseLength: agentResponse.message.content.length
                            }]
                        }));
                    }
                    
                    console.log(`✅ Real AWS Strands agent response received`);
                } else {
                    throw new Error(result.error || 'Backend processing failed');
                }
            } else {
                // Fallback simulation mode
                await simulateAgentResponse(message);
            }
            
        } catch (error) {
            console.error('❌ Agent Graph message processing failed:', error);
            addMessage('orchestrator', 
                `⚠️ I'm having connection issues. Let me try a different approach...`
            );
            
            // Fallback to simulation
            await simulateAgentResponse(message);
        }
        
        setIsOrchestratorThinking(false);
    };

    /**
     * Fallback simulation when AWS Strands is unavailable
     */
    const simulateAgentResponse = async (message) => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const msg = message.toLowerCase();
        let agentType = 'teacher';
        let response = '';
        
        if (msg.includes('explain') || msg.includes('understand')) {
            agentType = 'tutor';
            response = `I'll help you understand this concept step by step. What specific part would you like me to explain further?`;
        } else if (msg.includes('visual') || msg.includes('diagram')) {
            agentType = 'perfectScorer';
            response = `Let me create a visual representation to help you remember this concept better.`;
        } else if (msg.includes('question') || msg.includes('practice')) {
            agentType = 'teacher';
            response = `Here's a practice question for you to try: [Practice question would be generated here]`;
        } else {
            response = `I understand you're asking about "${message}". Let me provide some guidance on this topic.`;
        }
        
        addMessage(agentType, `**[Simulation Mode]**\n\n${response}\n\n*Full AWS Strands agent responses will be available when the backend is connected.*`);
    };

    /**
     * ORCHESTRATOR: Agent Routing Logic
     */
    const determineAgentRouting = (studentMessage) => {
        const msg = studentMessage.toLowerCase();
        
        // Start command
        if (msg.includes('start') || msg.includes('begin')) {
            return {
                callAgent: true,
                agentType: sessionData.sessionPlan?.primaryAgent || 'teacher',
                context: { mode: sessionData.currentMode, interactionType: 'session_start', reason: 'student_ready' },
                showOrchestratorResponse: true,
                orchestratorMessage: `Perfect! Let me connect you with the ${agentProfiles[sessionData.sessionPlan?.primaryAgent]?.name} to begin your ${sessionData.currentMode} session.`
            };
        }
        
        // Question keywords
        if (msg.includes('question') || msg.includes('practice') || msg.includes('test')) {
            return {
                callAgent: true,
                agentType: 'teacher',
                context: { mode: 'practice', interactionType: 'question_request', reason: 'student_wants_practice' },
                showOrchestratorResponse: true,
                orchestratorMessage: "I'll get the Teacher to prepare a practice question for you!"
            };
        }
        
        // Explanation keywords
        if (msg.includes('explain') || msg.includes('understand') || msg.includes('confused')) {
            return {
                callAgent: true,
                agentType: 'tutor',
                context: { mode: 'learning', interactionType: 'explanation_request', reason: 'student_needs_clarification' },
                showOrchestratorResponse: true,
                orchestratorMessage: "Let me bring in the Tutor to help clarify this concept for you."
            };
        }
        
        // Visual/memory keywords
        if (msg.includes('visual') || msg.includes('remember') || msg.includes('memorize') || msg.includes('diagram')) {
            return {
                callAgent: true,
                agentType: 'perfectScorer',
                context: { mode: 'learning', interactionType: 'visual_aid_request', reason: 'student_wants_visual_learning' },
                showOrchestratorResponse: true,
                orchestratorMessage: "Great idea! The Perfect Scorer will create some visual aids to help you remember this."
            };
        }
        
        // Default: Continue with current flow
        const currentAgent = sessionData.sessionPlan?.primaryAgent || 'teacher';
        return {
            callAgent: true,
            agentType: currentAgent,
            context: { mode: sessionData.currentMode, interactionType: 'continuation', reason: 'natural_flow' },
            showOrchestratorResponse: false
        };
    };

    // Helper functions
    const addMessage = (sender, content, metadata = null) => {
        const newMessage = {
            id: Date.now() + Math.random(),
            sender,
            content,
            timestamp: new Date(),
            metadata
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const logOrchestratorDecision = (type, data) => {
        setSessionData(prev => ({
            ...prev,
            orchestratorDecisions: [...prev.orchestratorDecisions, {
                timestamp: new Date(),
                type,
                data,
                reasoning: data.reasoning || 'orchestrator_optimization'
            }]
        }));
    };

    const updateProgress = (type) => {
        setSessionData(prev => {
            const updated = { ...prev };
            switch(type) {
                case 'interaction':
                    updated.studentProgress.conceptsLearned += 1;
                    break;
                case 'correct_answer':
                    updated.studentProgress.correctAnswers += 1;
                    updated.studentProgress.currentStreak += 1;
                    break;
                case 'question_answered':
                    updated.studentProgress.questionsAnswered += 1;
                    break;
                default:
                    break;
            }
            return updated;
        });
    };

    const handleSessionEnd = async () => {
        try {
            let finalSummary = null;
            
            // End Agent Graph session
            if (agentGraph && !sessionData.simulationMode) {
                try {
                    console.log('🏁 Ending Agent Graph session...');
                    
                    // Create final session summary
                    finalSummary = {
                        sessionId: agentGraph.graphId,
                        duration_minutes: Math.floor((new Date() - sessionData.startTime) / (1000 * 60)),
                        total_messages: messages.length,
                        agent_interactions: sessionData.agentInteractions.length,
                        student_progress: sessionData.studentProgress,
                        session_plan: {
                            primary_agent: currentAgent,
                            final_mode: currentMode,
                            agent_switches: sessionData.agentInteractions.filter((_, i, arr) => 
                                i === 0 || arr[i].agent !== arr[i-1].agent).length
                        },
                        context: agentGraph.sessionContext,
                        performance_data: {
                            concepts_covered: sessionData.studentProgress.conceptsLearned,
                            engagement_level: sessionData.studentProgress.engagementScore,
                            primary_agent_used: currentAgent,
                            modes_used: [...new Set(sessionData.agentInteractions.map(i => i.mode))],
                            adaptation_events: sessionData.agentInteractions.filter(i => 
                                i.agent !== currentAgent).length
                        }
                    };
                    
                    console.log('✅ Agent Graph session ended successfully');
                } catch (error) {
                    console.error('❌ Failed to end Agent Graph session:', error);
                }
            }
            
            // Save session data to Firebase
            if (sessionId) {
                const db = getFirestore();
                const sessionRef = doc(db, 'users', getAuth().currentUser.uid, 'studyPlan', sessionId);
                await updateDoc(sessionRef, {
                    status: 'completed',
                    completedAt: Timestamp.now(),
                    performanceSummary: finalSummary || {
                        ...sessionData.studentProgress,
                        totalMessages: messages.length,
                        sessionDuration: studyTime,
                        orchestratorDecisions: sessionData.orchestratorDecisions?.length || 0,
                        agentInteractions: sessionData.agentInteractions.length,
                        finalMode: currentMode,
                        agentGraphId: agentGraph?.graphId || null,
                        simulationMode: sessionData.simulationMode || false
                    },
                    chatLog: messages.map(msg => ({
                        sender: msg.sender,
                        content: msg.content,
                        timestamp: msg.timestamp
                    })),
                    agentInteractions: sessionData.agentInteractions,
                    orchestratorDecisions: sessionData.orchestratorDecisions,
                    // Part 8 preparation - AWS Strands session data
                    awsStrandsData: finalSummary || null
                });
            }

            addMessage('orchestrator', '🎉 Session completed! Your progress has been saved. Redirecting to dashboard...');
            setTimeout(() => navigate('/dashboard'), 3000);
            
        } catch (error) {
            console.error('Error ending session:', error);
            navigate('/dashboard');
        }
    };

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Error state
    if (!studyTime) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A241B', color: '#F5F5F5' }}>
                <p>No session data. Please start a session from the setup page.</p>
                <button onClick={() => navigate('/dashboard')} className="ml-4 px-4 py-2 rounded-md" style={{ backgroundColor: '#49B85B' }}>Go to Dashboard</button>
            </div>
        );
    }

    // Rest mode
    if (mode === 'Rest') {
        return (
            <div 
                className="min-h-screen flex flex-col items-center justify-center text-white p-4"
                style={{
                    backgroundImage: `url(/images/background1.jpg)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="bg-black bg-opacity-50 p-10 rounded-lg text-center">
                    <h1 className="text-4xl font-bold mb-4">Rest Time 🌿</h1>
                    <p className="text-lg mb-6">Relax and recharge. Your break is almost over.</p>
                    <div className="text-6xl font-bold">
                        {minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                    </div>
                    <p className="mt-6">Take deep breaths and let your mind rest...</p>
                </div>
            </div>
        );
    }

    // Main chat interface
    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1A241B', color: '#F5F5F5' }}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-600">
                <div className="flex items-center">
                    <h1 className="text-xl font-bold">📚 {topicId.replace(/_/g, ' ')}</h1>
                    <span className="ml-4 text-sm text-gray-300">
                        {expertiseLevel} • Focus: {focusLevel}/10 • Stress: {stressLevel}/10
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <PomodoroClock 
                        minutes={minutes} 
                        seconds={seconds} 
                        mode={mode} 
                        topic={topicId.replace(/_/g, ' ')}
                        compact={true}
                    />
                    <button 
                        onClick={handleSessionEnd} 
                        className="px-4 py-2 text-sm rounded-md hover:opacity-80" 
                        style={{ backgroundColor: '#49B85B' }}
                    >
                        End Session
                    </button>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-4">
                    {messages.map((message) => (
                        <div 
                            key={message.id}
                            className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div 
                                className={`max-w-2xl p-4 rounded-lg ${
                                    message.sender === 'student' 
                                        ? 'bg-gray-700 text-white' 
                                        : 'text-white'
                                }`}
                                style={{
                                    backgroundColor: message.sender === 'student' 
                                        ? '#4A5568' 
                                        : agentProfiles[message.sender]?.color || '#386641'
                                }}
                            >
                                {message.sender !== 'student' && (
                                    <div className="flex items-center mb-2">
                                        <span className="text-lg mr-2">{agentProfiles[message.sender]?.icon}</span>
                                        <span className="font-semibold">{agentProfiles[message.sender]?.name}</span>
                                        <span className="ml-auto text-xs opacity-70">
                                            {message.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                )}
                                <div className="whitespace-pre-wrap">{message.content}</div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Thinking indicator */}
                    {isOrchestratorThinking && (
                        <div className="flex justify-start">
                            <div 
                                className="max-w-2xl p-4 rounded-lg text-white"
                                style={{ backgroundColor: agentProfiles.orchestrator.color }}
                            >
                                <div className="flex items-center">
                                    <span className="text-lg mr-2">{agentProfiles.orchestrator.icon}</span>
                                    <span className="font-semibold">{agentProfiles.orchestrator.name}</span>
                                </div>
                                <div className="mt-2 italic opacity-80">
                                    Analyzing and calling the right agent...
                                    <span className="ml-2 animate-pulse">💭</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-600 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !isOrchestratorThinking && handleStudentMessage(inputMessage)}
                            placeholder={
                                sessionStarted 
                                    ? "Ask questions, request practice problems, or just chat about the topic..."
                                    : "Type 'start' to begin your study session..."
                            }
                            disabled={isOrchestratorThinking}
                            className="flex-1 p-3 rounded-md border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
                        />
                        <button
                            onClick={() => handleStudentMessage(inputMessage)}
                            disabled={!inputMessage.trim() || isOrchestratorThinking}
                            className="px-6 py-3 rounded-md font-semibold disabled:opacity-50 hover:opacity-80"
                            style={{ backgroundColor: '#49B85B' }}
                        >
                            Send
                        </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 text-center">
                        The orchestrator will decide the perfect learning approach and call the right agents for you
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudySession;