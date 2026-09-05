// import React, { useState } from "react";
// import { farmerLogin, farmerSignup, sendOtp } from "../../api/auth";
// import { useNavigate } from "react-router-dom";
// import "./LoginModal.css";
// // function LoginModal({ mode = "login", onClose }) {
// //   const [form, setForm] = useState({
// //     name: "",
// //     phone: "",
// //     email: "",
// //     password: "",
// //     otp: "",
// //   });
// // ****
// function LoginModal({ mode = "login", onClose }) {
//   const [currentMode, setCurrentMode] = useState(mode);
//   const [form, setForm] = useState({
//     name: "",
//     phone: "",
//     email: "",
//     password: "",
//     otp: "",
//   });
//   // ***
//   // const [otpSent, setOtpSent] = useState(false); // track OTP step
//   // const [loading, setLoading] = useState(false);

//   // const handleChange = (e) => {
//   //   setForm({ ...form, [e.target.name]: e.target.value });
//   // };
//   // *********
//     const [otpSent, setOtpSent] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [otpTimer, setOtpTimer] = useState(0);
//   const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
//   const navigate = useNavigate();

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       if (mode === "signup") {
//         if (!otpSent) {
//           // Step 1: send OTP
//           await sendOtp({
//             email: form.email,
//             phone: form.phone,
//             name: form.name,
//             password: form.password,
//             role: "farmer",
//           });
//           alert("OTP sent to your email/phone. Enter it below.");
//           setOtpSent(true);
//         } else {
//           // Step 2: complete signup with OTP
//           await farmerSignup({
//             email: form.email,
//             phone: form.phone,
//             name: form.name,
//             password: form.password,
//             otp: form.otp,
//           });
//           alert("Signup successful! You can now log in.");
//           setOtpSent(false);
//           onClose();
//         }
//       } else {
//         // Login
//         const res = await farmerLogin({
//           email: form.email,
//           password: form.password,
//         });
//         localStorage.setItem("token", res.data.token);
//         alert("Login successful!");
//         onClose();
//       }
//     } catch (err) {
//       alert(err.response?.data?.error || "Something went wrong");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="modal">
//       <div className="modal-content">
//         <h2>{mode === "signup" ? "Farmer Sign Up" : "Farmer Login"}</h2>

//         <form onSubmit={handleSubmit}>
//           {mode === "signup" && (
//             <>
//               <input
//                 name="name"
//                 placeholder="Full Name"
//                 value={form.name}
//                 onChange={handleChange}
//                 required
//               />
//               <input
//                 name="phone"
//                 placeholder="Phone"
//                 value={form.phone}
//                 onChange={handleChange}
//                 required
//               />
//             </>
//           )}

//           <input
//             name="email"
//             type="email"
//             placeholder="Email"
//             value={form.email}
//             onChange={handleChange}
//             required
//           />

//           <input
//             name="password"
//             type="password"
//             placeholder="Password"
//             value={form.password}
//             onChange={handleChange}
//             required
//           />

//           {mode === "signup" && otpSent && (
//             <input
//               name="otp"
//               placeholder="Enter OTP"
//               value={form.otp}
//               onChange={handleChange}
//               required
//             />
//           )}

//           <button type="submit" disabled={loading}>
//             {loading
//               ? "Please wait..."
//               : mode === "signup"
//               ? otpSent
//                 ? "Complete Signup"
//                 : "Send OTP"
//               : "Login"}
//           </button>
//         </form>

//         <button onClick={onClose} className="close-btn">
//           Close
//         </button>
//       </div>
//     </div>
//   );
// }

// export default LoginModal;
import React, { useState } from "react";
import { farmerLogin, farmerSignup, sendOtp } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import "./LoginModal.css";

function LoginModal({ mode = "login", onClose }) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    otp: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = value;
      setOtpValues(newOtpValues);
      setForm({ ...form, otp: newOtpValues.join('') });
      
      // Auto focus next input
      if (value && index < 5) {
        const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const startOtpTimer = () => {
    setOtpTimer(28);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(""), 5000);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (currentMode === "signup") {
        if (!otpSent) {
          // Validate form fields
          if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password.trim()) {
            throw new Error("All fields are required");
          }
          
          if (form.password.length < 6) {
            throw new Error("Password must be at least 6 characters");
          }

          const response = await sendOtp({
            email: form.email,
            phone: form.phone,
            name: form.name,
            password: form.password,
            role: "farmer",
          });
          
          setOtpSent(true);
          startOtpTimer();
          showSuccess("OTP sent to your email successfully!");
        } else {
          // Complete signup with OTP
          if (form.otp.length !== 6) {
            throw new Error("Please enter complete 6-digit OTP");
          }

          const response = await farmerSignup({
            email: form.email,
            phone: form.phone,
            name: form.name,
            password: form.password,
            otp: form.otp,
          });
          
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("user", JSON.stringify(response.data.user));
          showSuccess("Account created successfully! Redirecting to dashboard...");
          
          setTimeout(() => {
            navigate("/dashboard");
            onClose();
          }, 1500);
        }
      } else {
        // Login
        if (!form.email.trim() || !form.password.trim()) {
          throw new Error("Email and password are required");
        }

        const response = await farmerLogin({
          email: form.email,
          password: form.password,
        });
        
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        showSuccess("Login successful! Redirecting to dashboard...");
        
        setTimeout(() => {
          navigate("/dashboard");
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error("Auth error:", err);
      
      // Handle different types of errors
      let errorMsg = "Something went wrong. Please try again.";
      
      if (err.response?.status === 500) {
        errorMsg = "Server error. Please check if backend is running.";
      } else if (err.response?.data?.error) {
        // Handle backend error messages
        const backendError = err.response.data.error;
        switch (backendError) {
          case "email_and_password_required":
            errorMsg = "Email and password are required.";
            break;
          case "farmer_not_found":
            errorMsg = "No farmer account found with this email.";
            break;
          case "invalid_password":
            errorMsg = "Incorrect password. Please try again.";
            break;
          case "user_already_exists":
            errorMsg = "Account already exists with this email.";
            break;
          case "otp_mismatch":
            errorMsg = "Invalid OTP. Please try again.";
            break;
          case "otp_expired":
            errorMsg = "OTP has expired. Please request a new one.";
            break;
          case "no_otp_session":
            errorMsg = "OTP session expired. Please start over.";
            break;
          default:
            errorMsg = backendError.replace(/_/g, ' ');
        }
      } else if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
        errorMsg = "Cannot connect to server. Please make sure the backend is running.";
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
      await sendOtp({
        email: form.email,
        phone: form.phone,
        name: form.name,
        password: form.password,
        role: "farmer",
      });
      
      startOtpTimer();
      setOtpValues(["", "", "", "", "", ""]);
      setForm({ ...form, otp: "" });
      showSuccess("New OTP sent to your email!");
    } catch (err) {
      console.error("Resend OTP error:", err);
      let errorMsg = "Failed to resend OTP. Please try again.";
      
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error.replace(/_/g, ' ');
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      showError(errorMsg);
    }
  };

  const renderSignupForm = () => (
    <div className="auth-container">
      <div className="auth-modal">
        <div className="auth-left">
          <h1 className="auth-title">Signup</h1>
          <p className="auth-subtitle">Create your Farm assist account</p>
          
          {errorMessage && (
            <div className="message error-message">
              <i className="fas fa-exclamation-circle"></i>
              {errorMessage}
            </div>
          )}
          
          {successMessage && (
            <div className="message success-message">
              <i className="fas fa-check-circle"></i>
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
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
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="Enter your phone number"
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
                  placeholder="Create a password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  👁️
                </button>
              </div>
            </div>
            
            <p className="auth-switch">
              Already have an account? <button type="button" onClick={() => setCurrentMode("login")}>Login</button>
            </p>
            
            <button type="submit" className="auth-button primary" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
            
            <button type="button" className="auth-button secondary" onClick={() => setCurrentMode("login")}>
              Login
            </button>
          </form>
        </div>
        
        <div className="auth-right">
          <div className="auth-image"></div>
        </div>
        
        <button className="close-modal" onClick={onClose}>×</button>
      </div>
    </div>
  );

  const renderLoginForm = () => (
    <div className="auth-container">
      <div className="auth-modal">
        <div className="auth-left">
          <h1 className="auth-title">Login</h1>
          <p className="auth-subtitle">Access your Farm assist account</p>
          
          {errorMessage && (
            <div className="message error-message">
              <i className="fas fa-exclamation-circle"></i>
              {errorMessage}
            </div>
          )}
          
          {successMessage && (
            <div className="message success-message">
              <i className="fas fa-check-circle"></i>
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>User Name</label>
              <input
                type="email"
                name="email"
                placeholder="Enter Username"
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
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  👁️
                </button>
              </div>
            </div>
            
            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" />
                <span className="checkmark"></span>
                I'm not a robot
              </label>
              
              <a href="#" className="forgot-password">Forgot Password</a>
            </div>
            
            <p className="auth-switch">
              Don't have an account? <button type="button" onClick={() => setCurrentMode("signup")}>Signup</button>
            </p>
            
            <button type="submit" className="auth-button primary" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
            
            <button type="button" className="auth-button secondary" onClick={() => setCurrentMode("signup")}>
              Signup
            </button>
          </form>
        </div>
        
        <div className="auth-right">
          <div className="auth-image"></div>
        </div>
        
        <button className="close-modal" onClick={onClose}>×</button>
      </div>
    </div>
  );

  const renderOtpForm = () => (
    <div className="auth-container">
      <div className="auth-modal otp-modal">
        <div className="auth-left">
          <h1 className="auth-title">Verify OTP</h1>
          <p className="auth-subtitle">Enter the 6-digit code sent to your email address</p>
          
          <div className="otp-email">{form.email.replace(/(.{3}).*(@.*)/, '$1***$2')}</div>
          
          {errorMessage && (
            <div className="message error-message">
              <i className="fas fa-exclamation-circle"></i>
              {errorMessage}
            </div>
          )}
          
          {successMessage && (
            <div className="message success-message">
              <i className="fas fa-check-circle"></i>
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="auth-form">
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
              type="button" 
              className="auth-button secondary" 
              onClick={resendOtp}
              disabled={otpTimer > 0}
            >
              Resend OTP
            </button>
            
            <button type="submit" className="auth-button primary" disabled={loading || form.otp.length !== 6}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            
            <button type="button" className="auth-button secondary" onClick={() => {
              setOtpSent(false);
              setOtpValues(["", "", "", "", "", ""]);
              setForm({ ...form, otp: "" });
            }}>
              Back to Signup
            </button>
          </form>
        </div>
        
        <div className="auth-right">
          <div className="auth-image"></div>
        </div>
        
        <button className="close-modal" onClick={onClose}>×</button>
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

export default LoginModal;
