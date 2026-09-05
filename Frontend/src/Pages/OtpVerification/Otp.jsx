import React, { useState } from "react";
import { farmerSignup } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import "./Otp.css";

export default function OtpVerify() {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem("pendingUser"));

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
  };

  const handleVerify = async () => {
    try {
      const res = await farmerSignup({ email: userData.email, otp: otp.join(""), });
      localStorage.removeItem("pendingUser");
      localStorage.setItem("token", res.data.token);
      setMessage("Signup successful!");
      navigate("/dashboard");
    } catch (err) {
      setMessage(err.response?.data?.error || "OTP verification failed");
    }
  };

  return (
    <div className="main-container">
      <div className="left-panel">
        <div className="form-box otp-form active">
          <h2>Verify OTP</h2>
          <p>Enter the 6-digit code sent to {userData?.email}</p>
          <div className="otp-input-group">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength="1"
                className="otp-input"
                value={digit}
                onChange={(e) => handleChange(e, idx)}
              />
            ))}
          </div>
          <button className="verify-btn" onClick={handleVerify}>Verify OTP</button>
          <p style={{ color: "red" }}>{message}</p>
        </div>
      </div>
      <div className="right-panel">
        <div className="image-box active">
          <img src="/farmer.png" alt="Farmer" />
        </div>
      </div>
    </div>
  );
}
