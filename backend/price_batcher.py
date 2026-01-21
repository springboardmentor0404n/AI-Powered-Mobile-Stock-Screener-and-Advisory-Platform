"""
Price Batching Engine
Batches price updates to prevent UI overload and reduce network traffic
"""

import asyncio
import logging
from typing import Dict, Set, Callable
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PriceBatcher:
    """Batches price updates and sends consolidated updates at intervals"""
    
    def __init__(self, interval_ms: int = 100):
        self.interval_ms = interval_ms
        self.buffer: Dict[str, Dict] = {}  # {token: price_data}
        self.is_running = False
        self._task = None
        self.on_batch_ready: Callable[[Dict], None] = None
        
    async def start(self):
        """Start the batching loop"""
        if self.is_running:
            return
        
        self.is_running = True
        self._task = asyncio.create_task(self._batch_loop())
        logger.info(f"[PRICE BATCHER] Started with {self.interval_ms}ms interval")
    
    async def stop(self):
        """Stop the batching loop"""
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("[PRICE BATCHER] Stopped")
    
    async def add_update(self, token: str, price_data: Dict):
        """Add a price update to the buffer"""
        self.buffer[token] = price_data
    
    async def _batch_loop(self):
        """Main batching loop"""
        try:
            while self.is_running:
                await asyncio.sleep(self.interval_ms / 1000)
                
                if self.buffer and self.on_batch_ready:
                    # Get current buffer and clear it
                    batch = self.buffer.copy()
                    self.buffer.clear()
                    
                    # Send batch to callback
                    try:
                        await self.on_batch_ready(batch)
                    except Exception as e:
                        logger.error(f"[PRICE BATCHER] Callback error: {e}")
                        
        except asyncio.CancelledError:
            logger.info("[PRICE BATCHER] Loop cancelled")
        except Exception as e:
            logger.error(f"[PRICE BATCHER] Loop error: {e}")


# Global instance
price_batcher = PriceBatcher(interval_ms=100)
