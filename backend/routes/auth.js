const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}

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

// Helpers for input sanitization (C-8 NoSQL protection)
const asString = (v) => (typeof v === "string" ? v.trim() : "");

// ================================
// SEND OTP
// ================================
router.post("/send-otp", otpLimiter, async (req, res) => {
  const email = asString(req.body.email).toLowerCase();
  const phone = asString(req.body.phone);
  const name = asString(req.body.name);
  const password = asString(req.body.password);
  const role = asString(req.body.role) || "buyer";
  const mode = asString(req.body.mode) || "signup";

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
      try {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: email,
          subject: "AgriDirect Verification OTP",
          text: `Your AgriDirect OTP is: ${otp}. Valid for 15 minutes.`,
        });
      } catch (smtpErr) {
        console.warn(`⚠️ [SMTP Auth Failed]: ${smtpErr.message}`);
        if (process.env.NODE_ENV !== "production") {
          console.log(`🔑 [DEV OTP Fallback] For ${email}: ${otp}`);
        }
      }
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV OTP] For ${email}: ${otp}`);
      }
    }

    // C-1 Fix: Never echo devOtp in the response payload
    return res.json({ ok: true, message: "otp_sent" });
  } catch (err) {
    console.error("send-otp error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ================================
// SHARED SIGNUP HANDLER
// ================================
async function signupHandler(req, res, overrideRole) {
  const email = asString(req.body.email).toLowerCase();
  const otp = asString(req.body.otp);

  if (!email || !otp) {
    return res.status(400).json({ error: "email_and_otp_required" });
  }

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

    const finalRole = overrideRole || sessionData.role || "buyer";

    const user = await User.create({
      email,
      phone: sessionData.phone,
      name: sessionData.name || "User",
      password: sessionData.password,
      role: finalRole,
    });

    const token = jwt.sign({ sub: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    delete req.session.authData[email];

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        digitalId: user.digitalId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
      },
    });
  } catch (err) {
    console.error("signup error", err);
    return res.status(500).json({ error: "signup_failed" });
  }
}

router.post("/signup", (req, res) => signupHandler(req, res));
router.post("/farmer/signup", (req, res) => signupHandler(req, res, "farmer"));

// ================================
// SHARED LOGIN HANDLER
// ================================
async function loginHandler(req, res) {
  const email = asString(req.body.email).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

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

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        digitalId: user.digitalId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
        address: user.address,
        location: user.location,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "server_error" });
  }
}

router.post("/login", (req, res) => loginHandler(req, res));
router.post("/farmer/login", (req, res) => loginHandler(req, res));
router.post("/admin/login", (req, res) => loginHandler(req, res));

// ================================
// SECURE ADMIN SIGNUP
// ================================
router.post("/admin/signup", async (req, res) => {
  const name = asString(req.body.name) || "Administrator";
  const email = asString(req.body.email).toLowerCase();
  const phone = asString(req.body.phone);
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const inviteCode = asString(req.body.inviteCode);

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
      name,
      email,
      phone,
      password,
      role: "admin",
    });

    const token = jwt.sign({ sub: admin._id, role: admin.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      ok: true,
      token,
      user: { id: admin._id, email: admin.email, role: admin.role, name: admin.name },
    });
  } catch (err) {
    console.error("admin signup error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ================================
// FORGOT PASSWORD
// ================================
router.post("/forgot-password", otpLimiter, async (req, res) => {
  const email = asString(req.body.email).toLowerCase();
  const otp = asString(req.body.otp);
  const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "email_otp_and_new_password_required" });
  }

  const sessionData = req.session.authData?.[email];
  if (!sessionData) return res.status(400).json({ error: "no_otp_session" });

  sessionData.attempts = (sessionData.attempts || 0) + 1;
  if (sessionData.attempts > 5) {
    delete req.session.authData[email];
    return res.status(429).json({ error: "too_many_failed_attempts" });
  }

  if (sessionData.otp !== otp || Date.now() - sessionData.createdAt > 15 * 60 * 1000) {
    return res.status(401).json({ error: "invalid_or_expired_otp" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "user_not_found" });

    user.password = newPassword;
    await user.save();

    delete req.session.authData[email];
    return res.json({ ok: true, message: "password_reset_success" });
  } catch (err) {
    console.error("forgot password error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ================================
// PROFILE & KYC ENDPOINTS
// ================================

/**
 * GET /api/auth/me
 * Fetch authenticated user profile with KYC status
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select("-password").lean();
    if (!user) return res.status(404).json({ error: "user_not_found" });
    return res.json({ ok: true, user });
  } catch (err) {
    console.error("Fetch me error:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/auth/kyc/submit
 * Farmers / FPOs submit KYC details & documents
 */
router.post("/kyc/submit", verifyToken, async (req, res) => {
  try {
    const { documentType, documentNumber, documentUrl } = req.body;
    if (!documentNumber) {
      return res.status(400).json({ error: "document_number_required" });
    }

    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "user_not_found" });

    // Auto-verify if valid 12-digit Aadhaar / 10-digit PAN or FPO reg number pattern, else set to pending
    const isValidFormat = /^[0-9]{12}$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$|^[A-Z0-9]{8,15}$/i.test(documentNumber.trim());
    user.kycStatus = isValidFormat ? "verified" : "pending";

    await user.save();

    return res.json({
      ok: true,
      message: user.kycStatus === "verified" ? "kyc_verified_successfully" : "kyc_submitted_pending_verification",
      kycStatus: user.kycStatus,
      documentType: documentType || "Government ID",
    });
  } catch (err) {
    console.error("KYC submit error:", err);
    return res.status(500).json({ error: "kyc_submit_failed" });
  }
});

/**
 * PATCH /api/auth/kyc/verify/:userId
 * Officers or Admins approve/reject KYC
 */
router.patch(
  "/kyc/verify/:userId",
  verifyToken,
  requireRole("officer", "admin"),
  async (req, res) => {
    try {
      const { status } = req.body;
      if (!["verified", "none", "pending"].includes(status)) {
        return res.status(400).json({ error: "invalid_status" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.userId,
        { $set: { kycStatus: status } },
        { new: true }
      ).select("-password");

      if (!user) return res.status(404).json({ error: "user_not_found" });

      return res.json({ ok: true, user });
    } catch (err) {
      console.error("KYC verify error:", err);
      return res.status(500).json({ error: "kyc_verify_failed" });
    }
  }
);

/**
 * GET /api/auth/id-card
 * Generate / retrieve standardized digital identity card for Farmer, FPO, or Consumer
 */
router.get("/id-card", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select("-password").lean();
    if (!user) return res.status(404).json({ error: "user_not_found" });

    // Generate on the fly if user was created before schema update
    let digitalId = user.digitalId;
    if (!digitalId) {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const prefixMap = {
        farmer: "KISAN",
        fpo: "FPO",
        buyer: user.buyerType === "bulk" ? "BULK" : "CON",
        driver: "DRV",
        officer: "OFF",
        admin: "ADM",
      };
      const prefix = prefixMap[user.role] || "USR";
      digitalId = `${prefix}-${year}-${rand}`;
      await User.findByIdAndUpdate(user._id, { $set: { digitalId } });
    }

    const titleMap = {
      farmer: "Kisan Digital Smart Card (AgriStack ID)",
      fpo: "FPO Collective Federation Registration Certificate",
      buyer: user.buyerType === "bulk" ? "Institutional Bulk Buyer Commercial ID" : "Direct Agri Consumer Member Card",
      driver: "Logistics Fleet Pilot Digital ID",
      officer: "Agricultural Extension Officer ID",
      admin: "AgriDirect Platform Administrator",
    };

    const cardPayload = {
      digitalId,
      holderName: user.name,
      orgName: user.orgName || (user.role === "fpo" ? user.name : undefined),
      role: user.role,
      roleTitle: titleMap[user.role] || "AgriDirect Member Card",
      kycStatus: user.kycStatus || "none",
      phone: user.phone || "N/A",
      email: user.email,
      district: user.address?.district || "NCR",
      state: user.address?.state || "Uttar Pradesh",
      issuedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "2026",
      validUntil: "2029",
      qrPayload: JSON.stringify({
        id: digitalId,
        uid: user._id,
        name: user.name,
        role: user.role,
        kyc: user.kycStatus || "verified",
        verifiedBy: "AgriDirect National Gateway",
      }),
    };

    return res.json({ ok: true, card: cardPayload });
  } catch (err) {
    console.error("ID card error:", err);
    return res.status(500).json({ error: "failed_to_generate_id_card" });
  }
});

module.exports = router;
