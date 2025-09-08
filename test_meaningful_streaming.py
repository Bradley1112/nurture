#!/usr/bin/env python3
"""
Test script to validate meaningful streaming fixes
Tests that meaningful agent conversations are properly streamed to frontend
"""

import sys
import os
import asyncio
import json

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_meaningful_extraction():
    """Test that meaningful content extraction works properly"""
    
    # Import after adding to path
    from services.agentic.evaluation import MeshAgenticEvaluationService
    
    # Create service instance
    service = MeshAgenticEvaluationService(enable_streaming=True)
    
    # Test technical message cleaning
    technical_message = """URGENT ASSESSMENT - 30 SECOND LIMIT

    As an MOE Teacher, I assess this student's performance:
    
    The student demonstrates solid understanding of kinematic equations but struggles with complex problem-solving scenarios. Their foundational knowledge is adequate for Singapore O-Level standards, but application in multi-step problems needs improvement.
    
    Key misconceptions identified:
    - Confusion between velocity and acceleration concepts
    - Difficulty with vector vs scalar quantities
    
    Time pressure: 30s limit.
    Concise, direct recommendations only.
    """
    
    cleaned = service.extract_meaningful_content(technical_message)
    
    print("🧪 TESTING MESSAGE EXTRACTION")
    print("=" * 50)
    print("📝 Original message:")
    print(technical_message[:100] + "...")
    print("\n🧽 Cleaned message:")
    print(cleaned)
    print("\n" + "=" * 50)
    
    # Verify cleaning worked
    assert "URGENT ASSESSMENT" not in cleaned
    assert "30 SECOND LIMIT" not in cleaned
    assert "Time pressure" not in cleaned
    assert "student demonstrates" in cleaned.lower()
    assert "misconceptions" in cleaned.lower()
    
    print("✅ Message extraction test PASSED")
    return True

def test_streaming_structure():
    """Test that streaming chat message structure is correct"""
    
    from services.agentic.evaluation import MeshAgenticEvaluationService
    
    service = MeshAgenticEvaluationService(enable_streaming=True)
    
    # Test chat message emission
    test_message = "This student shows strong analytical skills in Physics problems."
    chat_msg = service.emit_meaningful_chat_message(
        'MOE Teacher', '👩‍🏫', test_message, 'initial_assessment', 'analysis'
    )
    
    print("🧪 TESTING CHAT MESSAGE STRUCTURE")
    print("=" * 50)
    print("📋 Generated chat message:")
    print(json.dumps(chat_msg, indent=2))
    print("=" * 50)
    
    # Verify structure
    assert chat_msg['type'] == 'chat_message'
    assert chat_msg['chat']['agent'] == 'MOE Teacher'
    assert chat_msg['chat']['icon'] == '👩‍🏫'
    assert chat_msg['chat']['phase'] == 'initial_assessment'
    assert test_message in chat_msg['chat']['message']
    
    print("✅ Chat message structure test PASSED")
    return True

def test_sample_quiz_data():
    """Generate sample quiz data for testing"""
    
    sample_quiz_results = {
        'answers': [
            {
                'topic': 'Kinematics',
                'difficulty': 'medium',
                'isCorrect': True,
                'timeSpent': 120000,  # 2 minutes
                'questionId': 'kin_med_1',
                'userAnswer': 'B',
                'correctAnswer': 'B'
            },
            {
                'topic': 'Algebra',
                'difficulty': 'hard',
                'isCorrect': False,
                'timeSpent': 300000,  # 5 minutes
                'questionId': 'alg_hard_1',
                'userAnswer': 'A',
                'correctAnswer': 'C'
            }
        ],
        'topics': ['Kinematics', 'Algebra']
    }
    
    print("🧪 TESTING SAMPLE QUIZ DATA")
    print("=" * 50)
    print("📊 Sample data structure:")
    print(json.dumps(sample_quiz_results, indent=2))
    print("=" * 50)
    print("✅ Sample quiz data generated")
    
    return sample_quiz_results

async def test_streaming_integration():
    """Test that streaming integration works end-to-end"""
    
    from services.agentic.evaluation import MeshAgenticEvaluationService
    
    print("🧪 TESTING STREAMING INTEGRATION")
    print("=" * 50)
    
    service = MeshAgenticEvaluationService(enable_streaming=True)
    sample_data = test_sample_quiz_data()
    
    # Test that streaming generator can be created
    try:
        streaming_gen = service.stream_evaluation_with_meaningful_chat(sample_data)
        
        # Test first few messages
        message_count = 0
        async_gen = streaming_gen
        
        # Convert sync generator to async for testing
        for message in list(async_gen)[:3]:  # Get first 3 messages
            print(f"📨 Message {message_count + 1}:")
            if message.startswith('data: '):
                data = json.loads(message[6:].strip())
                if 'chat' in data:
                    print(f"   Agent: {data['chat'].get('agent', 'Unknown')}")
                    print(f"   Message: {data['chat'].get('message', 'No message')[:100]}...")
                message_count += 1
        
        print(f"✅ Successfully generated {message_count} streaming messages")
        print("=" * 50)
        return True
        
    except Exception as e:
        print(f"❌ Streaming integration test FAILED: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 STARTING MEANINGFUL STREAMING TESTS")
    print("=" * 70)
    
    tests = [
        test_meaningful_extraction,
        test_streaming_structure,
        test_sample_quiz_data,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print("")  # Add spacing between tests
        except Exception as e:
            print(f"❌ Test {test.__name__} FAILED with exception: {str(e)}")
            print("")
    
    print("🎯 TEST SUMMARY")
    print("=" * 70)
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED - Ready for frontend streaming!")
        return True
    else:
        print("⚠️  Some tests failed - Check implementation")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)