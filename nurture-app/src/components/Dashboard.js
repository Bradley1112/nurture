import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [evaluatedTopics, setEvaluatedTopics] = useState({});
  const [loading, setLoading] = useState(true);

  // All subjects and topics as specified in Part 5
  const allSubjects = [
    {
      id: 'physics',
      name: 'Physics (SEAB Syllabus 6091)',
      topics: [
        { id: 'kinematics', name: 'Kinematics' }
      ]
    },
    {
      id: 'elementary_mathematics',
      name: 'Elementary Mathematics (SEAB Syllabus 4048)',
      topics: [
        { 
          id: 'algebra_solving_linear_quadratic_equations', 
          name: 'Algebra: Solving linear/quadratic equations (Numerical Answer)' 
        },
        {
          id: 'algebra_simplifying_expressions',
          name: 'Simplifying expressions (Numerical Answer)'
        }
      ]
    },
    {
      id: 'english_language',
      name: 'English Language (SEAB Syllabus 1128)',
      topics: [
        { 
          id: 'reading_comprehension', 
          name: 'Reading Comprehension: Test understanding of a given passage with questions on inference, main idea, and author\'s purpose (MCQ and Open-ended Questions)' 
        }
      ]
    }
  ];

  useEffect(() => {
    const fetchEvaluatedTopics = async () => {
      console.log('Dashboard: Fetching evaluated topics for user:', user?.uid);
      if (!user) {
        setLoading(false);
        return;
      }

      const db = getFirestore();
      const evaluatedTopicsData = {};
      
      try {
        // Check each predefined subject for evaluated topics
        for (const subject of allSubjects) {
          const subjectKey = subject.id;
          evaluatedTopicsData[subjectKey] = {};
          
          for (const topic of subject.topics) {
            const topicKey = topic.id;
            
            // Try to get the topic data from Firestore
            const topicDoc = await getDoc(doc(db, 'users', user.uid, 'subjects', subjectKey, 'topics', topicKey));
            
            if (topicDoc.exists()) {
              const topicData = topicDoc.data();
              evaluatedTopicsData[subjectKey][topicKey] = {
                expertiseLevel: topicData.expertiseLevel || 'Not Evaluated',
                evaluationScore: topicData.evaluationScore || 0,
                lastStudied: topicData.lastStudied,
                isEvaluated: true
              };
              console.log(`Dashboard: Found evaluation data for ${subjectKey}/${topicKey}:`, evaluatedTopicsData[subjectKey][topicKey]);
            } else {
              evaluatedTopicsData[subjectKey][topicKey] = {
                expertiseLevel: 'Not Evaluated',
                evaluationScore: 0,
                lastStudied: null,
                isEvaluated: false
              };
            }
          }
        }
        
        console.log('Dashboard: Final evaluated topics:', evaluatedTopicsData);
        setEvaluatedTopics(evaluatedTopicsData);
      } catch (error) {
        console.error("Dashboard: Error fetching evaluated topics:", error);
      }

      setLoading(false);
    };

    fetchEvaluatedTopics();
  }, [user]);

  const handleStartStudying = (subjectId, topicId) => {
    navigate('/study-setup', { state: { subjectId, topicId } });
  };

  const getFirstName = () => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'Student';
  };

  const getExpertiseColors = (level) => {
    const colorMap = {
      'Beginner': {
        bg: 'rgba(239, 68, 68, 0.1)',
        border: '#ef4444',
        text: '#fca5a5',
        dot: '#ef4444'
      },
      'Apprentice': {
        bg: 'rgba(245, 158, 11, 0.1)', 
        border: '#f59e0b',
        text: '#fbbf24',
        dot: '#f59e0b'
      },
      'Pro': {
        bg: 'rgba(34, 197, 94, 0.1)',
        border: '#22c55e',
        text: '#4ade80',
        dot: '#22c55e'
      },
      'Grand Master': {
        bg: 'rgba(59, 130, 246, 0.1)',
        border: '#3b82f6',
        text: '#60a5fa',
        dot: '#3b82f6'
      },
      'Not Evaluated': {
        bg: 'rgba(107, 114, 128, 0.1)',
        border: '#6b7280',
        text: '#9ca3af',
        dot: '#6b7280'
      }
    };
    return colorMap[level] || colorMap['Not Evaluated'];
  };

  const getTopicData = (subjectId, topicId) => {
    return evaluatedTopics[subjectId]?.[topicId] || {
      expertiseLevel: 'Not Evaluated',
      isEvaluated: false
    };
  };

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #1E2B22 0%, #0f1419 100%)',
      color: '#F5F5F5' 
    }}>
      {/* Header Section */}
      <div className="px-8 pt-12 pb-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4" style={{ 
            background: 'linear-gradient(135deg, #49B85B, #6ee7b7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Welcome Back, {getFirstName()}! 🌱
          </h1>
          <p className="text-xl text-gray-300 mb-8">Ready to nurture your knowledge and grow your expertise?</p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Your Learning Journey</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span>Not Evaluated</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-red-400">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Beginner</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-yellow-400">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Apprentice</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-green-400">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Pro</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-blue-400">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Grand Master</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300">Loading your subjects...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 3-Column Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {allSubjects.map((subject, index) => (
                  <div 
                    key={subject.id} 
                    className="group relative"
                    style={{
                      background: 'rgba(56, 102, 65, 0.2)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(73, 184, 91, 0.3)',
                      borderRadius: '24px',
                      padding: '32px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(73, 184, 91, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(73, 184, 91, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(73, 184, 91, 0.3)';
                    }}
                  >
                    {/* Subject Header */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{
                              background: `linear-gradient(135deg, ${['#ef4444', '#f59e0b', '#22c55e'][index]} 0%, ${['#f87171', '#fbbf24', '#4ade80'][index]} 100%)`,
                              boxShadow: `0 8px 16px ${['rgba(239, 68, 68, 0.3)', 'rgba(245, 158, 11, 0.3)', 'rgba(34, 197, 94, 0.3)'][index]}`
                            }}
                          >
                            {['⚡', '📐', '📚'][index]}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white leading-tight">
                              {subject.name.split('(')[0].trim()}
                            </h3>
                            <p className="text-sm text-gray-400">
                              ({subject.name.match(/\(([^)]+)\)/)?.[1] || ''})
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Topics</div>
                          <div className="text-2xl font-bold text-white">{subject.topics.length}</div>
                        </div>
                      </div>
                    </div>

                    {/* Topics List */}
                    <div className="space-y-4">
                      {subject.topics.map(topic => {
                        const topicData = getTopicData(subject.id, topic.id);
                        const colors = getExpertiseColors(topicData.expertiseLevel);
                        
                        return (
                          <div 
                            key={topic.id} 
                            className="relative group/topic"
                            style={{
                              background: colors.bg,
                              border: `2px solid ${colors.border}40`,
                              borderRadius: '16px',
                              padding: '20px',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = colors.border;
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = `${colors.border}40`;
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-3">
                                  <div 
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: colors.dot }}
                                  ></div>
                                  <h4 className="font-semibold text-white text-sm leading-tight">
                                    {topic.name.length > 80 ? `${topic.name.substring(0, 80)}...` : topic.name}
                                  </h4>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span 
                                      className="px-3 py-1 rounded-full text-xs font-medium"
                                      style={{ 
                                        backgroundColor: colors.bg,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}60`
                                      }}
                                    >
                                      {topicData.expertiseLevel.charAt(0).toUpperCase() + topicData.expertiseLevel.slice(1).toLowerCase()}
                                    </span>
                                    {topicData.lastStudied && (
                                      <span className="text-xs text-gray-400">
                                        Last studied: {new Date(topicData.lastStudied.seconds * 1000).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Button */}
                            <button 
                              onClick={() => handleStartStudying(subject.id, topic.id)}
                              className="w-full mt-4 px-4 py-3 font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                              style={{ 
                                background: 'linear-gradient(135deg, #49B85B 0%, #22c55e 100%)',
                                color: '#1E2B22',
                                boxShadow: '0 4px 12px rgba(73, 184, 91, 0.3)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(73, 184, 91, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(73, 184, 91, 0.3)';
                              }}
                            >
                              <span>{topicData.isEvaluated ? '📚 Continue Studying' : '🚀 Begin Studying'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Call to Action for New Users */}
              {Object.values(evaluatedTopics).every(subject => 
                Object.values(subject || {}).every(topic => !topic.isEvaluated)
              ) && (
                <div className="text-center py-16">
                  <div 
                    className="max-w-2xl mx-auto p-12 rounded-3xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(73, 184, 91, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)',
                      border: '2px dashed rgba(73, 184, 91, 0.3)',
                      backdropFilter: 'blur(20px)'
                    }}
                  >
                    <div className="text-6xl mb-6">🌱</div>
                    <h3 className="text-3xl font-bold text-white mb-4">Start Your Learning Adventure!</h3>
                    <p className="text-lg text-gray-300 mb-8">
                      Take our comprehensive evaluation quiz to discover your current expertise levels and receive personalized study recommendations.
                    </p>
                    <button 
                      onClick={() => navigate('/quiz')}
                      className="px-10 py-4 font-bold text-lg rounded-2xl transition-all duration-300"
                      style={{ 
                        background: 'linear-gradient(135deg, #49B85B 0%, #22c55e 100%)',
                        color: '#1E2B22',
                        boxShadow: '0 8px 24px rgba(73, 184, 91, 0.4)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(73, 184, 91, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(73, 184, 91, 0.4)';
                      }}
                    >
                      🎯 Start Evaluation Quiz
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
