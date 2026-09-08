const mongoose = require("mongoose");

const bulkPoolSchema = new mongoose.Schema(
  {
    fpo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    crop: { type: mongoose.Schema.Types.ObjectId, ref: "Crop", required: true },
    grade: { type: String, default: "A" },
    targetGrams: { type: Number, required: true },
    committedGrams: { type: Number, default: 0 },
    pricePaisePerKg: { type: Number, required: true },
    window: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    members: [
      {
        farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
        grams: { type: Number, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["open", "closed", "listed", "fulfilled"],
      default: "open",
    },
    resultListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BulkPool", bulkPoolSchema);
