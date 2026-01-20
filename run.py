
from dotenv import load_dotenv
load_dotenv()

import os

from app import create_app

app = create_app()

print(f"MARKET_API_KEY loaded: {'Yes' if os.getenv('MARKET_API_KEY') else 'No'}")
print(f"Key length: {len(os.getenv('MARKET_API_KEY', '')) if os.getenv('MARKET_API_KEY') else 0}")

if __name__ == "__main__":
    app.run(debug=True)