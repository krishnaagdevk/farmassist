const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "too_many_otp_requests_try_later" },
  standardHeaders: true,
  legacyHeaders: false,
});

let transporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

// ================================
// SEND OTP
// ================================
router.post("/send-otp", otpLimiter, async (req, res) => {
  const { email, phone, name, password, role = "buyer", mode = "signup" } = req.body;
  if (!email) return res.status(400).json({ error: "email_required" });

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    if (!req.session.authData) req.session.authData = {};
    req.session.authData[email] = {
      email,
      phone,
      name,
      password,
      role,
      otp,
      attempts: 0,
      mode,
      createdAt: Date.now(),
    };

    if (transporter) {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: "AgriDirect Verification OTP",
        text: `Your AgriDirect OTP is: ${otp}. Valid for 15 minutes.`,
      });
    } else {
      console.log(`[DEV OTP] For ${email}: ${otp}`);
    }

    res.json({ ok: true, message: "otp_sent" });
  } catch (err) {
    console.error("send-otp error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ================================
// VERIFY SIGNUP (Universal: Farmer / Buyer / FPO / Driver)
// ================================
router.post("/signup", async (req, res) => {
  const { email, otp } = req.body;
  const sessionData = req.session.authData?.[email];
  if (!sessionData) return res.status(400).json({ error: "no_otp_session" });

  sessionData.attempts = (sessionData.attempts || 0) + 1;
  if (sessionData.attempts > 5) {
    delete req.session.authData[email];
    return res.status(429).json({ error: "too_many_failed_attempts" });
  }

  if (sessionData.otp !== otp) {
    return res.status(401).json({ error: "otp_mismatch" });
  }
  if (Date.now() - sessionData.createdAt > 15 * 60 * 1000) {
    return res.status(401).json({ error: "otp_expired" });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "user_already_exists" });

    const user = await User.create({
      email,
      phone: sessionData.phone,
      name: sessionData.name || "User",
      password: sessionData.password,
      role: sessionData.role || "buyer",
    });

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    delete req.session.authData[email];

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("signup error", err);
    res.status(500).json({ error: "signup_failed" });
  }
});

// Legacy endpoint support
router.post("/farmer/signup", (req, res) => {
  if (req.session.authData?.[req.body.email]) {
    req.session.authData[req.body.email].role = "farmer";
  }
  return router.handle({ ...req, url: "/signup" }, res);
});

// ================================
// LOGIN (Universal)
// ================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email_and_password_required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "user_not_found" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "invalid_password" });

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        location: user.location,
      },
    });
  } catch (err) {
    console.error("login error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// Legacy support
router.post("/farmer/login", (req, res) => router.handle({ ...req, url: "/login" }, res));
router.post("/admin/login", (req, res) => router.handle({ ...req, url: "/login" }, res));

// ================================
// SECURE ADMIN SIGNUP (S-1 Fixed)
// ================================
router.post("/admin/signup", async (req, res) => {
  const { name, email, phone, password, inviteCode } = req.body;

  if (!process.env.ADMIN_INVITE_CODE) {
    return res.status(500).json({ error: "admin_registration_disabled" });
  }

  if (inviteCode !== process.env.ADMIN_INVITE_CODE) {
    return res.status(403).json({ error: "invalid_admin_invite_code" });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "email_and_password_required" });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "user_already_exists" });

    const admin = await User.create({
      name: name || "Administrator",
      email,
      phone,
      password,
      role: "admin",
    });

    const token = jwt.sign({ sub: admin._id, role: admin.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      ok: true,
      token,
      user: { id: admin._id, email: admin.email, role: admin.role, name: admin.name },
    });
  } catch (err) {
    console.error("admin signup error", err);
    res.status(500).json({ error: "server_error" });
  }
});

// ================================
// FORGOT PASSWORD
// ================================
router.post("/forgot-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const sessionData = req.session.authData?.[email];
  if (!sessionData) return res.status(400).json({ error: "no_otp_session" });

  if (sessionData.otp !== otp || Date.now() - sessionData.createdAt > 15 * 60 * 1000) {
    return res.status(401).json({ error: "invalid_or_expired_otp" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "user_not_found" });

    user.password = newPassword;
    await user.save();

    delete req.session.authData[email];
    res.json({ ok: true, message: "password_reset_success" });
  } catch (err) {
    console.error("forgot password error", err);
    res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
