import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getFirestore, doc, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { studySessionAPI } from "../services/studySessionAPI";
import ReactMarkdown from "react-markdown";
import {
  initializeAgentGraph,
  activateAgent,
  generateContent,
  coordinateAgentSwarm,
  updateProgress as updateAgentProgress,
} from "../services/agentGraph";

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

// Helper component for rendering formatted agent messages
const AgentMessage = ({ message, agentProfile }) => {
  const content = typeof message.content === "string"
    ? message.content
    : typeof message.content === "object" && message.content !== null
    ? message.content.content || message.content.message || message.content.error || JSON.stringify(message.content)
    : String(message.content);

  // Detect content type for special rendering
  const isQuestion = content.toLowerCase().includes("question:") ||
                    (content.includes("A)") && content.includes("B)") && content.includes("C)"));
  const isPractice = content.toLowerCase().includes("practice") ||
                     content.toLowerCase().includes("solve");
  const isExplanation = content.includes("**") && (content.includes("1.") || content.includes("Step"));

  return (
    <div className="w-full py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", margin: "8px 0" }}>
      <div className="max-w-4xl mx-auto" style={{ paddingLeft: "16px", paddingRight: "16px" }}>
        <div className="flex items-start gap-3">
          {/* Agent Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${agentProfile?.color || "#49B85B"}22, ${agentProfile?.color || "#49B85B"}44)`,
              border: `2px solid ${agentProfile?.color || "#49B85B"}`,
            }}
          >
            <span className="text-lg">{agentProfile?.icon || "🤖"}</span>
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {/* Agent Name & Timestamp */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="font-semibold text-sm"
                style={{ color: agentProfile?.color || "#49B85B" }}
              >
                {agentProfile?.name || "Assistant"}
              </span>
              {agentProfile?.specialty && (
                <span className="text-xs text-gray-500">• {agentProfile.specialty}</span>
              )}
              {message.metadata?.simulationMode && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: "rgba(245, 158, 11, 0.2)",
                    color: "#fbbf24",
                    border: "1px solid rgba(245, 158, 11, 0.3)"
                  }}
                >
                  Simulation
                </span>
              )}
              <span className="text-xs text-gray-500 ml-auto">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Content Card - Special styling for questions/practice */}
            {isQuestion || isPractice ? (
              <div
                className="rounded-xl p-4 mb-2"
                style={{
                  background: "linear-gradient(135deg, rgba(107, 159, 111, 0.08), rgba(107, 159, 111, 0.03))",
                  border: "1px solid rgba(107, 159, 111, 0.3)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      background: "rgba(107, 159, 111, 0.2)",
                      color: "#8bc68f",
                      border: "1px solid rgba(107, 159, 111, 0.4)"
                    }}
                  >
                    {isPractice ? "📝 Practice Problem" : "❓ Question"}
                  </div>
                </div>
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  style={{ color: "#e5e7eb", lineHeight: "1.7" }}
                >
                  <ReactMarkdown
                    components={{
                      h2: ({node, ...props}) => <h2 style={{fontSize: "1.1rem", fontWeight: "600", marginTop: "0.5rem", marginBottom: "0.75rem", color: "#f3f4f6"}} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{fontSize: "1rem", fontWeight: "600", marginTop: "0.5rem", marginBottom: "0.5rem", color: "#e5e7eb"}} {...props} />,
                      p: ({node, ...props}) => <p style={{marginBottom: "0.75rem", color: "#d1d5db", fontSize: "0.95rem"}} {...props} />,
                      ul: ({node, ...props}) => <ul style={{marginLeft: "0", marginBottom: "0.75rem", listStyleType: "none"}} {...props} />,
                      ol: ({node, ...props}) => <ol style={{marginLeft: "0", marginBottom: "0.75rem", listStyleType: "none"}} {...props} />,
                      li: ({node, ...props}) => (
                        <li style={{
                          marginBottom: "0.5rem",
                          padding: "0.75rem",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          color: "#d1d5db"
                        }} {...props} />
                      ),
                      code: ({node, inline, ...props}) => inline
                        ? <code style={{backgroundColor: "rgba(139, 92, 246, 0.15)", padding: "3px 8px", borderRadius: "4px", fontSize: "0.9em", color: "#a78bfa", fontFamily: "monospace"}} {...props} />
                        : <code style={{display: "block", backgroundColor: "rgba(0,0,0,0.4)", padding: "1rem", borderRadius: "8px", marginTop: "0.75rem", marginBottom: "0.75rem", fontSize: "0.9em", overflow: "auto", border: "1px solid rgba(255,255,255,0.15)", fontFamily: "monospace"}} {...props} />,
                      strong: ({node, ...props}) => <strong style={{fontWeight: "600", color: "#f9fafb"}} {...props} />,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              /* Regular Message Content with Markdown */
              <div
                className="prose prose-invert prose-sm max-w-none"
                style={{
                  color: "#e5e7eb",
                  lineHeight: "1.7"
                }}
              >
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 style={{fontSize: "1.5rem", fontWeight: "700", marginTop: "1rem", marginBottom: "0.75rem", color: "#f9fafb"}} {...props} />,
                    h2: ({node, ...props}) => <h2 style={{fontSize: "1.25rem", fontWeight: "600", marginTop: "1rem", marginBottom: "0.5rem", color: "#f3f4f6"}} {...props} />,
                    h3: ({node, ...props}) => <h3 style={{fontSize: "1.1rem", fontWeight: "600", marginTop: "0.75rem", marginBottom: "0.5rem", color: "#e5e7eb"}} {...props} />,
                    p: ({node, ...props}) => <p style={{marginBottom: "0.75rem", color: "#d1d5db"}} {...props} />,
                    ul: ({node, ...props}) => (
                      <ul style={{
                        marginLeft: "0",
                        marginBottom: "1rem",
                        listStyleType: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem"
                      }} {...props} />
                    ),
                    ol: ({node, ...props}) => (
                      <ol style={{
                        marginLeft: "0",
                        marginBottom: "1rem",
                        listStyleType: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        counterReset: "item"
                      }} {...props} />
                    ),
                    li: ({node, ordered, ...props}) => (
                      <li style={{
                        paddingLeft: ordered ? "2.5rem" : "2rem",
                        position: "relative",
                        color: "#d1d5db",
                        lineHeight: "1.6"
                      }}>
                        <span style={{
                          position: "absolute",
                          left: "0",
                          top: "0",
                          width: ordered ? "2rem" : "1.5rem",
                          height: "1.5rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: agentProfile?.color || "#49B85B",
                          backgroundColor: `${agentProfile?.color || "#49B85B"}22`,
                          borderRadius: "6px",
                          border: `1px solid ${agentProfile?.color || "#49B85B"}44`
                        }}>
                          {ordered ? (
                            <span style={{counterIncrement: "item", content: "counter(item)"}}>
                              {/* Counter will be rendered by CSS */}
                            </span>
                          ) : "•"}
                        </span>
                        <span {...props} />
                      </li>
                    ),
                    code: ({node, inline, ...props}) => inline
                      ? <code style={{backgroundColor: "rgba(139, 92, 246, 0.15)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.9em", color: "#a78bfa"}} {...props} />
                      : <code style={{display: "block", backgroundColor: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", marginTop: "0.5rem", marginBottom: "0.5rem", fontSize: "0.9em", overflow: "auto", border: "1px solid rgba(255,255,255,0.1)"}} {...props} />,
                    blockquote: ({node, ...props}) => <blockquote style={{borderLeft: `4px solid ${agentProfile?.color || "#49B85B"}`, paddingLeft: "1rem", marginLeft: 0, marginBottom: "0.75rem", color: "#9ca3af", fontStyle: "italic", backgroundColor: "rgba(255,255,255,0.02)", padding: "0.75rem 1rem", borderRadius: "0 8px 8px 0"}} {...props} />,
                    strong: ({node, ...props}) => <strong style={{fontWeight: "600", color: "#f9fafb"}} {...props} />,
                    em: ({node, ...props}) => <em style={{fontStyle: "italic", color: "#d1d5db"}} {...props} />,
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}

            {/* Interactive indicator */}
            {message.metadata?.interactive && (
              <div
                className="mt-3 px-3 py-2 rounded-lg inline-flex items-center gap-2"
                style={{
                  backgroundColor: "rgba(102, 187, 106, 0.1)",
                  border: "1px solid rgba(102, 187, 106, 0.3)"
                }}
              >
                <span style={{ color: "#66BB6A", fontSize: "0.875rem" }}>💬 Awaiting your response</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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

  // Initialize session
  useEffect(() => {
    if (!sessionStarted) {
      initializeAWSStrandsSession();
      setSessionStarted(true);
    }
  }, []);

  // Auto-scroll chat to bottom with smooth animation
  useEffect(() => {
    if (chatEndRef.current) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
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

      const sessionContext = {
        topicId,
        subjectId,
        expertiseLevel,
        focusLevel,
        stressLevel,
        sessionDuration: studyTime,
        examDate,
        userId: getAuth().currentUser?.uid,
      };

      // Step 1: Initialize backend session via API service
      console.log("🔗 Calling backend session initialization...");
      const backendSessionData = await studySessionAPI.initializeSession({
        userId: sessionContext.userId,
        topicId: sessionContext.topicId,
        subjectId: sessionContext.subjectId,
        expertiseLevel: sessionContext.expertiseLevel,
        focusLevel: sessionContext.focusLevel,
        stressLevel: sessionContext.stressLevel,
        sessionDuration: sessionContext.sessionDuration,
        examDate: sessionContext.examDate,
      });
      console.log("✅ Backend session initialized:", backendSessionData);

      // Step 2: Initialize the frontend agent graph with session_id
      const sessionContextWithId = {
        ...sessionContext,
        session_id: backendSessionData.session_id,
      };
      const graph = await initializeAgentGraph(sessionContextWithId);
      setAgentGraph(graph);

      // Load initial messages from backend (already contains properly formatted welcome message)
      if (
        backendSessionData.messages &&
        backendSessionData.messages.length > 0
      ) {
        setMessages(
          backendSessionData.messages.map((msg) => ({
            id: msg.id,
            sender: msg.sender,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            metadata: msg.metadata || {},
          }))
        );
      }

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
        addMessage(agentId, messageContent, {
          agentId: agentId,
          mode: agentResponse?.mode || "learning",
          interactive: false,
          metadata: agentResponse?.metadata || {},
        });

        updateProgress("interaction");
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

      // Save comprehensive session data to Firebase
      if (sessionId) {
        const db = getFirestore();
        const sessionRef = doc(
          db,
          "users",
          getAuth().currentUser.uid,
          "studyPlan",
          sessionId
        );

        await updateDoc(sessionRef, {
          status: "completed",
          completedAt: Timestamp.now(),

          // Enhanced performance summary with AWS Strands data
          performanceSummary: {
            ...sessionData.studentProgress,
            totalMessages: messages.length,
            sessionDuration: studyTime,
            orchestratorDecisions: sessionData.orchestratorDecisions.length,
            agentInteractions: sessionData.agentInteractions.length,
            finalMode: sessionMode,
            currentAgent: currentAgent,

            // AWS Strands specific data
            agentGraphSessionId: agentGraph?.graphId,
            awsStrandsActive: !sessionData.simulationMode,
            finalAgentSummary: finalAgentSummary,

            // Agent effectiveness metrics
            agentEffectiveness: calculateAgentEffectiveness(),
            contentQuality: calculateContentQuality(),
            sessionSatisfaction: 8.5, // Would be collected from student

            // Part 8 preparation - expertise assessment data
            expertiseAssessment: {
              preSessionLevel: expertiseLevel,
              postSessionLevel: expertiseLevel, // Will be assessed in Part 8
              confidenceChange: 0, // Will be measured
              recommendedFollowUp: generateFollowUpRecommendation(),
            },
          },

          // Complete chat log
          chatLog: messages.map((msg) => ({
            sender: msg.sender,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          })),

          // AWS Strands interaction data
          agentInteractions: sessionData.agentInteractions,
          orchestratorDecisions: sessionData.orchestratorDecisions,
          sessionPlan: sessionData.sessionPlan,

          // Enhanced agent data for Part 7 schema
          agentData: {
            teacher: calculateAgentMetrics("teacher"),
            tutor: calculateAgentMetrics("tutor"),
            perfectScorer: calculateAgentMetrics("perfectScorer"),
          },
        });
      }

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
      style={{
        background: "linear-gradient(to bottom, #0f1419 0%, #1A241B 100%)",
        color: "#F5F5F5"
      }}
    >
      {/* Enhanced Header */}
      <div
        className="sticky top-0 z-50"
        style={{
          background: "rgba(15, 20, 25, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          marginTop: "18px"
        }}
      >
        <div className="flex justify-between items-center px-8 py-5">
          {/* Left: Topic & Actions */}
          <div className="flex items-center gap-5">
            <button
              onClick={handleSessionEnd}
              className="px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2.5 transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                border: "none",
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                cursor: "pointer",
                marginLeft: "8px",
                marginRight: "16px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.3)";
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>←</span>
              <span>End Session</span>
            </button>

            <div className="h-8 w-px bg-gray-700"></div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📚</span>
                <h1 className="text-lg font-bold" style={{ color: "#A5D6A7" }}>
                  {topicId
                    .replace(/_/g, " ")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{agentProfiles[currentAgent]?.icon}</span>
                <span>Current: {agentProfiles[currentAgent]?.name}</span>
                <span>•</span>
                <span>Mode: {sessionMode}</span>
              </div>
            </div>
          </div>

          {/* Right: Timer & Stats - Compact Separate Cards */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
            {/* Concepts Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ fontSize: "18px" }}>📚</span>
              <div className="text-sm font-semibold" style={{ color: "#A5D6A7" }}>
                {sessionData.studentProgress.conceptsLearned} Concepts
              </div>
            </div>

            {/* Interactions Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ fontSize: "18px" }}>💬</span>
              <div className="text-sm font-semibold" style={{ color: "#4ECDC4" }}>
                {sessionData.agentInteractions.length} Interactions
              </div>
            </div>

            {/* Timer Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                whiteSpace: "nowrap"
              }}
            >
              <span style={{ fontSize: "18px" }}>⏱️</span>
              <div className="text-sm font-mono font-semibold" style={{ color: "#FFE66D" }}>
                {minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds} {mode} Time
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Improved with better structure */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: "1rem",
          paddingBottom: "2rem",
          backgroundColor: "#0f1419"
        }}
      >
        <div className="max-w-5xl mx-auto px-8">
          {/* Empty State - Show when no messages */}
          {messages.length === 0 && !isOrchestratorThinking && (
            <div className="flex flex-col items-center justify-center py-20">
              <div
                className="text-center max-w-2xl"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "20px",
                  padding: "3rem 2rem"
                }}
              >
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold mb-3" style={{ color: "#A5D6A7" }}>
                  Ready to Start Learning?
                </h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Your personalized study session is prepared! The AWS Strands AI orchestrator
                  has analyzed your expertise level ({expertiseLevel}), focus level ({focusLevel}/5),
                  and energy level ({stressLevel}/5) to create the perfect learning experience.
                </p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div
                    className="p-4 rounded-lg"
                    style={{
                      background: "rgba(73, 184, 91, 0.1)",
                      border: "1px solid rgba(73, 184, 91, 0.3)"
                    }}
                  >
                    <div className="text-2xl mb-2">👨‍🏫</div>
                    <div className="text-xs font-semibold text-gray-300">Teacher</div>
                    <div className="text-xs text-gray-500 mt-1">Exam prep & content</div>
                  </div>
                  <div
                    className="p-4 rounded-lg"
                    style={{
                      background: "rgba(78, 205, 196, 0.1)",
                      border: "1px solid rgba(78, 205, 196, 0.3)"
                    }}
                  >
                    <div className="text-2xl mb-2">🎓</div>
                    <div className="text-xs font-semibold text-gray-300">Tutor</div>
                    <div className="text-xs text-gray-500 mt-1">Deep understanding</div>
                  </div>
                  <div
                    className="p-4 rounded-lg"
                    style={{
                      background: "rgba(255, 230, 109, 0.1)",
                      border: "1px solid rgba(255, 230, 109, 0.3)"
                    }}
                  >
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="text-xs font-semibold text-gray-300">Perfect Scorer</div>
                    <div className="text-xs text-gray-500 mt-1">Visual aids & memory</div>
                  </div>
                </div>

                <div
                  className="text-sm text-left p-4 rounded-lg mb-6"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)"
                  }}
                >
                  <div className="font-semibold mb-2" style={{ color: "#8bc68f" }}>
                    💡 You can ask for:
                  </div>
                  <ul className="text-gray-400 text-xs space-y-1">
                    <li>• Concept explanations and examples</li>
                    <li>• Practice questions (O-Level style)</li>
                    <li>• Visual diagrams and memory techniques</li>
                    <li>• Step-by-step problem solving</li>
                  </ul>
                </div>

                <div className="text-sm text-gray-500">
                  Type <span className="px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.1)", color: "#8bc68f", fontFamily: "monospace" }}>start</span> to begin, or ask any question!
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} style={{ margin: "8px 0" }}>
              {message.sender === "student" ? (
                /* User message - improved bubble design */
                <div
                  className="w-full flex justify-end"
                  style={{ marginBottom: "12px" }}
                >
                  <div
                    className="max-w-2xl"
                    style={{
                      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "white",
                      borderRadius: "18px",
                      borderBottomRightRadius: "4px",
                      padding: "12px 18px",
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                      marginLeft: "16px",
                      marginRight: "16px"
                    }}
                  >
                    <div className="text-sm leading-relaxed" style={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
                      {typeof message.content === "string"
                        ? message.content
                        : String(message.content)}
                    </div>
                    <div className="text-xs mt-1 opacity-70 text-right">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Agent message - use enhanced component */
                <AgentMessage
                  message={message}
                  agentProfile={agentProfiles[message.sender]}
                />
              )}
            </div>
          ))}

          {/* Enhanced Thinking indicator */}
          {isOrchestratorThinking && (
            <div className="w-full py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", margin: "8px 0" }}>
              <div className="max-w-4xl mx-auto" style={{ paddingLeft: "16px", paddingRight: "16px" }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #49B85B22, #49B85B44)",
                      border: "2px solid #49B85B",
                    }}
                  >
                    <span className="text-lg animate-pulse">{agentProfiles.orchestrator.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm" style={{ color: "#49B85B" }}>
                        {agentProfiles.orchestrator.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                      <span className="text-sm text-gray-400 italic">
                        {agentGraph && !sessionData.simulationMode
                          ? "Coordinating AWS Strands agents..."
                          : "Analyzing and routing to best agent..."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Enhanced Input Area */}
      <div
        className="sticky bottom-0 border-t"
        style={{
          background: "rgba(15, 20, 25, 0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.3)",
          padding: "1.5rem 2rem"
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Quick Action Chips - Improved Spacing */}
          {messages.length > 0 && (
            <div
              className="flex gap-5 mb-4 overflow-x-auto pb-2"
              style={{
                scrollbarWidth: "thin",
                paddingTop: "0.5rem",
                paddingBottom: "0.75rem"
              }}
            >
              <button
                onClick={() => setInputMessage("Can you explain this concept in more detail?")}
                disabled={isOrchestratorThinking}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, rgba(107, 159, 111, 0.15), rgba(107, 159, 111, 0.08))",
                  border: "1px solid rgba(107, 159, 111, 0.3)",
                  color: "#a8d5ac",
                  minWidth: "170px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  marginRight: "8px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(107, 159, 111, 0.25), rgba(107, 159, 111, 0.12))";
                  e.currentTarget.style.borderColor = "rgba(107, 159, 111, 0.5)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(107, 159, 111, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(107, 159, 111, 0.15), rgba(107, 159, 111, 0.08))";
                  e.currentTarget.style.borderColor = "rgba(107, 159, 111, 0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>💡</span>
                <span>Explain more</span>
              </button>
              <button
                onClick={() => setInputMessage("Give me a practice question")}
                disabled={isOrchestratorThinking}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "rgba(255, 255, 255, 0.9)",
                  minWidth: "170px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  marginRight: "8px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>📝</span>
                <span>Practice question</span>
              </button>
              <button
                onClick={() => setInputMessage("Can you create a visual diagram for this?")}
                disabled={isOrchestratorThinking}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "rgba(255, 255, 255, 0.9)",
                  minWidth: "170px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>🎨</span>
                <span>Visual aid</span>
              </button>
            </div>
          )}

          {/* Input Container */}
          <div
            className="relative rounded-2xl"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "2px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
              transition: "all 0.2s ease",
              padding: "14px"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#49B85B";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(73, 184, 91, 0.2)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
            }}
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
                  ? "Ask a question, request practice, or ask for visual explanations..."
                  : "Type 'start' to begin your personalized study session..."
              }
              disabled={isOrchestratorThinking}
              className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none text-sm leading-6"
              style={{
                minHeight: "80px",
                maxHeight: "200px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                padding: "4px 120px 4px 4px"
              }}
              rows={3}
            />

            {/* Send Button - Elongated with Label */}
            <button
              onClick={() => handleStudentMessage(inputMessage)}
              disabled={!inputMessage.trim() || isOrchestratorThinking}
              className="absolute bottom-4 right-4 px-5 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
              style={{
                background: inputMessage.trim() && !isOrchestratorThinking
                  ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                  : "rgba(255, 255, 255, 0.1)",
                boxShadow: inputMessage.trim() && !isOrchestratorThinking
                  ? "0 3px 12px rgba(59, 130, 246, 0.4)"
                  : "none",
                opacity: inputMessage.trim() && !isOrchestratorThinking ? 1 : 0.4,
                cursor: inputMessage.trim() && !isOrchestratorThinking ? "pointer" : "not-allowed",
                border: inputMessage.trim() && !isOrchestratorThinking
                  ? "1px solid rgba(96, 165, 250, 0.3)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
                color: "white"
              }}
              onMouseEnter={(e) => {
                if (inputMessage.trim() && !isOrchestratorThinking) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.5)";
                  e.currentTarget.style.background = "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)";
                }
              }}
              onMouseLeave={(e) => {
                if (inputMessage.trim() && !isOrchestratorThinking) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 3px 12px rgba(59, 130, 246, 0.4)";
                  e.currentTarget.style.background = "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
                }
              }}
            >
              {isOrchestratorThinking ? (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                  <span className="text-sm">Sending...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                  <span className="text-sm">Send</span>
                </>
              )}
            </button>

            {/* Helper Text */}
            <div className="absolute bottom-1.5 left-4 text-xs text-gray-600 flex items-center gap-3">
              <span>Press Enter to send</span>
              <span>•</span>
              <span>Shift+Enter for new line</span>
              {agentGraph && !sessionData.simulationMode && (
                <>
                  <span>•</span>
                  <span className="text-green-500">🤖 AWS Strands Active</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySession;
