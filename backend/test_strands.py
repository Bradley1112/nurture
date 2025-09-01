#!/usr/bin/env python3
"""
Test script to verify Strands SDK is working properly
"""
import os

# Set AWS credentials
os.environ['AWS_ACCESS_KEY_ID'] = 'ASIA3M276NSD6ILUPIDR'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'i0Oy6R5EDT9M0LjYBsNXMGATh/1HLeaCogY/skCg'
os.environ['AWS_SESSION_TOKEN'] = 'IQoJb3JpZ2luX2VjEKT//////////wEaDmFwLXNvdXRoZWFzdC0xIkYwRAIgX9w4hYW4P9NGLrzIYkjZbQTYZnTF5vrII31PVCcqz8sCIEIczXlIEEdfMbV3Ryr5XNj3GpzW2dcNAyokbo1tjcg1KowDCP3//////////wEQABoMNzgzNDk1ODgzOTExIgzdHtHQ3PSd2sHLwBAq4AIxfIxGULg8yoBX2N3aTKxokksTJQlML+BglteFj3myBeoNfSBYTNik/YgsTkd2yc0DK4PL52RLBmDOEm2lHk0ib27+FF9DKYwqil3WXjr+p7Azjj//D8b1k1tZP+x8JfDRNPzQV1h4we1isW4amluycAq1hYBap8O/qUwcDv2S5BGHTV55Zq23VkbXBSPZATd/HskWekGFikXsrv5AzNk2zTSF7B/BDN93Q+W6bkmem6Ep4ROP2E1eN+kCmiB1d0DCYd7Yi/q3C/oX9TUwzQlMy7gwaS9puCFs3l8sf3TApDr8R6G+Cx8qaYRGxJNQFzc0KFJpIkXLH8kXBlu9PyKBYvlL9QMJmiR+HW0r1BvqWNf+4p9VmGI/st8d8Dvt5DQsGLikaDc+EVHIud/h3ZsBPd/fdm5TMRzOR8ZD1xSDCzMKCrrsqSgqwn+ah7rdpayNwfZz5lcQy1J5CQIc5tO7MOuu1MUGOqcBLQ6PhpnyRxLVWQh9nlcafBqiXL5XLIHnciNPif1kpeJ5lGo5CfRcbZbYKKlWbOBU0VQJyv0NEwHOWgCBSzgUhSYw7f+Irm1OSB0nnfnxOeCsoU30NqzC2SmcBDxj11SFXvA0TmvXN1fEo187dfMeW/lUnpGEs9I94FcEH2SDNJcnuVlZlsOGbvzLXu3vVO/5IovrCvDfES2rZjdEaQB9nEkbDxvFj/k='

try:
    from strands import Agent, tool
    print("✅ Strands SDK imported successfully")
    
    # Create a simple test agent
    @Agent
    class TestAgent:
        """A simple test agent for educational evaluation"""
        
        @tool
        def evaluate_answer(self, question: str, answer: str) -> str:
            """Evaluate a student's answer to a question"""
            return f"For question '{question}', the answer '{answer}' needs evaluation."
    
    # Test the agent
    agent = TestAgent()
    result = agent.evaluate_answer("What is velocity?", "Speed with direction")
    print(f"✅ Test agent created and working: {result}")
    
    print("🎉 Strands SDK is ready for use!")
    
except ImportError as e:
    print(f"❌ Failed to import Strands: {e}")
except Exception as e:
    print(f"❌ Error testing Strands: {e}")