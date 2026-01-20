import "./buyModal.css";

export default function BuyModal({ stock, onClose, onConfirm }) {
  const handleSubmit = e => {
    e.preventDefault();
    const qty = Number(e.target.quantity.value);
    if (qty > 0) onConfirm(qty);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Buy {stock.symbol}</h3>
        <p className="price">₹{stock.price}</p>

        <form onSubmit={handleSubmit}>
          <input
            name="quantity"
            type="number"
            placeholder="Enter quantity"
            required
          />
          <div className="actions">
            <button type="submit" className="buy-btn">Confirm</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
