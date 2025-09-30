/**
 * Agentic Evaluation Service - React Wrapper
 * 
 * This wrapper interfaces with the sophisticated Python backend that uses:
 * - Agent Graph (mesh topology) for structured expert analysis
 * - Swarm intelligence for consensus building and synthesis
 * - Hybrid approach combining both paradigms
 */

/**
 * Time-Limited Agentic Evaluation Service - React Wrapper
 * 
 * Supports 5-minute time-limited agent discussions with real-time chat display
 */

/**
 * Time-Limited Agentic Evaluation Service - React Wrapper
 * 
 * Supports adaptive agent discussions with smart time management and real-time chat display
 */

import { nurtureAPI } from './api';

/**
 * Evaluate quiz results with time limit and adaptive agent behavior
 */
export const evaluateQuizResultsWithTimeLimit = async (quizResults, timeLimitMinutes = 5, onChatUpdate = null) => {
  try {
    console.log(`🚀 Starting \${timeLimitMinutes}-minute adaptive evaluation...`);
    
    const response = await nurtureAPI.evaluateQuizWithTimeLimit({
      ...quizResults,
      timeLimitMinutes
    });
    
    // If chat updates are provided, simulate real-time updates
    if (onChatUpdate && response.evaluation.chat_log) {
      await simulateRealTimeChatUpdates(response.evaluation.chat_log, onChatUpdate);
    }
    
    console.log('✅ Adaptive time-limited evaluation completed');
    return response.evaluation;
    
  } catch (error) {
    console.error('❌ Time-limited evaluation failed:', error);
    throw new Error(`Adaptive evaluation failed: \${error.message}`);
  }
};

/**
 * Simulate real-time chat updates for UI demonstration
 */
const simulateRealTimeChatUpdates = async (chatLog, onChatUpdate) => {
  for (let i = 0; i < chatLog.length; i++) {
    const chat = chatLog[i];
    
    // Simulate delay based on time remaining (faster updates when time is low)
    const baseDelay = Math.max(100, Math.min(800, (chat.time_remaining || 60) * 8));
    const jitter = Math.random() * 200; // Add some randomness
    const delay = baseDelay + jitter;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    onChatUpdate({
      ...chat,
      isNew: true,
      messageIndex: i,
      totalMessages: chatLog.length,
      progressPercentage: ((i + 1) / chatLog.length) * 100
    });
  }
};

/**
 * Format chat log with comprehensive time-aware features
 */
export const formatTimeLimitedChatLog = (evaluationResults) => {
  const chatLog = evaluationResults.chat_log || evaluationResults.complete_discussion || [];
  const timeInfo = evaluationResults.time_info || {};
  
  return {
    // Organize by phases with time info
    phases: {
      initialization: chatLog.filter(c => c.phase === 'initialization'),
      agentAnalysis: chatLog.filter(c => c.phase === 'agent_analysis'),
      swarmConsensus: chatLog.filter(c => c.phase === 'swarm_consensus'),
      finalAssessment: chatLog.filter(c => c.phase === 'final_assessment'),
      system: chatLog.filter(c => c.chat_type === 'system'),
      errors: chatLog.filter(c => c.chat_type === 'error')
    },
    
    // Chronological with time remaining
    chronological: chatLog
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((chat, index) => ({
        ...chat,
        messageNumber: index + 1,
        timeRemainingFormatted: formatTimeRemaining(chat.time_remaining || 0),
        elapsedTimeFormatted: formatTimeElapsed(chat.elapsed_time || 0),
        timePressureLevel: getTimePressureLevel(chat.time_remaining || 0, timeInfo.limit_minutes || 5)
      })),
    
    // Time-based statistics
    timeStats: {
      totalDuration: timeInfo.actual_duration_seconds || 0,
      timeLimit: (timeInfo.limit_minutes || 5) * 60,
      completedWithinLimit: timeInfo.completed_within_limit || false,
      phasesCompleted: timeInfo.phases_completed || 0,
      messagesPerMinute: chatLog.length / Math.max(1, (timeInfo.actual_duration_seconds || 60) / 60),
      timeDistribution: calculateTimeDistribution(chatLog),
      adaptiveAdjustments: timeInfo.adaptive_adjustments || 0
    },
    
    // Agent participation analysis
    agentStats: calculateAgentStats(chatLog),
    
    // Key insights extraction
    keyInsights: extractKeyInsights(chatLog)
  };
};

/**
 * Calculate comprehensive agent statistics
 */
const calculateAgentStats = (chatLog) => {
  return chatLog.reduce((acc, chat) => {
    if (!acc[chat.agent]) {
      acc[chat.agent] = {
        messageCount: 0,
        firstMessage: chat.timestamp,
        lastMessage: chat.timestamp,
        chatTypes: new Set(),
        phases: new Set(),
        avgTimeRemaining: 0,
        timePressureLevels: new Set()
      };
    }
    
    const agent = acc[chat.agent];
    agent.messageCount++;
    agent.lastMessage = chat.timestamp;
    agent.chatTypes.add(chat.chat_type);
    agent.phases.add(chat.phase);
    agent.avgTimeRemaining = ((agent.avgTimeRemaining * (agent.messageCount - 1)) + (chat.time_remaining || 0)) / agent.messageCount;
    agent.timePressureLevels.add(getTimePressureLevel(chat.time_remaining || 0, 5));
    
    return acc;
  }, {});
};

/**
 * Extract key insights from chat log
 */
const extractKeyInsights = (chatLog) => {
  const insights = {
    systemMessages: chatLog.filter(c => c.chat_type === 'system' || c.agent === 'System'),
    criticalMoments: chatLog.filter(c => (c.time_remaining || 0) < 30 || c.chat_type === 'error'),
    finalAssessments: chatLog.filter(c => c.chat_type === 'final_assessment' || c.phase === 'final_assessment'),
    agentThoughts: chatLog.filter(c => c.chat_type === 'thinking'),
    swarmConsensus: chatLog.filter(c => c.chat_type === 'consensus'),
    timeWarnings: chatLog.filter(c => c.message && c.message.includes('⏰'))
  };
  
  return insights;
};

/**
 * Calculate time distribution across phases
 */
const calculateTimeDistribution = (chatLog) => {
  const phases = {};
  
  chatLog.forEach(chat => {
    const phase = chat.phase || 'unknown';
    if (!phases[phase]) {
      phases[phase] = {
        messageCount: 0,
        startTime: chat.time_remaining || 300,
        endTime: chat.time_remaining || 0,
        duration: 0
      };
    }
    phases[phase].messageCount++;
    phases[phase].endTime = Math.min(phases[phase].endTime, chat.time_remaining || 0);
    // Fix: Calculate actual elapsed time, not time remaining difference
    phases[phase].duration = Math.max(0, phases[phase].startTime - phases[phase].endTime);
  });
  
  return phases;
};

/**
 * Determine time pressure level based on remaining time
 */
const getTimePressureLevel = (timeRemaining, timeLimitMinutes) => {
  const totalTime = timeLimitMinutes * 60;
  const ratio = timeRemaining / totalTime;
  
  if (ratio > 0.7) return 'relaxed';
  if (ratio > 0.4) return 'moderate';
  if (ratio > 0.15) return 'urgent';
  return 'critical';
};

/**
 * Format time remaining for display
 */
const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return "⏰ TIME'S UP!";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else if (seconds > 10) {
    return `${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s ⚡`;
  }
};

/**
 * Format elapsed time for display
 */
const formatTimeElapsed = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
};

/**
 * Enhanced evaluation results formatting with comprehensive time info
 */
export const formatEvaluationResults = (evaluationResults) => {
  if (!evaluationResults) return null;
  
  const baseFormatting = {
    summary: evaluationResults.summary || {},
    expertiseLevel: evaluationResults.expertiseLevel || 'beginner',
    levelInfo: evaluationResults.levelInfo || {},
    justification: evaluationResults.justification || '',
    confidence: evaluationResults.confidence || 0,
    recommendation: evaluationResults.recommendation || '',
    breakdown: evaluationResults.breakdown || {},
    topicPerformance: evaluationResults.topic_performance || evaluationResults.topicPerformance || {}
  };
  
  // Add comprehensive time-specific formatting
  const timeLimitedFormatting = formatTimeLimitedChatLog(evaluationResults);
  
  return {
    ...baseFormatting,
    ...timeLimitedFormatting,
    
    // Maintain backward compatibility
    agentDiscussion: evaluationResults.chat_log || evaluationResults.complete_discussion || [],
    complete_discussion: evaluationResults.chat_log || evaluationResults.complete_discussion || [],
    
    // Enhanced metadata
    evaluationMethod: evaluationResults.evaluation_method || 'adaptive_time_managed_hybrid',
    timeInfo: evaluationResults.time_info || {},
    networkInfo: evaluationResults.network_info || {}
  };
};

/**
 * Real-time chat component helper for React with comprehensive features
 */
export const TimeLimitedChatDisplay = ({ chatLog, timeInfo }) => {
  const formatted = formatTimeLimitedChatLog({ chat_log: chatLog, time_info: timeInfo });
  
  return {
    messages: formatted.chronological,
    stats: formatted.timeStats,
    phases: formatted.phases,
    agents: formatted.agentStats,
    insights: formatted.keyInsights,
    
    // UI helpers
    getMessageStyle: (message) => ({
      urgency: message.timePressureLevel,
      color: getTimePressureColor(message.timePressureLevel),
      icon: message.icon,
      timestamp: message.timeRemainingFormatted
    }),
    
    // Progress tracking
    getProgress: () => ({
      currentPhase: getCurrentPhase(formatted.chronological),
      completion: (formatted.timeStats.totalDuration / formatted.timeStats.timeLimit) * 100,
      efficiency: formatted.timeStats.messagesPerMinute
    })
  };
};

/**
 * Get current phase from chronological messages
 */
const getCurrentPhase = (messages) => {
  if (messages.length === 0) return 'not_started';
  return messages[messages.length - 1].phase || 'unknown';
};

/**
 * Get color for time pressure level
 */
const getTimePressureColor = (pressureLevel) => {
  const colors = {
    relaxed: '#28a745',   // Green
    moderate: '#ffc107',  // Yellow  
    urgent: '#fd7e14',    // Orange
    critical: '#dc3545'   // Red
  };
  return colors[pressureLevel] || '#6c757d';
};

/**
 * Get time-based insights and analytics from evaluation
 */
export const extractTimeLimitedInsights = (evaluationResults) => {
  const chatData = formatTimeLimitedChatLog(evaluationResults);
  
  return {
    timeEfficiency: {
      completedWithinLimit: chatData.timeStats.completedWithinLimit,
      actualDuration: chatData.timeStats.totalDuration,
      timeLimit: chatData.timeStats.timeLimit,
      utilizationPercentage: Math.round((chatData.timeStats.totalDuration / chatData.timeStats.timeLimit) * 100),
      efficiencyRating: getEfficiencyRating(chatData.timeStats)
    },
    
    communicationEfficiency: {
      messagesPerMinute: Math.round(chatData.timeStats.messagesPerMinute * 10) / 10,
      totalMessages: chatData.chronological.length,
      phasesCompleted: chatData.timeStats.phasesCompleted,
      adaptiveAdjustments: chatData.timeStats.adaptiveAdjustments
    },
    
    agentPerformance: Object.entries(chatData.agentStats).map(([agent, stats]) => ({
      agent,
      messageCount: stats.messageCount,
      phases: Array.from(stats.phases),
      avgTimeRemaining: Math.round(stats.avgTimeRemaining),
      efficiency: stats.messageCount / Math.max(1, chatData.timeStats.totalDuration / 60)
    })),
    
    keyMoments: chatData.keyInsights.criticalMoments.map(msg => ({
      type: 'critical',
      message: msg.message,
      timeRemaining: msg.time_remaining,
      agent: msg.agent,
      timestamp: msg.timestamp,
      importance: msg.time_remaining < 10 ? 'critical' : 'high'
    })),
    
    phaseBreakdown: Object.entries(chatData.timeStats.timeDistribution).map(([phase, data]) => ({
      phase,
      duration: data.duration,
      messageCount: data.messageCount,
      efficiency: data.messageCount / Math.max(1, data.duration / 60)
    }))
  };
};

/**
 * Calculate efficiency rating
 */
const getEfficiencyRating = (timeStats) => {
  if (!timeStats.completedWithinLimit) return 'exceeded_limit';
  
  const utilization = timeStats.totalDuration / timeStats.timeLimit;
  const messageRate = timeStats.messagesPerMinute;
  
  if (utilization < 0.8 && messageRate > 3) return 'highly_efficient';
  if (utilization < 0.9 && messageRate > 2) return 'efficient';
  if (utilization < 1.0) return 'adequate';
  return 'inefficient';
};

/**
 * Configuration constants for time limits
 */
export const TIME_LIMIT_OPTIONS = {
  quick: { minutes: 2, label: "Quick (2 min)", description: "Rapid assessment" },
  standard: { minutes: 5, label: "Standard (5 min)", description: "Balanced analysis" },
  thorough: { minutes: 8, label: "Thorough (8 min)", description: "Comprehensive evaluation" },
  extended: { minutes: 10, label: "Extended (10 min)", description: "Deep analysis" }
};

/**
 * Chat type definitions with styling
 */
export const CHAT_TYPES = {
  thinking: { icon: "🤔", label: "Thinking", color: "#FFF3CD", priority: 1 },
  analysis: { icon: "📊", label: "Analysis", color: "#D4EDDA", priority: 3 },
  peer_communication: { icon: "💬", label: "Discussion", color: "#D1ECF1", priority: 2 },
  swarm_analysis: { icon: "🐝", label: "Swarm", color: "#F8D7DA", priority: 3 },
  consensus: { icon: "✨", label: "Consensus", color: "#E2E3E5", priority: 4 },
  system: { icon: "⚙️", label: "System", color: "#F8F9FA", priority: 0 },
  error: { icon: "⚠️", label: "Error", color: "#F5C6CB", priority: 5 },
  final_assessment: { icon: "🎯", label: "Final Result", color: "#C3E6CB", priority: 4 },
  timing: { icon: "⏱️", label: "Timing", color: "#E7F3FF", priority: 1 }
};

/**
 * Time pressure level definitions
 */
export const TIME_PRESSURE_LEVELS = {
  relaxed: { label: "Relaxed", color: "#28a745", description: "Plenty of time" },
  moderate: { label: "Moderate", color: "#ffc107", description: "Adequate time" },
  urgent: { label: "Urgent", color: "#fd7e14", description: "Time running low" },
  critical: { label: "Critical", color: "#dc3545", description: "Very little time" }
};

/**
 * Validation helper for quiz results with enhanced checks
 */
export const validateQuizResults = (quizResults) => {
  if (!quizResults) {
    throw new Error('Quiz results are required');
  }
  
  if (!quizResults.answers || !Array.isArray(quizResults.answers)) {
    throw new Error('Quiz results must contain an array of answers');
  }
  
  if (quizResults.answers.length === 0) {
    throw new Error('At least one answer is required for evaluation');
  }
  
  // Validate answer structure
  quizResults.answers.forEach((answer, index) => {
    if (typeof answer.isCorrect !== 'boolean') {
      throw new Error(`Answer \${index + 1} missing valid isCorrect field`);
    }
    if (!answer.difficulty) {
      console.warn(`Answer \${index + 1} missing difficulty, defaulting to 'medium'`);
    }
    if (!answer.topic) {
      console.warn(`Answer \${index + 1} missing topic, defaulting to 'Unknown'`);
    }
  });
  
  return true;
};

/**
 * Error boundary helper for agentic evaluation with time context
 */
export const handleEvaluationError = (error, timeContext = {}) => {
  console.error('Agentic evaluation error:', error);
  
  // Return fallback evaluation for graceful degradation
  return {
    summary: { accuracy: 0, confidence: 0, total_questions: 0, total_correct: 0 },
    expertiseLevel: 'beginner',
    levelInfo: EXPERTISE_LEVELS.beginner,
    justification: 'Evaluation failed - using fallback assessment',
    confidence: 0,
    recommendation: 'Please try evaluation again or contact support',
    agentDiscussion: [{
      agent: 'System',
      icon: '⚠️',
      message: `Evaluation failed: \${error.message}`,
      timestamp: new Date().toISOString(),
      phase: 'error',
      chat_type: 'error',
      time_remaining: timeContext.timeRemaining || 0
    }],
    networkInfo: {
      method: 'fallback',
      error: true,
      error_message: error.message
    },
    timeInfo: {
      error: true,
      ...timeContext
    }
  };
};

// Legacy compatibility - main export
export const evaluateQuizResults = evaluateQuizResultsWithTimeLimit;

// Updated agent personas for display
export const AGENT_PERSONAS = {
  moeTeacher: {
    name: "MOE Teacher",
    icon: "👩‍🏫",
    focus: "Singapore O-Level standards, curriculum compliance, misconceptions",
    role: "educational_assessor",
    description: "Evaluates based on official syllabus requirements"
  },
  perfectStudent: {
    name: "Perfect Score Student", 
    icon: "🏆",
    focus: "Efficiency optimization, strategic improvements, time management",
    role: "performance_optimizer",
    description: "Focuses on achieving maximum performance"
  },
  tutor: {
    name: "Private Tutor",
    icon: "🎓",
    focus: "Knowledge gaps, foundational understanding, remediation strategies",
    role: "foundation_builder",
    description: "Identifies and addresses learning gaps"
  }
};

// Updated expertise levels
export const EXPERTISE_LEVELS = {
  beginner: {
    level: "Beginner",
    color: "#FF6B6B",
    icon: "🌱",
    criteria: "Struggles to consistently answer Easy questions. Cannot solve Medium questions.",
    focus: "Missing core foundational knowledge"
  },
  apprentice: {
    level: "Apprentice", 
    color: "#FFE66D",
    icon: "🌿",
    criteria: "Can answer Easy and most Medium questions, but fails at Hard questions.",
    focus: "Theory-to-application gap"
  },
  pro: {
    level: "Pro",
    color: "#4ECDC4",
    icon: "🌳",
    criteria: "Can consistently solve Hard questions but makes mistakes on Very Hard questions.",
    focus: "Lacks deep mastery or efficiency"
  },
  grandmaster: {
    level: "Grand Master",
    color: "#49B85B", 
    icon: "🏆",
    criteria: "Consistently and efficiently solves Very Hard questions.",
    focus: "Demonstrates full mastery"
  }
};

/**
 * Development and debugging helpers
 */
export const getBackendInfo = () => ({
  backend: 'Python AWS Strands SDK',
  approach: 'Adaptive Time-Limited Agent Graph + Swarm',
  agents: Object.keys(AGENT_PERSONAS).length,
  topologies: ['mesh', 'swarm', 'hybrid'],
  phases: 4,
  timeManagement: 'adaptive',
  features: ['time_pressure_adaptation', 'phase_skipping', 'smart_consensus']
});

/**
 * Export for testing and development
 */
export const __testing__ = {
  formatTimeLimitedChatLog,
  calculateAgentStats,
  extractKeyInsights,
  getTimePressureLevel,
  formatTimeRemaining,
  formatTimeElapsed
};

// Note: All sophisticated multi-agent functionality implemented in Python backend
// - TimeLimitedStrandsEvaluationService: Adaptive time management with smart phase allocation
// - Agent Graph mesh topology for structured expert analysis
// - Swarm intelligence for consensus building with time constraints
// - Real-time chat logging with time pressure adaptation