import smtplib
from email.mime.text import MIMEText
from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL

def send_otp_email(to_email: str, otp: str, minutes: int = 10):
    subject = "Your verification code"
    body = f"Your verification code is: {otp}\nIt will expire in {minutes} minutes.\n\nIf you didn't request this, please ignore."
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL
    msg["To"] = to_email

    # Use TLS
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
    try:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
    finally:
        server.quit()