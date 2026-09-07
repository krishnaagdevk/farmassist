import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import "./LoginModal.css";

export default function LoginModal({ mode = "login", initialRole = "farmer", onClose }) {
  const [currentMode, setCurrentMode] = useState(mode);
  const { login } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: initialRole === "bulk" ? "buyer" : initialRole || "farmer",
    buyerType: initialRole === "bulk" ? "bulk" : "consumer",
    otp: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    } else {
      navigate("/home");
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = value;
      setOtpValues(newOtpValues);
      const combined = newOtpValues.join("");
      setForm((prev) => ({ ...prev, otp: combined }));

      // Auto focus next input
      if (value && index < 5) {
        const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const startOtpTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setOtpTimer(30);
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 6000);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const getRedirectPathForUser = (userObj) => {
    const role = userObj?.role || "buyer";
    switch (role) {
      case "farmer":
        return "/farmer";
      case "fpo":
        return "/fpo";
      case "driver":
        return "/driver";
      case "admin":
        return "/dispatch";
      case "buyer":
      default:
        return userObj?.buyerType === "bulk" ? "/bulk" : "/market";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (currentMode === "signup") {
        if (!otpSent) {
          // Validate signup fields
          if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password.trim()) {
            throw new Error("All fields are required.");
          }
          if (form.password.length < 6) {
            throw new Error("Password must be at least 6 characters.");
          }

          await api.post("/api/auth/send-otp", {
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            name: form.name.trim(),
            password: form.password,
            role: form.role,
            mode: "signup",
          });

          setOtpSent(true);
          startOtpTimer();
          showSuccess("Verification OTP dispatched to your email! Enter below to proceed.");
        } else {
          // Verify signup OTP
          if (form.otp.length !== 6) {
            throw new Error("Please enter the complete 6-digit OTP.");
          }

          const res = await api.post("/api/auth/signup", {
            email: form.email.trim().toLowerCase(),
            otp: form.otp.trim(),
          });

          const { user: userObj, token } = res.data;
          login(userObj, token);
          showSuccess(`Welcome ${userObj.name}! Setting up your ${userObj.role.toUpperCase()} portal...`);

          setTimeout(() => {
            handleClose();
            navigate(getRedirectPathForUser(userObj));
          }, 800);
        }
      } else {
        // Universal Login
        if (!form.email.trim() || !form.password.trim()) {
          throw new Error("Email and password are required.");
        }

        const res = await api.post("/api/auth/login", {
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });

        const { user: userObj, token } = res.data;
        login(userObj, token);
        showSuccess(`Welcome back, ${userObj.name || "User"}! Logging you in...`);

        setTimeout(() => {
          handleClose();
          navigate(getRedirectPathForUser(userObj));
        }, 600);
      }
    } catch (err) {
      console.error("Auth error:", err);
      let errorMsg = "Authentication failed. Please check details.";

      if (err.response?.data?.error) {
        const backendError = err.response.data.error;
        switch (backendError) {
          case "email_and_password_required":
            errorMsg = "Please enter both your registered email and password.";
            break;
          case "user_not_found":
          case "farmer_not_found":
            errorMsg = "No account found with this email. Please sign up first.";
            break;
          case "invalid_password":
            errorMsg = "Incorrect password. Please try again.";
            break;
          case "user_already_exists":
            errorMsg = "An account with this email already exists. Please log in.";
            break;
          case "otp_mismatch":
            errorMsg = "Invalid OTP code entered. Please re-check.";
            break;
          case "otp_expired":
            errorMsg = "OTP code has expired. Please request a new code.";
            break;
          case "no_otp_session":
            errorMsg = "OTP session expired. Please send OTP again.";
            break;
          case "too_many_failed_attempts":
            errorMsg = "Too many failed attempts. Please request a new OTP.";
            break;
          case "too_many_otp_requests_try_later":
            errorMsg = "Too many OTP requests. Please wait a few minutes.";
            break;
          default:
            errorMsg = backendError.replace(/_/g, " ");
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.post("/api/auth/send-otp", {
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        name: form.name.trim(),
        password: form.password,
        role: form.role,
        mode: "signup",
      });

      startOtpTimer();
      showSuccess("New OTP sent to your registered email!");
    } catch (err) {
      console.error("Resend OTP error:", err);
      showError(err.response?.data?.error || "Failed to resend OTP.");
    }
  };

  const renderSignupForm = () => (
    <div className="auth-container">
      <div className="auth-modal">
        <div className="auth-left">
          <h1 className="auth-title">Sign Up</h1>
          <p className="auth-subtitle">Join AgriDirect's Indian Agricultural Marketplace</p>

          {errorMessage && (
            <div className="message error-message">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="message success-message">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Select Marketplace Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                style={{ fontWeight: "600", cursor: "pointer" }}
              >
                <option value="farmer">🌾 Kisan / Farmer Producer</option>
                <option value="fpo">🏢 FPO Federation (Aggregation Cluster)</option>
                <option value="buyer">🛍️ Consumer / Bulk Procurement Buyer</option>
                <option value="driver">🚚 Logistics & Fleet Driver</option>
              </select>
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Ramesh Kumar / Sahyadri FPO"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="e.g. ramesh.kisan@gmail.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number (India)</label>
              <input
                type="tel"
                name="phone"
                placeholder="e.g. +91 98765 43210"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a strong password (min 6 chars)"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <p className="auth-switch">
              Already registered on AgriDirect?{" "}
              <button type="button" onClick={() => setCurrentMode("login")}>
                Login here
              </button>
            </p>

            <button type="submit" className="auth-button primary" disabled={loading}>
              {loading ? "Sending OTP..." : "Continue to Verification (Send OTP)"}
            </button>

            <button
              type="button"
              className="auth-button secondary"
              onClick={() => setCurrentMode("login")}
            >
              Switch to Login
            </button>
          </form>
        </div>

        <div className="auth-right">
          <div className="auth-image"></div>
        </div>

        <button className="close-modal" onClick={handleClose} title="Close">
          ×
        </button>
      </div>
    </div>
  );

  const renderLoginForm = () => (
    <div className="auth-container">
      <div className="auth-modal">
        <div className="auth-left">
          <h1 className="auth-title">Login</h1>
          <p className="auth-subtitle">Welcome back to AgriDirect Digital Marketplace</p>

          {errorMessage && (
            <div className="message error-message">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="message success-message">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your registered email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <p className="auth-switch">
              New to AgriDirect?{" "}
              <button type="button" onClick={() => setCurrentMode("signup")}>
                Create an account
              </button>
            </p>

            <button type="submit" className="auth-button primary" disabled={loading}>
              {loading ? "Verifying credentials..." : "Sign In"}
            </button>

            <button
              type="button"
              className="auth-button secondary"
              onClick={() => setCurrentMode("signup")}
            >
              Register New Entity
            </button>
          </form>
        </div>

        <div className="auth-right">
          <div className="auth-image"></div>
        </div>

        <button className="close-modal" onClick={handleClose} title="Close">
          ×
        </button>
      </div>
    </div>
  );

  const renderOtpForm = () => (
    <div className="auth-container">
      <div className="auth-modal otp-modal">
        <div className="auth-left">
          <h1 className="auth-title">Verify OTP</h1>
          <p className="auth-subtitle">Enter the 6-digit code sent to your email address</p>

          <div className="otp-email">{form.email}</div>

          {errorMessage && (
            <div className="message error-message">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="message success-message">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: "15px" }}>
            <div className="otp-inputs">
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  type="text"
                  name={`otp-${index}`}
                  maxLength="1"
                  value={value}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="otp-input"
                />
              ))}
            </div>

            <div className="otp-timer">
              {otpTimer > 0 ? `Resend OTP in ${otpTimer} seconds` : ""}
            </div>

            <button
              type="submit"
              className="auth-button primary"
              disabled={loading || form.otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify & Create Account"}
            </button>

            <button
              type="button"
              className="auth-button secondary"
              onClick={resendOtp}
              disabled={otpTimer > 0 || loading}
            >
              Resend OTP
            </button>

            <button
              type="button"
              className="auth-button"
              style={{ background: "#e2e8f0", color: "#334155" }}
              onClick={() => {
                setOtpSent(false);
                setOtpValues(["", "", "", "", "", ""]);
                setForm((prev) => ({ ...prev, otp: "" }));
              }}
            >
              ← Edit Details
            </button>
          </form>
        </div>

        <div className="auth-right">
          <div className="auth-image"></div>
        </div>

        <button className="close-modal" onClick={handleClose} title="Close">
          ×
        </button>
      </div>
    </div>
  );

  if (otpSent && currentMode === "signup") {
    return renderOtpForm();
  }

  if (currentMode === "signup") {
    return renderSignupForm();
  }

  return renderLoginForm();
}
