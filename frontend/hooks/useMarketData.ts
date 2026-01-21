/**
 * useMarketData Hook
 * React hook for WebSocket connection and real-time market data streaming
 */

import { useEffect, useRef, useState } from 'react';
import { useMarketStore } from '../store/marketStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export const useMarketData = (symbols: string[]) => {
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 10;

    const { updatePrices, setConnected } = useMarketStore();

    const connect = () => {
        try {
            console.log('[WS] Connecting to', `${WS_URL}/ws/market-data`);

            const websocket = new WebSocket(`${WS_URL}/ws/market-data`);

            websocket.onopen = () => {
                console.log('[WS] Connected');
                setIsConnected(true);
                setConnected(true);
                reconnectAttempts.current = 0;

                // Subscribe to symbols
                if (symbols.length > 0) {
                    websocket.send(JSON.stringify({
                        type: 'subscribe',
                        symbols: symbols
                    }));
                    console.log('[WS] Subscribed to', symbols.length, 'symbols');
                }
            };

            websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'snapshot') {
                        // Initial snapshot of prices
                        const updates = Object.entries(message.data).map(([symbol, data]: [string, any]) => ({
                            symbol,
                            ltp: data.ltp / 100, // Convert paise to rupees
                            prevLtp: data.prev_ltp / 100,
                            timestamp: data.timestamp
                        }));
                        updatePrices(updates);
                        console.log('[WS] Received snapshot for', updates.length, 'symbols');
                    } else if (message.type === 'delta') {
                        // Price updates
                        const normalizedUpdates = message.updates.map((update: any) => ({
                            ...update,
                            ltp: update.ltp / 100,
                            prevLtp: update.prevLtp ? update.prevLtp / 100 : undefined
                        }));
                        updatePrices(normalizedUpdates);
                    } else if (message.type === 'pong') {
                        // Ping response
                        console.log('[WS] Pong received');
                    }
                } catch (error) {
                    console.error('[WS] Message parse error:', error);
                }
            };

            websocket.onerror = (error) => {
                console.error('[WS] Error:', error);
            };

            websocket.onclose = () => {
                console.log('[WS] Disconnected');
                setIsConnected(false);
                setConnected(false);

                // Attempt to reconnect with exponential backoff
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);

                    reconnectTimeout.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay) as any;
                } else {
                    console.error('[WS] Max reconnection attempts reached');
                }
            };

            ws.current = websocket;
        } catch (error) {
            console.error('[WS] Connection error:', error);
        }
    };

    const disconnect = () => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }

        setIsConnected(false);
        setConnected(false);
    };

    const subscribe = (newSymbols: string[]) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'subscribe',
                symbols: newSymbols
            }));
            console.log('[WS] Subscribed to', newSymbols.length, 'new symbols');
        }
    };

    const unsubscribe = (symbolsToRemove: string[]) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'unsubscribe',
                symbols: symbolsToRemove
            }));
            console.log('[WS] Unsubscribed from', symbolsToRemove.length, 'symbols');
        }
    };

    // Connect on mount
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, []);

    // Update subscriptions when symbols change
    useEffect(() => {
        if (isConnected && symbols.length > 0) {
            subscribe(symbols);
        }
    }, [symbols, isConnected]);

    // Ping interval to keep connection alive
    useEffect(() => {
        if (!isConnected) return;

        const pingInterval = setInterval(() => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000); // Ping every 30 seconds

        return () => clearInterval(pingInterval);
    }, [isConnected]);

    return {
        isConnected,
        subscribe,
        unsubscribe
    };
};
