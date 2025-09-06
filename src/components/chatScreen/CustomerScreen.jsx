// src/components/chatScreen/CustomerScreen.jsx
import React, {useState, useEffect, useRef} from "react";
import OrderChat from "./OrderChat";
import CurrentOrder from "./CurrentOrder";
import "./CustomerScreen.css";
import TopBar from "../ToolBar/TopBar";
import PreviousOrders from "./PreviousOrders";
import ActiveOrders from "./ActiveOrders";

// Israel-only address validation utils
import {
    validateILAddress,
    formatAddress,
    geoErrorToMessage,
} from "../utils/checkValidAddress";

// Parse "City, Street, Number" into parts
function parseAddress3(s = "") {
    const parts = String(s).split(",").map(p => p.trim()).filter(Boolean);
    return {city: parts[0] || "", street: parts[1] || "", apt: parts[2] || ""};
}

// Normalize yes/no
function toYesNo(str) {
    if (!str) return null;
    const v = String(str).trim().toLowerCase();
    if (["y", "yes"].includes(v)) return "yes";
    if (["n", "no"].includes(v)) return "no";
    return null;
}

export default function CustomerScreen() {
    const [orderItems, setOrderItems] = useState([]);
    const [orderSent, setOrderSent] = useState(false);
    const [customerAddressOrder, setCustomerAddressOrder] = useState(null);
    const [coords, setCoords] = useState(null); // {lat, lng} when validated
    const [chatId, setChatId] = useState(null);
    const [storeId, setStoreId] = useState(null);
    const [olderOrderItems, setOlderOrderItems] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const chatPanelRef = useRef(null);
    const [chatPrefill, setChatPrefill] = useState("");
    const [chatKey, setChatKey] = useState(1);
    const [startingChatId, setStartingChatId] = useState("");
    const [newChat, setNewChat] = useState(true);
    const handleProfileSaved = (u) => {
        setCustomerAddressOrder(u?.address || null); // הכתובת החדשה
        setCoords(null);                              // נכריח ולידציה מחדש אם צריך
    };

    const startNewChat = async (addrOverride) => {
        try {
            // clear order
            setOrderItems([]);
            setOrderSent(false);
            setStoreId(null);

            // clear local chat
            localStorage.removeItem("pp_chat_id");
            setChatPrefill("");

            // ⬅️ משתמשים קודם כל בכתובת שהועברה מבחוץ (addrOverride),
            // ואם אין – בכתובת המעודכנת ב-state, ואם גם אין – בכתובת מה־localStorage.
            const addressToUse = addrOverride ?? customerAddressOrder ?? customer_address ?? "";

            const res = await fetch(
                `https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/client/createchat?client_id=${customer_id}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address: addressToUse }),
                }
            );

            const json = await res.json();
            const newId = json?.chat_id || "";
            if (newId) {
                localStorage.setItem("pp_chat_id", newId);
                setStartingChatId(newId);
            } else {
                setStartingChatId("");
            }

            setChatKey(prev => prev + 1); // force re-mount
            chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
            console.error("Start new chat failed:", err);
        }
    };

    const loadOrderToChat = (arg) => {

        const order = Array.isArray(arg?.items) ? arg : arg?.order;
        const explicitText = arg?.chatText;

        let line = explicitText;
        if (!line && order) {
            const parts = (order.items || []).map((it) => {
                if (typeof it === "string") {
                    const [name, qty] = it.split(":").map(s => String(s || "").trim());
                    return `${name} x ${qty || 1}`;
                }
                const name = String(it?.name ?? it?.product ?? "item");
                const qty = Number(it?.quantity ?? it?.qty ?? 1);
                return `${name} x ${qty}`;
            });
            line = parts.join(", ");
        }

        setChatPrefill(line ? `Please add: ${line}` : "");
        // Do NOT setOrderItems here – user will send to the bot first
        chatPanelRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    };

    // Session guard
    useEffect(() => {
        const userStr = localStorage.getItem("pp_user");
        if (!userStr) {
            window.location.href = "/login";
            return;
        }
        try {
            const user = JSON.parse(userStr);
            const token = user.idToken;
            const payload = JSON.parse(atob(token.split(".")[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                localStorage.removeItem("pp_user");
                window.location.href = "/login";
            }
        } catch {
            localStorage.removeItem("pp_user");
            window.location.href = "/login";
        }
    }, []);

    // Current user (after guard)
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

    // Ask for delivery address on mount
    useEffect(() => {
        if (!customer_address) return;
        (async () => {
            if (newChat) {
                setNewChat(false);
                let initial = prompt("Use your saved signup address? (yes/no)");
                let yn = toYesNo(initial);
                if (!yn) yn = "yes";

                if (yn === "yes") {
                    setCustomerAddressOrder(customer_address);
                    setCoords(null);
                    return;
                }

                // Ask until valid address in Israel or user cancels to saved address
                while (true) {
                    const city = prompt("Enter city (required) or type 'cancel' to use saved address:");
                    if (city === null || String(city).trim().toLowerCase() === "cancel") {
                        setCustomerAddressOrder(customer_address);
                        setCoords(null);
                        break;
                    }

                    const street = prompt("Enter street name (e.g., Herzl). Type 'cancel' to use saved address:");
                    if (street === null || String(street).trim().toLowerCase() === "cancel") {
                        setCustomerAddressOrder(customer_address);
                        setCoords(null);
                        break;
                    }

                    const number = prompt("Enter house number. Type 'cancel' to use saved address:");
                    if (number === null || String(number).trim().toLowerCase() === "cancel") {
                        setCustomerAddressOrder(customer_address);
                        setCoords(null);
                        break;
                    }

                    const addressStr = formatAddress({city, street: `${street} ${number}`, apt: ""});

                    try {
                        const {coords: c} = await validateILAddress({
                            city,
                            street: `${street} ${number}`,
                            apt: "",
                        });
                        setCustomerAddressOrder(addressStr);
                        setCoords(c);
                        break;
                    } catch (err) {
                        alert(geoErrorToMessage(err));
                    }
                }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer_address]);

    // Load previous + active orders
    useEffect(() => {
        (async () => {
            try {
                const oldestRes = await fetch(
                    `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/getOldestsOrders/${customer_id}`,
                    {method: "GET", headers: {"Content-Type": "application/json"}}
                );
                const oldestJson = await oldestRes.json();
                const oldestOrdersArr = Array.isArray(oldestJson?.orders) ? oldestJson.orders : [];
                const parsedOldest = oldestOrdersArr.map(order => ({
                    items: (order.items || []).map(it => {
                        if (typeof it === "string") {
                            const [name, quantity] = it.split(":").map(s => s.trim());
                            return {name, quantity: Number.parseInt(quantity || "1", 10) || 1};
                        }
                        if (it && typeof it === "object") {
                            return {
                                name: String(it.name ?? it.product ?? "item"),
                                quantity: Number(it.quantity ?? it.qty ?? 1),
                            };
                        }
                        return {name: String(it), quantity: 1};
                    }),
                }));
                setOlderOrderItems(parsedOldest);

                const activeRes = await fetch(
                    `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/activeOrders/${customer_id}`,
                    {method: "GET", headers: {"Content-Type": "application/json"}}
                );
                const activeJson = await activeRes.json();
                setActiveOrders(Array.isArray(activeJson?.orders) ? activeJson.orders : []);
            } catch (e) {
                console.error("Load orders failed:", e);
            }
        })();
    }, [customer_id]);

    // Bot returned items -> now we do update Current Order
    const handleNewItems = (itemsList, store_id) => {
        if (!Array.isArray(itemsList)) return;
        const newItems = itemsList.map(item => ({
            name: item.Name,
            image: item.Image || "https://img.icons8.com/ios-filled/50/cccccc/shopping-cart.png",
            quantity: item.Quantity,
            price: parseFloat(item.Price) * parseInt(item.Quantity, 10),
        }));
        setOrderItems(newItems);
        setStoreId(store_id);
    };

    const sendOrder = async () => {
        if (!customerAddressOrder) {
            alert("Missing delivery address.");
            return;
        }

        // Ensure coords exist
        let coordsToUse = coords;
        if (!coordsToUse) {
            const parsed = parseAddress3(customerAddressOrder);
            try {
                const {coords: c} = await validateILAddress({
                    city: parsed.city,
                    street: parsed.street,
                    apt: parsed.apt,
                });
                coordsToUse = c;
            } catch (err) {
                alert(geoErrorToMessage(err));
                return;
            }
        }

        const orderData = {
            storeId,
            customerName,
            customerMail,
            customerId: customer_id,
            customerLocation: customerAddressOrder,
            customerLat: coordsToUse.lat,
            customerLng: coordsToUse.lng,
            totalPrice: orderItems.reduce((sum, item) => sum + item.price, 0),
            items: orderItems.map(item => `${item.name}: ${item.quantity}`),
        };

        try {
            const res = await fetch(
                "https://yv6baxe2i0.execute-api.us-east-1.amazonaws.com/dev/addOrderToStore",
                {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(orderData),
                }
            );
            await res.json().catch(() => ({}));
            setOrderSent(true);
        } catch (err) {
            console.error("Send order failed:", err);
            alert("Failed to send order. Please try again.");
        }
    };

    return (
        <>
            <TopBar
                onLogin={() => console.log("Login clicked")}
                onLogout={() => console.log("Logout clicked")}
                onAddLocation={() => console.log("Add Location clicked")}
                onNewChat={startNewChat}
                onProfileSaved={handleProfileSaved}
            />

            <div className="customer-layout">
                <div className="old-orders">
                    <PreviousOrders
                        orders={olderOrderItems}
                        onSelectOrder={loadOrderToChat}
                    />
                    <ActiveOrders orders={activeOrders}/>
                </div>

                {/* Chat Area */}
                <div className="chat-panel" ref={chatPanelRef}>
                    <h2 className="section-title">Chat with PrepPal</h2>
                    <OrderChat
                        key={chatKey}
                        onNewItem={handleNewItems}
                        customer_id={customer_id}
                        customer_address={customerAddressOrder}
                        prefillText={chatPrefill}
                        startingChatId={startingChatId}
                    />
                </div>

                {/* Order Area */}
                <div className="order-panel">
                    <h2 className="section-title">Current Order</h2>
                    <CurrentOrder items={orderItems}/>
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
