import { useState } from "react";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "👋 Hi! I’m your AI Stock Assistant. Ask me about market trends, top gainers, or your portfolio."
    }
  ]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { sender: "user", text: input }]);

    try {
      const res = await fetch("http://localhost:8000/ai/chat/simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });

      const data = await res.json();

      setMessages(prev => [...prev, { sender: "bot", text: data.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "⚠️ Server error. Try again." }
      ]);
    }

    setInput("");
  };

  return (
    <>
      {/* FLOATING AI BUTTON */}
      <div className="chatbot-fab" onClick={() => setOpen(true)}>
        🤖
      </div>

      {/* CHATBOT PANEL */}
      {open && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <span>🤖 AI Stock Assistant</span>
            <button onClick={() => setOpen(false)}>✖</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.sender}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="chatbot-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about stocks, market, portfolio..."
              onKeyDown={e => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
