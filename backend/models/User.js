const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["farmer", "fpo", "buyer", "driver", "officer", "admin"],
      default: "buyer",
    },
    phone: { type: String, index: true, sparse: true },
    orgName: { type: String, trim: true }, // FPO or business buyer
    buyerType: { type: String, enum: ["consumer", "bulk"], default: "consumer" },
    fpo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // farmer -> parent FPO
    location: {
      type: { type: String, enum: ["Point"], default: undefined },
      coordinates: { type: [Number], default: undefined }, // [lng, lat] GeoJSON order!
    },
    address: {
      line1: String,
      village: String,
      district: String,
      state: String,
      pincode: String,
    },
    digitalId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    kycStatus: {
      type: String,
      enum: ["none", "pending", "verified"],
      default: "none",
    },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// GeoJSON 2dsphere index for geolocation lookups (sparse so users without coordinates save cleanly)
userSchema.index({ location: "2dsphere" }, { sparse: true });

userSchema.pre("save", async function (next) {
  // Auto-generate standardized digital identity code if not already set
  if (!this.digitalId) {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const prefixMap = {
      farmer: "KISAN",
      fpo: "FPO",
      buyer: this.buyerType === "bulk" ? "BULK" : "CON",
      driver: "DRV",
      officer: "OFF",
      admin: "ADM",
    };
    const prefix = prefixMap[this.role] || "USR";
    this.digitalId = `${prefix}-${year}-${rand}`;
  }

  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
