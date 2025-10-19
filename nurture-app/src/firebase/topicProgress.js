import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * Topic Progress Tracking Service
 *
 * Lightweight storage of actionable insights per topic instead of full chat logs.
 * Enables personalized, context-aware future sessions.
 */

/**
 * Get topic progress data for personalized session initialization
 */
export const getTopicProgress = async (userId, subjectId, topicId) => {
  const db = getFirestore();
  const topicRef = doc(db, 'users', userId, 'subjects', subjectId, 'topics', topicId);

  try {
    const topicDoc = await getDoc(topicRef);

    if (topicDoc.exists()) {
      return topicDoc.data();
    } else {
      // Return default structure for new topics
      return {
        expertiseLevel: 'beginner',
        lastStudied: null,
        totalSessions: 0,
        nextSteps: {
          content: 'Begin with foundational concepts and basic explanations',
          recommendedMode: 'learning',
          recommendedAgent: 'tutor',
          learningRatio: 80,
          practiceRatio: 20,
          strugglingAreas: [],
          masteredConcepts: [],
          confidence: 5,
          estimatedSessionsToMastery: null
        },
        performanceHistory: {
          averageAccuracy: 0,
          questionsAnswered: 0,
          lastSessionDate: null,
          trend: 'new'
        },
        recentSessions: []
      };
    }
  } catch (error) {
    console.error('Error fetching topic progress:', error);
    throw error;
  }
};

/**
 * Generate "Next Steps" summary using agent analysis
 * This replaces storing entire chat logs
 */
export const generateNextSteps = async (sessionData, messages, agentInteractions) => {
  // Analyze session to generate actionable insights
  const { studentProgress, sessionPlan, current_mode } = sessionData;

  // Calculate what student struggled with and mastered
  const strugglingAreas = extractStrugglingAreas(messages, agentInteractions);
  const masteredConcepts = extractMasteredConcepts(messages, studentProgress);

  // Determine next recommended approach
  const accuracy = studentProgress.correctAnswers / Math.max(1, studentProgress.questionsAnswered);
  const hasStruggles = strugglingAreas.length > 0;
  const hasMastery = masteredConcepts.length >= 2;

  // Smart recommendations based on session performance
  let recommendedMode = 'learning';
  let recommendedAgent = 'teacher';
  let learningRatio = 60;
  let practiceRatio = 40;
  let contentMessage = '';

  if (accuracy > 0.8 && hasMastery) {
    // Student doing well - increase practice
    recommendedMode = 'practice';
    recommendedAgent = 'teacher';
    learningRatio = 30;
    practiceRatio = 70;
    contentMessage = `Great progress! Focus on challenging practice questions to solidify mastery.`;
  } else if (accuracy < 0.5 || hasStruggles) {
    // Student struggling - more learning support
    recommendedMode = 'learning';
    recommendedAgent = 'tutor';
    learningRatio = 75;
    practiceRatio = 25;
    contentMessage = `Need more foundational work. Focus on: ${strugglingAreas.slice(0, 2).join(', ')}`;
  } else {
    // Balanced approach
    recommendedMode = 'learning';
    recommendedAgent = 'teacher';
    learningRatio = 50;
    practiceRatio = 50;
    contentMessage = `Continue balanced learning and practice to build confidence.`;
  }

  // Estimate sessions to mastery
  const estimatedSessionsToMastery = Math.max(1, Math.ceil((1 - accuracy) * 5));

  return {
    content: contentMessage,
    recommendedMode,
    recommendedAgent,
    learningRatio,
    practiceRatio,
    strugglingAreas,
    masteredConcepts,
    confidence: Math.min(10, accuracy * 10),
    estimatedSessionsToMastery,
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Extract areas where student struggled (from agent interactions)
 */
const extractStrugglingAreas = (messages, agentInteractions) => {
  const struggles = [];

  // Look for tutor interventions (usually means student needed help)
  const tutorInteractions = agentInteractions.filter(i => i.agent === 'tutor');
  if (tutorInteractions.length > 2) {
    struggles.push('conceptual understanding');
  }

  // Look for repeated questions or confusion markers in student messages
  const studentMessages = messages.filter(m => m.sender === 'student');
  const confusionKeywords = ['confused', 'don\'t understand', 'help', 'explain again', 'stuck'];

  studentMessages.forEach(msg => {
    const content = (msg.content || '').toLowerCase();
    if (confusionKeywords.some(keyword => content.includes(keyword))) {
      struggles.push('requires additional explanations');
    }
  });

  // Remove duplicates
  return [...new Set(struggles)];
};

/**
 * Extract concepts student has mastered (from progress data)
 */
const extractMasteredConcepts = (messages, studentProgress) => {
  const mastered = [];

  // If student got multiple correct answers, they've mastered basic concepts
  if (studentProgress.correctAnswers >= 3) {
    mastered.push('basic problem-solving');
  }

  // If high accuracy, mastered the topic
  const accuracy = studentProgress.correctAnswers / Math.max(1, studentProgress.questionsAnswered);
  if (accuracy > 0.75) {
    mastered.push('core concepts');
  }

  // Look for agent confirmations
  const agentMessages = messages.filter(m =>
    m.sender === 'teacher' || m.sender === 'tutor' || m.sender === 'perfect_scorer'
  );

  const successKeywords = ['excellent', 'great job', 'correct', 'well done', 'mastered'];
  agentMessages.forEach(msg => {
    const content = (msg.content || '').toLowerCase();
    if (successKeywords.some(keyword => content.includes(keyword))) {
      mastered.push('demonstrated competency');
    }
  });

  // Remove duplicates
  return [...new Set(mastered)];
};

/**
 * Determine if student should be promoted to next expertise level
 * Based on sustained performance over multiple sessions
 */
const determineExpertisePromotion = (currentLevel, averageAccuracy, totalSessions, trend) => {
  // Promotion criteria: sustained performance + sufficient sessions
  const PROMOTION_THRESHOLDS = {
    beginner: {
      nextLevel: 'apprentice',
      minAccuracy: 0.75,  // 75% average accuracy
      minSessions: 2,      // At least 2 sessions
      requireTrend: ['improving', 'stable']  // Not declining
    },
    apprentice: {
      nextLevel: 'pro',
      minAccuracy: 0.80,  // 80% average accuracy
      minSessions: 3,      // At least 3 sessions at apprentice
      requireTrend: ['improving', 'stable']
    },
    pro: {
      nextLevel: 'grandmaster',
      minAccuracy: 0.90,  // 90% average accuracy
      minSessions: 4,      // At least 4 sessions at pro
      requireTrend: ['improving', 'stable']
    },
    grandmaster: {
      nextLevel: 'grandmaster',  // Already at max
      minAccuracy: 1.0,
      minSessions: Infinity,
      requireTrend: []
    }
  };

  const threshold = PROMOTION_THRESHOLDS[currentLevel];

  if (!threshold) {
    console.warn(`Unknown expertise level: ${currentLevel}, defaulting to beginner`);
    return 'beginner';
  }

  // Check if promotion criteria met
  const meetsAccuracy = averageAccuracy >= threshold.minAccuracy;
  const meetsSessions = totalSessions >= threshold.minSessions;
  const meetsTrend = threshold.requireTrend.includes(trend);

  if (meetsAccuracy && meetsSessions && meetsTrend) {
    console.log(`🎉 Promoting from ${currentLevel} to ${threshold.nextLevel}! ` +
                `(Accuracy: ${Math.round(averageAccuracy * 100)}%, Sessions: ${totalSessions}, Trend: ${trend})`);
    return threshold.nextLevel;
  }

  // No promotion - return current level
  return currentLevel;
};

/**
 * Update topic progress after session ends
 * This is the key function that replaces storing full chat logs
 */
export const updateTopicProgress = async (
  userId,
  subjectId,
  topicId,
  sessionData,
  messages,
  agentInteractions,
  sessionId
) => {
  console.log("🔧 updateTopicProgress called with:", {
    userId,
    subjectId,
    topicId,
    questionsAnswered: sessionData?.studentProgress?.questionsAnswered,
    correctAnswers: sessionData?.studentProgress?.correctAnswers
  });

  const db = getFirestore();
  const topicRef = doc(db, 'users', userId, 'subjects', subjectId, 'topics', topicId);

  try {
    // Get current progress
    console.log("📥 Getting current progress...");
    const currentProgress = await getTopicProgress(userId, subjectId, topicId);
    console.log("✅ Current progress loaded:", {
      expertiseLevel: currentProgress.expertiseLevel,
      totalSessions: currentProgress.totalSessions
    });

    // Generate next steps based on this session
    const nextSteps = await generateNextSteps(sessionData, messages, agentInteractions);

    // Calculate performance metrics
    const accuracy = sessionData.studentProgress.correctAnswers /
                     Math.max(1, sessionData.studentProgress.questionsAnswered);

    // Update average accuracy (weighted average with previous sessions)
    const newAverageAccuracy = currentProgress.totalSessions > 0
      ? (currentProgress.performanceHistory.averageAccuracy * currentProgress.totalSessions + accuracy) /
        (currentProgress.totalSessions + 1)
      : accuracy;

    // Determine trend
    let trend = 'stable';
    if (currentProgress.performanceHistory.averageAccuracy > 0) {
      if (accuracy > currentProgress.performanceHistory.averageAccuracy + 0.15) {
        trend = 'improving';
      } else if (accuracy < currentProgress.performanceHistory.averageAccuracy - 0.15) {
        trend = 'declining';
      }
    }

    // Create lightweight session summary (NOT full chat log)
    const sessionSummary = {
      sessionId,
      date: Timestamp.now(),
      summary: `${sessionData.sessionPlan?.strategy || 'Learning session'} - ${
        sessionData.studentProgress.questionsAnswered
      } questions, ${Math.round(accuracy * 100)}% accuracy`,
      accuracy,
      primaryAgent: sessionData.currentAgent,
      mode: sessionData.currentMode
    };

    // Keep only last 3 sessions
    const recentSessions = [
      sessionSummary,
      ...(currentProgress.recentSessions || [])
    ].slice(0, 3);

    // Auto-promote based on performance
    const promotedExpertiseLevel = determineExpertisePromotion(
      currentProgress.expertiseLevel,
      newAverageAccuracy,
      currentProgress.totalSessions + 1,
      trend
    );

    // Update topic progress document
    const updatedProgress = {
      expertiseLevel: sessionData.context?.expertise_level || promotedExpertiseLevel,
      lastStudied: serverTimestamp(),
      totalSessions: (currentProgress.totalSessions || 0) + 1,
      nextSteps,
      performanceHistory: {
        averageAccuracy: newAverageAccuracy,
        questionsAnswered: (currentProgress.performanceHistory?.questionsAnswered || 0) +
                          sessionData.studentProgress.questionsAnswered,
        lastSessionDate: serverTimestamp(),
        trend
      },
      recentSessions
    };

    console.log("💾 Writing to Firebase:", {
      path: `users/${userId}/subjects/${subjectId}/topics/${topicId}`,
      data: {
        expertiseLevel: updatedProgress.expertiseLevel,
        totalSessions: updatedProgress.totalSessions,
        questionsAnswered: updatedProgress.performanceHistory.questionsAnswered,
        averageAccuracy: updatedProgress.performanceHistory.averageAccuracy
      }
    });

    await setDoc(topicRef, updatedProgress, { merge: true });

    console.log('✅ Topic progress successfully saved to Firebase!');
    console.log('📊 Next steps:', nextSteps);

    // Return progress with promotion flag if leveled up
    const wasPromoted = promotedExpertiseLevel !== currentProgress.expertiseLevel;

    return {
      ...updatedProgress,
      wasPromoted,
      promotionMessage: wasPromoted
        ? `🎉 Congratulations! You've been promoted from ${currentProgress.expertiseLevel} to ${promotedExpertiseLevel}!`
        : null
    };

  } catch (error) {
    console.error('❌ Error updating topic progress:', error);
    throw error;
  }
};

/**
 * Get personalized session configuration based on topic progress
 * This is used during session initialization
 */
export const getPersonalizedSessionConfig = (topicProgress) => {
  if (!topicProgress || !topicProgress.nextSteps) {
    return null;
  }

  const { nextSteps, performanceHistory, expertiseLevel } = topicProgress;

  return {
    // Use recommendations from last session
    initialMode: nextSteps.recommendedMode,
    primaryAgent: nextSteps.recommendedAgent,
    learningRatio: nextSteps.learningRatio,
    practiceRatio: nextSteps.practiceRatio,

    // Context for agents
    context: {
      strugglingAreas: nextSteps.strugglingAreas,
      masteredConcepts: nextSteps.masteredConcepts,
      previousAccuracy: performanceHistory.averageAccuracy,
      trend: performanceHistory.trend,
      totalPreviousSessions: topicProgress.totalSessions,
      nextStepsGuidance: nextSteps.content
    },

    // Show to student
    welcomeMessage: `📚 **Continuing ${topicProgress.recentSessions?.[0]?.summary || 'your learning journey'}**\n\n` +
                   `**Next Steps**: ${nextSteps.content}\n\n` +
                   `**Performance Trend**: ${performanceHistory.trend === 'improving' ? '📈 Improving!' :
                                            performanceHistory.trend === 'declining' ? '📉 Needs work' :
                                            '➡️ Steady'}\n` +
                   `**Confidence Level**: ${Math.round(nextSteps.confidence)}/10\n\n` +
                   `Today's focus: ${nextSteps.learningRatio}% learning, ${nextSteps.practiceRatio}% practice`
  };
};

export default {
  getTopicProgress,
  updateTopicProgress,
  getPersonalizedSessionConfig,
  generateNextSteps
};
