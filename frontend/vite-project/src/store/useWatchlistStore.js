import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWatchlistStore = create(
  persist(
    (set, get) => ({
      watchlist: [],

      // NEW: Allows the dashboard to load stocks from the database
      setWatchlist: (list) => {
        set({ watchlist: list });
      },

      addToWatchlist: (stock) => {
        const current = get().watchlist;
        const exists = current.some((s) => s.symbol === stock.symbol);
        if (!exists) {
          set({ watchlist: [...current, stock] });
          return true;
        }
        return false;
      },

      removeFromWatchlist: (symbol) => {
        set({
          watchlist: get().watchlist.filter((s) => s.symbol !== symbol),
        });
      },

      isWatching: (symbol) => {
        return get().watchlist.some((s) => s.symbol === symbol);
      },
    }),
    { name: 'stock-watchlist-storage' }
  )
);