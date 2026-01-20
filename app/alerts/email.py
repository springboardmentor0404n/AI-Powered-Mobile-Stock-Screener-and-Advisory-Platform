import smtplib
from email.mime.text import MIMEText

def send_email(subject, body, to_email):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = "stockai@alerts.com"
    msg["To"] = to_email

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login("usakshi738@gmail.com", "tpwrlgwytvtgdkld")
    server.send_message(msg)
    server.quit()
