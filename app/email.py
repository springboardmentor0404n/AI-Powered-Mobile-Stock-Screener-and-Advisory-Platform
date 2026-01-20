import os

# SAFE DEFAULTS (no crash)
MAIL_HOST = os.getenv("MAIL_HOST", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")


async def send_otp_email(email: str, otp: str):
    # DEV MODE: just print OTP instead of sending email
    print("===================================")
    print(f"OTP for {email}: {otp}")
    print("===================================")
