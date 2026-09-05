const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema({
  seq: { type: Number, required: true },
  kind: { type: String, enum: ["pickup", "drop"], required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", default: null },
  label: { type: String, required: true },
  point: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  loadGrams: { type: Number, required: true }, // +pickup, -drop
  etaMinutes: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["pending", "done", "failed"],
    default: "pending",
  },
  doneAt: Date,
  proofUrl: String,
});

const shipmentSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, required: true },
    stops: [stopSchema],
    polyline: { type: String, default: "" }, // OSRM encoded polyline
    plannedDistanceKm: { type: Number, required: true },
    plannedDurationMin: { type: Number, required: true },
    naiveDistanceKm: { type: Number, required: true }, // For before/after optimization metric
    costPaise: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed"],
      default: "planned",
      index: true,
    },
    optimizerMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shipment", shipmentSchema);
