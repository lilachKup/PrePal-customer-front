import React from "react";
import "./PreviousOrders.css";

const PreviousOrders = ({ orders }) => {
  return (
    <div className="orders-box previous-orders">
      <h2 className="section-title">Previous Orders</h2>
      {(!orders || orders.length === 0) ? (
        <p>No previous orders.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((order, index) => (
            <li key={index} className="orders-item">
              <strong>Order {index + 1}</strong>
              <ul>
                {order.items.map((item, i) => (
                  <li key={i}>{item.name} × {item.quantity}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PreviousOrders;
