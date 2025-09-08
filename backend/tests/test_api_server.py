from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Nurture Backend API',
        'agentic_system': 'Fallback Mode'
    })

@app.route('/api/subjects')
def get_subjects():
    return jsonify({
        'subjects': [
            {
                'name': 'Physics',
                'syllabus': '6091',
                'icon': '⚡',
                'topics': ['Kinematics'],
                'description': 'Test your understanding of motion, velocity, and acceleration'
            },
            {
                'name': 'Elementary Mathematics',
                'syllabus': '4048',
                'icon': '📐',
                'topics': ['Algebra: Solving linear/quadratic equations'],
                'description': 'Master algebraic problem-solving and expression simplification'
            }
        ],
        'status': 'success',
        'using_strands': False
    })

@app.route('/api/quiz/start', methods=['POST'])
def start_quiz():
    from flask import request
    data = request.get_json()
    return jsonify({
        'session_id': 'test_123',
        'status': 'generating',
        'message': 'Quiz generation started (demo mode)',
        'quiz_data': {
            'total_questions': 5,
            'questions': [
                {
                    'id': 1,
                    'question': 'What is velocity?',
                    'options': ['Speed with direction', 'Just speed', 'Acceleration', 'Force'],
                    'correct_answer': 0
                }
            ]
        }
    })

@app.route('/api/agent-discussion-live', methods=['POST'])
def agent_discussion_live():
    from flask import request, Response
    import json
    import time
    
    def generate_mock_stream():
        # Mock streaming response
        messages = [
            {"type": "chat_message", "chat": {"agent": "Teacher", "message": "Let me evaluate your answers..."}},
            {"type": "chat_message", "chat": {"agent": "Examiner", "message": "I see some good understanding here."}},
            {"type": "evaluation_complete", "evaluation": {
                "overall_score": 75,
                "feedback": "Good work! Keep practicing.",
                "detailed_feedback": [{"question": 1, "score": 75, "feedback": "Correct understanding of velocity"}]
            }}
        ]
        
        for msg in messages:
            yield f"data: {json.dumps(msg)}\n\n"
            time.sleep(1)
    
    return Response(generate_mock_stream(), mimetype='text/plain')

@app.route('/api/quiz/evaluate', methods=['POST'])
def evaluate_quiz():
    from flask import request
    return jsonify({
        'evaluation': {
            'overall_score': 75,
            'feedback': 'Good work on the quiz!',
            'detailed_feedback': []
        },
        'status': 'success'
    })

if __name__ == '__main__':
    print("✅ Starting simple Nurture Backend API on localhost:8000")
    app.run(debug=True, host='localhost', port=5001)