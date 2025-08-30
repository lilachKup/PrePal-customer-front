import React from "react";
import CurrentOrder from "./CurrentOrder";
import "./ActiveOrders.css";

const ActiveOrders = ({ items, onSend, orderSent }) => {
  return (
    <div className="orders-box active-order">
      <h2 className="section-title">Active Orders</h2>
      <CurrentOrder items={items} />
      <button
        onClick={onSend}
        className="send-order-btn"
        disabled={items.length === 0 || orderSent}
      >
        {orderSent ? "✅ Order Sent" : "📦 Send Order"}
      </button>
    </div>
  );
};

export default ActiveOrders;
