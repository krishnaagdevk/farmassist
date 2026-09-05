const express = require("express");
const crypto = require("crypto");
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
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "order_not_found" });

    // In mock mode or when keys aren't set
    if (process.env.MOCK_PAYMENTS === "true" || !razorpay) {
      return res.json({
        mock: true,
        orderId: order._id,
        amount: order.totalPaise,
        currency: "INR",
        keyId: "mock_key",
      });
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
 * Server-side HMAC-SHA256 verification
 */
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const {
      orderId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "order_not_found" });

    if (process.env.MOCK_PAYMENTS === "true" || !razorpay) {
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

    // Cryptographic signature check
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
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
      note: "Payment verified via Razorpay",
    });
    await order.save();

    return res.json({ ok: true, status: "paid" });
  } catch (err) {
    console.error("Payment verify error:", err);
    return res.status(500).json({ error: "payment_verification_failed" });
  }
});

module.exports = router;
