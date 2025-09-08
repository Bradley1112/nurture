"""
Data parsing utilities for Nurture Backend  
"""
import re
from typing import Dict, Any, Optional, List


def parse_ai_response_content(ai_response) -> str:
    """Extract meaningful content from AI response object"""
    try:
        # Handle Strands AI response format
        if hasattr(ai_response, 'message'):
            message_str = str(ai_response.message)
            # Parse if it's a dict/JSON structure
            if message_str.startswith("{'role'"):
                import ast
                parsed = ast.literal_eval(message_str)
                if 'content' in parsed and isinstance(parsed['content'], list):
                    return parsed['content'][0]['text']
            return message_str
        elif hasattr(ai_response, 'content'):
            return str(ai_response.content)
        else:
            return str(ai_response)
    except Exception:
        return str(ai_response)[:200]  # Fallback to truncated string


def parse_structured_question(ai_response_text: str, question_type: str) -> Dict[str, Any]:
    """Parse AI-generated question into structured components"""
    # Initialize result structure
    parsed = {
        'question': '',
        'options': None,
        'correct_answer': '',
        'explanation': ''
    }
    
    try:
        text = ai_response_text.strip()
        
        # Extract question text
        question_patterns = [
            r'\*\*Question:\*\*\s*(.*?)(?=\*\*|$)',
            r'Question:\s*(.*?)(?=\n\n|Options:|A\)|Correct|$)',
            r'^(.*?)(?=\n\n|Options:|A\)|Correct|$)'
        ]
        
        for pattern in question_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                parsed['question'] = match.group(1).strip()
                break
        
        if question_type == 'mcq':
            # Extract MCQ options
            option_patterns = [
                r'(?:\*\*Options:\*\*|Options:)\s*(.*?)(?=\*\*Correct|\*\*Answer|Correct Answer|$)',
                r'((?:A\)|a\)|\d\)).*?)(?=\*\*Correct|\*\*Answer|Correct Answer|$)',
                r'((?:[A-D]\).*?\n)+)'
            ]
            
            for pattern in option_patterns:
                match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
                if match:
                    options_text = match.group(1).strip()
                    # Parse individual options
                    option_lines = [line.strip() for line in options_text.split('\n') if line.strip()]
                    parsed['options'] = []
                    
                    for line in option_lines:
                        # Remove option prefixes (A), B), 1), etc.)
                        cleaned = re.sub(r'^[A-Za-z]\)\s*|^\d+\)\s*|^[A-Za-z]\.\s*|^\d+\.\s*', '', line).strip()
                        if cleaned:
                            parsed['options'].append(cleaned)
                    
                    if len(parsed['options']) < 2:  # Fallback if parsing failed
                        parsed['options'] = None
                    break
        
        # Extract correct answer
        answer_patterns = [
            r'\*\*Correct Answer:\*\*\s*(.*?)(?=\*\*|$)',
            r'\*\*Answer:\*\*\s*(.*?)(?=\*\*|$)', 
            r'Correct Answer:\s*(.*?)(?=\n\n|Explanation|$)',
            r'Answer:\s*(.*?)(?=\n\n|Explanation|$)'
        ]
        
        for pattern in answer_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                answer = match.group(1).strip()
                
                # For MCQ, extract just the option text without prefix
                if question_type == 'mcq' and parsed['options']:
                    # Handle "A) option text" or "option text" formats
                    clean_answer = re.sub(r'^[A-Za-z]\)\s*|^\d+\)\s*', '', answer).strip()
                    # Find matching option
                    for option in parsed['options']:
                        if clean_answer.lower() in option.lower() or option.lower() in clean_answer.lower():
                            parsed['correct_answer'] = option
                            break
                    if not parsed['correct_answer']:  # Fallback
                        parsed['correct_answer'] = clean_answer
                else:
                    parsed['correct_answer'] = answer
                break
        
        # Extract explanation
        explanation_patterns = [
            r'\*\*Explanation:\*\*\s*(.*?)$',
            r'\*\*Solution:\*\*\s*(.*?)$',
            r'Explanation:\s*(.*?)$'
        ]
        
        for pattern in explanation_patterns:
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                parsed['explanation'] = match.group(1).strip()
                break
        
        # Validation and fallbacks
        if not parsed['question']:
            parsed['question'] = text[:500] + '...' if len(text) > 500 else text
        
        if not parsed['correct_answer']:
            parsed['correct_answer'] = 'Answer not specified'
            
        if not parsed['explanation']:
            parsed['explanation'] = f'This question tests understanding of the given topic.'
        
        return parsed
        
    except Exception:
        # Return basic fallback structure
        return {
            'question': ai_response_text[:500] if len(ai_response_text) > 500 else ai_response_text,
            'options': None,
            'correct_answer': 'Answer parsing failed',
            'explanation': 'Question parsing encountered an error.'
        }