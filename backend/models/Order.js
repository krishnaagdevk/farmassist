const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop" },
  grams: { type: Number, required: true },
  pricePaisePerKg: { type: Number, required: true },
  lineTotalPaise: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true, required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [orderItemSchema],

    // Financial breakdown (all in paise)
    produceSubtotalPaise: { type: Number, required: true },
    logisticsFeePaise: { type: Number, required: true },
    platformFeePaise: { type: Number, required: true },
    totalPaise: { type: Number, required: true },

    // Fulfillment
    deliveryAddress: {
      line1: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      point: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true }, // [lng, lat]
      },
    },
    deliverySlot: {
      date: { type: Date, required: true },
      startHour: { type: Number, default: 8 },
      endHour: { type: Number, default: 20 },
    },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: "Shipment", default: null },
    status: {
      type: String,
      enum: [
        "pending_payment",
        "paid",
        "confirmed",
        "routed",
        "picked_up",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending_payment",
      index: true,
    },
    payment: {
      provider: { type: String, default: "razorpay" },
      orderId: String,
      paymentId: String,
      signature: String,
      paidAt: Date,
    },
    payouts: [
      {
        farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        amountPaise: Number,
        status: { type: String, enum: ["held", "released"], default: "held" },
        releasedAt: Date,
      },
    ],
    statusLog: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
