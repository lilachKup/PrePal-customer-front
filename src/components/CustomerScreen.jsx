import React, { useState, useEffect } from "react";
import OrderChat from "./OrderChat";
import CurrentOrder from "./CurrentOrder";
import './CustomerScreen.css';

export default function CustomerScreen({ userId }) {
    const [orderItems, setOrderItems] = useState([]);
    const [orderSent, setOrderSent] = useState(false);

    useEffect(() => {
        console.log("Customer user ID:", userId);
      }, [userId]);

    const handleNewItems = (itemsList) => {
        if (!Array.isArray(itemsList)) return;
        //setOrderItems([]);


        const newItems = itemsList.map((item) => {
            return {
                name: item.Name,
                image: item.Image || "https://img.icons8.com/ios-filled/50/cccccc/shopping-cart.png",
                quantity: item.Quantity ,
                price: (parseFloat(item.Price) * parseInt(item.Quantity)) ,
            };
        });
        setOrderItems(newItems);
       
      };
      
    const sendOrder = () => {
        fetch("http://localhost:5001/sendOrder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: orderItems }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("Order response:", data);
                setOrderSent(true);
            })
            .catch((err) => console.error(err));
    };

    return (
        <div className="customer-layout">
            {/* Chat Area */}
            <div className="chat-panel">
                <h2 className="section-title">🛒 Chat with PrepPal</h2>
                <OrderChat onNewItem={handleNewItems} />
            </div>

            {/* Order Area */}
            <div className="order-panel">
                <h2 className="section-title">🧾 Current Order</h2>
                <CurrentOrder items={orderItems} />
                <button
                    onClick={sendOrder}
                    className="send-order-btn"
                    disabled={orderItems.length === 0 || orderSent}
                >
                    {orderSent ? "✅ Order Sent" : "📦 Send Order"}
                </button>
            </div>
        </div>
    );
}
