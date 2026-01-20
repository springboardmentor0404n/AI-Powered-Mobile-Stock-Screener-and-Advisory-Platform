console.log("TopPriceTable.jsx loaded");

import { buyStock } from "../services/api";

export default function TopPriceTable({ data = [], setBuyStock }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p>No data available</p>;
  }

  const formatNumber = (value) =>
    typeof value === "number" && !isNaN(value)
      ? value.toLocaleString()
      : "NA";

      const handleBuy = async (symbol, price) => {
  try {
    await buyStock({
      symbol: symbol,
      qty: 1,      // default buy quantity
      price: price // current market price
    });

    alert("Stock added to portfolio");
  } catch (err) {
    console.error("Buy failed:", err);
    alert("Buy failed");
  }
};


  return (
    <table className="stock-table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Price</th>
          <th>Volume</th>
          <th>Buy</th>
        </tr>
      </thead>
      <tbody>
        {data.map((stock) => (
          <tr key={stock.symbol}>
            <td>{stock.symbol}</td>

            {/* PRICE */}
            <td>₹{formatNumber(stock.price)}</td>

            {/* VOLUME */}
            <td>{formatNumber(stock.volume)}</td>

            {/* BUY */}
            <td>
              <button
  onClick={(e) => {
    e.stopPropagation();

    console.log("BUY CLICKED:", stock.symbol);

    fetch("http://127.0.0.1:8000/portfolio/buy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol: stock.symbol,
        qty: 1,
        price: stock.price || stock.current_price || stock.close || 100,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Buy API failed");
        return res.json();
      })
      .then((data) => {
        console.log("BUY SUCCESS:", data);
        alert("Stock added to portfolio");
      })
      .catch((err) => {
        console.error("BUY ERROR:", err);
        alert("Buy failed – check console");
      });
  }}
>
  +
</button>


            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
