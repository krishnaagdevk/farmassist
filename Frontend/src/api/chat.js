import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/chat",
});

// Automatically attach token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// send a question
export const sendChat = (data) => API.post("/send", data);

// stream AI response (SSE)
export const streamChat = async (data, onMessage, onComplete, onError) => {
  try {
    const url = new URL("http://localhost:5000/api/chat/stream");
    url.search = new URLSearchParams(data).toString();

    const token = localStorage.getItem("token");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,   // ✅ add JWT here
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
