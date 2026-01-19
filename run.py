"""
Run this script to start the application in production mode.
"""

import uvicorn
import logging
from config import Config

# Set up logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format=Config.LOG_FORMAT
)

logger = logging.getLogger(__name__)

def print_banner():
    """Print startup banner."""
    banner = f"""
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║           📈 Stock Market Analytics Platform 📊                   ║
║                                                                   ║
║                         Version {Config.VERSION}                           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

🚀 Starting application...

📋 Configuration:
   • Environment: {Config.ENV}
   • Debug Mode: {Config.DEBUG}
   • Server: http://{Config.HOST}:{Config.PORT}
   • Database: Connected ✓
   • AI Service: {'Enabled ✓' if Config.GROQ_API_KEY else 'Not configured ⚠️'}

📚 Documentation:
   • API Docs: http://{Config.HOST}:{Config.PORT}/docs
   • Health Check: http://{Config.HOST}:{Config.PORT}/api/health

💡 Quick Tips:
   • Use Ctrl+C to stop the server
   • Check logs for detailed information
   • Report issues on GitHub

═══════════════════════════════════════════════════════════════════
"""
    print(banner)

if __name__ == "__main__":
    try:
        print_banner()
        
        logger.info(f"Starting {Config.APP_NAME} v{Config.VERSION}")
        logger.info(f"Environment: {Config.ENV}")
        logger.info(f"Debug mode: {Config.DEBUG}")
        
        uvicorn.run(
            "main:app",
            host=Config.HOST,
            port=Config.PORT,
            reload=Config.DEBUG,
            log_level=Config.LOG_LEVEL.lower(),
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("\n\n👋 Shutting down gracefully...")
        print("\nThank you for using Stock Market Analytics Platform!")
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        print("\n❌ Application failed to start. Check logs for details.")
        exit(1)
