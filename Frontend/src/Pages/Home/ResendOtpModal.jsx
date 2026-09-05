import React, { useState } from "react";
import api from "../../lib/api";

export default function ResetOtpModal({ onClose, setModal }) {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const email = localStorage.getItem("resetEmail");

  const handleReset = async () => {
    try {
      await api.post("/api/auth/forgot-password", {
        email,
        otp,
        newPassword,
      });
      setMessage("Password reset successful! Please login.");
      localStorage.removeItem("resetEmail");

      setTimeout(() => {
        if (setModal) setModal(null);
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to reset password");
    }
  };

  return (
    <div className="modal">
      <h2>Reset Password</h2>
      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <input
        type="password"
        placeholder="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button onClick={handleReset}>Reset Password</button>
      <p style={{ color: "red" }}>{message}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
