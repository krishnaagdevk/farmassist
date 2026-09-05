import api from "../lib/api";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? "http://localhost:5000" : "");

// send a question
export const sendChat = (data) => api.post("/api/chat/send", data);

// stream AI response (SSE)
export const streamChat = async (data, onMessage, onComplete, onError) => {
  try {
    const base = API_BASE.replace(/\/$/, "");
    const url = new URL(`${base}/api/chat/stream`);
    url.search = new URLSearchParams(data).toString();

    const token = localStorage.getItem("token");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (onComplete) onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (const part of parts) {
        if (part.startsWith("data:")) {
          try {
            const payload = JSON.parse(part.replace("data:", "").trim());
            if (payload.delta) onMessage(payload.delta);
            if (payload.done && onComplete) onComplete();
          } catch (err) {
            console.error("Stream parse error:", err, part);
          }
        }
      }
    }
  } catch (err) {
    if (onError) onError(err);
  }
};
