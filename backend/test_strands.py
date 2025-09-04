#!/usr/bin/env python3
"""
Test script to verify Strands SDK is working properly
"""
import os

# AWS credentials will be loaded from ~/.aws/credentials or environment variables  
# No hardcoded credentials - use aws configure or set AWS_ACCESS_KEY_ID env vars

try:
    from strands import Agent, tool
    print("✅ Strands SDK imported successfully")
    
    # Test different Agent patterns
    
    # Pattern 1: Simple function-based agent
    agent = Agent("Test Agent")
    print(f"✅ Simple agent created: {agent}")
    
    print("🎉 Strands SDK is ready for use!")
    
except ImportError as e:
    print(f"❌ Failed to import Strands: {e}")
except Exception as e:
    print(f"❌ Error testing Strands: {e}")