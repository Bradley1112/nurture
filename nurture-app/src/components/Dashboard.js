import React from 'react';
import { auth } from '../firebase/firebase';

function Dashboard() {
  const user = auth.currentUser;
  
  // Safe name extraction with fallbacks
  const getFirstName = () => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Student';
  };
  
  const firstName = getFirstName();

  // Mock data for demonstration - this will be replaced with actual Firebase data
  const mockStudyPlan = [
    { subject: 'Physics', topic: 'Kinematics', level: 'Beginner', nextSession: '2025-08-27', type: 'Learning' },
    { subject: 'Mathematics', topic: 'Algebra', level: 'Apprentice', nextSession: '2025-08-28', type: 'Practice' },
    { subject: 'English', topic: 'Comprehension', level: 'Pro', nextSession: '2025-08-29', type: 'Review' }
  ];

  const getLevelColor = (level) => {
    switch(level) {
      case 'Beginner': return '#FF6B6B';
      case 'Apprentice': return '#FFE66D'; 
      case 'Pro': return '#4ECDC4';
      case 'Grand Master': return '#49B85B';
      default: return '#A3B8A5';
    }
  };

  const getLevelIcon = (level) => {
    switch(level) {
      case 'Beginner': return '🌱';
      case 'Apprentice': return '🌿';
      case 'Pro': return '🌳';
      case 'Grand Master': return '🏆';
      default: return '📚';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Learning': return '📖';
      case 'Practice': return '💪';
      case 'Review': return '🔄';
      default: return '📚';
    }
  };

  return (
    <div className="dashboard-container">
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
        <h1>🌱 Welcome Back, {firstName}!</h1>
        <p style={{ opacity: 0.9, fontSize: 'var(--text-lg)' }}>
          Ready to continue growing your knowledge today?
        </p>
      </div>

      {/* Study Progress Overview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 'var(--space-6)', 
        marginBottom: 'var(--space-10)' 
      }}>
        <div style={{
          background: 'rgba(30, 43, 34, 0.5)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(163, 184, 165, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>📈</div>
          <h3 style={{ margin: '0 0 var(--space-2) 0' }}>Study Streak</h3>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--vibrant-leaf)' }}>7 days</p>
        </div>

        <div style={{
          background: 'rgba(30, 43, 34, 0.5)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(163, 184, 165, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>⏱️</div>
          <h3 style={{ margin: '0 0 var(--space-2) 0' }}>Total Study Time</h3>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--vibrant-leaf)' }}>24h 30m</p>
        </div>

        <div style={{
          background: 'rgba(30, 43, 34, 0.5)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(163, 184, 165, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>📅</div>
          <h3 style={{ margin: '0 0 var(--space-2) 0' }}>Next Exam</h3>
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--vibrant-leaf)' }}>45 days</p>
        </div>
      </div>

      {/* Today's Study Plan */}
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>🗓️ Today's Growth Plan</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {mockStudyPlan.map((item, index) => (
            <div key={index} style={{
              background: 'rgba(30, 43, 34, 0.5)',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(163, 184, 165, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all var(--transition-normal)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--text-2xl)' }}>{getTypeIcon(item.type)}</div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--soft-white)' }}>{item.subject} - {item.topic}</h4>
                  <p style={{ margin: 0, opacity: 0.8, fontSize: 'var(--text-sm)' }}>{item.type} Session</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-2)',
                  background: getLevelColor(item.level) + '20',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-full)',
                  border: `2px solid ${getLevelColor(item.level)}`
                }}>
                  <span style={{ fontSize: 'var(--text-sm)' }}>{getLevelIcon(item.level)}</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: getLevelColor(item.level) }}>
                    {item.level}
                  </span>
                </div>
                <button style={{
                  background: 'var(--leaf-gradient)',
                  color: 'var(--deep-forest)',
                  border: 'none',
                  padding: 'var(--space-3) var(--space-6)',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 'bold',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer'
                }}>
                  Start Session
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: 'var(--space-6)' }}>🚀 Quick Actions</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ padding: 'var(--space-4) var(--space-6)' }}>
            📊 View Progress
          </button>
          <button className="btn-secondary" style={{ padding: 'var(--space-4) var(--space-6)' }}>
            🎯 Set Goals  
          </button>
          <button className="btn-secondary" style={{ padding: 'var(--space-4) var(--space-6)' }}>
            📚 Browse Topics
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;