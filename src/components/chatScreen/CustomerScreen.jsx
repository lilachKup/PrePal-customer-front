import React, { useState, useEffect, useRef } from "react";
import OrderChat from "./OrderChat";
import CurrentOrder from "./CurrentOrder";
import './CustomerScreen.css';
import TopBar from "../ToolBar/TopBar";
import PreviousOrders from "./PreviousOrders";
import ActiveOrders from "./ActiveOrders";

{/* import TopBar from "./TopBar";*/ }



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


export default function CustomerScreen({ /*customer_id, customerName, customerMail, customer_address*/ }) {
    const [orderItems, setOrderItems] = useState([]);
    const [orderSent, setOrderSent] = useState(false);
    const [customerAddressOrder, setCustomerAddressOrder] = useState(null);
    const chatCreated = useRef(false);
    const [chatId, setChatId] = useState(null);
    const [storeId, setStoreId] = useState(null);
    const [olderOrderItems, setOlderOrderItems] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);

    const [coords, setCoords] = React.useState(null);

    useEffect(() => {
        const userStr = localStorage.getItem("pp_user");
        if (!userStr) {
            console.warn("🔒 No user found, redirecting to login");
            return window.location.href = "/login";
        }

        try {
            const user = JSON.parse(userStr);
            const token = user.idToken;
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                console.warn("🔒 Token expired, redirecting to login");
                localStorage.removeItem("pp_user");
                return window.location.href = "/login";
            }
        } catch (e) {
            console.error("🔒 Invalid token format, redirecting to login");
            localStorage.removeItem("pp_user");
            return window.location.href = "/login";
        }
    }, []);

    const user = (() => {
        try {
            return JSON.parse(localStorage.getItem("pp_user") || "null");
        } catch {
            return null;
        }
    })();

    const customer_id = user?.sub;
    const customerName = user?.name;
    const customerMail = user?.email;
    const customer_address = user?.address;



    /*React.useEffect(() => {
        if (customer_address) {
            getCoordinates(customer_address)
                .then(c => setCoords(c))
                .catch(err => console.error("Geocoding error:", err));
        }
    }, [customerAddress]);*/


    useEffect(() => {
        (async () => {
            try {
                // כתובת למשלוח
                let flag = prompt("do you order to your location that you sigend up? yes/no");
                if (flag === "yes") {
                    const city = prompt("Please enter your city to order:");
                    const street = prompt("Please enter your full address to order (street):");
                    const number = prompt("Please enter your house number:");
                    setCustomerAddressOrder(`${city}, ${street}, ${number}`);
                } else {
                    setCustomerAddressOrder(customer_address);
                }

                // ===== 1) Orders: oldest =====
                const oldestRes = await fetch(
                    `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/getOldestsOrders/${customer_id}`,
                    { method: "GET", headers: { "Content-Type": "application/json" } }
                );
                const oldestJson = await oldestRes.json();
                console.log("oldestOrders raw:", oldestJson);

                const oldestOrdersArr = Array.isArray(oldestJson?.orders) ? oldestJson.orders : [];
                // פרסור גמיש: גם "שם: כמות" וגם אובייקט {name, quantity}
                const parsedOldest = oldestOrdersArr.map((order) => ({
                    items: (order.items || []).map((it) => {
                        if (typeof it === "string") {
                            const [name, quantity] = it.split(":").map((s) => s.trim());
                            return { name, quantity: Number.parseInt(quantity || "1", 10) || 1 };
                        }
                        if (it && typeof it === "object") {
                            return {
                                name: String(it.name ?? it.product ?? "item"),
                                quantity: Number(it.quantity ?? it.qty ?? 1),
                            };
                        }
                        return { name: String(it), quantity: 1 };
                    }),
                }));
                setOlderOrderItems(parsedOldest);

                // ===== 2) Orders: active (תמיד נביא, גם אם אין ישנים)
                const activeRes = await fetch(
                    `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/activeOrders/${customer_id}`,
                    { method: "GET", headers: { "Content-Type": "application/json" } }
                );
                const activeJson = await activeRes.json();
                console.log("activeOrders raw:", activeJson);

                // שמור רק את המערך של ההזמנות (אם זה מה שה־UI מצפה לו)
                setActiveOrders(Array.isArray(activeJson?.orders) ? activeJson.orders : []);

                // אם תרצה לשמור גם count וכו' – שמור אובייקט אחר בסטייט נפרד.
                // setActiveMeta({ count: activeJson.count, customer_id: activeJson.customer_id });

            } catch (e) {
                console.error("load orders failed:", e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {console.log("Rendering CustomerScreen with:", { customer_id, customerName, customerMail, customer_address, customerAddressOrder })}
            <TopBar
                onLogin={() => console.log("Login clicked")}
                onLogout={() => console.log("Logout clicked")}
                onAddLocation={() => console.log("Add Location clicked")}
            />


            <div className="customer-layout">
                <div className="old-orders">
                    <PreviousOrders orders={olderOrderItems} />
                    <ActiveOrders orders={activeOrders} />
                </div>

                {/* Chat Area */}
                <div className="chat-panel">
                    <h2 className="section-title">Chat with PrepPal</h2>
                    <OrderChat onNewItem={handleNewItems} customer_id={customer_id} customer_address={customerAddressOrder} />
                </div>



                {/* Order Area */}
                <div className="order-panel">
                    <h2 className="section-title">Current Order</h2>
                    <CurrentOrder items={orderItems} />
                    <button
                        onClick={sendOrder}
                        className="send-order-btn"
                        disabled={orderItems.length === 0 || orderSent}
                    >
                        {orderSent ? "✅ Order Sent" : "Send Order"}
                    </button>
                </div>
            </div>

        </>
    );
}
