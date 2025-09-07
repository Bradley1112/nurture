#!/usr/bin/env python3
"""
Integration Test for Nurture App
Tests the complete flow from React frontend to Python backend
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_backend_health():
    """Test backend health check"""
    print("🔍 Testing backend health...")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        response.raise_for_status()
        data = response.json()
        print(f"✅ Backend healthy: {data['service']}")
        print(f"   Agentic System: {data['agentic_system']}")
        return True
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")
        return False

def test_subjects_endpoint():
    """Test subjects API endpoint"""
    print("\n📚 Testing subjects endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/subjects")
        response.raise_for_status()
        data = response.json()
        subjects = data['subjects']
        print(f"✅ Found {len(subjects)} subjects:")
        for subject in subjects:
            print(f"   {subject['icon']} {subject['name']} ({subject['syllabus']})")
            print(f"      Topics: {', '.join(subject['topics'])}")
        return True
    except Exception as e:
        print(f"❌ Subjects endpoint failed: {e}")
        return False

def test_quiz_generation():
    """Test quiz generation with agentic RAG"""
    print("\n🧠 Testing quiz generation (agentic RAG)...")
    try:
        payload = {
            "topics": ["Kinematics"]
        }
        response = requests.post(f"{BACKEND_URL}/api/quiz/start", json=payload)
        response.raise_for_status()
        data = response.json()
        
        # Check if quiz_data is immediately available (cached or fallback)
        if 'quiz_data' in data:
            quiz_data = data['quiz_data']
            print(f"✅ Quiz generated immediately (cached/fallback):")
            print(f"   Total questions: {quiz_data['total_questions']}")
            print(f"   Topics: {', '.join(quiz_data['topics'])}")
            if 'syllabi' in quiz_data:
                print(f"   Syllabi: {', '.join(quiz_data['syllabi'])}")
            
            # Show sample question
            if quiz_data['questions']:
                sample = quiz_data['questions'][0]
                print(f"   Sample question: {sample['question'][:100]}...")
                
            return quiz_data
        
        # Handle agentic RAG generation with progress tracking
        elif 'session_id' in data and data.get('status') == 'generating_with_agentic_rag':
            session_id = data['session_id']
            print(f"✅ Quiz generation started with agentic RAG:")
            print(f"   Session ID: {session_id}")
            print(f"   Status: {data['status']}")
            print(f"   Method: {data.get('method', 'unknown')}")
            
            # Poll for completion (with timeout)
            print("   Waiting for agentic generation to complete...")
            max_wait = 30  # 30 seconds timeout
            wait_time = 0
            
            while wait_time < max_wait:
                time.sleep(2)
                wait_time += 2
                
                progress_response = requests.get(f"{BACKEND_URL}/api/quiz/progress/{session_id}")
                progress_response.raise_for_status()
                progress = progress_response.json()
                
                status = progress.get('status', 'unknown')
                print(f"   Progress: {status} - {progress.get('message', '')}")
                
                if status == 'completed':
                    quiz_data = progress.get('quiz_data')
                    if quiz_data:
                        print(f"✅ Agentic quiz generation completed:")
                        print(f"   Total questions: {quiz_data['total_questions']}")
                        print(f"   Topics: {', '.join(quiz_data['topics'])}")
                        return quiz_data
                    else:
                        print("⚠️ Quiz completed but no quiz_data found")
                        break
                        
                elif status in ['error', 'timeout_fallback', 'ai_error']:
                    print(f"⚠️ Generation failed with status: {status}")
                    # Try to get fallback quiz
                    fallback_response = requests.post(f"{BACKEND_URL}/api/quiz/fallback/{session_id}")
                    if fallback_response.status_code == 200:
                        fallback_data = fallback_response.json()
                        if 'quiz_data' in fallback_data:
                            print("✅ Fallback quiz generated:")
                            quiz_data = fallback_data['quiz_data']
                            print(f"   Total questions: {quiz_data['total_questions']}")
                            return quiz_data
                    break
            
            if wait_time >= max_wait:
                print("⚠️ Quiz generation timed out, trying fallback...")
                # Try to get fallback quiz
                fallback_response = requests.post(f"{BACKEND_URL}/api/quiz/fallback/{session_id}")
                if fallback_response.status_code == 200:
                    fallback_data = fallback_response.json()
                    if 'quiz_data' in fallback_data:
                        print("✅ Fallback quiz generated after timeout:")
                        quiz_data = fallback_data['quiz_data']
                        print(f"   Total questions: {quiz_data['total_questions']}")
                        return quiz_data
        
        print("❌ Unexpected response format from quiz generation")
        return None
        
    except Exception as e:
        print(f"❌ Quiz generation failed: {e}")
        return None

def test_quiz_evaluation(quiz_data):
    """Test quiz evaluation with collaborative agents"""
    print("\n🤖 Testing agentic evaluation (collaborative swarm)...")
    try:
        # Create mock quiz results
        mock_answers = []
        for i, question in enumerate(quiz_data['questions'][:3]):  # Test with first 3 questions
            mock_answers.append({
                "questionId": question['id'],
                "topic": question['topic'],
                "difficulty": question['difficulty'],
                "isCorrect": i % 2 == 0,  # Alternate correct/incorrect
                "timeSpent": 30000 + (i * 5000),  # 30s, 35s, 40s
                "userAnswer": f"Mock answer {i+1}",
                "correctAnswer": question.get('correct_answer', 'Mock correct answer')
            })
        
        payload = {
            "quiz_results": {
                "answers": mock_answers,
                "topics": quiz_data['topics'],
                "userId": "test_user",
                "completedAt": datetime.now().isoformat()
            }
        }
        
        response = requests.post(f"{BACKEND_URL}/api/quiz/evaluate", json=payload)
        response.raise_for_status()
        data = response.json()
        
        evaluation = data['evaluation']
        print(f"✅ Evaluation completed:")
        print(f"   Expertise Level: {evaluation['expertiseLevel']}")
        print(f"   Justification: {evaluation['justification']}")
        print(f"   Confidence: {evaluation.get('confidence', 'N/A')}%")
        
        if evaluation.get('agentDiscussion'):
            print(f"   Agent discussions: {len(evaluation['agentDiscussion'])} messages")
        
        return True
    except Exception as e:
        print(f"❌ Quiz evaluation failed: {e}")
        return False

def test_frontend_connectivity():
    """Test if frontend is accessible"""
    print("\n⚛️  Testing frontend connectivity...")
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        if response.status_code == 200:
            print("✅ Frontend accessible at http://localhost:3000")
            return True
        else:
            print(f"⚠️  Frontend responded with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Frontend not accessible: {e}")
        return False

def main():
    """Run complete integration test"""
    print("🌱 Nurture App Integration Test")
    print("=" * 50)
    
    tests = [
        test_backend_health,
        test_subjects_endpoint,
        test_quiz_generation,
        test_frontend_connectivity
    ]
    
    results = []
    quiz_data = None
    
    for test in tests:
        if test == test_quiz_generation:
            quiz_data = test()
            results.append(quiz_data is not None)
        else:
            results.append(test())
    
    # Test evaluation if quiz generation succeeded
    if quiz_data:
        results.append(test_quiz_evaluation(quiz_data))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Integration Test Results")
    print("=" * 50)
    
    passed = sum(1 for r in results if r)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total} tests")
    
    if passed == total:
        print("🎉 All tests passed! Integration successful!")
        print("\n🚀 Ready to use:")
        print(f"   Frontend: {FRONTEND_URL}")
        print(f"   Backend API: {BACKEND_URL}")
        print("   Agentic System: Sophisticated Python agents with mesh topology")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)