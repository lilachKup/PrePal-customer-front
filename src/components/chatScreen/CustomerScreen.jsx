import React, { useState, useEffect, useRef } from "react";
import OrderChat from "./OrderChat";
import CurrentOrder from "./CurrentOrder";
import './CustomerScreen.css';
import TopBar from "./TopBar";

{/* import TopBar from "./TopBar";*/}



async function getCoordinates(address) {

    let cleaned = address.replace(/,?\s*0\s*,?\s*0\s*/g, "").trim();
    if (!cleaned) throw new Error("Address is empty");

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);
    const data = await res.json();

    if (!data.length) {
        const cityOnly = address.split(",")[0].trim();
        if (cityOnly) {
            const cityUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityOnly)}`;
            const cityRes = await fetch(cityUrl);
            const cityData = await cityRes.json();
            if (cityData.length) {
                return {
                    lat: parseFloat(cityData[0].lat),
                    lng: parseFloat(cityData[0].lon)
                };
            }
        }
        throw new Error("No results found");
    }

    return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
    };
}


export default function CustomerScreen({ customer_id, customerName, customerMail, customer_address }) {
    const [orderItems, setOrderItems] = useState([]);
    const [orderSent, setOrderSent] = useState(false);
    const [customerAddressOrder, setCustomerAddressOrder] = useState(null);
    const chatCreated = useRef(false);
    const [chatId, setChatId] = useState(null);
    const [storeId, setStoreId] = useState(null);
    const [olderOrderItems, setOlderOrderItems] = useState([]);

    const [coords, setCoords] = React.useState(null);


    /*React.useEffect(() => {
        if (customer_address) {
            getCoordinates(customer_address)
                .then(c => setCoords(c))
                .catch(err => console.error("Geocoding error:", err));
        }
    }, [customerAddress]);*/


    useEffect(() => {
        (async () => {
            let flag = prompt("do you order to your location that you sigend up? yes/no");
            if (flag === "yes") {
                const city = prompt("Please enter your city to order:");
                const street = prompt("Please enter your full address to order (street):");
                const number = prompt("Please enter your house number:");
                const address = `${city}, ${street}, ${number}`;
                setCustomerAddressOrder(address);
            } else {
                setCustomerAddressOrder(customer_address);
            }


            const res = await fetch(
                `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/getOldestsOrders/${customer_id}`, {
                    method: "GET", headers: {
                        "Content-Type": "application/json"
                    }
                });
            const data = await res.json();
            if (data.orders && data.orders.length > 0)
            {
                const oldestOrders = data.orders.map(orderItems => ({
                    items: orderItems.items.map(item => {
                        const [name, quantity] = item.split(":").map(s => s.trim());
                        return { name, quantity: parseInt(quantity, 10) };
                    })
                }));


                setOlderOrderItems(oldestOrders);
                console.log("oldestOrders:", olderOrderItems);

            }


        })();
    }, []);



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

    const handleNewItems = (itemsList, store_id) => {
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

        setStoreId(store_id);

    };



    const sendOrder = async () => {

        const coords = await getCoordinates(customerAddressOrder);

        const orderData = {
            storeId: storeId,
            customerName: customerName,
            customerMail: customerMail,
            customerId: customer_id,
            customerLocation: customerAddressOrder,
            customerLat: coords.lat,
            customerLng: coords.lng,
            totalPrice: orderItems.reduce((sum, item) => sum + item.price, 0),
            items: orderItems.map(item => `${item.name}: ${item.quantity}`)
        };

        console.log("Sending order data:", orderData);

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
        <>
            <TopBar
                onLogin={() => console.log("Login clicked")}
                onLogout={() => console.log("Logout clicked")}
                onAddLocation={() => console.log("Add Location clicked")}
            />


            <div className="customer-layout">
                {/* Chat Area */}
                <div className="chat-panel">
                    <h2 className="section-title">🛒 Chat with PrepPal</h2>
                    <OrderChat onNewItem={handleNewItems} customer_id={customer_id} customer_address={customerAddressOrder} />
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

        </>
    );
}
