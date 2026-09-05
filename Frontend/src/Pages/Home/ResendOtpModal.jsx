import React, { useState } from "react";
import { farmerForgotPassword } from "../../api/auth";

export default function ResetOtpModal({ onClose, setModal }) {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const email = localStorage.getItem("resetEmail");

  const handleReset = async () => {
    try {
      const res = await farmerForgotPassword({
        email,
        otp,
        newPassword,
      });
      setMessage("Password reset successful! Please login.");
      localStorage.removeItem("resetEmail");

      // ✅ Redirect back to login form
      setTimeout(() => {
        setModal(null);
        onClose();
      }, 2000);
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
