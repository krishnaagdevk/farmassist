const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    regNo: { type: String, unique: true, required: true },
    kind: { type: String, enum: ["bike", "tempo", "truck"], default: "tempo" },
    capacityGrams: { type: Number, required: true }, // Max weight load
    refrigerated: { type: Boolean, default: false },
    costPaisePerKm: { type: Number, default: 800 }, // ₹8/km
    start: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // depot location [lng, lat]
    },
    shift: {
      startHour: { type: Number, default: 6 },
      endHour: { type: Number, default: 20 },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
