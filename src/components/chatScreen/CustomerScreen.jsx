// src/components/chatScreen/CustomerScreen.jsx
import React, { useState, useEffect, useRef } from "react";
import OrderChat from "./OrderChat";
import CurrentOrder from "./CurrentOrder";
import "./CustomerScreen.css";
import TopBar from "../ToolBar/TopBar";
import PreviousOrders from "./PreviousOrders";
import ActiveOrders from "./ActiveOrders";

// Address validation utils (Israel-only)
import {
    validateILAddress,
    formatAddress,
    geoErrorToMessage,
} from "../utils/checkValidAddress";

// Parse "City, Street, Number" to parts
function parseAddress3(s = "") {
    const parts = String(s).split(",").map(p => p.trim()).filter(Boolean);
    return {
        city: parts[0] || "",
        street: parts[1] || "",
        apt: parts[2] || "", // we don't really use apt here
    };
}

// Normalize yes/no prompt value
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
    const chatCreated = useRef(false);
    const [chatId, setChatId] = useState(null);
    const [storeId, setStoreId] = useState(null);
    const [olderOrderItems, setOlderOrderItems] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);

    // --- session guard ---
    useEffect(() => {
        const userStr = localStorage.getItem("pp_user");
        if (!userStr) {
            console.warn("No user found, redirecting to login");
            window.location.href = "/login";
            return;
        }
        try {
            const user = JSON.parse(userStr);
            const token = user.idToken;
            const payload = JSON.parse(atob(token.split(".")[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                console.warn("Token expired, redirecting to login");
                localStorage.removeItem("pp_user");
                window.location.href = "/login";
            }
        } catch {
            console.error("Invalid token, redirecting to login");
            localStorage.removeItem("pp_user");
            window.location.href = "/login";
        }
    }, []);

    // current user (after the guard above)
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
    const customer_address = user?.address; // string like "City, Street, Number"

    // --- ask delivery address on mount ---
    useEffect(() => {
        if (!customer_address) return; // if no saved address, skip (or you could force entering one)

        (async () => {
            // Ask whether to use saved address
            let initial = prompt("Use your saved signup address? (yes/no)");
            let yn = toYesNo(initial);
            if (!yn) yn = "yes"; // default to saved address

            if (yn === "yes") {
                // Use saved address without forcing validation here
                setCustomerAddressOrder(customer_address);
                setCoords(null); // coords will be resolved on send if needed
                return;
            }

            // yn === "no" → ask for a new address in a loop until valid or user cancels
            // User can type 'cancel' in any prompt to fall back to saved address.
            // All prompts are blocking, so this loop is safe here.
            // We use validateILAddress (Lambda + reverse) to ensure Israel.
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

                const addressStr = formatAddress({
                    city,
                    street: `${street} ${number}`,
                    apt: "",
                });

                try {
                    const { coords: c } = await validateILAddress({
                        city,
                        street: `${street} ${number}`,
                        apt: "",
                    });
                    // Valid in Israel → use it and store coords
                    setCustomerAddressOrder(addressStr);
                    setCoords(c); // {lat, lng}
                    break;
                } catch (err) {
                    alert(geoErrorToMessage(err));
                    // Loop again; user can type 'cancel' in next iteration to fallback
                }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer_address]);

    // --- load orders (oldest + active) ---
    useEffect(() => {
        (async () => {
            try {
                // Oldest orders
                const oldestRes = await fetch(
                    `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/getOldestsOrders/${customer_id}`,
                    { method: "GET", headers: { "Content-Type": "application/json" } }
                );
                const oldestJson = await oldestRes.json();
                const oldestOrdersArr = Array.isArray(oldestJson?.orders) ? oldestJson.orders : [];
                const parsedOldest = oldestOrdersArr.map(order => ({
                    items: (order.items || []).map(it => {
                        if (typeof it === "string") {
                            const [name, quantity] = it.split(":").map(s => s.trim());
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

                // Active orders
                const activeRes = await fetch(
                    `https://fhuufimc4l.execute-api.us-east-1.amazonaws.com/dev/activeOrders/${customer_id}`,
                    { method: "GET", headers: { "Content-Type": "application/json" } }
                );
                const activeJson = await activeRes.json();
                setActiveOrders(Array.isArray(activeJson?.orders) ? activeJson.orders : []);
            } catch (e) {
                console.error("Load orders failed:", e);
            }
        })();
    }, [customer_id]);

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

        // Ensure we have coords. If not (using saved address), resolve them now.
        let coordsToUse = coords;
        if (!coordsToUse) {
            // Try to derive city/street/number from saved string
            const parsed = parseAddress3(customerAddressOrder);
            try {
                const { coords: c } = await validateILAddress({
                    city: parsed.city,
                    street: parsed.street, // may contain "Street name" (could also hold "street + number")
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
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderData),
                }
            );
            const data = await res.json().catch(() => ({}));
            console.log("Order response:", data);
            setOrderSent(true);
        } catch (err) {
            console.error("Send order failed:", err);
            alert("Failed to send order. Please try again.");
        }
    };

    return (
        <>
            {console.log("Rendering CustomerScreen with:", {
                customer_id,
                customerName,
                customerMail,
                customer_address,
                customerAddressOrder,
                coords,
            })}
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
                    <OrderChat
                        onNewItem={handleNewItems}
                        customer_id={customer_id}
                        customer_address={customerAddressOrder}
                    />
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
