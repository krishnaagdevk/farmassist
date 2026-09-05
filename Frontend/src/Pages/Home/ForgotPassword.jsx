import React, { useState } from "react";
import api from "../../lib/api";

export default function ForgotPasswordModal({ onClose, setModal }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async () => {
    try {
      const res = await api.post("/api/auth/send-otp", { email, mode: "forgot" });
      localStorage.setItem("resetEmail", email);
      setMessage(res.data.message || "OTP sent to your email!");
      setModal("resetOtp");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to send OTP");
    }
  };

  return (
    <div className="modal">
      <h2>Forgot Password</h2>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleSendOtp}>Send OTP</button>
      <p style={{ color: "red" }}>{message}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
