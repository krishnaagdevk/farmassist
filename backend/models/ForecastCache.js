const mongoose = require("mongoose");

const forecastCacheSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true, index: true }, // e.g. "demand:tomato:Ghaziabad:14"
    kind: { type: String, enum: ["demand", "price"], required: true },
    crop: { type: String, required: true },
    region: { type: String, required: true },
    horizonDays: { type: Number, default: 14 },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Mongo TTL index
  },
  { timestamps: true },
);

module.exports = mongoose.model("ForecastCache", forecastCacheSchema);
