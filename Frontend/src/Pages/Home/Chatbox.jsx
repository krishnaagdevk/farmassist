// import React, { useState } from "react";
// import { sendChat, streamChat } from "../../api/chat";
// import "./Home.css";

// export default function Chatbox({ onClose }) {
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [chatId, setChatId] = useState(null); // ✅ track conversation id

//   const handleSend = async () => {
//     if (!input.trim()) return;
//     const userMessage = { role: "user", content: input };
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");
//     setLoading(true);

//     try {
//       // === 1. Save question via /send ===
//       const res = await sendChat({ message: input });
//       if (res.data.chatId && !chatId) {
//         setChatId(res.data.chatId);
//       }

//       // === 2. Stream AI response ===
//       let aiResponse = { role: "assistant", content: "" };
//       setMessages((prev) => [...prev, aiResponse]);

//       await streamChat(
//         { message: input, chatId: chatId || res.data.chatId },
//         (chunk) => {
//           aiResponse.content += chunk;
//           setMessages((prev) => {
//             const updated = [...prev];
//             updated[updated.length - 1] = { ...aiResponse };
//             return updated;
//           });
//         },
//         () => setLoading(false),
//         (err) => {
//           console.error("Stream error:", err);
//           setLoading(false);
//         }
//       );
//     } catch (err) {
//       console.error("Chat error:", err);
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="chatbox">
//       <div className="chat-header">
//         <h3>AI Chat</h3>
//         <button onClick={onClose}>X</button>
//       </div>

//       <div className="chat-messages">
//         {messages.map((msg, idx) => (
//           <div
//             key={idx}
//             className={`message ${msg.role === "user" ? "user" : "ai"}`}
//           >
//             {msg.content}
//           </div>
//         ))}
//         {loading && <div className="typing">AI is typing...</div>}
//       </div>

//       <div className="chat-input">
//         <input
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           placeholder="Ask your question..."
//         />
//         <button onClick={handleSend} disabled={loading}>
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }
// ************************
import React, { useState } from "react";
import { sendChat, streamChat } from "../../api/chat";
import "./home.css"; // 👉 new CSS file for popup

export default function Chatbox({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null); // ✅ track conversation id

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // === 1. Save question via /send ===
      const res = await sendChat({ message: input });
      if (res.data.chatId && !chatId) {
        setChatId(res.data.chatId);
      }

      // === 2. Stream AI response ===
      let aiResponse = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, aiResponse]);

      await streamChat(
        { message: input, chatId: chatId || res.data.chatId },
        (chunk) => {
          aiResponse.content += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...aiResponse };
            return updated;
          });
        },
        () => setLoading(false),
        (err) => {
          console.error("Stream error:", err);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Chat error:", err);
      setLoading(false);
    }
  };

  return (
    <div className="chatbox-overlay">
      <div className="chatbox-modal">
        <div className="chatbox-header">
          <h3>Ask Your Question</h3>
          <button className="chatbox-close" onClick={onClose}>✖</button>
        </div>

        <div className="chatbox-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message ${msg.role === "user" ? "user" : "ai"}`}
            >
              {msg.content}
            </div>
          ))}
          {loading && <div className="typing">AI is typing...</div>}
        </div>

        <div className="chatbox-input-container">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your farming question here..."
          />
          <button onClick={handleSend} disabled={loading}>
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
}
