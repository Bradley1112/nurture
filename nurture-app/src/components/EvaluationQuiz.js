import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { initializeUserSubjects } from '../firebase/quiz';

const subjects = [
  {
    name: 'Physics',
    syllabus: '6091',
    icon: '⚡',
    topics: ['Kinematics'],
    description: 'Test your understanding of motion, velocity, and acceleration'
  },
  {
    name: 'Elementary Mathematics',
    syllabus: '4048', 
    icon: '📐',
    topics: ['Algebra: Solving linear/quadratic equations', 'Algebra: simplifying expressions'],
    description: 'Master algebraic problem-solving and expression simplification'
  },
  {
    name: 'English Language',
    syllabus: '1128',
    icon: '📚',
    topics: ['Reading Comprehension'],
    description: 'Develop critical reading and analytical thinking skills'
  }
];

function EvaluationQuiz() {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const navigate = useNavigate();

  const handleTopicSelection = (topic) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const startQuiz = async () => {
    if (selectedTopics.length === 0) return;
    
    try {
      // TODO: IMPLEMENT AGENTIC RAG INTEGRATION
      // ========================================
      // You need to integrate the following components:
      // 
      // 1. RAG RETRIEVAL SERVICE:
      //    - Connect to your agentic RAG system
      //    - Retrieve Singapore GCE O-Level syllabus content for selected topics
      //    - API endpoint: [YOUR_RAG_ENDPOINT]
      //    - Required parameters: { topics: selectedTopics, syllabus: ['6091', '4048', '1128'] }
      //
      // 2. QUESTION GENERATION:
      //    - Generate questions according to ramped difficulty:
      //      * Very Easy (2 questions): Definition Recall (MCQ)
      //      * Easy (2 questions): Concept Identification (MCQ)  
      //      * Medium (3 questions): Single-Formula Application (Structured)
      //      * Hard (3 questions): Multi-Step Application (Structured)
      //      * Very Hard (1-2 questions): Complex Synthesis (Structured + Explanation)
      //
      // 3. QUESTION FORMAT BY SUBJECT:
      //    - Physics: MCQ for concepts + Structured for calculations
      //    - Mathematics: Primarily Numerical + Structured questions
      //    - English: MCQ + Fill-in-blanks + Open-ended responses
      //
      // PLACEHOLDER CODE (replace with your implementation):
      /*
      const ragResponse = await fetch(`${process.env.REACT_APP_RAG_ENDPOINT}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: selectedTopics,
          syllabi: getSelectedSyllabi(),
          difficulty_levels: ['very_easy', 'easy', 'medium', 'hard', 'very_hard'],
          question_counts: { very_easy: 2, easy: 2, medium: 3, hard: 3, very_hard: 2 }
        })
      });
      
      const generatedQuestions = await ragResponse.json();
      
      // Navigate to quiz interface with generated questions
      navigate('/quiz-session', { 
        state: { 
          questions: generatedQuestions,
          topics: selectedTopics,
          startTime: new Date().toISOString()
        }
      });
      */
      
      // Initialize user subjects in Firebase database
      const user = auth.currentUser;
      if (user) {
        await initializeUserSubjects(user.uid, selectedTopics);
      }
      
      // TEMPORARY MOCK IMPLEMENTATION (remove when RAG is integrated):
      const mockQuestions = generateMockQuestions(selectedTopics);
      
      // Store quiz session start
      const startTime = new Date().toISOString();
      sessionStorage.setItem('quizStartTime', startTime);
      sessionStorage.setItem('selectedTopics', JSON.stringify(selectedTopics));
      sessionStorage.setItem('generatedQuestions', JSON.stringify(mockQuestions));
      
      // Navigate to quiz session with agentic evaluation
      navigate('/quiz-session');
      
    } catch (error) {
      alert(`Failed to start quiz: ${error.message}`);
    }
  };

  // MOCK QUESTION GENERATOR (remove when RAG is implemented)
  const generateMockQuestions = (topics) => {
    const questions = [];
    
    topics.forEach(topic => {
      const subject = getSubjectByTopic(topic);
      
      // Generate questions according to difficulty ramp
      const difficulties = [
        { level: 'very_easy', count: 2, type: 'mcq' },
        { level: 'easy', count: 2, type: 'mcq' },
        { level: 'medium', count: 3, type: 'structured' },
        { level: 'hard', count: 3, type: 'structured' },
        { level: 'very_hard', count: 2, type: 'structured_explanation' }
      ];
      
      difficulties.forEach(diff => {
        for (let i = 0; i < diff.count; i++) {
          questions.push({
            id: `${topic}_${diff.level}_${i + 1}`,
            topic,
            subject: subject?.name,
            difficulty: diff.level,
            type: diff.type,
            question: `[${diff.level.toUpperCase()}] Sample question ${i + 1} for ${topic}`,
            options: diff.type === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
            correctAnswer: diff.type === 'mcq' ? 'Option A' : 'Sample answer',
            explanation: `Sample explanation for ${topic} question`
          });
        }
      });
    });
    
    return questions;
  };

  const getSubjectByTopic = (topic) => {
    return subjects.find(subject => subject.topics.includes(topic));
  };

  // eslint-disable-next-line no-unused-vars
  const getSelectedSyllabi = () => {
    const uniqueSyllabi = new Set();
    selectedTopics.forEach(topic => {
      const subject = getSubjectByTopic(topic);
      if (subject) {
        uniqueSyllabi.add(subject.syllabus);
      }
    });
    return Array.from(uniqueSyllabi);
  };

  return (
    <div className="quiz-container">
      <h1>🧠 Assessment Time</h1>
      <p className="text-center mb-8" style={{opacity: 0.9, fontSize: 'var(--text-lg)'}}>
        Choose subjects to discover your current expertise level and build your personalized learning path
      </p>
      
      <div className="subjects-container">
        {subjects.map(subject => (
          <div key={subject.name} className="subject-card">
            <h3>{subject.icon} {subject.name}</h3>
            <p style={{opacity: 0.8, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)'}}>
              Syllabus {subject.syllabus}
            </p>
            <p style={{opacity: 0.9, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', lineHeight: 1.5}}>
              {subject.description}
            </p>
            
            {subject.topics.map(topic => (
              <div key={topic} className="topic-checkbox" onClick={() => handleTopicSelection(topic)}>
                <input 
                  type="checkbox" 
                  id={topic} 
                  value={topic} 
                  checked={selectedTopics.includes(topic)}
                  onChange={() => handleTopicSelection(topic)} 
                />
                <label htmlFor={topic}>{topic}</label>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="text-center mt-8">
        <p style={{opacity: 0.8, marginBottom: 'var(--space-4)'}}>
          {selectedTopics.length > 0 
            ? `🌱 ${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''} selected` 
            : '🔍 Select topics to begin assessment'
          }
        </p>
        <button onClick={startQuiz} disabled={selectedTopics.length === 0}>
          {selectedTopics.length === 0 
            ? '🌿 Choose topics first' 
            : `🚀 Begin Assessment (${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''})`
          }
        </button>
      </div>
    </div>
  );
}

export default EvaluationQuiz;