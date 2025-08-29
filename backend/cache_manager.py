"""
Persistent Cache Manager for Quiz Questions
Dramatically improves speed by maintaining cache across restarts
"""
import json
import os
import hashlib
from datetime import datetime, timedelta

class QuizCache:
    def __init__(self, cache_dir="quiz_cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_cache_key(self, topics):
        """Generate consistent cache key from topics"""
        sorted_topics = sorted(topics)
        return hashlib.md5('_'.join(sorted_topics).encode()).hexdigest()
    
    def _get_cache_file(self, cache_key):
        return os.path.join(self.cache_dir, f"{cache_key}.json")
    
    def get(self, topics, max_age_hours=24):
        """Get cached quiz if exists and not expired"""
        cache_key = self._get_cache_key(topics)
        cache_file = self._get_cache_file(cache_key)
        
        if not os.path.exists(cache_file):
            return None
            
        try:
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
            
            # Check if cache is still valid
            cached_time = datetime.fromisoformat(cached_data['timestamp'])
            if datetime.now() - cached_time > timedelta(hours=max_age_hours):
                os.remove(cache_file)  # Remove expired cache
                return None
                
            return cached_data['quiz_data']
        except:
            return None
    
    def set(self, topics, quiz_data):
        """Cache quiz data with timestamp"""
        cache_key = self._get_cache_key(topics)
        cache_file = self._get_cache_file(cache_key)
        
        cached_data = {
            'timestamp': datetime.now().isoformat(),
            'topics': topics,
            'quiz_data': quiz_data
        }
        
        with open(cache_file, 'w') as f:
            json.dump(cached_data, f, indent=2)
    
    def clear_expired(self, max_age_hours=24):
        """Clean up expired cache files"""
        for filename in os.listdir(self.cache_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(self.cache_dir, filename)
                try:
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                    cached_time = datetime.fromisoformat(data['timestamp'])
                    if datetime.now() - cached_time > timedelta(hours=max_age_hours):
                        os.remove(filepath)
                except:
                    os.remove(filepath)  # Remove corrupted files