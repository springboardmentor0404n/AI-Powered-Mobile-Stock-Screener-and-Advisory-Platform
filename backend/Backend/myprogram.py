import psycopg2
import bcrypt

conn = psycopg2.connect(
    dbname="Backend",
    user="postgres",
    password="rishitha",
    host="localhost",
    port="5432"
)
cur = conn.cursor()

# Example: Update a single password
plain_password = "Rishi@05"
hashed_password = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
cur.execute(
    'UPDATE "Stock"."user" SET hashed_password=%s WHERE email_id=%s',
    (hashed_password.decode("utf-8"), "srishitha0616@gmail.com")
)
conn.commit()
cur.close()
conn.close()
print("Password updated!")
