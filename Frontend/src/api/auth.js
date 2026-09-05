import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/auth", // your backend base
  withCredentials: true, // so cookies/sessions work
});

// ================= Farmer =================
export const sendOtp = (data) => API.post("/send-otp", data); 
export const farmerSignup = (data) => API.post("/farmer/signup", data);
export const farmerLogin = (data) => API.post("/farmer/login", data);
export const farmerForgotPassword = (data) => API.post("/farmer/forgot-password", data);

// ================= Admin =================
export const adminSignup = (data) => API.post("/admin/signup", data);
export const adminLogin = (data) => API.post("/admin/login", data);
