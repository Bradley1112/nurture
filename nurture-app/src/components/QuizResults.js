import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * QuizResults Component
 * 
 * Displays the final expertise level assessment with agent justification
 * Maximum 100 characters justification as specified in Part 3 README
 */
function QuizResults({ evaluationResults, onContinue }) {
  const navigate = useNavigate();
  
  if (!evaluationResults) {
    return (
      <div className="quiz-container">
        <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <h2>Loading results...</h2>
        </div>
      </div>
    );
  }

  const {
    summary,
    expertiseLevel,
    justification,
    confidence,
    recommendation,
    agentDiscussion,
    breakdown
  } = evaluationResults;

  const getLevelIcon = (level) => {
    const icons = {
      'beginner': '🌱',
      'apprentice': '🌿', 
      'pro': '🌳',
      'grandmaster': '🏆'
    };
    return icons[level] || '📚';
  };

  const getLevelColor = (level) => {
    const colors = {
      'beginner': '#FF6B6B',
      'apprentice': '#FFE66D',
      'pro': '#4ECDC4', 
      'grandmaster': '#49B85B'
    };
    return colors[level] || '#A3B8A5';
  };

  const getDifficultyLabel = (key) => {
    const labels = {
      'very_easy': 'Very Easy',
      'easy': 'Easy',
      'medium': 'Medium', 
      'hard': 'Hard',
      'very_hard': 'Very Hard'
    };
    return labels[key] || key;
  };

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="quiz-container">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <h1>🎯 Your Learning Assessment</h1>
        <p style={{ opacity: 0.9, fontSize: 'var(--text-lg)' }}>
          Based on collaborative AI agent analysis
        </p>
      </div>

      {/* Expertise Level Card */}
      <div style={{
        background: `linear-gradient(135deg, ${getLevelColor(expertiseLevel)}20 0%, ${getLevelColor(expertiseLevel)}10 100%)`,
        border: `3px solid ${getLevelColor(expertiseLevel)}`,
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-12)',
        textAlign: 'center',
        marginBottom: 'var(--space-8)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${getLevelColor(expertiseLevel)}05 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: 'var(--space-4)',
            animation: 'pulse 2s infinite'
          }}>
            {getLevelIcon(expertiseLevel)}
          </div>
          
          <h2 style={{ 
            color: getLevelColor(expertiseLevel),
            fontSize: 'var(--text-4xl)',
            marginBottom: 'var(--space-4)',
            textTransform: 'capitalize'
          }}>
            {expertiseLevel} Level
          </h2>
          
          <div style={{
            backgroundColor: 'rgba(30, 43, 34, 0.8)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-6)',
            maxWidth: '600px',
            margin: '0 auto var(--space-6) auto'
          }}>
            <p style={{ 
              fontSize: 'var(--text-lg)',
              fontWeight: '500',
              margin: 0,
              lineHeight: 1.4
            }}>
              "{justification}"
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            <div style={{
              backgroundColor: 'rgba(240, 242, 240, 0.1)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)'
            }}>
              📊 {confidence}% Confidence
            </div>
            <div style={{
              backgroundColor: 'rgba(240, 242, 240, 0.1)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-sm)'
            }}>
              ✅ {summary.totalCorrect}/{summary.totalQuestions} Correct
            </div>
          </div>
        </div>
      </div>

      {/* Performance Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--space-6)',
        marginBottom: 'var(--space-8)'
      }}>
        {/* Quick Stats */}
        <div style={{
          backgroundColor: 'rgba(30, 43, 34, 0.5)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(163, 184, 165, 0.3)'
        }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>📈 Quick Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Overall Accuracy:</span>
              <strong style={{ color: 'var(--vibrant-leaf)' }}>{summary.accuracy}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Avg. Time/Question:</span>
              <strong>{summary.averageTime}s</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Questions Answered:</span>
              <strong>{summary.totalQuestions}</strong>
            </div>
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div style={{
          backgroundColor: 'rgba(30, 43, 34, 0.5)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(163, 184, 165, 0.3)'
        }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>📊 Difficulty Analysis</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Object.entries(breakdown).map(([difficulty, stats]) => {
              if (stats.total === 0) return null;
              const percentage = Math.round((stats.correct / stats.total) * 100);
              const isStrong = percentage >= 80;
              
              return (
                <div key={difficulty} style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-2)'
                }}>
                  <span style={{ fontSize: 'var(--text-sm)' }}>
                    {getDifficultyLabel(difficulty)}:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{
                      width: '60px',
                      height: '6px',
                      backgroundColor: 'rgba(163, 184, 165, 0.3)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: isStrong ? 'var(--vibrant-leaf)' : percentage >= 50 ? '#FFE66D' : '#FF6B6B',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 1s ease-out'
                      }} />
                    </div>
                    <strong style={{ 
                      fontSize: 'var(--text-sm)',
                      color: isStrong ? 'var(--vibrant-leaf)' : 'inherit',
                      minWidth: '35px'
                    }}>
                      {percentage}%
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{
        backgroundColor: 'rgba(56, 102, 65, 0.3)',
        border: '1px solid var(--vibrant-leaf)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        marginBottom: 'var(--space-8)'
      }}>
        <h3 style={{ 
          color: 'var(--vibrant-leaf)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)'
        }}>
          💡 Personalized Recommendation
        </h3>
        <p style={{ 
          fontSize: 'var(--text-lg)',
          lineHeight: 1.6,
          margin: 0
        }}>
          {recommendation}
        </p>
      </div>

      {/* Agent Discussion Summary */}
      {agentDiscussion && agentDiscussion.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(30, 43, 34, 0.5)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-8)',
          border: '1px solid rgba(163, 184, 165, 0.3)'
        }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>
            🧠 AI Agent Analysis Summary
          </h3>
          <p style={{ 
            opacity: 0.8, 
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-4)'
          }}>
            Three AI agents collaborated to evaluate your performance:
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-2xl)' }}>👩‍🏫</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>MOE Teacher</div>
              <div style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>Curriculum Standards</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-2xl)' }}>🏆</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>Perfect Scorer</div>
              <div style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>Method Efficiency</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-2xl)' }}>🎓</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>Private Tutor</div>
              <div style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>Knowledge Gaps</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        gap: 'var(--space-4)',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={handleContinue}
          style={{
            background: 'var(--leaf-gradient)',
            color: 'var(--deep-forest)',
            border: 'none',
            padding: 'var(--space-4) var(--space-8)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'bold',
            cursor: 'pointer',
            minWidth: '200px'
          }}
        >
          🚀 Continue to Dashboard
        </button>
        
        <button 
          onClick={() => window.print()}
          className="btn-secondary"
          style={{
            padding: 'var(--space-4) var(--space-8)',
            fontSize: 'var(--text-base)',
            minWidth: '150px'
          }}
        >
          📄 Save Results
        </button>
      </div>
    </div>
  );
}

export default QuizResults;