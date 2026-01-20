import smtplib
from email.message import EmailMessage
import os

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(subject: str, body: str, to_email: str):
    msg = EmailMessage()
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
