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

  const expertiseColorMapping = {
    'Beginner': 'text-red-500',
    'Apprentice': 'text-yellow-500', 
    'Pro': 'text-green-500',
    'Grand Master': 'text-blue-500',
    'Not Evaluated': 'text-gray-400'
  };

  const getTopicData = (subjectId, topicId) => {
    return evaluatedTopics[subjectId]?.[topicId] || {
      expertiseLevel: 'Not Evaluated',
      isEvaluated: false
    };
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#1A241B', color: '#F5F5F5' }}>
      <h1 className="text-4xl font-bold mb-2 text-center">Welcome Back, {getFirstName()}!</h1>
      <p className="text-lg text-center mb-12">Ready to nurture your knowledge?</p>

      {/* Part 5: Subjects and Topics Section */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Subjects & Topics</h2>
        {loading ? (
          <p>Loading your subjects...</p>
        ) : (
          <div className="space-y-6">
            {allSubjects.map(subject => (
              <div key={subject.id} className="p-6 rounded-lg" style={{ backgroundColor: '#386641' }}>
                <h3 className="text-xl font-semibold mb-4">{subject.name}</h3>
                <div className="space-y-3">
                  {subject.topics.map(topic => {
                    const topicData = getTopicData(subject.id, topic.id);
                    return (
                      <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-md bg-opacity-50">
                        <div className="flex-1">
                          <p className="font-medium">{topic.name}</p>
                          <p className={`text-sm ${expertiseColorMapping[topicData.expertiseLevel]}`}>
                            {topicData.expertiseLevel}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleStartStudying(subject.id, topic.id)}
                          className="px-4 py-2 font-semibold rounded-md transition-transform transform hover:scale-105 ml-4"
                          style={{ backgroundColor: '#49B85B' }}
                        >
                          {topicData.isEvaluated ? 'Continue Studying' : 'Begin Studying'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Show evaluation quiz option if no topics are evaluated */}
        {!loading && Object.keys(evaluatedTopics).length === 0 && (
          <div className="text-center p-10 rounded-lg mt-6" style={{ backgroundColor: '#386641' }}>
            <h3 className="text-xl font-semibold">Start your learning journey!</h3>
            <p className="mt-2 text-gray-300">Complete the evaluation quiz to assess your current expertise levels.</p>
            <button 
              onClick={() => navigate('/quiz')}
              className="mt-6 px-6 py-2 font-semibold rounded-md transition-transform transform hover:scale-105"
              style={{ backgroundColor: '#49B85B' }}
            >
              Start Evaluation Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
