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
BACKEND_URL = "http://localhost:5000"
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
            "topics": ["Kinematics", "Reading Comprehension"]
        }
        response = requests.post(f"{BACKEND_URL}/api/quiz/start", json=payload)
        response.raise_for_status()
        data = response.json()
        
        quiz_data = data['quiz_data']
        print(f"✅ Quiz generated successfully:")
        print(f"   Total questions: {quiz_data['total_questions']}")
        print(f"   Topics: {', '.join(quiz_data['topics'])}")
        print(f"   Syllabi: {', '.join(quiz_data['syllabi'])}")
        
        # Show sample question
        if quiz_data['questions']:
            sample = quiz_data['questions'][0]
            print(f"   Sample question: {sample['question'][:100]}...")
            
        return quiz_data
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