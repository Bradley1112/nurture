"""
Configuration Settings for Nurture Backend
Environment-based configuration management
"""

import os
from pathlib import Path

# Load environment variables (fallback if dotenv not available)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️ python-dotenv not installed, using system environment variables only")

class Config:
    """Base configuration class"""
    
    # Flask Settings
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    ENV = os.getenv('FLASK_ENV', 'development')
    
    # Server Configuration
    HOST = os.getenv('BACKEND_HOST', 'localhost')
    PORT = int(os.getenv('BACKEND_PORT', 8000))
    
    # AWS Configuration
    AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    
    # Strands AI Configuration
    STRANDS_API_KEY = os.getenv('STRANDS_API_KEY')
    STRANDS_ENDPOINT = os.getenv('STRANDS_ENDPOINT', 'https://api.strands.ai')
    
    # Database Configuration
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///nurture_dev.db')
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',')
    
    # Cache Configuration
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    CACHE_TIMEOUT = int(os.getenv('CACHE_TIMEOUT', 3600))  # 1 hour default
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # File Paths
    BASE_DIR = Path(__file__).parent.parent
    STATIC_DIR = BASE_DIR / 'static'
    TEMPLATES_DIR = BASE_DIR / 'templates'
    
    @classmethod
    def validate_config(cls):
        """Validate critical configuration values"""
        required_for_production = [
            'SECRET_KEY',
            'AWS_ACCESS_KEY_ID', 
            'AWS_SECRET_ACCESS_KEY',
            'STRANDS_API_KEY'
        ]
        
        if cls.ENV == 'production':
            missing = [key for key in required_for_production if not getattr(cls, key, None)]
            if missing:
                raise ValueError(f"Missing required production config: {', '.join(missing)}")
    
    @classmethod
    def get_strands_config(cls):
        """Get Strands SDK configuration"""
        return {
            'api_key': cls.STRANDS_API_KEY,
            'endpoint': cls.STRANDS_ENDPOINT,
            'aws_region': cls.AWS_REGION,
            'aws_access_key_id': cls.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': cls.AWS_SECRET_ACCESS_KEY
        }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    ENV = 'development'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    ENV = 'production'
    
    @classmethod
    def validate_config(cls):
        super().validate_config()

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    ENV = 'testing'
    DATABASE_URL = 'sqlite:///:memory:'

# Configuration mapping
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}

def get_config():
    """Get configuration based on environment"""
    env = os.getenv('FLASK_ENV', 'development')
    return config_map.get(env, DevelopmentConfig)