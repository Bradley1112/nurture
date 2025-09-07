import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { nurtureAPI } from '../services/api';

/**
 * Utility function to extract clean question text from various AI response formats
 */
const extractQuestionText = (questionData, index) => {
  let questionText = '';
  
  try {
    // Case 1: Simple string
    if (typeof questionData === 'string') {
      questionText = questionData;
    }
    // Case 2: Nested structure with content array
    else if (questionData?.content?.[0]?.text) {
      const fullText = questionData.content[0].text;
      questionText = parseStructuredQuestionText(fullText);
    }
    // Case 3: Message property
    else if (questionData?.message) {
      if (typeof questionData.message === 'string') {
        questionText = questionData.message;
      } else if (questionData.message?.content?.[0]?.text) {
        questionText = parseStructuredQuestionText(questionData.message.content[0].text);
      }
    }
    // Case 4: Direct content array at top level
    else if (Array.isArray(questionData) && questionData[0]?.text) {
      questionText = parseStructuredQuestionText(questionData[0].text);
    }
    // Case 5: Fallback
    else {
      questionText = `Question ${index + 1}`;
    }
    
    // Clean up the extracted text
    questionText = questionText
      .replace(/\*\*.*?\*\*/g, '') // Remove all **text** formatting
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
      
    return questionText || `Question ${index + 1}`;
    
  } catch (error) {
    console.warn(`Failed to parse question ${index + 1}:`, error);
    return `Question ${index + 1}`;
  }
};

/**
 * Parse structured question text that may contain markdown formatting
 */
const parseStructuredQuestionText = (fullText) => {
  if (!fullText || typeof fullText !== 'string') {
    return '';
  }
  
  // Try to extract question using various patterns
  const patterns = [
    // Pattern 1: **Question:** followed by content
    /\*\*Question:\*\*\s*(.*?)(?:\*\*(?:Options|Correct Answer|Solution):|$)/s,
    // Pattern 2: Question without formatting
    /^([^*\n]+?)(?:\*\*|Options:|Correct Answer:|$)/,
    // Pattern 3: Everything before first **Options** or similar
    /^(.*?)(?:\*\*Options|Options:|Correct Answer:|$)/s
  ];
  
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match && match[1] && match[1].trim().length > 5) {
      return match[1].trim();
    }
  }
  
  // Fallback: return first meaningful line
  const firstLine = fullText.split('\n')[0];
  return firstLine.length > 5 ? firstLine : fullText.substring(0, 200);
};

/**
 * Thin React UI Component for Evaluation Quiz
 * 
 * This component ONLY handles the user interface and experience.
 * All sophisticated agentic functionality is handled by the Python backend:
 * 
 * BACKEND FEATURES (EvaluationQuiz.py):
 * - Agent Pool System: 3 reusable agents for efficiency (~10x faster)
 * - Real PDF Fetching: http_request tool fetches actual syllabus content
 * - Batch Processing: Rate-limited batches of 3 questions per batch
 * - Memory Management: Fresh conversation history per question
 * - Model: Claude Sonnet 4.0 (anthropic.claude-sonnet-4-20250514-v1:0)
 */
function EvaluationQuiz({ user }) {
  // UI State Management (no AI logic here)
  const [step, setStep] = useState('selection'); // selection, quiz, evaluation, results
  const [subjects, setSubjects] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [agentDiscussion, setAgentDiscussion] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  
  // Progress tracking for quiz generation
  const [generationProgress, setGenerationProgress] = useState({
    status: 'idle', // idle, generating, completed, error
    message: '',
    current_batch: 0,
    total_batches: 0,
    session_id: null
  });
  
  const navigate = useNavigate();

  // Check backend connectivity on component mount
  useEffect(() => {
    checkSystemStatus();
    loadSubjects();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const status = await nurtureAPI.getSystemStatus();
      setSystemStatus(status);
      if (!status.backend_online) {
        setError('Backend agentic system is offline. Please try again later.');
      }
    } catch (err) {
      setError('Failed to connect to agentic backend system.');
    }
  };

  // Load subjects from Python backend (uses agentic RAG system)
  const loadSubjects = async () => {
    try {
      setLoading(true);
      const response = await nurtureAPI.getSubjects();
      setSubjects(response.subjects || []);
    } catch (err) {
      setError('Failed to load subjects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelection = (topic) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  // Start quiz with progress tracking - triggers sophisticated Python agentic RAG system
  const startQuiz = async () => {
    if (selectedTopics.length === 0) {
      setError('Please select at least one topic');
      return;
    }

    setError(null);
    
    try {
      // Call Python backend which uses AWS Strands SDK and agentic RAG
      const response = await nurtureAPI.startQuiz(selectedTopics);
      
      // Check if we got direct quiz_data (cached/fallback) or session_id (progress tracking)
      if (response.quiz_data) {
        // Immediate quiz data available (cached or fallback mode)
        const questions = response.quiz_data.questions || [];
        
        // Clean and validate questions format - Improved robust parsing
        const cleanedQuestions = questions.map((q, index) => {
          // Extract question text using robust parsing logic
          let questionText = extractQuestionText(q.question, index);

          return {
            id: q.id || `question_${index}`,
            topic: q.topic || 'Unknown',
            subject: q.subject || 'General',
            difficulty: q.difficulty || 'medium',
            type: q.type || 'mcq',
            question: questionText,
            options: q.options || (q.type === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null),
            correct_answer: q.correct_answer || 'Option A',
            explanation: q.explanation || 'Generated by AI agent pool system'
          };
        });
        
        setQuestions(cleanedQuestions);
        setStartTime(Date.now());
        setStep('quiz');
        setGenerationProgress({ 
          status: 'completed', 
          message: response.message || 'Quiz loaded successfully', 
          current_batch: 1, 
          total_batches: 1,
          session_id: response.session_id || null 
        });
        setLoading(false);
      } else if (response.session_id) {
        // AGENTIC RAG: Need to poll for progress (AI agents working in background)
        setLoading(true);
        setStep('generating');
        
        // Determine if using agentic RAG or fallback based on response
        const isAgenticRAG = response.method === 'agentic_rag' || response.status === 'generating_with_agentic_rag';
        
        setGenerationProgress({ 
          status: isAgenticRAG ? 'agentic_rag_generating' : 'generating', 
          message: response.message || (isAgenticRAG ? 'AI agents generating quiz using RAG...' : 'Generating quiz...'), 
          current_batch: 0, 
          total_batches: response.agentic_system ? selectedTopics.length : 0,
          session_id: response.session_id,
          method: response.method || 'unknown',
          agentic_system: response.agentic_system
        });
        
        console.log(`🧠 Starting ${isAgenticRAG ? 'AGENTIC RAG' : 'standard'} quiz generation with session:`, response.session_id);
        
        // Start polling for progress
        pollProgress(response.session_id);
      } else {
        throw new Error('Invalid response format from quiz generation');
      }
    } catch (err) {
      setError('Failed to generate quiz: ' + err.message);
      setGenerationProgress({ 
        status: 'error', 
        message: err.message, 
        current_batch: 0, 
        total_batches: 0,
        session_id: null 
      });
      setLoading(false);
    }
  };

  // Poll for quiz generation progress with enhanced error handling
  const pollProgress = async (sessionId) => {
    let pollCount = 0;
    const maxPolls = 360; // Maximum 6 minutes of polling for agentic RAG
    
    const poll = async () => {
      try {
        pollCount++;
        
        // Safety check for maximum polling time
        if (pollCount > maxPolls) {
          // Request fallback quiz instead of throwing error
          console.log('Quiz generation timed out after 6 minutes, requesting fallback...');
          try {
            const fallbackResponse = await fetch(`/api/quiz/fallback/${sessionId}`, {
              method: 'POST'
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              if (fallbackData.quiz_data) {
                setQuestions(fallbackData.quiz_data.questions || []);
                setLoading(false);
                setError('AI generation timed out - using template questions');
                return;
              }
            }
          } catch (fallbackError) {
            console.error('Fallback request failed:', fallbackError);
          }
          
          // Final fallback - show error but don't crash
          setError('Quiz generation timed out. Please try again with fewer topics.');
          setLoading(false);
          return;
        }
        
        const progress = await nurtureAPI.getQuizProgress(sessionId);
        
        // Validate progress response
        if (!progress || typeof progress !== 'object') {
          throw new Error('Invalid progress response from server');
        }
        
        setGenerationProgress(prev => ({
          ...prev,
          ...progress
        }));
        
        if (progress.status === 'completed' && progress.quiz_data) {
          // Quiz generation completed successfully - whether agentic RAG or fallback
          const isAgenticGenerated = progress.method === 'agentic_rag';
          console.log(`✅ Quiz generation completed using: ${progress.method || 'unknown method'}`);
          
          // Validate quiz data structure
          const questions = progress.quiz_data.questions || [];
          if (questions.length === 0) {
            throw new Error('Quiz completed but no questions were generated');
          }
          
          setQuestions(questions);
          setStartTime(Date.now());
          setStep('quiz');
          setLoading(false);
          
          // Update progress to reflect completion method
          setGenerationProgress(prev => ({
            ...prev,
            ...progress,
            message: isAgenticGenerated ? 
              'AI-powered quiz generated successfully!' : 
              progress.message || 'Quiz loaded successfully'
          }));
        } else if (progress.status === 'error') {
          // Generation failed
          throw new Error(progress.message || 'Quiz generation failed');
        } else if (progress.status === 'timeout') {
          // AI timeout - show specific message
          throw new Error(progress.message || 'AI generation timed out - please try again');
        } else if (progress.status === 'ai_error') {
          // AI-specific error - show detailed message
          throw new Error(progress.message || 'AI system error - please try again');
        } else if (progress.status === 'not_found') {
          // Session not found
          throw new Error('Quiz session not found - please try again');
        } else if (progress.status === 'generating' || progress.status === 'agentic_rag_generating' || 
                   progress.status === 'initializing_agents' || progress.status === 'initializing' || 
                   progress.status === 'finalizing') {
          // Still generating - continue polling (includes agentic RAG states)
          setTimeout(() => poll().catch(handlePollError), 1000);
        } else {
          // Unknown status
          console.warn(`Unknown progress status: ${progress.status}`);
          setTimeout(() => poll().catch(handlePollError), 1000);
        }
      } catch (err) {
        handlePollError(err);
      }
    };
    
    const handlePollError = (err) => {
      console.error('Polling error:', err);
      setError('Failed to get progress: ' + err.message);
      setGenerationProgress(prev => ({ 
        ...prev, 
        status: 'error', 
        message: err.message 
      }));
      setLoading(false);
    };
    
    // Start polling with error handling
    poll().catch(handlePollError);
  };

  const handleAnswer = (answer) => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) {
      console.error('No current question available');
      return;
    }
    
    // Check if answer is correct (for MCQ, compare with option index; for structured, use simple matching)
    let isCorrect = false;
    if (currentQuestion.type === 'mcq' && currentQuestion.options) {
      // For MCQ, answer is the option index
      const selectedOption = currentQuestion.options[answer];
      isCorrect = selectedOption === currentQuestion.correct_answer;
    } else {
      // For structured questions, do basic comparison (real evaluation happens on backend)
      // Convert both to lowercase and trim for basic comparison
      const userAnswer = String(answer || '').toLowerCase().trim();
      const correctAnswer = String(currentQuestion.correct_answer || '').toLowerCase().trim();
      isCorrect = userAnswer === correctAnswer || userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer);
    }
    
    // Record answer with correctness
    const answerData = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      userAnswer: answer,
      correctAnswer: currentQuestion.correct_answer,
      difficulty: currentQuestion.difficulty,
      topic: currentQuestion.topic,
      timeSpent: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      isCorrect: isCorrect
    };
    
    const updatedAnswers = [...answers, answerData];
    setAnswers(updatedAnswers);
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setStartTime(Date.now()); // Reset timer for next question
    } else {
      // Quiz completed - start agentic evaluation
      evaluateQuiz(updatedAnswers);
    }
  };

  // Trigger sophisticated multi-agent collaborative evaluation
  const evaluateQuiz = async (finalAnswers) => {
    setStep('evaluation');
    setLoading(true);
    setAgentDiscussion([]);
    
    try {
      const quizResults = {
        answers: finalAnswers,
        topics: selectedTopics,
        userId: user.uid,
        completedAt: new Date().toISOString()
      };

      // Stream real-time agent discussion during evaluation
      console.log('Starting real-time agent discussion stream...');
      
      try {
        await nurtureAPI.streamRealAgentDiscussion(
          {
            answers: quizResults.answers,
            topics: quizResults.topics,
            timeLimitMinutes: 7
          },
          // On chat message received
          (chatMessage) => {
            console.log('Received chat message:', chatMessage);
            if (chatMessage && typeof chatMessage === 'object') {
              // Clean and filter agent messages for better display
              let processedMessage = { ...chatMessage };
              let shouldDisplay = false;
              
              if (chatMessage.message) {
                // Skip pure technical/debug messages
                if (chatMessage.message.includes('toolUseId') ||
                    chatMessage.message.includes('Message sent to node') ||
                    chatMessage.message.includes('Status.COMPLETED') ||
                    chatMessage.message.includes('Execution Time:') ||
                    chatMessage.message.startsWith('✅ {')) {
                  shouldDisplay = false;
                }
                // Clean up and show agent analysis messages
                else if (chatMessage.agent && chatMessage.agent !== 'System') {
                  shouldDisplay = true;
                  // Enhance specific agent messages with context
                  if (chatMessage.message.includes('Starting') && chatMessage.message.includes('analysis')) {
                    processedMessage.message = `Analyzing your quiz performance...`;
                  } else if (chatMessage.message.includes('Analysis completed')) {
                    processedMessage.message = `Completed analysis in ${chatMessage.message.match(/(\d+)s/)?.[1] || 'few'} seconds`;
                  }
                }
                // Show important system messages with cleaning
                else if (chatMessage.chat_type === 'system') {
                  if (chatMessage.message.includes('Phase') || 
                      chatMessage.message.includes('FINAL') ||
                      chatMessage.message.includes('Smart-timed') ||
                      chatMessage.message.includes('Setting up mesh') ||
                      chatMessage.message.includes('Consensus')) {
                    shouldDisplay = true;
                  }
                }
              }
              
              if (shouldDisplay) {
                setAgentDiscussion(prev => {
                  // Avoid duplicates by checking if message already exists
                  const exists = prev.some(msg => 
                    msg.timestamp === processedMessage.timestamp && 
                    msg.message === processedMessage.message
                  );
                  if (!exists) {
                    return [...prev, processedMessage];
                  }
                  return prev;
                });
              }
            }
          },
          // On error
          (error) => {
            console.error('Streaming error:', error);
            setError('Evaluation streaming error: ' + error.message);
            setLoading(false);
          },
          // On complete with evaluation results
          (evaluationData) => {
            console.log('Evaluation complete:', evaluationData);
            if (evaluationData) {
              setEvaluation(evaluationData);
              saveQuizResults(finalAnswers, evaluationData);
            }
            setStep('results');
            setLoading(false);
          }
        );
      } catch (streamError) {
        console.error('Failed to start streaming:', streamError);
        setError('Failed to start evaluation: ' + streamError.message);
        setLoading(false);
      }

    } catch (err) {
      setError('Failed to evaluate quiz: ' + err.message);
      setLoading(false);
    }
  };

  // Save results to Firebase
  const saveQuizResults = async (finalAnswers, evaluationResults) => {
    try {
      const userId = user.uid;
      console.log('Saving quiz results for user:', userId);
      
      // Update user's onboarding status
      await updateDoc(doc(db, 'users', userId), {
        onboardingCompleted: true,
        lastQuizDate: Timestamp.now()
      });
      console.log('✅ Updated user onboarding status');
      
      // Save expertise levels for each topic
      for (const topic of selectedTopics) {
        const subject = subjects.find(s => s.topics.includes(topic));
        if (subject) {
          // Clean subject name for Firestore path (more lenient sanitization)
          const subjectName = subject.name.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
          
          // Clean topic name for Firestore path (more lenient sanitization) 
          const topicName = topic.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
          
          const topicAnswers = finalAnswers.filter(a => a.topic === topic);
          const correctAnswers = topicAnswers.filter(a => a.isCorrect).length;
          const score = topicAnswers.length > 0 ? Math.round((correctAnswers / topicAnswers.length) * 100) : 0;
          
          // Build the complete path for debugging
          const topicPath = `users/${userId}/subjects/${subjectName}/topics/${topicName}`;
          console.log('📝 Saving to path:', topicPath);
          console.log('📊 Topic data:', { topic, subject: subject.name, subjectName, topicName, score });
          
          // Use the correct nested structure as specified in README
          const topicRef = doc(db, 'users', userId, 'subjects', subjectName, 'topics', topicName);
          // Extract topic-specific rich recommendations
          let topicRichRecommendation = null;
          if (evaluationResults?.rich_recommendations?.topic_recommendations) {
            topicRichRecommendation = evaluationResults.rich_recommendations.topic_recommendations[topic];
          }

          const topicData = {
            userId: userId,
            topicId: topicName,
            subjectId: subjectName,
            originalTopicName: topic,
            originalSubjectName: subject.name,
            expertiseLevel: evaluationResults?.expertiseLevel || evaluationResults?.level || 'beginner',
            lastStudied: Timestamp.now(),
            evaluationScore: score,
            totalQuestions: topicAnswers.length,
            correctAnswers: correctAnswers,
            quizDate: Timestamp.now(),
            answers: topicAnswers.map(a => ({
              questionId: a.questionId,
              userAnswer: a.userAnswer,
              correctAnswer: a.correctAnswer,
              isCorrect: a.isCorrect,
              difficulty: a.difficulty
            })),
            // Add rich recommendations for this topic
            recommendation: topicRichRecommendation || {
              next_steps: [`Continue practicing ${topic} problems`],
              study_focus: score >= 70 ? 'Mastery & Speed' : 'Foundation Building',
              time_estimate: '2-3 hours/week',
              key_errors: [],
              accuracy: score,
              generated_at: new Date().toISOString(),
              agent_insights: evaluationResults?.rich_recommendations?.agent_perspectives || null,
              immediate_actions: evaluationResults?.rich_recommendations?.immediate_actions || [],
              weekly_plan_excerpt: evaluationResults?.rich_recommendations?.weekly_plan ? 
                Object.entries(evaluationResults.rich_recommendations.weekly_plan)
                  .slice(0, 3)
                  .reduce((acc, [day, tasks]) => {
                    acc[day] = tasks.filter(task => task.includes(topic));
                    return acc;
                  }, {}) : {}
            }
          };
          
          await setDoc(topicRef, topicData, { merge: true });
          console.log(`✅ Saved expertise data for ${topic} -> ${topicPath}`);
          console.log('💾 Saved data:', topicData);
        }
      }
      
      console.log('🎉 All quiz results saved successfully');
      
    } catch (err) {
      console.error('❌ Failed to save quiz results:', err);
      console.error('Error details:', err.message);
      // Don't throw - let the app continue even if save fails
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  // Loading screen with progress indicator - Aligned with Python agent pool batching
  if (loading && step !== 'evaluation') {
    // Calculate progress based on agent pool batching system (3 questions per batch)
    const progressPercentage = generationProgress.total_batches > 0 
      ? Math.round((generationProgress.current_batch / generationProgress.total_batches) * 100) 
      : 0;

    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>🧠</div>
          <h2>
            {step === 'selection' ? 'Loading subjects...' : 
             step === 'generating' ? (
               generationProgress.status === 'agentic_rag_generating' || generationProgress.method === 'agentic_rag' ?
               '🧠 AI Agents Generating Quiz...' : 'Generating personalized assessment...'
             ) : 
             'Preparing your quiz...'}
          </h2>
          
          {/* Progress indicator for quiz generation */}
          {step === 'generating' && generationProgress.total_batches > 0 && (
            <div style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: 'var(--space-2)' 
              }}>
                <span style={{ fontSize: 'var(--text-sm)', marginRight: 'var(--space-2)' }}>
                  Batch {generationProgress.current_batch} of {generationProgress.total_batches}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
                  {progressPercentage}%
                </span>
              </div>
              
              {/* Progress bar */}
              <div style={{ 
                width: '100%', 
                height: '8px', 
                backgroundColor: '#e2e8f0', 
                borderRadius: '4px', 
                overflow: 'hidden',
                marginBottom: 'var(--space-2)'
              }}>
                <div style={{ 
                  width: `${progressPercentage}%`, 
                  height: '100%', 
                  backgroundColor: '#3b82f6', 
                  borderRadius: '4px', 
                  transition: 'width 0.3s ease-in-out' 
                }} />
              </div>
              
              {/* Progress message */}
              <p style={{ 
                fontSize: 'var(--text-sm)', 
                opacity: 0.8,
                marginBottom: 0 
              }}>
                {generationProgress.message}
              </p>
            </div>
          )}
          
          <p style={{ opacity: 0.8 }}>
            {systemStatus?.agentic_system && (
              <span>Powered by {systemStatus.agentic_system}</span>
            )}
          </p>
          
          {/* AI Agent status indicators - Shows agentic RAG vs fallback */}
          {step === 'generating' && (
            <div style={{ 
              marginTop: 'var(--space-4)', 
              fontSize: 'var(--text-xs)', 
              opacity: 0.6 
            }}>
              {generationProgress.method === 'agentic_rag' || generationProgress.status === 'agentic_rag_generating' ? (
                // AGENTIC RAG indicators
                <>
                  <div>🧠 <strong>AGENTIC RAG ACTIVE</strong></div>
                  <div>🔄 AWS Strands SDK Multi-Agent System</div>
                  <div>⚡ Claude Sonnet 4.0 (anthropic.claude-sonnet-4-20250514-v1:0)</div>
                  <div>📡 Real-time PDF content fetching</div>
                  <div>🤖 Agent pool system with batch processing</div>
                  <div>🎯 Singapore O-Level syllabus alignment</div>
                  <div>🚀 AI-generated questions with explanations</div>
                </>
              ) : (
                // Fallback indicators
                <>
                  <div>📝 Static question templates</div>
                  <div>⚠️ Agentic RAG unavailable</div>
                  <div>🔧 Basic question generation</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Topic Selection Step
  if (step === 'selection') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>🧠 Assessment Time</h1>
          <p className="text-center mb-6" style={{ opacity: 0.9 }}>
            Choose subjects to discover your current expertise level and build your personalized learning path
          </p>
          
          {systemStatus && !systemStatus.backend_online && (
            <div style={{ 
              padding: 'var(--space-4)', 
              background: 'rgba(255, 107, 107, 0.2)', 
              borderRadius: 'var(--radius-lg)', 
              marginBottom: 'var(--space-6)',
              border: '1px solid rgba(255, 107, 107, 0.3)'
            }}>
              <p style={{ margin: 0, color: '#FF6B6B' }}>⚠️ Agentic backend system is offline</p>
            </div>
          )}
          
          <div style={{ marginBottom: 'var(--space-8)' }}>
            {subjects.map(subject => (
              <div key={subject.name} style={{ marginBottom: 'var(--space-6)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <span style={{ fontSize: 'var(--text-xl)' }}>{subject.icon}</span>
                  {subject.name}
                  <span style={{ fontSize: 'var(--text-sm)', opacity: 0.7 }}>({subject.syllabus})</span>
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', opacity: 0.8, marginBottom: 'var(--space-3)' }}>
                  {subject.description}
                </p>
                
                {subject.topics.map(topic => (
                  <div key={topic} style={{ marginBottom: 'var(--space-2)' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--space-3)',
                      cursor: 'pointer',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid rgba(163, 184, 165, 0.3)',
                      background: selectedTopics.includes(topic) ? 'rgba(73, 184, 91, 0.2)' : 'rgba(30, 43, 34, 0.3)'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic)}
                        onChange={() => handleTopicSelection(topic)}
                        style={{ accentColor: 'var(--vibrant-leaf)' }}
                      />
                      <span>{topic}</span>
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {error && <p className="error">⚠️ {error}</p>}
          
          <button 
            onClick={startQuiz}
            disabled={selectedTopics.length === 0 || !systemStatus?.backend_online}
            style={{
              width: '100%',
              background: selectedTopics.length > 0 && systemStatus?.backend_online ? 'var(--leaf-gradient)' : 'rgba(163, 184, 165, 0.3)',
              color: selectedTopics.length > 0 && systemStatus?.backend_online ? 'var(--deep-forest)' : 'rgba(245, 245, 245, 0.5)'
            }}
          >
            {selectedTopics.length === 0 ? '🌿 Select topics to continue' : 
             !systemStatus?.backend_online ? '⚠️ Backend offline' :
             `🚀 Begin AI Assessment (${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''})`}
          </button>
          
          {systemStatus?.subjects_available > 0 && (
            <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', opacity: 0.7, marginTop: 'var(--space-4)' }}>
              ✅ AWS Strands SDK • Real PDF Fetching • {systemStatus.subjects_available} subjects available
            </p>
          )}
        </div>
      </div>
    );
  }

  // Quiz Step - Display questions from Python backend
  if (step === 'quiz' && questions.length > 0 && currentQuestionIndex < questions.length) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    
    return (
      <div className="auth-container">
        <div className="auth-card">
          {/* Progress Bar */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-sm)', opacity: 0.8 }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', opacity: 0.8 }}>
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '4px', 
              backgroundColor: 'rgba(163, 184, 165, 0.3)', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--leaf-gradient)',
                borderRadius: '2px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          
          {/* Question Display */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ 
              display: 'inline-block',
              padding: 'var(--space-2) var(--space-4)',
              background: 'rgba(73, 184, 91, 0.2)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'bold',
              marginBottom: 'var(--space-4)'
            }}>
              {currentQuestion.difficulty} • {currentQuestion.topic}
            </div>
            
            <div style={{ 
              fontSize: 'var(--text-lg)', 
              lineHeight: 1.6, 
              marginBottom: 'var(--space-6)',
              wordWrap: 'break-word',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: 'var(--space-2)',
              border: '1px solid rgba(163, 184, 165, 0.2)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(30, 43, 34, 0.1)'
            }}>
              {typeof currentQuestion.question === 'string' ? 
                currentQuestion.question
                  .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
                  .replace(/Question:\s*/gi, '') // Remove "Question:" prefix
                  .trim()
                : 'Question loading...'}
            </div>
          </div>
          
          {/* Answer Options */}
          {currentQuestion.type === 'mcq' && currentQuestion.options ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  style={{
                    textAlign: 'left',
                    padding: 'var(--space-4)',
                    border: '1px solid rgba(163, 184, 165, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(30, 43, 34, 0.3)',
                    color: 'var(--soft-white)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-normal)',
                    fontSize: 'var(--text-base)',
                    lineHeight: 1.5,
                    wordWrap: 'break-word',
                    whiteSpace: 'normal',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(73, 184, 91, 0.2)';
                    e.target.style.borderColor = 'var(--vibrant-leaf)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(30, 43, 34, 0.3)';
                    e.target.style.borderColor = 'rgba(163, 184, 165, 0.3)';
                  }}
                >
                  <span style={{ fontWeight: 'bold', marginRight: 'var(--space-3)', opacity: 0.7 }}>
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>
          ) : (
            // Structured/Open-ended questions
            <div>
              <textarea
                placeholder="Enter your answer here..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: 'var(--space-4)',
                  border: '1px solid rgba(163, 184, 165, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(30, 43, 34, 0.3)',
                  color: 'var(--soft-white)',
                  fontSize: 'var(--text-base)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  marginBottom: 'var(--space-4)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    const textarea = e.target;
                    handleAnswer(textarea.value);
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const textarea = e.target.parentElement.querySelector('textarea');
                  handleAnswer(textarea.value);
                }}
                style={{
                  background: 'var(--leaf-gradient)',
                  color: 'var(--deep-forest)',
                  border: 'none',
                  padding: 'var(--space-3) var(--space-6)',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Submit Answer
              </button>
              <p style={{ fontSize: 'var(--text-sm)', opacity: 0.7, marginTop: 'var(--space-2)' }}>
                Tip: Press Ctrl+Enter to submit quickly
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Evaluation Step - Show real-time agent discussion
  if (step === 'evaluation') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🧠</div>
            <h1>AI Agents Evaluating...</h1>
            <p style={{ opacity: 0.9 }}>Three expert AI agents are collaboratively assessing your performance</p>
          </div>
          
          {/* Agent Discussion Stream */}
          <div style={{ 
            background: 'rgba(30, 43, 34, 0.5)',
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(163, 184, 165, 0.3)',
            maxHeight: '400px',
            overflowY: 'auto',
            marginBottom: 'var(--space-6)'
          }}>
            <h3 style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
              🤝 Collaborative Assessment in Progress
            </h3>
            
            {agentDiscussion.length === 0 && (
              <div style={{ textAlign: 'center', opacity: 0.7 }}>
                <p>Waiting for agents to begin discussion...</p>
              </div>
            )}
            
            {agentDiscussion.filter(d => d && typeof d === 'object').map((discussion, index) => (
              <div key={`discussion-${discussion.timestamp || index}`} style={{
                padding: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
                borderLeft: '3px solid var(--vibrant-leaf)',
                background: 'rgba(73, 184, 91, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-lg)' }}>{discussion.icon || '🤖'}</span>
                  <strong>{typeof discussion.agent === 'string' ? discussion.agent : 'Agent'}</strong>
                  <span style={{ fontSize: 'var(--text-sm)', opacity: 0.7 }}>
                    {discussion.round ? `Round ${discussion.round}` : discussion.phase || 'Processing'}
                  </span>
                  {discussion.time_remaining && (
                    <span style={{ fontSize: 'var(--text-xs)', opacity: 0.5 }}>
                      ({discussion.time_remaining}s remaining)
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, opacity: 0.9 }}>
                  {typeof discussion.message === 'string' 
                    ? discussion.message.replace(/\{\{'.*?'\}\}/g, '').trim() // Clean up any template strings
                    : 'Processing...'
                  }
                </p>
              </div>
            ))}
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid rgba(73, 184, 91, 0.3)',
              borderTop: '3px solid var(--vibrant-leaf)',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ marginTop: 'var(--space-4)', opacity: 0.8 }}>
              Analysis in progress... This may take up to 1 minute
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Results Step - Display evaluation from Python backend
  if (step === 'results' && evaluation) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🎉</div>
            <h1>Assessment Complete!</h1>
            <p style={{ opacity: 0.9 }}>Your personalized learning journey begins now</p>
          </div>
          
          {/* Results Summary */}
          <div style={{ 
            background: 'rgba(30, 43, 34, 0.5)',
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(163, 184, 165, 0.3)',
            marginBottom: 'var(--space-6)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-4)', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--vibrant-leaf)' }}>
                  {evaluation.summary?.total_correct || evaluation.summary?.totalCorrect || 0}/{evaluation.summary?.total_questions || evaluation.summary?.totalQuestions || 0}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', opacity: 0.8 }}>Correct</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--vibrant-leaf)' }}>
                  {evaluation.summary?.accuracy || 0}%
                </div>
                <div style={{ fontSize: 'var(--text-sm)', opacity: 0.8 }}>Accuracy</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--vibrant-leaf)' }}>
                  {typeof evaluation.expertiseLevel === 'string' ? evaluation.expertiseLevel : 'Beginner'}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', opacity: 0.8 }}>Level</div>
              </div>
            </div>
          </div>
          
          <p style={{ textAlign: 'center', marginBottom: 'var(--space-6)', opacity: 0.9 }}>
            {typeof evaluation.justification === 'string' ? evaluation.justification : 'Assessment completed successfully'}
          </p>
          
          {/* Rich Recommendations Section */}
          {evaluation.rich_recommendations ? (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              {/* Overall Summary */}
              <div style={{
                padding: 'var(--space-4)',
                background: 'rgba(73, 184, 91, 0.1)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-4)',
                border: '1px solid rgba(73, 184, 91, 0.3)'
              }}>
                <h3 style={{ margin: '0 0 var(--space-2) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  💡 Personalized Learning Plan
                </h3>
                <p style={{ margin: 0, opacity: 0.9 }}>
                  {evaluation.rich_recommendations.summary}
                </p>
              </div>

              {/* Topic-Specific Recommendations */}
              {Object.values(evaluation.rich_recommendations.topic_recommendations || {}).map((topicRec, index) => (
                <div key={index} style={{
                  padding: 'var(--space-4)',
                  background: 'rgba(30, 43, 34, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--space-4)',
                  border: '1px solid rgba(163, 184, 165, 0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h4 style={{ margin: 0 }}>{topicRec.topic}</h4>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                      <span style={{ 
                        background: topicRec.accuracy >= 70 ? 'rgba(73, 184, 91, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                        color: topicRec.accuracy >= 70 ? 'var(--vibrant-leaf)' : '#FF6B6B',
                        padding: 'var(--space-1) var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'bold'
                      }}>
                        {topicRec.accuracy}%
                      </span>
                      <span style={{ 
                        background: 'rgba(73, 184, 91, 0.2)',
                        color: 'var(--vibrant-leaf)',
                        padding: 'var(--space-1) var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)'
                      }}>
                        {topicRec.study_focus}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: 'var(--text-sm)', opacity: 0.9 }}>
                    <strong>Next Steps:</strong>
                    <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)' }}>
                      {topicRec.next_steps?.map((step, stepIndex) => (
                        <li key={stepIndex} style={{ marginBottom: 'var(--space-1)' }}>{step}</li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <strong>Recommended Study Time:</strong> {topicRec.time_estimate}
                    </div>
                  </div>
                </div>
              ))}

              {/* Agent Perspectives */}
              {evaluation.rich_recommendations.agent_perspectives && (
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'rgba(30, 43, 34, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--space-4)',
                  border: '1px solid rgba(163, 184, 165, 0.3)'
                }}>
                  <h4 style={{ marginBottom: 'var(--space-3)' }}>🤖 AI Agent Insights</h4>
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    {Object.entries(evaluation.rich_recommendations.agent_perspectives).map(([agentKey, insight]) => (
                      <div key={agentKey} style={{
                        padding: 'var(--space-3)',
                        background: 'rgba(73, 184, 91, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--vibrant-leaf)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                          <span>{agentKey === 'moe_teacher' ? '👩‍🏫' : agentKey === 'perfect_student' ? '🏆' : '🎓'}</span>
                          <strong style={{ fontSize: 'var(--text-sm)' }}>
                            {agentKey === 'moe_teacher' ? 'MOE Teacher' : 
                             agentKey === 'perfect_student' ? 'Perfect Student' : 'Tutor'}
                          </strong>
                        </div>
                        <p style={{ fontSize: 'var(--text-sm)', margin: 0, opacity: 0.9 }}>
                          {insight.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Immediate Actions */}
              {evaluation.rich_recommendations.immediate_actions && (
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'rgba(73, 184, 91, 0.1)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--space-4)',
                  border: '1px solid rgba(73, 184, 91, 0.3)'
                }}>
                  <h4 style={{ marginBottom: 'var(--space-3)' }}>⚡ Immediate Action Items</h4>
                  <ul style={{ paddingLeft: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                    {evaluation.rich_recommendations.immediate_actions.map((action, index) => (
                      <li key={index} style={{ marginBottom: 'var(--space-2)' }}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weekly Study Plan */}
              {evaluation.rich_recommendations.weekly_plan && (
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'rgba(30, 43, 34, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 'var(--space-4)',
                  border: '1px solid rgba(163, 184, 165, 0.3)'
                }}>
                  <h4 style={{ marginBottom: 'var(--space-3)' }}>📅 Weekly Study Plan</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-2)' }}>
                    {Object.entries(evaluation.rich_recommendations.weekly_plan).map(([day, tasks]) => (
                      <div key={day} style={{
                        padding: 'var(--space-2)',
                        background: 'rgba(73, 184, 91, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)'
                      }}>
                        <strong style={{ display: 'block', marginBottom: 'var(--space-1)' }}>{day}</strong>
                        {tasks.map((task, index) => (
                          <div key={index} style={{ opacity: 0.8, marginBottom: 'var(--space-1)' }}>• {task}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : evaluation.recommendation && (
            // Fallback to simple recommendation if rich recommendations not available
            <div style={{
              padding: 'var(--space-4)',
              background: 'rgba(73, 184, 91, 0.1)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-6)',
              border: '1px solid rgba(73, 184, 91, 0.3)'
            }}>
              <p style={{ margin: 0, opacity: 0.9 }}>
                <strong>💡 AI Recommendation:</strong> {typeof evaluation.recommendation === 'string' ? evaluation.recommendation : 'No recommendation available'}
              </p>
            </div>
          )}
          
          <button 
            onClick={goToDashboard}
            style={{
              width: '100%',
              background: 'var(--leaf-gradient)',
              color: 'var(--deep-forest)',
              fontSize: 'var(--text-lg)',
              fontWeight: 'bold'
            }}
          >
            🚀 Enter Dashboard
          </button>
          
          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', opacity: 0.7, marginTop: 'var(--space-4)' }}>
            ✨ Generated by Agent Pool System with real PDF content fetching
          </p>
        </div>
      </div>
    );
  }

  // Debug: Show what step and evaluation state we're in
  if (step === 'results' && !evaluation) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center' }}>
            <h2>⚠️ Results Loading Issue</h2>
            <p>Step: {step}</p>
            <p>Evaluation: {evaluation ? 'Present' : 'Missing'}</p>
            <button onClick={() => setStep('selection')} style={{
              background: 'var(--leaf-gradient)',
              color: 'var(--deep-forest)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)'
            }}>
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return null;
}

export default EvaluationQuiz;