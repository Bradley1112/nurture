"""
Smart Question Generation System
Combines templates, variations, and selective AI enhancement
"""
import random
import json

class SmartQuestionGenerator:
    def __init__(self):
        # Question templates with parametric variations
        self.question_patterns = {
            "Physics": {
                "Kinematics": {
                    "very_easy_mcq": [
                        {
                            "pattern": "What is the SI unit of {concept}?",
                            "concepts": ["velocity", "acceleration", "displacement", "speed"],
                            "answers": {
                                "velocity": {"correct": "m/s", "options": ["m/s²", "m/s", "m", "s"]},
                                "acceleration": {"correct": "m/s²", "options": ["m/s", "m/s²", "m", "kg"]},
                                "displacement": {"correct": "m", "options": ["m/s", "m", "kg", "N"]},
                                "speed": {"correct": "m/s", "options": ["m/s²", "m/s", "km/h", "both B and C"]}
                            }
                        }
                    ],
                    "easy_calculation": [
                        {
                            "pattern": "A {object} travels {distance}m in {time}s at constant {motion_type}. Calculate the {calculate_what}.",
                            "variables": {
                                "object": ["car", "bicycle", "train", "ball"],
                                "distance": [50, 80, 120, 150, 200],
                                "time": [4, 5, 8, 10, 12],
                                "motion_type": ["speed", "velocity"],
                                "calculate_what": ["speed", "average velocity"]
                            },
                            "formula": "speed = distance / time",
                            "solution_template": "Using the formula {formula}: {calculation}"
                        }
                    ]
                }
            }
        }
        
        # Pre-validated question pool (mix of templates and AI-generated)
        self.question_pool = self.load_question_pool()
    
    def generate_question_fast(self, topic, difficulty, question_type):
        """Generate question using smart templates (2-5s vs 30s AI)"""
        
        # 1. Try question pool first (cached good questions)
        pooled = self.get_from_pool(topic, difficulty, question_type)
        if pooled:
            return pooled
        
        # 2. Generate from patterns (parametric templates)
        pattern_question = self.generate_from_pattern(topic, difficulty, question_type)
        if pattern_question:
            return pattern_question
        
        # 3. Fallback to AI only for complex questions
        return None  # Let AI handle it
    
    def generate_from_pattern(self, topic, difficulty, question_type):
        """Generate variations from parametric patterns"""
        subject = self._get_subject_from_topic(topic)
        
        if subject not in self.question_patterns:
            return None
            
        topic_patterns = self.question_patterns[subject].get(topic, {})
        pattern_key = f"{difficulty}_{question_type}"
        
        if pattern_key not in topic_patterns:
            return None
        
        patterns = topic_patterns[pattern_key]
        selected_pattern = random.choice(patterns)
        
        return self._fill_pattern(selected_pattern, topic, difficulty, question_type)
    
    def _fill_pattern(self, pattern, topic, difficulty, question_type):
        """Fill parametric pattern with random values"""
        if question_type == "mcq" and "concepts" in pattern:
            # MCQ with concept variations
            concept = random.choice(pattern["concepts"])
            question_text = pattern["pattern"].format(concept=concept)
            answer_data = pattern["answers"][concept]
            
            return {
                'id': f"{topic}_{difficulty}_{random.randint(1000,9999)}",
                'topic': topic,
                'difficulty': difficulty,
                'type': 'mcq',
                'question': question_text,
                'options': answer_data["options"],
                'correct_answer': answer_data["correct"],
                'explanation': f"The SI unit of {concept} is {answer_data['correct']}"
            }
        
        elif "variables" in pattern:
            # Calculation questions with variable substitution
            variables = {}
            for var, options in pattern["variables"].items():
                variables[var] = random.choice(options)
            
            question_text = pattern["pattern"].format(**variables)
            
            # Calculate answer if it's a calculation
            if variables.get("distance") and variables.get("time"):
                answer = variables["distance"] / variables["time"]
                solution = f"Using the formula {pattern['formula']}: {variables['distance']} ÷ {variables['time']} = {answer} m/s"
            else:
                solution = pattern.get("solution_template", "Apply the relevant formula")
            
            return {
                'id': f"{topic}_{difficulty}_{random.randint(1000,9999)}",
                'topic': topic,
                'difficulty': difficulty,
                'type': question_type,
                'question': question_text,
                'correct_answer': solution,
                'explanation': f"This tests {topic} calculations at {difficulty} level"
            }
        
        return None
    
    def get_from_pool(self, topic, difficulty, question_type):
        """Get pre-validated question from pool"""
        pool_key = f"{topic}_{difficulty}_{question_type}"
        if pool_key in self.question_pool:
            questions = self.question_pool[pool_key]
            if questions:
                return random.choice(questions)
        return None
    
    def load_question_pool(self):
        """Load pre-generated high-quality questions"""
        # This could load from JSON file, database, etc.
        return {
            "Kinematics_medium_structured": [
                {
                    'id': 'kinematics_medium_001',
                    'topic': 'Kinematics',
                    'difficulty': 'medium',
                    'type': 'structured',
                    'question': 'A car accelerates from rest at 3 m/s² for 4 seconds. Calculate: (a) final velocity (b) distance traveled',
                    'correct_answer': '(a) v = u + at = 0 + 3×4 = 12 m/s (b) s = ut + ½at² = 0 + ½×3×16 = 24 m',
                    'explanation': 'Uses kinematic equations for constant acceleration'
                }
            ]
        }
    
    def _get_subject_from_topic(self, topic):
        topic_mapping = {
            'Kinematics': 'Physics',
            'Algebra': 'Mathematics', 
            'Reading Comprehension': 'English'
        }
        for key in topic_mapping:
            if key in topic:
                return topic_mapping[key]
        return 'General'