import React, { useState } from "react";
import { sendOtp } from "../../api/auth";

export default function ForgotPasswordModal({ onClose, setModal }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async () => {
    try {
      const res = await sendOtp({ email });
      localStorage.setItem("resetEmail", email);
      setMessage(res.data.message || "OTP sent to your email!");
      setModal("resetOtp"); // go to OTP modal
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
