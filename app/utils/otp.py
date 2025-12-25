# app/utils/otp.py
import secrets

def generate_numeric_otp(length=6):
    # cryptographically secure numeric OTP
    range_max = 10 ** length
    return str(secrets.randbelow(range_max)).zfill(length)
