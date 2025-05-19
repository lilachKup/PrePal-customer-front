import React, { useState, useRef, useEffect } from "react";
import './OrderChat.css';

const OrderChat = ({ onNewItem, customer_id }) => {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatId, setChatId] = useState("");
  const [isNewChat, setIsNewChat] = useState(true);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    console.log("👤 customer_id prop:", customer_id);

    if (!customer_id) {
      console.warn("⚠️ Missing customer_id! Make sure it's passed correctly from CustomerScreen.");
    }
  }, [customer_id]);

  useEffect(() => {
    scrollToBottom();
  }, [chatLog]);

  const scrollToBottom = () => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = { role: "user", content: message };
    setMessage("");
    setChatLog(prev => [...prev, userMessage, { role: "bot-typing" }]);
    setIsBotTyping(true);

    try {
      let currentChatId = chatId;

      if (isNewChat) {
        const initRes = await fetch("https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/client/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: customer_id,
            create_chat: true
          })
        });

        const initData = await initRes.json();
        currentChatId = initData.chat_id;
        setChatId(currentChatId);
        setIsNewChat(false);
        console.log("🆕 New chat started:", currentChatId);
      }

      const res = await fetch("https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/client/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: currentChatId,
          client_id: customer_id,
          message: userMessage.content,
          create_chat: false
        })
      });

      await new Promise(resolve => setTimeout(resolve, 700)); // delay for realism
      const data = await res.json();
      console.log("📦 Full Response:", data);

      const botMessage = data.message || data.response?.message || data.choices?.[0]?.message?.content;

      if (botMessage) {
        setChatLog(prev => [
          ...prev.slice(0, -1),
          { role: "bot", content: botMessage }
        ]);
      } else {
        setChatLog(prev => [
          ...prev.slice(0, -1),
          { role: "bot", content: "I'm here, but didn't get a response. Try again!" }
        ]);
      }

      let products = data.products;

      if (!Array.isArray(products) && typeof products === "string") {
        try {
          products = JSON.parse(products);
        } catch (e) {
          console.error("❌ Failed to parse products string:", products);
          products = [];
        }
      }

      if (Array.isArray(products)) {
        console.log("📤 calling onNewItem with:", products);
        onNewItem(products);
      } else {
        console.warn("⚠️ products is missing or not an array:", products);
      }

    } catch (error) {
      console.error("Chat error:", error);
      setChatLog(prev => [
        ...prev.slice(0, -1),
        { role: "bot", content: "⚠️ Something went wrong. Please try again." }
      ]);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <div>
      <div className="chat-box" ref={chatBoxRef}>
        {chatLog.map((msg, i) => (
          <div
            key={i}
            className={msg.role === "user" ? "chat-row user" : "chat-row bot"}
          >
            {msg.role === "bot-typing" ? (
              <div className="msg-box typing-indicator">
                <span></span><span></span><span></span>
              </div>
            ) : (
              <div className="msg-box">{msg.content}</div>
            )}
          </div>
        ))}
      </div>
      <div className="chat-input-container">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type your order..."
          className="chat-input"
        />
        <button
          onClick={handleSend}
          className={`chat-send-btn ${isBotTyping ? "disabled-btn" : ""}`}
          disabled={isBotTyping}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default OrderChat;
