import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { nurtureAPI } from '../services/api';

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
        
        // Clean and validate questions format - Updated to handle agent-generated content
        const cleanedQuestions = questions.map((q, index) => {
          // Extract question text from nested structure
          let questionText = '';
          if (typeof q.question === 'string') {
            questionText = q.question;
          } else if (q.question?.content?.[0]?.text) {
            // Parse the structured text content and extract just the question part
            const fullText = q.question.content[0].text;
            // Split by **Question:** and take the part after it, then split by **Options:** or **Correct Answer:**
            const questionMatch = fullText.match(/\*\*Question:\*\*\s*(.*?)(?:\*\*(?:Options|Correct Answer):|$)/s);
            if (questionMatch) {
              questionText = questionMatch[1].trim();
              // Remove any remaining markdown formatting
              questionText = questionText.replace(/\*\*/g, '').replace(/\n+/g, ' ').trim();
            } else {
              // Fallback: take everything before "**Options:**" or "**Correct Answer:**"
              questionText = fullText.split('**Options:**')[0].split('**Correct Answer:**')[0]
                .replace(/\*\*Question:\*\*/g, '').replace(/\*\*/g, '').trim();
            }
          } else if (q.question?.message) {
            questionText = q.question.message;
          } else {
            questionText = `Question ${index + 1}`;
          }

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
        // Need to poll for progress (background generation)
        setLoading(true);
        setStep('generating');
        setGenerationProgress({ 
          status: 'generating', 
          message: response.message || 'Starting quiz generation...', 
          current_batch: 0, 
          total_batches: 0,
          session_id: response.session_id 
        });
        
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

  // Poll for quiz generation progress
  const pollProgress = async (sessionId) => {
    const poll = async () => {
      try {
        const progress = await nurtureAPI.getQuizProgress(sessionId);
        
        setGenerationProgress(prev => ({
          ...prev,
          ...progress
        }));
        
        if (progress.status === 'completed' && progress.quiz_data) {
          // Quiz generation completed successfully
          setQuestions(progress.quiz_data.questions || []);
          setStartTime(Date.now());
          setStep('quiz');
          setLoading(false);
        } else if (progress.status === 'error') {
          // Generation failed
          setError(progress.message || 'Quiz generation failed');
          setLoading(false);
        } else if (progress.status === 'generating' || progress.status === 'initializing' || progress.status === 'finalizing') {
          // Still generating - continue polling
          setTimeout(poll, 1000);
        }
      } catch (err) {
        setError('Failed to get progress: ' + err.message);
        setGenerationProgress(prev => ({ 
          ...prev, 
          status: 'error', 
          message: err.message 
        }));
        setLoading(false);
      }
    };
    
    // Start polling
    poll();
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
      
      // Update user's onboarding status
      await updateDoc(doc(db, 'users', userId), {
        onboardingCompleted: true,
        lastQuizDate: Timestamp.now()
      });
      
      // Save expertise levels for each topic
      for (const topic of selectedTopics) {
        const subject = subjects.find(s => s.topics.includes(topic));
        if (subject) {
          const subjectName = subject.name.toLowerCase().replace(/\s+/g, '_');
          const topicName = topic.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_:/]/g, '');
          
          const topicAnswers = finalAnswers.filter(a => a.topic === topic);
          const correctAnswers = topicAnswers.filter(a => a.isCorrect).length;
          const score = topicAnswers.length > 0 ? Math.round((correctAnswers / topicAnswers.length) * 100) : 0;
          
          // Create the topic document in the correct Firebase structure
          const topicRef = doc(db, `users/${userId}/subjects/${subjectName}/topics`, topicName);
          await setDoc(topicRef, {
            topicId: topicName,
            expertiseLevel: evaluationResults.expertiseLevel || evaluationResults.level || 'beginner',
            lastStudied: Timestamp.now(),
            evaluationScore: score,
            totalQuestions: topicAnswers.length,
            correctAnswers: correctAnswers,
            quizDate: Timestamp.now()
          }, { merge: true });
          
          console.log(`Saved expertise level for ${topic}: ${evaluationResults.expertiseLevel || evaluationResults.level}`);
        }
      }
      
    } catch (err) {
      console.error('Failed to save quiz results:', err);
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
             step === 'generating' ? 'Generating personalized assessment...' : 
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
          
          {/* AI Agent status indicators - Updated to match Python implementation */}
          {generationProgress.status === 'generating' && (
            <div style={{ 
              marginTop: 'var(--space-4)', 
              fontSize: 'var(--text-xs)', 
              opacity: 0.6 
            }}>
              <div>🔄 AWS Strands SDK</div>
              <div>⚡ Claude Sonnet 4.0 (anthropic.claude-sonnet-4-20250514-v1:0)</div>
              <div>📡 Real PDF fetching with http_request tool</div>
              <div>🚀 Batch processing: 3 questions per batch</div>
              <div>🧠 Memory management: Fresh conversation per question</div>
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
            
            <h2 style={{ lineHeight: 1.4, marginBottom: 'var(--space-6)' }}>
              {typeof currentQuestion.question === 'string' ? currentQuestion.question : 'Question loading...'}
            </h2>
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
                    transition: 'all var(--transition-normal)'
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
          
          {evaluation.recommendation && (
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