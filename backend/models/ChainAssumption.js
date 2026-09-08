const mongoose = require("mongoose");

const chainAssumptionSchema = new mongoose.Schema(
  {
    commissionAgentPct: { type: Number, default: 8 },
    wholesalerMarginPct: { type: Number, default: 12 },
    retailerMarginPct: { type: Number, default: 40 },
    logisticsLossPct: { type: Number, default: 15 },
    source: {
      type: String,
      default:
        "Modelled from published supply chain & APMC mandi studies; configurable",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ChainAssumption", chainAssumptionSchema);
