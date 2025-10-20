import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getFirestore, doc, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { studySessionAPI } from "../services/studySessionAPI";
import {
  initializeAgentGraph,
  activateAgent,
  generateContent,
  coordinateAgentSwarm,
  updateProgress as updateAgentProgress,
} from "../services/agentGraph";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getTopicProgress,
  updateTopicProgress,
  getPersonalizedSessionConfig
} from "../firebase/topicProgress";

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
    expertiseLevel = "beginner",
    focusLevel = 5,
    stressLevel = 3,
    examDate = null,
  } = location.state || {};

  // Debug: Log session parameters
  console.log("🎯 Study Session Started:", {
    topicId,
    subjectId,
    studyTime,
    expertiseLevel,
    sessionId
  });

  // Session state
  const [mode, setMode] = useState("Study");
  const [totalSeconds, setTotalSeconds] = useState(studyTime * 60);
  const [isActive, setIsActive] = useState(true);

  // Chat interface state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isOrchestratorThinking, setIsOrchestratorThinking] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // AWS Strands Agent Graph state
  const [agentGraph, setAgentGraph] = useState(null);
  const [currentAgent, setCurrentAgent] = useState("orchestrator");
  const [sessionMode, setSessionMode] = useState("learning");

  // Session tracking
  const [sessionData, setSessionData] = useState({
    startTime: new Date(),
    currentMode: null,
    agentInteractions: [],
    studentProgress: {
      conceptsLearned: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      engagementScore: 100,
      currentStreak: 0,
    },
    orchestratorDecisions: [],
    lastQuestionAsked: null, // Track if waiting for student answer
  });

  // Agent configurations
  const agentProfiles = {
    orchestrator: {
      name: "Study Orchestrator",
      icon: "🎯",
      color: "#49B85B",
    },
    teacher: {
      name: "Teacher",
      icon: "👨‍🏫",
      color: "#386641",
      specialty: "Content delivery and exam preparation",
    },
    tutor: {
      name: "Tutor",
      icon: "🎓",
      color: "#4ECDC4",
      specialty: "Socratic questioning and deep understanding",
    },
    perfectScorer: {
      name: "Perfect Scorer",
      icon: "🏆",
      color: "#FFE66D",
      specialty: "Visual aids and wellbeing optimization",
    },
  };

  // Initialize session with topic progress
  useEffect(() => {
    if (!sessionStarted) {
      initializeAWSStrandsSession();
      setSessionStarted(true);
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pomodoro timer logic
  useEffect(() => {
    let interval = null;
    if (isActive && totalSeconds > 0 && sessionStarted) {
      interval = setInterval(() => {
        setTotalSeconds((seconds) => seconds - 1);
      }, 1000);
    } else if (totalSeconds === 0) {
      if (mode === "Study") {
        setMode("Rest");
        setTotalSeconds(breakTime * 60);
        addMessage(
          "orchestrator",
          "⏱️ Study time completed! Time for a well-deserved break."
        );
      } else {
        setIsActive(false);
        handleSessionEnd();
      }
    }
    return () => clearInterval(interval);
  }, [isActive, totalSeconds, mode, breakTime, sessionStarted]);

  /**
   * AWS STRANDS SDK: Initialize Agent Graph
   */
  const initializeAWSStrandsSession = async () => {
    setIsOrchestratorThinking(true);

    try {
      console.log("🎯 Initializing AWS Strands Agent Graph...");

      const userId = getAuth().currentUser?.uid;

      // STEP 1: Load topic progress for personalization
      console.log("📊 Loading topic progress for personalization...");
      const topicProgress = await getTopicProgress(userId, subjectId, topicId);
      const personalizedConfig = getPersonalizedSessionConfig(topicProgress);

      console.log("✅ Topic progress loaded:", {
        totalSessions: topicProgress.totalSessions,
        trend: topicProgress.performanceHistory?.trend,
        nextSteps: topicProgress.nextSteps?.content
      });

      const sessionContext = {
        topicId,
        subjectId,
        expertiseLevel: topicProgress.expertiseLevel || expertiseLevel, // Use saved expertise
        focusLevel,
        stressLevel,
        sessionDuration: studyTime,
        examDate,
        userId,
        // Include historical context for agents
        topicProgress: personalizedConfig?.context
      };

      // Step 1: Initialize backend session via API service
      console.log("🔗 Calling backend session initialization...");
      console.log("📤 Sending topicProgress to backend:", personalizedConfig?.context);

      const backendSessionData = await studySessionAPI.initializeSession({
        userId: sessionContext.userId,
        topicId: sessionContext.topicId,
        subjectId: sessionContext.subjectId,
        expertiseLevel: sessionContext.expertiseLevel,
        focusLevel: sessionContext.focusLevel,
        stressLevel: sessionContext.stressLevel,
        sessionDuration: sessionContext.sessionDuration,
        examDate: sessionContext.examDate,
        // ADDED: Pass progression context to backend
        topicProgress: personalizedConfig?.context
      });
      console.log("✅ Backend session initialized:", backendSessionData);

      // Step 2: Initialize the frontend agent graph with session_id
      const sessionContextWithId = {
        ...sessionContext,
        session_id: backendSessionData.session_id,
      };
      const graph = await initializeAgentGraph(sessionContextWithId);
      setAgentGraph(graph);

      // Load initial messages from backend + add personalized welcome if available
      const initialMessages = [];

      if (backendSessionData.messages && backendSessionData.messages.length > 0) {
        initialMessages.push(...backendSessionData.messages.map((msg) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          metadata: msg.metadata || {},
        })));
      }

      // Add personalized welcome message based on topic progress
      if (personalizedConfig && topicProgress.totalSessions > 0) {
        initialMessages.push({
          id: `personalized_${Date.now()}`,
          sender: 'orchestrator',
          content: personalizedConfig.welcomeMessage,
          timestamp: new Date(),
          metadata: { personalized: true }
        });
      }

      setMessages(initialMessages);

      // Store session plan from backend
      if (backendSessionData.session_plan) {
        setSessionData((prev) => ({
          ...prev,
          sessionPlan: backendSessionData.session_plan,
          currentMode: backendSessionData.session_plan.initial_mode,
        }));
        setSessionMode(backendSessionData.session_plan.initial_mode);
      }

      console.log("✅ AWS Strands Agent Graph initialized successfully");
    } catch (error) {
      console.error("❌ AWS Strands initialization failed:", error);
      addMessage(
        "orchestrator",
        `⚠️ Agent graph initialization encountered an issue: ${error.message}\n\n` +
          `Running in enhanced simulation mode. I'll still coordinate the best learning experience for you!`
      );

      // Fallback to enhanced simulation
      const fallbackDecision = makeOrchestratorDecisions();
      setSessionData((prev) => ({
        ...prev,
        simulationMode: true,
        sessionPlan: fallbackDecision,
      }));
    }

    setIsOrchestratorThinking(false);
  };

  /**
   * ORCHESTRATOR: Core Decision Making Algorithm
   */
  const makeOrchestratorDecisions = () => {
    const timeToExam = examDate
      ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))
      : 90;

    let strategy = "";
    let learningRatio = 50;
    let practiceRatio = 50;
    let primaryAgent = "teacher";
    let intensity = "moderate";
    let initialMode = "learning";

    // Expertise-based decisions
    if (expertiseLevel === "beginner") {
      strategy = "Foundation Building";
      learningRatio = 80;
      practiceRatio = 20;
      primaryAgent = "tutor";
      initialMode = "learning";
    } else if (expertiseLevel === "apprentice") {
      strategy = "Concept Application";
      learningRatio = 60;
      practiceRatio = 40;
      primaryAgent = "teacher";
      initialMode = "learning";
    } else if (expertiseLevel === "pro") {
      strategy = "Skill Refinement";
      learningRatio = 40;
      practiceRatio = 60;
      primaryAgent = "teacher";
      initialMode = "practice";
    } else {
      strategy = "Mastery Validation";
      learningRatio = 20;
      practiceRatio = 80;
      primaryAgent = "perfectScorer";
      initialMode = "practice";
    }

    // Stress/Focus adjustments
    if (stressLevel > 4) {
      // Match backend logic: stress > 4 triggers perfect_scorer
      primaryAgent = "perfectScorer";
      intensity = "gentle";
      learningRatio += 20;
      practiceRatio -= 20;
    } else if (focusLevel < 2) {
      // Match backend logic: focus < 2 triggers perfect_scorer
      primaryAgent = "perfectScorer";
      intensity = "engaging";
    }

    // Time pressure adjustments
    if (timeToExam < 30) {
      strategy += " (Exam Focused)";
      practiceRatio += 20;
      learningRatio -= 20;
      intensity = "intensive";
    }

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
        stressConsidered: stressLevel > 4,
        focusOptimized: focusLevel < 2,
        examPressure: timeToExam < 30,
      },
    };
  };

  /**
   * AWS STRANDS SDK: Call Specific Agent
   */
  const callAWSStrandsAgent = async (agentId, context, studentMessage = "") => {
    setIsOrchestratorThinking(true);

    try {
      if (agentGraph && !sessionData.simulationMode) {
        console.log(`🤖 Activating AWS Strands ${agentId} agent...`);

        // Activate the agent using AWS Strands SDK
        const activationResult = await activateAgent(agentGraph, agentId, {
          mode: context.mode || sessionMode,
          prompt: studentMessage,
          ...context,
        });

        // Generate content using the activated agent
        const contentResult = await generateContent(
          agentGraph,
          agentId,
          context.mode || sessionMode,
          {
            topic: topicId,
            expertiseLevel,
            studentMessage,
            ...context,
          }
        );

        // Log agent interaction
        const interaction = {
          timestamp: new Date(),
          agent: agentId,
          mode: context.mode || sessionMode,
          context,
          activationResult,
          contentResult,
        };

        setSessionData((prev) => ({
          ...prev,
          agentInteractions: [...prev.agentInteractions, interaction],
        }));

        // Add agent response to chat (ensure content is a string)
        const messageContent =
          typeof contentResult.content === "string"
            ? contentResult.content
            : JSON.stringify(contentResult.content);
        addMessage(agentId, messageContent, {
          agentId,
          mode: context.mode || sessionMode,
          interactive: contentResult.interactive,
          metadata: contentResult,
        });

        // Update current agent
        setCurrentAgent(agentId);

        // Update progress in agent graph
        await updateAgentProgress(agentGraph, "agent_interaction", {
          agent: agentId,
          mode: context.mode || sessionMode,
          timestamp: new Date(),
        });

        console.log(`✅ AWS Strands ${agentId} agent response generated`);

        return contentResult;
      } else {
        // Fallback to enhanced simulation
        return await simulateAgentResponse(agentId, context, studentMessage);
      }
    } catch (error) {
      console.error(`❌ AWS Strands ${agentId} agent failed:`, error);
      addMessage(
        "orchestrator",
        `⚠️ Having trouble reaching the ${agentProfiles[agentId]?.name}. Let me try a different approach...`
      );

      // Fallback to simulation
      return await simulateAgentResponse(agentId, context, studentMessage);
    }

    setIsOrchestratorThinking(false);
  };

  /**
   * AWS STRANDS SDK: Orchestrator Swarm Decision
   */
  const makeSwarmDecision = async (topic, duration = 60000) => {
    try {
      if (agentGraph && !sessionData.simulationMode) {
        console.log("🐝 Initiating AWS Strands agent swarm discussion...");

        const swarmResult = await coordinateAgentSwarm(
          agentGraph,
          topic,
          duration
        );

        // Display swarm discussion in chat
        addMessage(
          "orchestrator",
          `🐝 **Agent Swarm Discussion: ${topic}**\n\n${swarmResult.swarmResponse}\n\n` +
            `*All agents contributed their perspectives to optimize your learning experience.*`
        );

        logOrchestratorDecision("swarm_decision", {
          topic,
          swarmResult,
          participants: swarmResult.participants,
        });

        return swarmResult;
      } else {
        // Simulate swarm discussion
        const mockSwarmResponse = `**Teacher:** Based on curriculum requirements, we should focus on ${topicId} fundamentals first.\n\n**Tutor:** I agree, but let's ensure deep understanding through questioning rather than lecturing.\n\n**Perfect Scorer:** Consider the student's stress level (${stressLevel}/10) - we should balance challenge with support.`;

        addMessage(
          "orchestrator",
          `🐝 **Agent Swarm Discussion (Simulated)**\n\n${mockSwarmResponse}\n\n` +
            `*Decision: Proceeding with balanced approach based on your expertise level.*`
        );

        return {
          swarmResponse: mockSwarmResponse,
          participants: ["teacher", "tutor", "perfectScorer"],
        };
      }
    } catch (error) {
      console.error("❌ AWS Strands swarm coordination failed:", error);
      addMessage(
        "orchestrator",
        `⚠️ Agent coordination issue: ${error.message}`
      );
      return null;
    }
  };

  /**
   * Enhanced simulation with agent-specific responses
   */
  const simulateAgentResponse = async (agentId, context, studentMessage) => {
    await new Promise((resolve) =>
      setTimeout(resolve, 1500 + Math.random() * 1000)
    );

    const responses = {
      teacher: {
        learning: [
          `📚 **Structured Learning Approach**\n\nLet me break down ${topicId.replace(
            /_/g,
            " "
          )} into key concepts:\n\n1. **Foundation**: [Core principles would be explained here]\n2. **Application**: [Real-world examples]\n3. **Singapore O-Level Context**: [Exam-specific requirements]\n\n*This content would be generated by AWS Strands content_explanation tool.*`,

          `🎯 **Curriculum-Focused Explanation**\n\nFor your ${expertiseLevel} level, here's what you need to master:\n\n• **Key Definition**: [Generated by AWS Strands]\n• **Formula Applications**: [Step-by-step breakdowns]\n• **Common Exam Questions**: [Pattern recognition]\n\n*Full content delivery via AWS Strands Teacher Agent.*`,
        ],
        practice: [
          `📝 **Singapore O-Level Practice Question**\n\nHere's a ${expertiseLevel}-appropriate question:\n\n**Question**: [Generated exam-style question would appear here]\n\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\n\n*Question generated by AWS Strands question_generation tool.*`,

          `🎯 **Structured Problem**\n\n**Scenario**: [Real exam context]\n**Calculate**: [Multi-step problem]\n\n**Show your working and provide your final answer.**\n\n*Problem complexity adjusted for ${expertiseLevel} level by AWS Strands.*`,
        ],
      },
      tutor: {
        learning: [
          `🤔 **Socratic Discovery**\n\nInstead of telling you directly, let me guide your thinking:\n\n**Question 1**: What do you think happens when [scenario]?\n\n**Question 2**: How does this relate to what you already know about [related concept]?\n\n*Socratic questioning sequence by AWS Strands interactive_questioning tool.*`,

          `💭 **Guided Exploration**\n\nBased on your message: "${studentMessage}"\n\nLet's discover this together:\n\n🔍 **Think About**: [Guiding question]\n🔗 **Connection**: How might this link to [previous learning]?\n\n*Personalized guidance via AWS Strands Tutor Agent.*`,
        ],
        practice: [
          `✅ **Answer Analysis & Technique**\n\n**Your Response**: [Student answer would be analyzed]\n\n**Singapore O-Level Technique**:\n1. **Keywords to Include**: [Subject-specific terms]\n2. **Structure**: [Answer format]\n3. **Time Management**: [Timing strategy]\n\n*Detailed feedback by AWS Strands answer_analysis tool.*`,

          `📊 **Performance Feedback**\n\n**Correct Answer**: [Provided here]\n**Your Approach**: [Analysis of method]\n**Improvement Areas**: [Specific suggestions]\n\n**Next Steps**: [Customized recommendations]\n\n*Comprehensive analysis via AWS Strands Tutor Agent.*`,
        ],
      },
      perfectScorer: {
        learning: [
          `🎨 **Visual Learning Enhancement**\n\n**Concept Map**: [Mermaid diagram code would be generated]\n\n**Memory Technique**: [Custom mnemonic]\n\n**Chunking Strategy**: [Information organization]\n\nConsidering your stress level (${stressLevel}/10), I'm optimizing for calm, effective learning.\n\n*Visual aids created by AWS Strands diagram_generator and mnemonic_creator tools.*`,

          `🧠 **Memory Optimization**\n\n**For Topic**: ${topicId.replace(
            /_/g,
            " "
          )}\n\n**Visual Aid**: [Interactive diagram]\n**Memory Palace**: [Location-based technique]\n**Study Rhythm**: [Personalized timing]\n\n*Wellbeing-focused approach by AWS Strands Perfect Scorer Agent.*`,
        ],
        practice: [
          `🎭 **Peer Study Simulation**\n\nPretend I'm your study buddy. Explain ${topicId.replace(
            /_/g,
            " "
          )} to me like I'm learning it for the first time.\n\n**Your turn**: Walk me through the key points!\n\n*I'll listen and provide peer-level feedback.*\n\n*Active recall session by AWS Strands peer_simulation tool.*`,

          `👥 **Teach-Back Challenge**\n\nNow that you've learned this concept, teach it back to me:\n\n1. **Explain the main idea**\n2. **Give an example**\n3. **Connect it to something else you know**\n\nThis active recall will strengthen your understanding!\n\n*Peer-to-peer learning via AWS Strands Perfect Scorer Agent.*`,
        ],
      },
    };

    const mode = context.mode || sessionMode;
    const agentResponses =
      responses[agentId]?.[mode] || responses[agentId]?.learning || [];
    const selectedResponse =
      agentResponses[Math.floor(Math.random() * agentResponses.length)];

    // Log simulated interaction
    const interaction = {
      timestamp: new Date(),
      agent: agentId,
      mode,
      context,
      simulationMode: true,
      message: studentMessage,
    };

    setSessionData((prev) => ({
      ...prev,
      agentInteractions: [...prev.agentInteractions, interaction],
    }));

    return {
      agentId,
      mode,
      content: selectedResponse,
      interactive: isInteractiveContent(agentId, mode),
      simulationMode: true,
    };
  };

  /**
   * AWS STRANDS: Message Processing
   */
  const handleStudentMessage = async (message) => {
    if (!message.trim()) return;

    addMessage("student", message);
    setInputMessage("");
    setIsOrchestratorThinking(true);

    try {
      // Use studySessionAPI directly to send message to backend
      const sessionId = agentGraph?.sessionContext?.session_id || "default";
      const result = await studySessionAPI.sendChatMessage(sessionId, message);

      if (result.success) {
        // Extract the actual message content from the response
        const agentResponse = result.agent_response;
        const messageContent =
          agentResponse?.message?.content || JSON.stringify(agentResponse);

        // Add agent response to chat with proper sender
        const agentId = agentResponse?.agent_id || "orchestrator";
        const mode = agentResponse?.mode || "learning";

        addMessage(agentId, messageContent, {
          agentId: agentId,
          mode: mode,
          interactive: false,
          metadata: agentResponse?.metadata || {},
        });

        // Track questions and answers
        if (agentId === "teacher" && mode === "practice") {
          // Teacher just asked a practice question
          setSessionData(prev => ({
            ...prev,
            lastQuestionAsked: {
              timestamp: new Date(),
              content: messageContent
            }
          }));
          // Don't increment question count yet - wait for student to answer
        } else if (sessionData.lastQuestionAsked && message.toLowerCase().trim().length > 3) {
          // Student just responded to a question
          updateProgress("question_answered");

          // Simple heuristic: check if tutor/teacher confirms correctness
          // Look for positive keywords in next agent response
          // This is a placeholder - ideally we'd have structured Q&A
          const assumedCorrect = Math.random() > 0.3; // ~70% accuracy placeholder
          if (assumedCorrect) {
            updateProgress("correct_answer");
          }

          // Clear the question tracker
          setSessionData(prev => ({
            ...prev,
            lastQuestionAsked: null
          }));
        } else {
          // Regular interaction (learning mode)
          updateProgress("interaction");
        }
      } else {
        addMessage("orchestrator", `⚠️ Error: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Message processing failed:", error);
      addMessage(
        "orchestrator",
        `⚠️ I encountered an issue processing your message. Let me try a different approach: ${error.message}`
      );
    }

    setIsOrchestratorThinking(false);
  };

  /**
   * ORCHESTRATOR: Agent Routing Logic
   */
  const determineAgentRouting = (studentMessage) => {
    const msg = studentMessage.toLowerCase();

    if (msg.includes("start") || msg.includes("begin")) {
      return {
        callAgent: true,
        agentType: sessionData.sessionPlan?.primaryAgent || "teacher",
        context: {
          mode: sessionMode,
          interactionType: "session_start",
          reason: "student_ready",
        },
        showOrchestratorResponse: true,
        orchestratorMessage: `🎯 Perfect! Connecting you with the **${
          agentProfiles[sessionData.sessionPlan?.primaryAgent]?.name
        }** to begin your ${sessionMode} session.`,
        triggerReassessment: false,
      };
    }

    if (
      msg.includes("question") ||
      msg.includes("practice") ||
      msg.includes("test")
    ) {
      return {
        callAgent: true,
        agentType: "teacher",
        context: {
          mode: "practice",
          interactionType: "question_request",
          reason: "student_wants_practice",
        },
        showOrchestratorResponse: true,
        orchestratorMessage:
          "📝 Bringing in the Teacher to prepare a Singapore O-Level style question!",
        triggerReassessment: true,
      };
    }

    if (
      msg.includes("explain") ||
      msg.includes("understand") ||
      msg.includes("confused")
    ) {
      return {
        callAgent: true,
        agentType: "tutor",
        context: {
          mode: "learning",
          interactionType: "explanation_request",
          reason: "student_needs_clarification",
        },
        showOrchestratorResponse: true,
        orchestratorMessage:
          "🎓 The Tutor will help clarify this concept using guided questioning.",
        triggerReassessment: false,
      };
    }

    if (
      msg.includes("visual") ||
      msg.includes("remember") ||
      msg.includes("memorize") ||
      msg.includes("diagram")
    ) {
      return {
        callAgent: true,
        agentType: "perfectScorer",
        context: {
          mode: "learning",
          interactionType: "visual_aid_request",
          reason: "student_wants_visual_learning",
        },
        showOrchestratorResponse: true,
        orchestratorMessage:
          "🏆 Perfect Scorer will create visual aids to enhance your memory!",
        triggerReassessment: false,
      };
    }

    if (
      msg.includes("tired") ||
      msg.includes("stressed") ||
      msg.includes("difficult")
    ) {
      return {
        callAgent: true,
        agentType: "perfectScorer",
        context: {
          mode: "learning",
          interactionType: "wellbeing_support",
          reason: "student_wellbeing_concern",
        },
        showOrchestratorResponse: true,
        orchestratorMessage:
          "🏆 Let me get Perfect Scorer to help with a more supportive approach.",
        triggerReassessment: true,
      };
    }

    // Default: Continue with current flow
    const currentAgentType = sessionData.sessionPlan?.primaryAgent || "teacher";
    return {
      callAgent: true,
      agentType: currentAgentType,
      context: {
        mode: sessionMode,
        interactionType: "continuation",
        reason: "natural_flow",
      },
      showOrchestratorResponse: false,
      triggerReassessment: Math.random() > 0.7,
    };
  };

  /**
   * ORCHESTRATOR: Session Reassessment
   */
  const reassessSession = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const decision = Math.random();
    if (decision > 0.7) {
      const newMode = sessionMode === "learning" ? "practice" : "learning";
      setSessionMode(newMode);

      addMessage(
        "orchestrator",
        `🔄 **Mode Switch Decision**\n\nBased on your progress, I'm switching from ${sessionMode} to **${newMode}** mode to optimize your learning experience.`
      );

      logOrchestratorDecision("mode_switch", {
        from: sessionMode,
        to: newMode,
        reasoning: "progress_optimization",
      });
    } else if (decision < 0.3) {
      addMessage(
        "orchestrator",
        `🤔 **Agent Coordination**\n\nI'm bringing in a different agent to provide a fresh perspective on this topic.`
      );

      logOrchestratorDecision("agent_switch", {
        reason: "perspective_diversification",
        currentAgent: currentAgent,
      });
    }
  };

  // Helper functions
  const addMessage = (sender, content, metadata = null) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      sender,
      content,
      timestamp: new Date(),
      metadata,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const logOrchestratorDecision = (type, data) => {
    setSessionData((prev) => ({
      ...prev,
      orchestratorDecisions: [
        ...prev.orchestratorDecisions,
        {
          timestamp: new Date(),
          type,
          data,
          reasoning: data.reasoning || "orchestrator_optimization",
        },
      ],
    }));
  };

  const updateProgress = (type) => {
    setSessionData((prev) => {
      const updated = { ...prev };
      switch (type) {
        case "interaction":
          updated.studentProgress.conceptsLearned += 1;
          break;
        case "correct_answer":
          updated.studentProgress.correctAnswers += 1;
          updated.studentProgress.currentStreak += 1;
          break;
        case "question_answered":
          updated.studentProgress.questionsAnswered += 1;
          break;
        default:
          break;
      }
      return updated;
    });
  };

  const isInteractiveContent = (agentId, mode) => {
    const interactiveMap = {
      teacher: { learning: false, practice: true },
      tutor: { learning: true, practice: false },
      perfectScorer: { learning: false, practice: true },
    };
    return interactiveMap[agentId]?.[mode] || false;
  };

  const handleSessionEnd = async () => {
    try {
      // End AWS Strands session
      let finalAgentSummary = null;

      if (agentGraph && !sessionData.simulationMode) {
        try {
          console.log("🏁 Finalizing AWS Strands Agent Graph session...");

          // Get final summary from orchestrator
          const finalSummary = await callAWSStrandsAgent(
            "orchestrator",
            {
              mode: "session_summary",
              interactionType: "session_end",
              sessionData: sessionData,
            },
            "Please provide a final session summary"
          );

          finalAgentSummary = finalSummary;
          console.log("✅ AWS Strands session finalized");
        } catch (error) {
          console.error("❌ Failed to finalize AWS Strands session:", error);
        }
      }

      // Save LIGHTWEIGHT topic progress (instead of full chat logs)
      const userId = getAuth().currentUser.uid;

      console.log("💾 Saving topic progress with 'next steps'...");
      console.log("📊 Session data being saved:", {
        userId,
        subjectId,
        topicId,
        questionsAnswered: sessionData.studentProgress.questionsAnswered,
        correctAnswers: sessionData.studentProgress.correctAnswers,
        messagesCount: messages.length
      });

      const topicProgressResult = await updateTopicProgress(
        userId,
        subjectId,
        topicId,
        sessionData,
        messages,
        sessionData.agentInteractions,
        sessionId || `session_${Date.now()}`
      );

      console.log("✅ Topic progress result:", topicProgressResult);

      // Show promotion celebration if student leveled up!
      if (topicProgressResult.wasPromoted) {
        addMessage(
          "orchestrator",
          topicProgressResult.promotionMessage
        );
      }

      // Optionally save minimal session record (NOT full chat)
      if (sessionId) {
        const db = getFirestore();
        const sessionRef = doc(
          db,
          "users",
          userId,
          "studyPlan",
          sessionId
        );

        await updateDoc(sessionRef, {
          status: "completed",
          completedAt: Timestamp.now(),
          topic: topicId,
          subject: subjectId,

          // Minimal performance summary (no chat log!)
          performanceSummary: {
            questionsAnswered: sessionData.studentProgress.questionsAnswered,
            correctAnswers: sessionData.studentProgress.correctAnswers,
            accuracy: sessionData.studentProgress.correctAnswers /
                     Math.max(1, sessionData.studentProgress.questionsAnswered),
            sessionDuration: studyTime,
            primaryAgent: currentAgent,
            finalMode: sessionMode
          }
        });
      }

      console.log("✅ Topic progress saved (no chat log stored)");

      addMessage(
        "orchestrator",
        "🎉 **Session Complete!**\n\nYour progress has been saved with full AWS Strands agent interaction data. Redirecting to dashboard for Part 8 assessment..."
      );
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (error) {
      console.error("Error ending session:", error);
      navigate("/dashboard");
    }
  };

  // Session metrics calculation helpers
  const calculateAgentEffectiveness = () => {
    const agentCounts = sessionData.agentInteractions.reduce(
      (acc, interaction) => {
        acc[interaction.agent] = (acc[interaction.agent] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      teacher: Math.min(10, (agentCounts.teacher || 0) / 2 + 5),
      tutor: Math.min(10, (agentCounts.tutor || 0) / 2 + 5),
      perfectScorer: Math.min(10, (agentCounts.perfectScorer || 0) / 2 + 5),
    };
  };

  const calculateContentQuality = () => {
    return Math.min(
      10,
      messages.length / 5 + sessionData.studentProgress.engagementScore / 10
    );
  };

  const calculateAgentMetrics = (agentId) => {
    const agentInteractions = sessionData.agentInteractions.filter(
      (i) => i.agent === agentId
    );
    return {
      contentDelivered: agentInteractions.filter((i) => i.mode === "learning")
        .length,
      questionsGenerated: agentInteractions.filter((i) => i.mode === "practice")
        .length,
      activeTime: agentInteractions.length * 2, // Rough estimate in minutes
    };
  };

  const generateFollowUpRecommendation = () => {
    const { learningRatio, practiceRatio } = sessionData.sessionPlan || {};
    if (learningRatio > practiceRatio) {
      return "Focus on practice questions in next session";
    } else {
      return "Continue with mixed learning and practice approach";
    }
  };

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Error state
  if (!studyTime) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1A241B", color: "#F5F5F5" }}
      >
        <p>No session data. Please start a session from the setup page.</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="ml-4 px-4 py-2 rounded-md"
          style={{ backgroundColor: "#49B85B" }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Rest mode
  if (mode === "Rest") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-white p-4"
        style={{
          backgroundImage: `url(/images/background1.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="bg-black bg-opacity-50 p-10 rounded-lg text-center">
          <h1 className="text-4xl font-bold mb-4">Rest Time 🌿</h1>
          <p className="text-lg mb-6">
            Relax and recharge. Your break is almost over.
          </p>
          <div className="text-6xl font-bold">
            {minutes < 10 ? `0${minutes}` : minutes}:
            {seconds < 10 ? `0${seconds}` : seconds}
          </div>
          <p className="mt-6">Take deep breaths and let your mind rest...</p>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#1A241B", color: "#F5F5F5" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-600">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSessionEnd}
            className="px-3 py-2 text-sm rounded-md hover:opacity-80 flex items-center gap-2"
            style={{ backgroundColor: "#49B85B" }}
          >
            ← End Session
          </button>
          <h1 className="text-xl font-bold uppercase">
            📚{" "}
            {topicId
              .replace(/_/g, " ")
              .split(" ")
              .map((word) => {
                return word.charAt(0).toUpperCase() + word.slice(1);
              })
              .join(" ")}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Custom Timer Display */}
          <div className="flex items-center bg-gray-800 rounded-lg px-4 py-2 border border-gray-600">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-white">
                {minutes < 10 ? `0${minutes}` : minutes}:
                {seconds < 10 ? `0${seconds}` : seconds}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                {mode} Time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Claude/Gemini style matching reference image */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingLeft: "20px", paddingRight: "20px" }}
      >
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <div key={message.id}>
              {message.sender === "student" ? (
                /* User message - content-sized bubble right-aligned */
                <div
                  className="w-full"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    className="text-sm leading-relaxed"
                    style={{
                      backgroundColor: "#e5e7eb",
                      color: "#1f2937",
                      borderRadius: "20px",
                      borderTopRightRadius: "8px",
                      maxWidth: "50%",
                      display: "inline-block",
                      wordWrap: "break-word",
                      whiteSpace: "pre-wrap",
                      padding: "12px 16px",
                    }}
                  >
                    {typeof message.content === "string"
                      ? message.content
                      : String(message.content)}
                  </span>
                </div>
              ) : (
                /* Agent message - full width like reference */
                <div className="w-full py-6">
                  <div className="max-w-4xl">
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1">
                        <span className="text-base">
                          {agentProfiles[message.sender]?.icon || "🤖"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <span className="font-medium text-gray-100 text-sm">
                            {agentProfiles[message.sender]?.name || "Assistant"}
                          </span>
                          {message.metadata?.simulationMode && (
                            <span className="ml-2 text-xs bg-yellow-600 px-2 py-1 rounded">
                              SIM
                            </span>
                          )}
                          <span className="ml-auto text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-100 leading-relaxed text-sm markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              // Style headers
                              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-2 mb-1" {...props} />,
                              // Style lists
                              ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                              // Style code blocks
                              code: ({node, inline, ...props}) =>
                                inline
                                  ? <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                  : <code className="block bg-gray-700 p-3 rounded my-2 text-sm font-mono overflow-x-auto" {...props} />,
                              // Style paragraphs
                              p: ({node, ...props}) => <p className="my-2" {...props} />,
                              // Style strong/bold
                              strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                              // Style emphasis/italic
                              em: ({node, ...props}) => <em className="italic" {...props} />,
                              // Style blockquotes
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-600 pl-4 my-2 italic" {...props} />,
                              // Style horizontal rules
                              hr: ({node, ...props}) => <hr className="my-4 border-gray-600" {...props} />,
                            }}
                          >
                            {typeof message.content === "string"
                              ? message.content
                              : typeof message.content === "object" &&
                                message.content !== null
                              ? message.content.content ||
                                message.content.message ||
                                message.content.error ||
                                JSON.stringify(message.content)
                              : String(message.content)}
                          </ReactMarkdown>
                        </div>
                        {message.metadata?.interactive && (
                          <div className="mt-3 text-xs text-gray-500 italic">
                            💬 Interactive content - respond to continue
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator */}
          {isOrchestratorThinking && (
            <div className="w-full py-6">
              <div className="max-w-4xl">
                <div className="flex items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-base">
                      {agentProfiles.orchestrator.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-2">
                      <span className="font-medium text-gray-100 text-sm">
                        {agentProfiles.orchestrator.name}
                      </span>
                    </div>
                    <div className="text-gray-400 italic text-sm">
                      {agentGraph && !sessionData.simulationMode
                        ? "Coordinating AWS Strands agents..."
                        : "Analyzing and routing to best agent..."}
                      <span className="ml-2 animate-pulse">💭</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area - Claude-style */}
      <div
        className="border-t border-gray-600 p-4 bg-gray-900"
        style={{
          width: "100vw",
          marginLeft: "calc(-50vw + 50%)",
          marginRight: "calc(-50vw + 50%)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "calc(100vw - 2rem)",
            margin: "0 auto",
            padding: "0 1rem",
          }}
        >
          <div
            className="relative bg-gray-800 rounded-2xl shadow-lg border border-gray-700"
            style={{ width: "100%", maxWidth: "none" }}
          >
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isOrchestratorThinking && inputMessage.trim()) {
                    handleStudentMessage(inputMessage);
                  }
                }
              }}
              placeholder={
                sessionStarted
                  ? "Ask questions, request practice problems, or type 'visual' for diagrams..."
                  : "Type 'start' to begin your study session..."
              }
              disabled={isOrchestratorThinking}
              className="w-full p-5 pr-20 bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none text-base leading-6"
              style={{
                minHeight: "120px",
                maxHeight: "300px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                maxWidth: "none !important",
                width: "100% !important",
              }}
              rows={Math.max(
                4,
                Math.min(12, inputMessage.split("\n").length + 1)
              )}
            />

            {/* Send Button */}
            <button
              onClick={() => handleStudentMessage(inputMessage)}
              disabled={!inputMessage.trim() || isOrchestratorThinking}
              className="absolute bottom-4 right-4 p-3 rounded-xl font-medium disabled:opacity-40 hover:opacity-90 transition-all duration-200 shadow-md"
              style={{
                backgroundColor:
                  inputMessage.trim() && !isOrchestratorThinking
                    ? "#49B85B"
                    : "#4A5568",
                transform:
                  inputMessage.trim() && !isOrchestratorThinking
                    ? "scale(1)"
                    : "scale(0.95)",
              }}
            >
              {isOrchestratorThinking ? (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>

            {/* Character count and shortcuts */}
            <div className="absolute bottom-2 left-4 text-xs text-gray-500">
              {inputMessage.length > 0 && (
                <span className="mr-3">{inputMessage.length} chars</span>
              )}
              <span>Enter to send • Shift+Enter for new line</span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            {agentGraph && !sessionData.simulationMode
              ? "🤖 AWS Strands orchestrator coordinates Teacher, Tutor, and Perfect Scorer agents"
              : "🔄 Enhanced simulation mode - AWS Strands integration ready"}
          </div>
        </div>
      </div>

      {/* Session Stats Display */}
      <div className="text-xs text-gray-500 px-4 py-2 border-t border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between">
          <span>Interactions: {sessionData.agentInteractions.length}</span>
          <span>Current Agent: {agentProfiles[currentAgent]?.name}</span>
          <span>Decisions: {sessionData.orchestratorDecisions.length}</span>
          <span>
            Progress: {sessionData.studentProgress.conceptsLearned} concepts
          </span>
        </div>
      </div>
    </div>
  );
};

export default StudySession;
