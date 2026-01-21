
import sys
import os
import traceback

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

print("Attempting to import server...")
try:
    import server
    print("✅ Import successful!")
except Exception:
    print("❌ Import failed with error:")
    traceback.print_exc()
