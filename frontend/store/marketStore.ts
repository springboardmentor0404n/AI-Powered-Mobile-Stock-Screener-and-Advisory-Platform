/**
 * Market Data Store
 * Global state management for real-time stock prices using Zustand
 */

import { create } from 'zustand';

export interface PriceData {
    symbol: string;
    ltp: number;
    prevLtp: number;
    timestamp: string;
}

interface MarketStore {
    prices: Map<string, PriceData>;
    isConnected: boolean;

    // Actions
    updatePrice: (symbol: string, data: PriceData) => void;
    updatePrices: (updates: PriceData[]) => void;
    setConnected: (connected: boolean) => void;
    getPriceChange: (symbol: string) => 'up' | 'down' | 'neutral';
    getPrice: (symbol: string) => PriceData | undefined;
    clearPrices: () => void;
}

export const useMarketStore = create<MarketStore>((set, get) => ({
    prices: new Map(),
    isConnected: false,

    updatePrice: (symbol, data) => {
        set(state => {
            const newPrices = new Map(state.prices);
            newPrices.set(symbol, data);
            return { prices: newPrices };
        });
    },

    updatePrices: (updates) => {
        set(state => {
            const newPrices = new Map(state.prices);
            updates.forEach(data => {
                newPrices.set(data.symbol, data);
            });
            return { prices: newPrices };
        });
    },

    setConnected: (connected) => {
        set({ isConnected: connected });
    },

    getPriceChange: (symbol) => {
        const data = get().prices.get(symbol);
        if (!data || data.ltp === 0 || data.prevLtp === 0) return 'neutral';
        return data.ltp > data.prevLtp ? 'up' : data.ltp < data.prevLtp ? 'down' : 'neutral';
    },

    getPrice: (symbol) => {
        return get().prices.get(symbol);
    },

    clearPrices: () => {
        set({ prices: new Map() });
    }
}));
