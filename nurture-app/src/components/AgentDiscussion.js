import React, { useState, useEffect, useMemo } from 'react';

/**
 * AgentDiscussion Component
 * 
 * Displays the collaborative swarm pattern discussion between 3 AI agents
 * with a 1-minute timer as specified in Part 3 of README
 */
function AgentDiscussion({ onDiscussionComplete, quizMetrics }) {
  const [discussion, setDiscussion] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isActive, setIsActive] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);

  const agents = useMemo(() => [
    {
      name: "MOE Teacher",
      icon: "👩‍🏫",
      color: "#4A90E2",
      role: "Pedagogical Analysis"
    },
    {
      name: "Perfect Score Student", 
      icon: "🏆",
      color: "#F5A623",
      role: "Method Efficiency"
    },
    {
      name: "Private Tutor",
      icon: "🎓", 
      color: "#7ED321",
      role: "Knowledge Gaps"
    }
  ], []);

  // Timer effect - 1 minute countdown
  useEffect(() => {
    let interval = null;
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            setIsActive(false);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeRemaining]);

  const generateAgentMessage = (agent, round, metrics) => {
    const accuracy = metrics ? (metrics.totalCorrect / metrics.totalQuestions) * 100 : 0;
    
    const messages = {
      "MOE Teacher": {
        1: `Analyzing performance against O-Level standards... ${accuracy.toFixed(1)}% accuracy indicates ${accuracy >= 80 ? 'strong' : accuracy >= 60 ? 'adequate' : 'insufficient'} mastery of core concepts.`,
        2: `The difficulty progression shows clear patterns. Student handles basic concepts well but struggles with multi-step applications - typical theory-to-practice gap.`,
        3: `From a curriculum perspective, this student needs targeted intervention in problem-solving strategies before advancing to complex topics.`
      },
      "Perfect Score Student": {
        1: `Time efficiency analysis reveals suboptimal approaches. A top performer would solve these questions 30% faster with streamlined methods.`,
        2: `The error patterns suggest hesitation and second-guessing. Confidence and systematic approaches are key differentiators at higher levels.`,
        3: `Overall methodology needs refinement. Good understanding but inefficient execution - this gap widens significantly in advanced topics.`
      },
      "Private Tutor": {
        1: `Focusing on specific misconceptions... The wrong answers reveal systematic gaps rather than careless mistakes. This is actually encouraging for targeted remediation.`,
        2: `Each error tells a story about underlying understanding. I see opportunities to strengthen foundations that will unlock higher performance levels.`,
        3: `Building confidence through mastery of prerequisites is essential. With proper scaffolding, this student can achieve significant improvement.`
      }
    };

    return messages[agent.name]?.[round] || `${agent.name} is analyzing the performance data...`;
  };

  // Agent discussion simulation effect
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const discussionInterval = setInterval(() => {
      if (discussion.length >= 9) { // 3 rounds × 3 agents = 9 messages
        setIsActive(false);
        return;
      }

      const agentIndex = discussion.length % 3;
      const round = Math.floor(discussion.length / 3) + 1;
      const agent = agents[agentIndex];

      const newMessage = generateAgentMessage(agent, round, quizMetrics);
      
      setDiscussion(prev => [...prev, {
        id: Date.now(),
        agent: agent.name,
        icon: agent.icon,
        color: agent.color,
        message: newMessage,
        timestamp: new Date().toISOString(),
        round
      }]);

      setCurrentAgent(agentIndex);
      setCurrentRound(round);

    }, 6000); // New message every 6 seconds (60s / 10 messages)

    return () => clearInterval(discussionInterval);
  }, [discussion, isActive, timeRemaining, quizMetrics, agents]);

  // Complete discussion when timer ends
  useEffect(() => {
    if (!isActive && timeRemaining === 0) {
      setTimeout(() => {
        onDiscussionComplete?.(discussion);
      }, 2000); // 2 second delay before showing results
    }
  }, [isActive, timeRemaining, discussion, onDiscussionComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((60 - timeRemaining) / 60) * 100;
  };

  return (
    <div className="quiz-container">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <h1>🧠 Agent Evaluation in Progress</h1>
        <p style={{ opacity: 0.9, fontSize: 'var(--text-lg)' }}>
          Three AI agents are collaboratively analyzing your performance
        </p>
      </div>

      {/* Timer */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: 'var(--space-8)',
        gap: 'var(--space-4)'
      }}>
        <div style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'bold',
          color: timeRemaining <= 10 ? 'var(--error-red)' : 'var(--vibrant-leaf)'
        }}>
          ⏱️ {formatTime(timeRemaining)}
        </div>
        <div style={{
          width: '200px',
          height: '8px',
          backgroundColor: 'rgba(163, 184, 165, 0.3)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${getProgressPercentage()}%`,
            height: '100%',
            backgroundColor: 'var(--vibrant-leaf)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 1s linear'
          }} />
        </div>
      </div>

      {/* Agent Status */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 'var(--space-6)',
        marginBottom: 'var(--space-8)'
      }}>
        {agents.map((agent, index) => (
          <div key={agent.name} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: currentAgent === index && isActive ? 
              'rgba(73, 184, 91, 0.2)' : 'rgba(163, 184, 165, 0.1)',
            border: currentAgent === index && isActive ? 
              '2px solid var(--vibrant-leaf)' : '2px solid transparent',
            transition: 'all var(--transition-normal)',
            minWidth: '120px'
          }}>
            <div style={{ 
              fontSize: 'var(--text-3xl)',
              marginBottom: 'var(--space-2)',
              animation: currentAgent === index && isActive ? 'pulse 2s infinite' : 'none'
            }}>
              {agent.icon}
            </div>
            <div style={{ 
              fontSize: 'var(--text-sm)', 
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 'var(--space-1)'
            }}>
              {agent.name}
            </div>
            <div style={{ 
              fontSize: 'var(--text-xs)', 
              opacity: 0.8,
              textAlign: 'center'
            }}>
              {agent.role}
            </div>
          </div>
        ))}
      </div>

      {/* Discussion Messages */}
      <div style={{
        backgroundColor: 'rgba(30, 43, 34, 0.5)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        minHeight: '400px',
        maxHeight: '500px',
        overflowY: 'auto',
        border: '1px solid rgba(163, 184, 165, 0.3)'
      }}>
        {discussion.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            opacity: 0.7,
            marginTop: 'var(--space-16)'
          }}>
            <div style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>
              🤔
            </div>
            <p>Agents are preparing their analysis...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {discussion.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                backgroundColor: 'rgba(163, 184, 165, 0.1)',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${msg.color}20`,
                animation: 'slideInUp 0.5s ease-out'
              }}>
                <div style={{ 
                  fontSize: 'var(--text-2xl)',
                  minWidth: '40px'
                }}>
                  {msg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-2)'
                  }}>
                    <strong style={{ color: msg.color }}>
                      {msg.agent}
                    </strong>
                    <span style={{ 
                      fontSize: 'var(--text-xs)',
                      opacity: 0.6,
                      backgroundColor: msg.color + '20',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      Round {msg.round}
                    </span>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    lineHeight: 1.5,
                    fontSize: 'var(--text-sm)'
                  }}>
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: 'var(--space-6)',
        opacity: 0.8 
      }}>
        {isActive ? (
          <p>
            🔄 Discussion in progress... 
            <strong style={{ color: 'var(--vibrant-leaf)' }}>
              Round {currentRound} of 3
            </strong>
          </p>
        ) : (
          <p style={{ color: 'var(--vibrant-leaf)', fontWeight: 'bold' }}>
            ✅ Analysis complete! Preparing your personalized assessment...
          </p>
        )}
      </div>
    </div>
  );
}

export default AgentDiscussion;