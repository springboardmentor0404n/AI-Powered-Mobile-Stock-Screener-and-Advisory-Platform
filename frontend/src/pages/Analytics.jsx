import StockTable from "../components/StockTable";
import PageTransition from "../components/PageTransition";
import { buyStock } from "../services/api";

export default function Analytics({ sidebarOpen }) {

  const handleBuy = async (symbol, price) => {
  console.log("BUY CLICKED:", symbol, price);

  try {
    const res = await buyStock({
      symbol,
      qty: 1,
      price,
    });

    console.log("BUY RESPONSE:", res);
    alert("Stock added");
  } catch (err) {
    console.error("BUY ERROR:", err);
  }
};



 return (
  <PageTransition>
    <div className={`main-content ${sidebarOpen ? "open" : "collapsed"}`}>
      <div className="page-wrapper">
        <div className="analytics-card">
          <StockTable />
          <button onClick={() => {
  console.log(row);
  handleBuy(row.symbol, row.price);
}}>
  +
</button>



        </div>
      </div>
    </div>
  </PageTransition>
);

}
