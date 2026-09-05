const mongoose = require("mongoose");

const priceBenchmarkSchema = new mongoose.Schema(
  {
    crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true, index: true },
    market: { type: String, required: true },
    state: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    mandiModalPaisePerKg: { type: Number, required: true },
    mandiMinPaisePerKg: { type: Number, required: true },
    mandiMaxPaisePerKg: { type: Number, required: true },
    retailPaisePerKg: { type: Number, required: true }, // What consumers pay at city markets
    source: { type: String, default: "agmarknet" },
  },
  { timestamps: true }
);

priceBenchmarkSchema.index({ crop: 1, market: 1, date: -1 });

module.exports = mongoose.model("PriceBenchmark", priceBenchmarkSchema);
