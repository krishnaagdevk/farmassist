import api from "../lib/api";

export const sendOtp = (data) => api.post("/api/auth/send-otp", data);
export const farmerSignup = (data) => api.post("/api/auth/signup", data);
export const farmerLogin = (data) => api.post("/api/auth/login", data);
export const farmerForgotPassword = (data) => api.post("/api/auth/forgot-password", data);
export const adminSignup = (data) => api.post("/api/auth/admin/signup", data);
export const adminLogin = (data) => api.post("/api/auth/admin/login", data);
