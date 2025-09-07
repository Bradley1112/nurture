#!/usr/bin/env python3
"""
Test the evaluation flow specifically
"""

import requests
import json
import time

API_BASE = 'http://localhost:8000'

def test_evaluation_endpoint():
    """Test the evaluation endpoint with sample data"""
    print("🧪 Testing evaluation endpoint...")
    
    # Sample quiz results
    sample_quiz_results = {
        'answers': [
            {
                'questionId': 'q1',
                'question': 'What is velocity?',
                'userAnswer': 'Speed with direction',
                'correctAnswer': 'Speed with direction',
                'difficulty': 'easy',
                'topic': 'Kinematics',
                'timeSpent': 30000,
                'isCorrect': True
            },
            {
                'questionId': 'q2', 
                'question': 'Calculate acceleration',
                'userAnswer': '5 m/s^2',
                'correctAnswer': '10 m/s^2',
                'difficulty': 'medium',
                'topic': 'Kinematics',
                'timeSpent': 60000,
                'isCorrect': False
            },
            {
                'questionId': 'q3',
                'question': 'Solve quadratic equation',
                'userAnswer': 'x = 2, 3',
                'correctAnswer': 'x = 2, 3',
                'difficulty': 'hard',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'timeSpent': 120000,
                'isCorrect': True
            }
        ],
        'topics': ['Kinematics', 'Algebra: Solving linear/quadratic equations'],
        'userId': 'test-user',
        'completedAt': '2025-09-07T17:00:00Z'
    }
    
    try:
        response = requests.post(
            f'{API_BASE}/api/quiz/evaluate',
            json={'quiz_results': sample_quiz_results},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Evaluation endpoint works!")
            print(f"📊 Evaluation method: {result.get('evaluation', {}).get('network_info', {}).get('method', 'unknown')}")
            print(f"🎯 Expertise level: {result.get('evaluation', {}).get('expertise_level', 'unknown')}")
            print(f"💡 Recommendation: {result.get('evaluation', {}).get('recommendation', 'none')}")
            
            # Check if we have rich agent discussion
            agent_discussion = result.get('evaluation', {}).get('mesh_discussion', [])
            print(f"🗣️ Agent discussion messages: {len(agent_discussion)}")
            
            if agent_discussion:
                print("📝 Sample agent messages:")
                for i, msg in enumerate(agent_discussion[:3]):  # Show first 3
                    print(f"   {msg.get('agent', 'Unknown')}: {msg.get('message', 'No message')[:100]}...")
            
            return result
        else:
            print(f"❌ Evaluation failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Evaluation error: {e}")
        return None

def test_streaming_evaluation():
    """Test the streaming evaluation endpoint"""
    print("\n🧪 Testing streaming evaluation endpoint...")
    
    sample_data = {
        'answers': [
            {
                'questionId': 'q1',
                'userAnswer': 'Answer 1',
                'correctAnswer': 'Correct 1',
                'difficulty': 'easy',
                'topic': 'Kinematics',
                'isCorrect': True
            }
        ],
        'topics': ['Kinematics'],
        'timeLimitMinutes': 1  # Short limit for testing
    }
    
    try:
        response = requests.post(
            f'{API_BASE}/api/agent-discussion-live',
            json=sample_data,
            stream=True,
            timeout=120
        )
        
        if response.status_code == 200:
            print("✅ Streaming evaluation started!")
            message_count = 0
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        try:
                            data = json.loads(line_str[6:])
                            message_count += 1
                            
                            if data.get('type') == 'chat_message':
                                chat = data.get('chat', {})
                                print(f"💬 {chat.get('agent', 'Agent')}: {chat.get('message', 'No message')[:50]}...")
                            elif data.get('type') == 'evaluation_complete':
                                print("🎉 Evaluation completed!")
                                evaluation = data.get('evaluation', {})
                                print(f"📊 Final level: {evaluation.get('expertiseLevel', 'unknown')}")
                                break
                            elif data.get('type') == 'error':
                                print(f"❌ Stream error: {data.get('error')}")
                                break
                                
                        except json.JSONDecodeError:
                            continue
            
            print(f"📈 Received {message_count} messages total")
            return True
        else:
            print(f"❌ Streaming failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Streaming error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Evaluation Flow")
    print("=" * 50)
    
    # Test basic evaluation
    eval_result = test_evaluation_endpoint()
    
    # Test streaming evaluation 
    stream_result = test_streaming_evaluation()
    
    print("\n📋 Summary:")
    print(f"✅ Basic evaluation: {'✓' if eval_result else '✗'}")
    print(f"✅ Streaming evaluation: {'✓' if stream_result else '✗'}")