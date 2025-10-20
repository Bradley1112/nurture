/**
 * Study Session API Service - Python Backend Integration
 * 
 * This service connects the React frontend to the Python AWS Strands backend
 * for Part 7 study sessions with Agent Graph (Star Topology).
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class StudySessionAPI {
    constructor() {
        this.baseURL = `${API_BASE_URL}/api/study-session`;
    }

    /**
     * Map frontend expertise levels to backend expected values
     * Frontend: "Beginner", "Apprentice", "Pro", "Grand Master"  
     * Backend: "beginner", "apprentice", "pro", "grandmaster"
     */
    mapExpertiseLevel(frontendLevel) {
        const mapping = {
            'Beginner': 'beginner',
            'Apprentice': 'apprentice', 
            'Pro': 'pro',
            'Grand Master': 'grandmaster',
            // Handle lowercase versions too
            'beginner': 'beginner',
            'apprentice': 'apprentice',
            'pro': 'pro',
            'grandmaster': 'grandmaster'
        };
        return mapping[frontendLevel] || 'beginner';
    }

    /**
     * Initialize a new study session with AWS Strands Agent Graph
     * @param {Object} sessionData - Session initialization data
     * @returns {Promise<Object>} Session initialization response
     */
    async initializeSession(sessionData) {
        try {
            console.log('🎯 Initializing AWS Strands study session...', sessionData);
            
            const payload = {
                user_id: sessionData.userId,
                topic_id: sessionData.topicId,
                subject_id: sessionData.subjectId,
                expertise_level: this.mapExpertiseLevel(sessionData.expertiseLevel || 'beginner'),
                focus_level: sessionData.focusLevel || 5,
                stress_level: sessionData.stressLevel || 3,
                session_duration: sessionData.sessionDuration || 60,
                exam_date: sessionData.examDate || null
            };

            // ADDED: Include topicProgress if provided
            if (sessionData.topicProgress) {
                payload.topicProgress = sessionData.topicProgress;
                console.log('📊 Including topicProgress in payload:', sessionData.topicProgress);
            }

            const response = await fetch(`${this.baseURL}/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            console.log('✅ Study session initialized:', result);
            return result;

        } catch (error) {
            console.error('❌ Session initialization failed:', error);
            throw new Error(`Failed to initialize study session: ${error.message}`);
        }
    }

    /**
     * Send chat message to AWS Strands orchestrator
     * @param {string} sessionId - Session identifier
     * @param {string} message - Student's chat message
     * @returns {Promise<Object>} Agent response
     */
    async sendChatMessage(sessionId, message) {
        try {
            console.log(`💬 Sending message to orchestrator (${sessionId}):`, message.substring(0, 50));
            
            const response = await fetch(`${this.baseURL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: message
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            console.log('✅ Agent response received:', result);
            return result;

        } catch (error) {
            console.error('❌ Chat message failed:', error);
            throw new Error(`Failed to process message: ${error.message}`);
        }
    }

    /**
     * Get current session status
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Session status
     */
    async getSessionStatus(sessionId) {
        try {
            const response = await fetch(`${this.baseURL}/${sessionId}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            return result;

        } catch (error) {
            console.error('❌ Session status check failed:', error);
            throw new Error(`Failed to get session status: ${error.message}`);
        }
    }

    /**
     * End study session and get final data for Part 8
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Final session data
     */
    async endSession(sessionId) {
        try {
            console.log(`🏁 Ending study session: ${sessionId}`);
            
            const response = await fetch(`${this.baseURL}/${sessionId}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            console.log('✅ Session ended successfully:', result);
            return result;

        } catch (error) {
            console.error('❌ Session end failed:', error);
            throw new Error(`Failed to end session: ${error.message}`);
        }
    }

    /**
     * Check if study session service is available
     * @returns {Promise<Object>} Health check result
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('❌ Health check failed:', error);
            return {
                service: 'study_session',
                status: 'unavailable',
                error: error.message
            };
        }
    }

    /**
     * Test agent availability (development endpoint)
     * @returns {Promise<Object>} Agent status
     */
    async testAgents() {
        try {
            const response = await fetch(`${this.baseURL}/test/agents`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('❌ Agent test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export singleton instance
export const studySessionAPI = new StudySessionAPI();

// Export class for testing
export default StudySessionAPI;