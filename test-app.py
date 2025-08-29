#!/usr/bin/env python3
"""
Simple test script to verify the Nurture app flow works properly
"""

import subprocess
import time
import requests
import json
import sys
import os

def test_backend_startup():
    """Test that the backend starts up correctly"""
    print("🧪 Testing backend startup...")
    
    try:
        # Test health check endpoint
        response = requests.get('http://localhost:5000/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend is healthy: {data['service']}")
            print(f"   Status: {data['agentic_system']}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Could not connect to backend: {e}")
        return False

def test_subjects_endpoint():
    """Test that subjects can be loaded"""
    print("🧪 Testing subjects endpoint...")
    
    try:
        response = requests.get('http://localhost:5000/api/subjects', timeout=10)
        if response.status_code == 200:
            data = response.json()
            subjects = data.get('subjects', [])
            print(f"✅ Loaded {len(subjects)} subjects:")
            for subject in subjects:
                print(f"   - {subject['icon']} {subject['name']} ({len(subject['topics'])} topics)")
            return True
        else:
            print(f"❌ Subjects endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Could not load subjects: {e}")
        return False

def test_quiz_generation():
    """Test quiz generation with sample topics"""
    print("🧪 Testing quiz generation...")
    
    try:
        # Start quiz generation
        quiz_data = {
            "topics": ["Kinematics", "Algebra: Solving linear/quadratic equations"]
        }
        
        response = requests.post(
            'http://localhost:5000/api/quiz/start', 
            json=quiz_data,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if 'quiz_data' in data:
                # Immediate response (cached or fallback)
                questions = data['quiz_data']['questions']
                print(f"✅ Quiz generated immediately with {len(questions)} questions")
                return True, data
            elif 'session_id' in data:
                # Background generation
                session_id = data['session_id']
                print(f"⏳ Quiz generation started with session ID: {session_id}")
                
                # Poll for completion
                for i in range(30):  # Wait up to 30 seconds
                    time.sleep(1)
                    progress_response = requests.get(f'http://localhost:5000/api/quiz/progress/{session_id}')
                    
                    if progress_response.status_code == 200:
                        progress_data = progress_response.json()
                        status = progress_data.get('status', 'unknown')
                        
                        if status == 'completed' and 'quiz_data' in progress_data:
                            questions = progress_data['quiz_data']['questions']
                            print(f"✅ Quiz generation completed with {len(questions)} questions")
                            return True, progress_data
                        elif status == 'error':
                            print(f"❌ Quiz generation failed: {progress_data.get('message', 'Unknown error')}")
                            return False, None
                        else:
                            print(f"⏳ Status: {status} - {progress_data.get('message', '')}")
                
                print("❌ Quiz generation timed out")
                return False, None
            else:
                print(f"❌ Unexpected quiz response format: {data}")
                return False, None
        else:
            print(f"❌ Quiz generation request failed: {response.status_code}")
            return False, None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Quiz generation failed: {e}")
        return False, None

def test_quiz_evaluation():
    """Test quiz evaluation with sample answers"""
    print("🧪 Testing quiz evaluation...")
    
    # Sample quiz results
    quiz_results = {
        "answers": [
            {
                "questionId": "kin_easy_1",
                "topic": "Kinematics",
                "difficulty": "easy",
                "userAnswer": "m/s²",
                "correctAnswer": "m/s²",
                "isCorrect": True,
                "timeSpent": 5000
            },
            {
                "questionId": "alg_medium_1", 
                "topic": "Algebra: Solving linear/quadratic equations",
                "difficulty": "medium",
                "userAnswer": "x = 2 or x = 3",
                "correctAnswer": "x = 2 or x = 3 (by factoring: (x-2)(x-3) = 0)",
                "isCorrect": True,
                "timeSpent": 15000
            }
        ],
        "topics": ["Kinematics", "Algebra: Solving linear/quadratic equations"],
        "userId": "test_user",
        "completedAt": "2025-08-28T06:30:00Z"
    }
    
    try:
        response = requests.post(
            'http://localhost:5000/api/quiz/evaluate',
            json={"quiz_results": quiz_results},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            evaluation = data.get('evaluation', {})
            
            expertise_level = evaluation.get('expertiseLevel', evaluation.get('level', 'unknown'))
            accuracy = evaluation.get('summary', {}).get('accuracy', 'unknown')
            
            print(f"✅ Quiz evaluation completed:")
            print(f"   Expertise Level: {expertise_level}")
            print(f"   Accuracy: {accuracy}%")
            print(f"   Method: {data.get('message', 'Unknown method')}")
            
            return True, evaluation
        else:
            print(f"❌ Quiz evaluation failed: {response.status_code}")
            return False, None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Quiz evaluation failed: {e}")
        return False, None

def main():
    """Run all tests"""
    print("🌱 Starting Nurture App Flow Tests")
    print("=" * 50)
    
    # Test 1: Backend health
    if not test_backend_startup():
        print("\n❌ Backend is not running. Please start it first:")
        print("   cd backend && python app.py")
        return False
    
    print()
    
    # Test 2: Subjects loading
    if not test_subjects_endpoint():
        return False
    
    print()
    
    # Test 3: Quiz generation
    quiz_success, quiz_data = test_quiz_generation()
    if not quiz_success:
        return False
    
    print()
    
    # Test 4: Quiz evaluation
    eval_success, eval_data = test_quiz_evaluation()
    if not eval_success:
        return False
    
    print()
    print("🎉 All tests passed! The Nurture app flow is working correctly.")
    print("\n📋 Summary:")
    print("✅ Backend startup and health check")
    print("✅ Subject and topic loading")
    print("✅ Quiz question generation (AI agents)")
    print("✅ Quiz answer evaluation (AI marking)")
    print("\n🚀 Your app is ready for testing!")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)