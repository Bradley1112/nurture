#!/usr/bin/env python3
"""
Test the end-to-end rich recommendations flow
"""

import requests
import json
import time

API_BASE = 'http://localhost:8000'

def test_rich_recommendations_flow():
    """Test the complete rich recommendations flow"""
    print("🚀 Testing Rich Recommendations End-to-End Flow")
    print("=" * 60)
    
    # Sample quiz results with multiple topics
    sample_quiz_results = {
        'answers': [
            # Physics - Kinematics (mixed performance)
            {
                'questionId': 'kin_1',
                'question': 'What is velocity?',
                'userAnswer': 'Speed with direction',
                'correctAnswer': 'Speed with direction',
                'difficulty': 'easy',
                'topic': 'Kinematics',
                'timeSpent': 30000,
                'isCorrect': True
            },
            {
                'questionId': 'kin_2',
                'question': 'Calculate final velocity given initial velocity, acceleration, and time',
                'userAnswer': '20 m/s',
                'correctAnswer': '25 m/s',
                'difficulty': 'medium',
                'topic': 'Kinematics',
                'timeSpent': 90000,
                'isCorrect': False
            },
            {
                'questionId': 'kin_3',
                'question': 'Derive equations of motion',
                'userAnswer': 'v = u + at, partial work',
                'correctAnswer': 'v = u + at, s = ut + 1/2at², v² = u² + 2as',
                'difficulty': 'hard',
                'topic': 'Kinematics',
                'timeSpent': 180000,
                'isCorrect': False
            },
            # Math - Algebra (better performance)
            {
                'questionId': 'alg_1',
                'question': 'Solve: 2x + 5 = 11',
                'userAnswer': 'x = 3',
                'correctAnswer': 'x = 3',
                'difficulty': 'easy',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'timeSpent': 45000,
                'isCorrect': True
            },
            {
                'questionId': 'alg_2',
                'question': 'Solve quadratic equation: x² - 5x + 6 = 0',
                'userAnswer': 'x = 2, 3',
                'correctAnswer': 'x = 2, 3',
                'difficulty': 'medium',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'timeSpent': 120000,
                'isCorrect': True
            },
            {
                'questionId': 'alg_3',
                'question': 'Complex quadratic with discriminant',
                'userAnswer': 'x = 1 ± i',
                'correctAnswer': 'x = 1 ± 2i',
                'difficulty': 'hard',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'timeSpent': 240000,
                'isCorrect': False
            }
        ],
        'topics': ['Kinematics', 'Algebra: Solving linear/quadratic equations'],
        'userId': 'test-user-rich-recommendations',
        'completedAt': '2025-09-07T17:30:00Z'
    }
    
    print("📊 Testing with sample data:")
    print(f"   - Topics: {', '.join(sample_quiz_results['topics'])}")
    print(f"   - Total questions: {len(sample_quiz_results['answers'])}")
    print(f"   - Expected rich recommendations for each topic")
    
    try:
        # Test basic evaluation endpoint first
        print("\n🧪 Testing basic evaluation endpoint...")
        response = requests.post(
            f'{API_BASE}/api/quiz/evaluate',
            json={'quiz_results': sample_quiz_results},
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Basic evaluation works!")
            
            evaluation = result.get('evaluation', {})
            
            # Check for rich recommendations
            if 'rich_recommendations' in evaluation:
                print("🎉 Rich recommendations found!")
                rich_recs = evaluation['rich_recommendations']
                
                print(f"\n📋 Overall Assessment:")
                print(f"   - Level: {evaluation.get('expertise_level', 'unknown')}")
                print(f"   - Summary: {rich_recs.get('summary', 'No summary')}")
                
                # Check topic recommendations
                topic_recs = rich_recs.get('topic_recommendations', {})
                print(f"\n📚 Topic-Specific Recommendations ({len(topic_recs)} topics):")
                
                for topic, rec in topic_recs.items():
                    print(f"\n   📖 {topic}:")
                    print(f"      - Accuracy: {rec.get('accuracy', 0)}%")
                    print(f"      - Study Focus: {rec.get('study_focus', 'Unknown')}")
                    print(f"      - Time Estimate: {rec.get('time_estimate', 'Unknown')}")
                    print(f"      - Next Steps: {len(rec.get('next_steps', []))} items")
                    
                    # Show first next step
                    if rec.get('next_steps'):
                        print(f"        • {rec['next_steps'][0]}")
                
                # Check agent perspectives
                agent_perspectives = rich_recs.get('agent_perspectives', {})
                print(f"\n🤖 Agent Insights ({len(agent_perspectives)} agents):")
                for agent, insight in agent_perspectives.items():
                    print(f"   {agent}: {insight.get('recommendation', 'No recommendation')[:60]}...")
                
                # Check immediate actions
                immediate_actions = rich_recs.get('immediate_actions', [])
                print(f"\n⚡ Immediate Actions ({len(immediate_actions)} items):")
                for i, action in enumerate(immediate_actions[:3], 1):
                    print(f"   {i}. {action}")
                
                # Check weekly plan
                weekly_plan = rich_recs.get('weekly_plan', {})
                print(f"\n📅 Weekly Plan ({len(weekly_plan)} days covered)")
                
                return {
                    'success': True,
                    'has_rich_recommendations': True,
                    'topic_count': len(topic_recs),
                    'agent_count': len(agent_perspectives),
                    'action_count': len(immediate_actions),
                    'evaluation_data': evaluation
                }
                
            else:
                print("⚠️ No rich recommendations found, only basic recommendation:")
                print(f"   {evaluation.get('recommendation', 'No recommendation')}")
                
                return {
                    'success': True,
                    'has_rich_recommendations': False,
                    'basic_recommendation': evaluation.get('recommendation'),
                    'evaluation_data': evaluation
                }
        else:
            print(f"❌ Evaluation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return {'success': False, 'error': response.text}
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return {'success': False, 'error': str(e)}

def test_streaming_rich_recommendations():
    """Test the streaming evaluation with rich recommendations"""
    print("\n🔄 Testing Streaming Evaluation with Rich Recommendations")
    print("=" * 60)
    
    sample_data = {
        'answers': [
            {
                'questionId': 'stream_test_1',
                'userAnswer': 'Good answer',
                'correctAnswer': 'Perfect answer',
                'difficulty': 'medium',
                'topic': 'Kinematics',
                'isCorrect': False
            },
            {
                'questionId': 'stream_test_2',
                'userAnswer': 'Perfect answer',
                'correctAnswer': 'Perfect answer',
                'difficulty': 'easy',
                'topic': 'Algebra: Solving linear/quadratic equations',
                'isCorrect': True
            }
        ],
        'topics': ['Kinematics', 'Algebra: Solving linear/quadratic equations'],
        'timeLimitMinutes': 2  # Short limit for testing
    }
    
    try:
        response = requests.post(
            f'{API_BASE}/api/agent-discussion-live',
            json=sample_data,
            stream=True,
            timeout=180
        )
        
        if response.status_code == 200:
            print("✅ Streaming started successfully!")
            
            message_count = 0
            final_evaluation = None
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        try:
                            data = json.loads(line_str[6:])
                            message_count += 1
                            
                            if data.get('type') == 'chat_message':
                                chat = data.get('chat', {})
                                print(f"💬 {chat.get('agent', 'System')}: {chat.get('message', '')[:80]}...")
                            elif data.get('type') == 'evaluation_complete':
                                print("🎉 Streaming evaluation completed!")
                                final_evaluation = data.get('evaluation', {})
                                
                                # Check for rich recommendations in streaming result
                                if final_evaluation.get('rich_recommendations'):
                                    print("🌟 Rich recommendations available in streaming result!")
                                    topic_recs = final_evaluation['rich_recommendations'].get('topic_recommendations', {})
                                    print(f"   Topics with recommendations: {len(topic_recs)}")
                                else:
                                    print("📝 Basic recommendations only in streaming result")
                                
                                break
                            elif data.get('type') == 'error':
                                print(f"❌ Stream error: {data.get('error')}")
                                break
                                
                        except json.JSONDecodeError:
                            continue
            
            print(f"📊 Streaming Summary:")
            print(f"   - Messages received: {message_count}")
            print(f"   - Final evaluation: {'✓' if final_evaluation else '✗'}")
            print(f"   - Rich recommendations: {'✓' if final_evaluation and final_evaluation.get('rich_recommendations') else '✗'}")
            
            return {
                'success': True,
                'message_count': message_count,
                'has_final_evaluation': final_evaluation is not None,
                'has_rich_recommendations': bool(final_evaluation and final_evaluation.get('rich_recommendations')),
                'final_evaluation': final_evaluation
            }
        else:
            print(f"❌ Streaming failed: {response.status_code} - {response.text}")
            return {'success': False, 'error': f"HTTP {response.status_code}"}
            
    except Exception as e:
        print(f"❌ Streaming test failed: {e}")
        return {'success': False, 'error': str(e)}

if __name__ == "__main__":
    # Test basic rich recommendations
    basic_result = test_rich_recommendations_flow()
    
    # Test streaming rich recommendations
    streaming_result = test_streaming_rich_recommendations()
    
    # Final summary
    print("\n" + "=" * 60)
    print("📋 FINAL TEST SUMMARY")
    print("=" * 60)
    
    print(f"✅ Basic Evaluation: {'PASS' if basic_result['success'] else 'FAIL'}")
    if basic_result['success'] and basic_result.get('has_rich_recommendations'):
        print(f"   🌟 Rich recommendations: ✓")
        print(f"   📚 Topics covered: {basic_result.get('topic_count', 0)}")
        print(f"   🤖 Agent insights: {basic_result.get('agent_count', 0)}")
        print(f"   ⚡ Action items: {basic_result.get('action_count', 0)}")
    else:
        print(f"   ⚠️ Rich recommendations: ✗ (fallback to basic)")
    
    print(f"\n✅ Streaming Evaluation: {'PASS' if streaming_result['success'] else 'FAIL'}")
    if streaming_result['success']:
        print(f"   💬 Messages: {streaming_result.get('message_count', 0)}")
        print(f"   🎯 Final evaluation: {'✓' if streaming_result.get('has_final_evaluation') else '✗'}")
        print(f"   🌟 Rich recommendations: {'✓' if streaming_result.get('has_rich_recommendations') else '✗'}")
    
    # Overall status
    overall_success = basic_result['success'] and streaming_result['success']
    rich_recs_working = (basic_result.get('has_rich_recommendations', False) or 
                        streaming_result.get('has_rich_recommendations', False))
    
    print(f"\n🎯 Overall Status: {'SUCCESS' if overall_success else 'NEEDS WORK'}")
    print(f"🌟 Rich Recommendations: {'WORKING' if rich_recs_working else 'NOT YET WORKING'}")
    
    if not rich_recs_working:
        print("\n💡 Next Steps:")
        print("   1. Check backend agent service imports")
        print("   2. Verify Strands SDK availability")
        print("   3. Test with longer evaluation time limits")
        print("   4. Review agent discussion logs")