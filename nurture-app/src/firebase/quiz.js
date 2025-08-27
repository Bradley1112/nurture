import { doc, setDoc, collection, addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Creates subject and topic entries in Firebase according to Part 2 database structure
 * This follows the database schema specified in the README:
 * users/{userId}/subjects/{subject}/topics/{topic}
 */
export const initializeUserSubjects = async (userId, selectedTopics) => {
  try {
    // Group topics by subject
    const subjectTopics = {
      'math': [],
      'physics': [],
      'english': []
    };

    selectedTopics.forEach(topic => {
      if (topic.toLowerCase().includes('algebra')) {
        subjectTopics.math.push('algebraic_techniques');
      } else if (topic.toLowerCase().includes('kinematics')) {
        subjectTopics.physics.push('kinematics');
      } else if (topic.toLowerCase().includes('comprehension') || topic.toLowerCase().includes('reading')) {
        subjectTopics.english.push('reading_comprehension');
      }
    });

    // Create subject and topic documents
    for (const [subject, topics] of Object.entries(subjectTopics)) {
      if (topics.length > 0) {
        for (const topic of topics) {
          await setDoc(doc(db, "users", userId, "subjects", subject, "topics", topic), {
            expertiseLevel: "Beginner", // Initial level - will be updated after evaluation
            lastStudied: Timestamp.now(),
            evaluationCompleted: false,
            createdAt: Timestamp.now()
          });
        }
      }
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to initialize user subjects: ${error.message}`);
  }
};

/**
 * Stores quiz results after evaluation
 * Creates entries in Firebase according to the database structure
 */
export const storeQuizResults = async (quizData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const { topics, results, startTime, endTime } = quizData;

    // Store quiz session data
    const quizSessionData = {
      userId: user.uid,
      topics,
      startTime: Timestamp.fromDate(new Date(startTime)),
      endTime: Timestamp.fromDate(new Date(endTime)),
      totalQuestions: results.length,
      correctAnswers: results.filter(r => r.isCorrect).length,
      createdAt: Timestamp.now()
    };

    const quizSessionRef = await addDoc(collection(db, "quizSessions"), quizSessionData);

    // Store individual question results
    for (const result of results) {
      await addDoc(collection(db, "quizSessions", quizSessionRef.id, "questionResults"), {
        questionId: result.questionId,
        topic: result.topic,
        difficulty: result.difficulty,
        userAnswer: result.userAnswer,
        correctAnswer: result.correctAnswer,
        isCorrect: result.isCorrect,
        timeSpent: result.timeSpent || 0,
        timestamp: Timestamp.now()
      });
    }

    return quizSessionRef.id;
  } catch (error) {
    throw new Error(`Failed to store quiz results: ${error.message}`);
  }
};

/**
 * Updates topic expertise level after evaluation
 * This will be used by the agentic evaluation system in Part 3
 */
export const updateTopicExpertise = async (userId, topic, expertiseLevel, justification = '') => {
  try {
    // Map topic to subject and normalized topic name
    let subject, normalizedTopic;
    
    if (topic.toLowerCase().includes('algebra')) {
      subject = 'math';
      normalizedTopic = 'algebraic_techniques';
    } else if (topic.toLowerCase().includes('kinematics')) {
      subject = 'physics';
      normalizedTopic = 'kinematics';
    } else if (topic.toLowerCase().includes('comprehension') || topic.toLowerCase().includes('reading')) {
      subject = 'english';
      normalizedTopic = 'reading_comprehension';
    } else {
      throw new Error(`Unknown topic: ${topic}`);
    }

    await updateDoc(doc(db, "users", userId, "subjects", subject, "topics", normalizedTopic), {
      expertiseLevel,
      lastEvaluated: Timestamp.now(),
      evaluationJustification: justification,
      evaluationCompleted: true
    });

    return true;
  } catch (error) {
    throw new Error(`Failed to update topic expertise: ${error.message}`);
  }
};

/**
 * Part 3 Integration Point - Agentic Evaluation
 * Triggers the collaborative swarm pattern evaluation using AWS Bedrock Sonnet 4.0
 */
export const triggerAgenticEvaluation = async (quizResults, userId) => {
  try {
    // Import the agentic evaluation service
    const { evaluateQuizResults } = await import('../services/agenticEvaluation');
    
    // Perform agentic evaluation using collaborative swarm pattern
    const evaluationResults = await evaluateQuizResults(quizResults);
    
    // Update Firebase with evaluation results
    const evaluationData = {
      userId,
      quizSessionId: quizResults.sessionId,
      expertiseLevel: evaluationResults.finalAssessment.level,
      justification: evaluationResults.finalAssessment.justification,
      confidence: evaluationResults.finalAssessment.confidence,
      agentDiscussion: evaluationResults.agentDiscussion,
      metrics: evaluationResults.metrics,
      evaluatedAt: Timestamp.now()
    };
    
    // Store evaluation results
    const evaluationRef = await addDoc(collection(db, "agenticEvaluations"), evaluationData);
    
    // Update topic expertise levels for each topic
    const topics = quizResults.topics || [];
    for (const topic of topics) {
      await updateTopicExpertise(
        userId, 
        topic, 
        evaluationResults.finalAssessment.level,
        evaluationResults.finalAssessment.justification
      );
    }
    
    return {
      evaluationId: evaluationRef.id,
      results: evaluationResults,
      success: true
    };
    
  } catch (error) {
    throw new Error(`Agentic evaluation failed: ${error.message}`);
  }
};

/**
 * Gets current user's topic expertise levels
 */
export const getUserTopicExpertise = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // This would query the Firebase database for user's topic expertise
    // Implementation will depend on the specific query needs
    // TODO: Implement getUserTopicExpertise query
    
    // Placeholder return
    return {
      physics: { kinematics: 'Beginner' },
      math: { algebraic_techniques: 'Apprentice' },
      english: { reading_comprehension: 'Pro' }
    };
  } catch (error) {
    throw new Error(`Failed to get user topic expertise: ${error.message}`);
  }
};