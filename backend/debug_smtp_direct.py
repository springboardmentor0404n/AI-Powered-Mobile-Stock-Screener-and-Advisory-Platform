
import asyncio
import os
from dotenv import load_dotenv

# Load exactly as main.py does
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from utils_email import send_email_otp

async def test_smtp():
    print("Test 1: Check Env Vars")
    user = os.getenv("MAIL_USERNAME")
    pwd = os.getenv("MAIL_PASSWORD")
    print(f"MAIL_USERNAME: {'[SET]' if user else '[NOT SET]'}")
    print(f"MAIL_PASSWORD: {'[SET]' if pwd else '[NOT SET]'}")
    
    print("\nTest 2: Attempting Send (Mock)")
    # We pass a fake email. If it attempts to connect and hangs, we know it's network.
    print("Calling send_email_otp...")
    success, msg = send_email_otp("test@example.com", "123456")
    print(f"Result: Success={success}, Msg='{msg}'")

if __name__ == "__main__":
    asyncio.run(test_smtp())
