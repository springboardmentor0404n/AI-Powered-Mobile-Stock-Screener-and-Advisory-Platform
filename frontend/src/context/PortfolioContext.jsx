
import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from "react";


const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState([]);

  const buyStock = (stock) => {
  if (!stock || !stock.symbol) return;

  setPortfolio((prev) => {
    const existing = prev.find(p => p.symbol === stock.symbol);

    if (existing) {
      return prev.map(p =>
        p.symbol === stock.symbol
          ? { ...p, qty: p.qty + 1 }
          : p
      );
    }

    return [
      ...prev,
      {
        symbol: stock.symbol,
        qty: 1,
        buy_price: stock.price || 0,
      },
    ];
  });
};


  return (
    <PortfolioContext.Provider value={{ portfolio, buyStock }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => useContext(PortfolioContext);
