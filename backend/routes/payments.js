const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * POST /api/payments/intent
 * Create Razorpay payment order
 */
router.post("/intent", verifyToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ error: "invalid_order_id" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "order_not_found" });

    // Ownership: buyer or admin
    if (order.buyer.toString() !== req.user.sub && req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    // Mock payment mode
    if (process.env.MOCK_PAYMENTS === "true") {
      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({ error: "mock_payments_forbidden_in_production" });
      }
      return res.json({
        mock: true,
        orderId: order._id,
        amount: order.totalPaise,
        currency: "INR",
        keyId: "mock_key",
      });
    }

    if (!razorpay) {
      return res.status(503).json({ error: "payment_provider_not_configured" });
    }

    const options = {
      amount: order.totalPaise, // amount in paise
      currency: "INR",
      receipt: order.orderNo,
      notes: {
        orderId: order._id.toString(),
      },
    };

    const rzpOrder = await razorpay.orders.create(options);
    return res.json({
      mock: false,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Payment intent error:", err);
    return res.status(500).json({ error: "failed_to_create_payment_intent" });
  }
});

/**
 * POST /api/payments/verify
 * Server-side HMAC-SHA256 verification with strict ownership and idempotency
 */
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const {
      orderId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    if (!orderId || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ error: "invalid_order_id" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "order_not_found" });

    // Ownership: buyer who placed it, or an admin
    if (order.buyer.toString() !== req.user.sub && req.user.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    // Idempotency: never re-pay an already paid order
    if (order.status === "paid") {
      return res.json({ ok: true, status: "paid" });
    }

    // Mock payment branch
    if (process.env.MOCK_PAYMENTS === "true") {
      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({ error: "mock_payments_forbidden_in_production" });
      }

      order.status = "paid";
      order.payment = {
        provider: "mock",
        orderId: razorpay_order_id || "mock_order",
        paymentId: razorpay_payment_id || `mock_pay_${Date.now()}`,
        paidAt: new Date(),
      };
      order.statusLog.push({
        status: "paid",
        by: req.user.sub,
        note: "Payment confirmed (Mock Mode)",
      });
      await order.save();
      return res.json({ ok: true, status: "paid" });
    }

    if (!razorpay || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: "payment_provider_not_configured" });
    }

    // Cryptographic signature check
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (
      !razorpay_signature ||
      Buffer.byteLength(expected) !== Buffer.byteLength(String(razorpay_signature)) ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature)))
    ) {
      return res.status(400).json({ error: "invalid_payment_signature" });
    }

    order.status = "paid";
    order.payment = {
      provider: "razorpay",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      paidAt: new Date(),
    };
    order.statusLog.push({
      status: "paid",
      by: req.user.sub,
      note: "Payment verified successfully via Razorpay",
    });

    await order.save();
    return res.json({ ok: true, status: "paid" });
  } catch (err) {
    console.error("Payment verify error:", err);
    return res.status(500).json({ error: "payment_verification_failed" });
  }
});

module.exports = router;
