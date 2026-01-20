import { useEffect, useState } from "react";
import axios from "axios";

export default function useLivePrice(symbol) {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      const res = await axios.get(`/market/live-price/${symbol}`);
      setPrice(res.data);
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  return price;
}
