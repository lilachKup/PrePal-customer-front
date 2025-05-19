import React, { useState, useEffect, useRef } from "react";
import OrderChat from "./OrderChat";
import CurrentOrder from "./CurrentOrder";
import './CustomerScreen.css';

export default function CustomerScreen({ customer_id, customerName, customerMail, customerLocation }) {
    const [orderItems, setOrderItems] = useState([]);
    const [orderSent, setOrderSent] = useState(false);
    const chatCreated = useRef(false);
    const [chatId, setChatId] = useState(null);


    /*useEffect(() => {
        if (!customerId || chatCreated.current) return;

        const createChat = async () => {
            try {
                const response = await fetch(`https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/client/createchat?client_id=${customerId}`, {
                    method: "POST",
                });

                if (!response.ok) throw new Error("❌ Failed to create chat");

                const data = await response.json();
                console.log("🆕 Chat created successfully:", data.chat_id);

                setChatId(data.chat_id); // 👈 כאן את שומרת אותו ב־state
                chatCreated.current = true;
            } catch (error) {
                console.error("🚨 Error creating chat:", error);
            }
        };

        createChat();
    }, [customerId]);*/

    const handleNewItems = (itemsList) => {
        if (!Array.isArray(itemsList)) return;
        //setOrderItems([]);


        const newItems = itemsList.map((item) => {
            return {
                name: item.Name,
                image: item.Image || "https://img.icons8.com/ios-filled/50/cccccc/shopping-cart.png",
                quantity: item.Quantity,
                price: (parseFloat(item.Price) * parseInt(item.Quantity)),
            };
        });
        setOrderItems(newItems);

    };

    /*const sendOrder = () => {
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
    };*/

    const sendOrder = () => {
        const orderData = {
            storeId: "24682478-3021-70bf-41e1-a3ee28bb3db7", //
            customerName: customerName,
            customerMail: customerMail,
            customerLocation: customerLocation,
            totalPrice: orderItems.reduce((sum, item) => sum + item.price, 0),
            items: orderItems.map(item => `${item.name}: ${item.quantity}`)
        };

        fetch("https://yv6baxe2i0.execute-api.us-east-1.amazonaws.com/dev/addOrderToStore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
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
                <OrderChat onNewItem={handleNewItems} customer_id={customer_id} />
            </div>

            {/* Order Area */}
            <div className="order-panel">
                <h2 className="section-title">🧾 {customerName}'s Order</h2>
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
