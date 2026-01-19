import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import random
import string

# Simple in-memory storage for OTPs (in production use Redis)
# key: email, value: {otp: "123456", expires: timestamp}
otp_storage = {}

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def send_email_otp(to_email: str, otp: str):
    """
    Sends an OTP to the specified email using SMTP.
    Requires environment variables: MAIL_USERNAME, MAIL_PASSWORD
    Defaults to printing to console if not configured.
    """
    # Support both SMTP_ and MAIL_ prefixes (user used MAIL_)
    smtp_server = os.getenv("SMTP_SERVER") or os.getenv("MAIL_SERVER") or "smtp.gmail.com"
    smtp_port = int(os.getenv("SMTP_PORT") or os.getenv("MAIL_PORT") or "587")
    sender_email = os.getenv("MAIL_USERNAME")
    sender_password = os.getenv("MAIL_PASSWORD")

    print(f"-------------\n[DEV MODE] OTP for {to_email}: {otp}\n-------------")

    if not sender_email or not sender_password:
        print("Wait! MAIL_USERNAME or MAIL_PASSWORD not set. OTP printed above.")
        return True, "Dev Mode (Check Console)" # Return true so flow continues in dev

    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to_email
        msg['Subject'] = "Your Stock Screener Verification Code"
        body = f"Hello,\n\nYour verification code is: {otp}\n\nThis code expires in 10 minutes."
        msg.attach(MIMEText(body, 'plain'))

        # TIMEOUT ADDED: 5 seconds max for connection
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=5)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, to_email, text)
        server.quit()
        print(f"Email sent to {to_email}")
        return True, "Sent"
    except Exception as e:
        # FALLBACK: If email fails (Auth, Timeout, Network), treat as Dev Mode
        print(f" [!] EMAIL COMPLETELY FAILED: {e}")
        print(f" [!] FALLING BACK TO DEV MODE: OTP IS {otp}")
        return True, f"Dev Mode (Email Failed: {str(e)})"
