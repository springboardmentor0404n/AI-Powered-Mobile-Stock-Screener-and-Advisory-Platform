import React from "react";

export default function PortfolioTable({ data, onSelect }) {
  const calcPnL = (row) => {
    const invested = row.qty * row.buy_price;
    const current = row.qty * row.current_price;
    const pnl = current - invested;
    const percent = invested ? (pnl / invested) * 100 : 0;
    return { pnl, percent };
  };

  return (
    <table className="portfolio-table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Qty</th>
          <th>Buy Price</th>
          <th>Current</th>
          <th>P&amp;L</th>
          <th>%</th>
        </tr>
      </thead>

      <tbody>
        {data.map((row) => {
          const { pnl, percent } = calcPnL(row);
          const color = pnl >= 0 ? "green" : "red";

          return (
            <tr key={row.symbol} onClick={() => onSelect(row.symbol)}>
              <td>{row.symbol}</td>
              <td>{row.qty}</td>
              <td>₹{row.buy_price}</td>
              <td>₹{row.current_price}</td>
              <td style={{ color }}>
                {pnl >= 0 ? "+" : ""}₹{pnl.toFixed(2)}
              </td>
              <td style={{ color }}>
                {percent.toFixed(2)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
