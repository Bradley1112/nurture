/**
 * API Service for Nurture App
 * Handles communication with the Python Flask backend for agentic functionality
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class NurtureAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Generic API request handler
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  /**
   * Health check - verify backend is running
   */
  async healthCheck() {
    return this.request('/');
  }

  /**
   * Get available subjects and topics for quiz selection
   */
  async getSubjects() {
    return this.request('/api/subjects');
  }

  /**
   * Start quiz with selected topics using sophisticated agentic RAG
   */
  async startQuiz(selectedTopics) {
    return this.request('/api/quiz/start', {
      method: 'POST',
      body: JSON.stringify({
        topics: selectedTopics,
      }),
    });
  }

  /**
   * Get quiz generation progress by session ID
   */
  async getQuizProgress(sessionId) {
    return this.request(`/api/quiz/progress/${sessionId}`);
  }

  /**
   * Evaluate quiz results using collaborative agentic swarm pattern
   */
  async evaluateQuiz(quizResults) {
    return this.request('/api/quiz/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        quiz_results: quizResults,
      }),
    });
  }

  /**
   * Evaluate quiz results with time limit using adaptive agentic system
   */
  async evaluateQuizWithTimeLimit(quizData) {
    return this.request('/api/evaluate-quiz-time-limited', {
      method: 'POST',
      body: JSON.stringify({
        answers: quizData.answers,
        topics: quizData.topics,
        timeLimitMinutes: quizData.timeLimitMinutes || 5,
      }),
    });
  }

  /**
   * Get real-time agent discussion stream during actual evaluation
   */
  async streamRealAgentDiscussion(quizData, onMessage, onError, onComplete) {
    console.log('streamRealAgentDiscussion called with:', quizData);
    try {
      const response = await fetch(`${this.baseURL}/api/agent-discussion-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: quizData.answers,
          topics: quizData.topics,
          timeLimitMinutes: quizData.timeLimitMinutes || 7,
        }),
      });

      if (!response.ok) {
        console.error('Streaming response not OK:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('Streaming response OK, starting to read...');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete?.();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              console.log('Parsed SSE data:', data);
              if (data.type === 'chat_message') {
                console.log('Calling onMessage with chat:', data.chat);
                onMessage?.(data.chat);
              } else if (data.type === 'evaluation_complete') {
                console.log('Evaluation complete, calling onComplete');
                onComplete?.(data.evaluation);
                return;
              } else if (data.type === 'error') {
                console.error('Received error from stream:', data.error);
                onError?.(new Error(data.error));
                return;
              }
              // Ignore heartbeat messages
              
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      onError?.(error);
    }
  }

  /**
   * Get real-time agent discussion stream (1 minute collaborative evaluation)
   */
  async streamAgentDiscussion(quizResults, onMessage, onError, onComplete) {
    try {
      const response = await fetch(`${this.baseURL}/api/agent-discussion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quiz_results: quizResults,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete?.();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                onError?.(new Error(data.error));
              } else {
                onMessage?.(data);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      onError?.(error);
    }
  }

  /**
   * Generate personalized study plan using the three AI study agents
   */
  async generateStudyPlan(expertiseLevels, targetExamDate) {
    return this.request('/api/study-plan', {
      method: 'POST',
      body: JSON.stringify({
        expertise_levels: expertiseLevels,
        target_exam_date: targetExamDate,
      }),
    });
  }

  /**
   * Start a study session using agent graph architecture (star topology)
   */
  async startStudySession(sessionConfig) {
    return this.request('/api/session/start', {
      method: 'POST',
      body: JSON.stringify({
        session_config: sessionConfig,
      }),
    });
  }

  /**
   * Check backend connectivity and agentic system status
   */
  async getSystemStatus() {
    try {
      const health = await this.healthCheck();
      const subjects = await this.getSubjects().catch(() => null);
      
      return {
        backend_online: true,
        agentic_system: health.agentic_system || 'Unknown',
        subjects_available: subjects?.subjects?.length || 0,
        timestamp: health.timestamp,
      };
    } catch (error) {
      return {
        backend_online: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const nurtureAPI = new NurtureAPI();

// Export individual functions for convenience
export const {
  healthCheck,
  getSubjects,
  startQuiz,
  evaluateQuiz,
  evaluateQuizWithTimeLimit,
  streamRealAgentDiscussion,
  streamAgentDiscussion,
  generateStudyPlan,
  startStudySession,
  getSystemStatus,
} = nurtureAPI;

export default nurtureAPI;