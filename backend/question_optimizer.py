"""
Question Generation Optimizer
Combines templates with AI for 10x speed improvement
"""

class QuestionOptimizer:
    def __init__(self):
        self.templates = {
            "Physics": {
                "Kinematics": {
                    "very_easy": [
                        {"question": "What is the SI unit of velocity?", "options": ["m/s²", "m/s", "m", "s"], "correct": 1},
                        {"question": "What is acceleration?", "options": ["Rate of change of velocity", "Rate of change of position", "Force applied", "Energy stored"], "correct": 0}
                    ],
                    "easy": [
                        {"question": "A car travels {distance}m in {time}s. Calculate speed.", "formula": "speed = distance/time"},
                        {"question": "An object accelerates from rest at {accel}m/s² for {time}s. Find final velocity.", "formula": "v = u + at"}
                    ]
                }
            },
            "Mathematics": {
                "Algebra": {
                    "easy": [
                        {"question": "Solve: {a}x + {b} = {c}", "template": "linear_equation"},
                        {"question": "Simplify: {a}x² + {b}x + {c}", "template": "quadratic_expression"}
                    ]
                }
            }
        }
    
    def get_fast_question(self, topic, difficulty, question_type):
        """Generate question using template (instant) vs AI (30s)"""
        subject = self._get_subject_from_topic(topic)
        
        if subject in self.templates and topic in self.templates[subject]:
            topic_templates = self.templates[subject][topic].get(difficulty, [])
            if topic_templates:
                import random
                template = random.choice(topic_templates)
                return self._fill_template(template, topic, difficulty)
        
        # Fallback to AI generation if no template
        return None
    
    def _fill_template(self, template, topic, difficulty):
        """Fill template with random values for instant generation"""
        import random
        
        # Generate random values for physics calculations
        values = {
            'distance': random.randint(50, 200),
            'time': random.randint(5, 15),
            'accel': random.randint(2, 8),
            'a': random.randint(2, 9),
            'b': random.randint(1, 20),
            'c': random.randint(10, 50)
        }
        
        question_text = template['question'].format(**values)
        
        if 'options' in template:
            # MCQ
            return {
                'id': f"{topic}_{difficulty}_{random.randint(1000,9999)}",
                'topic': topic,
                'difficulty': difficulty,
                'type': 'mcq',
                'question': question_text,
                'options': template['options'],
                'correct_answer': template['options'][template['correct']],
                'explanation': f"Template-generated {difficulty} question for {topic}"
            }
        else:
            # Structured question
            return {
                'id': f"{topic}_{difficulty}_{random.randint(1000,9999)}",
                'topic': topic,
                'difficulty': difficulty,
                'type': 'structured',
                'question': question_text,
                'correct_answer': f"Apply {template['formula']} with given values",
                'explanation': f"Use the formula: {template.get('formula', 'Standard approach')}"
            }
    
    def _get_subject_from_topic(self, topic):
        """Map topic to subject"""
        topic_mapping = {
            'Kinematics': 'Physics',
            'Algebra': 'Mathematics',
            'Reading Comprehension': 'English'
        }
        
        for key in topic_mapping:
            if key in topic:
                return topic_mapping[key]
        return 'General'