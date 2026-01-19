import os, smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

TESTING = os.getenv("TESTING") == "True"

def send_otp(email, otp):
    if TESTING:
        print(f"[TESTING MODE] OTP for {email}: {otp}")
        return

    try:
        msg = EmailMessage()
        msg["Subject"] = "Stock Analytics Pro - OTP Verification"
        msg["From"] = os.getenv("SMTP_USER")
        msg["To"] = email
        msg.set_content(f"""
Hello,

Your OTP for Stock Analytics Pro is: {otp}

This OTP is valid for 10 minutes. Do not share this with anyone.

If you didn't request this, please ignore this email.

Best regards,
Stock Analytics Pro Team
        """)

        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")

        with smtplib.SMTP(smtp_host, smtp_port) as s:
            s.starttls()
            s.login(smtp_user, smtp_password)
            s.send_message(msg)
        
        print(f"[EMAIL] OTP sent to {email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP to {email}: {e}")
        raise e
