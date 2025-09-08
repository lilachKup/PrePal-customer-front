import React from "react";
import './CurrentOrder.css';

const placeholderImg = "https://img.icons8.com/ios-filled/50/cccccc/shopping-cart.png";


const CurrentOrder = ({ items }) => {
  return (
    <div>
      {items.length === 0 ? (
        <p>No items in the order yet.</p>
      ) : (
        <ul className="order-list">
          {items.map((item, i) => (
            <li key={i} className="order-item">
              <span>{item.name}</span>
              <span className="order-item-quantity"> {item.quantity} </span>
              <span className="order-item-price">₪{(Math.ceil(item.price * 100) / 100).toFixed(2)}</span>
              <img
                src={item.image_url || placeholderImg}
                alt={item.name}
                className="order-item-img"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CurrentOrder;
