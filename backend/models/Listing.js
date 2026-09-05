const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fpo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true, index: true },
    variety: { type: String, default: "Standard" },
    grade: { type: String, enum: ["A", "B", "C"], default: "A" },
    organic: { type: Boolean, default: false },
    totalGrams: { type: Number, required: true }, // Store in grams (Int32 safe)
    availableGrams: { type: Number, required: true, index: true },
    pricePaisePerKg: { type: Number, required: true }, // Store in paise (Int32 safe)
    minOrderGrams: { type: Number, default: 1000 }, // Default min 1 kg
    harvestedOn: { type: Date, default: Date.now },
    expiresOn: { type: Date, required: true },
    pickup: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    pickupWindow: {
      startHour: { type: Number, default: 6 },
      endHour: { type: Number, default: 18 },
    },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ["draft", "active", "sold_out", "expired", "paused"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

listingSchema.index({ pickup: "2dsphere" });
listingSchema.index({ crop: 1, status: 1, pricePaisePerKg: 1 });

module.exports = mongoose.model("Listing", listingSchema);
