import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { triggerAgenticEvaluation } from '../firebase/quiz';
import { formatEvaluationResults } from '../services/agenticEvaluation';
import AgentDiscussion from './AgentDiscussion';
import QuizResults from './QuizResults';

/**
 * QuizSession Component
 * 
 * Integrates Parts 2 and 3: Quiz taking → Agent Discussion → Results Display
 * Simulates a complete quiz session with agentic evaluation
 */
function QuizSession() {
  const [stage, setStage] = useState('taking'); // 'taking', 'evaluating', 'results'
  const [quizData, setQuizData] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Initialize quiz data from session storage (set in EvaluationQuiz)
  useEffect(() => {
    const initializeQuiz = () => {
      try {
        const startTime = sessionStorage.getItem('quizStartTime');
        const selectedTopics = JSON.parse(sessionStorage.getItem('selectedTopics') || '[]');
        const generatedQuestions = JSON.parse(sessionStorage.getItem('generatedQuestions') || '[]');
        
        if (!startTime || selectedTopics.length === 0 || generatedQuestions.length === 0) {
          navigate('/quiz');
          return;
        }

        // Simulate quiz completion with mock answers
        const mockAnswers = generatedQuestions.map((question, index) => {
          // Simulate realistic performance based on difficulty
          const successRate = {
            'very_easy': 0.9,
            'easy': 0.85,
            'medium': 0.7,
            'hard': 0.5,
            'very_hard': 0.3
          };
          
          const rate = successRate[question.difficulty] || 0.7;
          const isCorrect = Math.random() < rate;
          
          return {
            questionId: question.id,
            topic: question.topic,
            difficulty: question.difficulty,
            userAnswer: isCorrect ? question.correctAnswer : 'Wrong answer',
            correctAnswer: question.correctAnswer,
            isCorrect,
            timeSpent: Math.random() * 120000 + 30000 // 30s - 2.5min per question
          };
        });

        setQuizData({
          startTime,
          endTime: new Date().toISOString(),
          topics: selectedTopics,
          answers: mockAnswers,
          sessionId: `quiz_${Date.now()}`
        });

        // Auto-start evaluation after 2 seconds
        setTimeout(() => {
          setStage('evaluating');
        }, 2000);

      } catch (error) {
        setError('Failed to initialize quiz session');
        navigate('/quiz');
      }
    };

    initializeQuiz();
  }, [navigate]);

  // Handle agent discussion completion
  const handleDiscussionComplete = async (agentDiscussion) => {
    try {
      if (!quizData) {
        throw new Error('Quiz data not available');
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Trigger agentic evaluation
      const evaluationResponse = await triggerAgenticEvaluation(quizData, user.uid);
      
      // Format results for display
      const formattedResults = formatEvaluationResults(evaluationResponse.results);
      
      // Add agent discussion to results
      formattedResults.agentDiscussion = agentDiscussion;
      
      setEvaluationResults(formattedResults);
      setStage('results');

      // Clear session storage
      sessionStorage.removeItem('quizStartTime');
      sessionStorage.removeItem('selectedTopics'); 
      sessionStorage.removeItem('generatedQuestions');

    } catch (error) {
      setError(`Evaluation failed: ${error.message}`);
      setStage('results'); // Show error state
    }
  };

  // Handle results completion
  const handleResultsComplete = () => {
    navigate('/dashboard');
  };

  // Error state
  if (error) {
    return (
      <div className="quiz-container">
        <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <h1>⚠️ Evaluation Error</h1>
          <p style={{ opacity: 0.9, marginBottom: 'var(--space-6)' }}>
            {error}
          </p>
          <button onClick={() => navigate('/quiz')}>
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // Quiz taking stage (simulated)
  if (stage === 'taking') {
    return (
      <div className="quiz-container">
        <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <h1>📝 Quiz in Progress</h1>
          <p style={{ opacity: 0.9, marginBottom: 'var(--space-6)' }}>
            Completing your assessment...
          </p>
          <div className="loading" style={{ margin: '0 auto' }} />
          <p style={{ fontSize: 'var(--text-sm)', opacity: 0.7, marginTop: 'var(--space-4)' }}>
            This is a simulation. In production, this would be the actual quiz interface.
          </p>
        </div>
      </div>
    );
  }

  // Agent evaluation stage
  if (stage === 'evaluating') {
    return (
      <AgentDiscussion 
        onDiscussionComplete={handleDiscussionComplete}
        quizMetrics={quizData ? {
          totalQuestions: quizData.answers.length,
          totalCorrect: quizData.answers.filter(a => a.isCorrect).length
        } : null}
      />
    );
  }

  // Results display stage
  if (stage === 'results') {
    return (
      <QuizResults 
        evaluationResults={evaluationResults}
        onContinue={handleResultsComplete}
      />
    );
  }

  // Loading state
  return (
    <div className="quiz-container">
      <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <div className="loading" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: 'var(--space-4)' }}>Loading...</p>
      </div>
    </div>
  );
}

export default QuizSession;