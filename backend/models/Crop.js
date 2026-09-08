const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    nameHi: { type: String, default: "" },
    category: {
      type: String,
      enum: ["vegetable", "fruit", "cereal", "pulse", "spice"],
      required: true,
    },
    unit: { type: String, enum: ["kg"], default: "kg" },
    shelfLifeDays: { type: Number, default: 7 }, // drives route urgency
    imageUrl: { type: String, default: "" },
    msppaisePerKg: { type: Number, default: null }, // MSP in paise per kg
  },
  { timestamps: true },
);

module.exports = mongoose.model("Crop", cropSchema);
