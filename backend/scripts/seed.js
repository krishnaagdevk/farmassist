const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Crop = require("../models/Crop");
const Listing = require("../models/Listing");
const PriceBenchmark = require("../models/PriceBenchmark");
const Vehicle = require("../models/Vehicle");
const Order = require("../models/Order");
const ChainAssumption = require("../models/ChainAssumption");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/agridirect";

async function seed() {
  console.log("🌱 Connecting to MongoDB for deterministic seeding...");
  await mongoose.connect(MONGO_URI, {});

  // Reset collections
  await Promise.all([
    User.deleteMany({}),
    Crop.deleteMany({}),
    Listing.deleteMany({}),
    PriceBenchmark.deleteMany({}),
    Vehicle.deleteMany({}),
    Order.deleteMany({}),
    ChainAssumption.deleteMany({}),
  ]);

  console.log("🧹 Cleaned existing records.");

  // 1. Seed Chain Assumptions (Modelled transparency margins)
  await ChainAssumption.create({
    commissionAgentPct: 8,
    wholesalerMarginPct: 12,
    retailerMarginPct: 40,
    logisticsLossPct: 15,
    source: "APMC Mandi Price Survey & Supply Chain Margin Studies (2025-2026)",
  });

  // 2. Seed Standard Crops Catalog
  const cropsData = [
    {
      slug: "tomato",
      name: "Tomato",
      nameHi: "टमाटर",
      category: "vegetable",
      shelfLifeDays: 7,
      imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600",
      msppaisePerKg: 1800,
    },
    {
      slug: "potato",
      name: "Potato",
      nameHi: "आलू",
      category: "vegetable",
      shelfLifeDays: 30,
      imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600",
      msppaisePerKg: 1200,
    },
    {
      slug: "onion",
      name: "Onion",
      nameHi: "प्याज",
      category: "vegetable",
      shelfLifeDays: 25,
      imageUrl: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600",
      msppaisePerKg: 1600,
    },
    {
      slug: "brinjal",
      name: "Brinjal",
      nameHi: "बैंगन",
      category: "vegetable",
      shelfLifeDays: 6,
      imageUrl: "https://images.unsplash.com/photo-1628773822503-930a84d436cf?w=600",
      msppaisePerKg: 1400,
    },
    {
      slug: "banana",
      name: "Banana",
      nameHi: "केला",
      category: "fruit",
      shelfLifeDays: 8,
      imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600",
      msppaisePerKg: 2200,
    },
    {
      slug: "wheat",
      name: "Wheat Grain",
      nameHi: "गेहूं",
      category: "cereal",
      shelfLifeDays: 180,
      imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600",
      msppaisePerKg: 2275,
    },
  ];

  const createdCrops = await Crop.insertMany(cropsData);
  const cropMap = {};
  createdCrops.forEach((c) => (cropMap[c.slug] = c._id));

  // 3. Seed Users (Admin, FPO, Farmers, Drivers, Consumers)
  const passwordHash = await bcrypt.hash("Password@123", 10);

  const admin = await User.create({
    name: "Dr. Ashok Sharma (Admin)",
    email: "admin@agridirect.in",
    password: passwordHash,
    role: "admin",
    digitalId: "ADM-2026-0001",
    phone: "9876543210",
  });

  const fpo = await User.create({
    name: "Ghaziabad Kisan Samriddhi FPO",
    email: "fpo@agridirect.in",
    password: passwordHash,
    role: "fpo",
    digitalId: "FPO-2026-1001",
    orgName: "Ghaziabad Farmers Producer Co. Ltd.",
    phone: "9876543211",
    location: { type: "Point", coordinates: [77.4538, 28.6692] },
  });

  const farmersData = [
    {
      name: "Rameshwar Singh",
      email: "farmer1@agridirect.in",
      digitalId: "KISAN-2026-1001",
      village: "Muradnagar",
      coordinates: [77.502, 28.775],
    },
    {
      name: "Suresh Pal",
      email: "farmer2@agridirect.in",
      digitalId: "KISAN-2026-1002",
      village: "Modinagar",
      coordinates: [77.581, 28.831],
    },
    {
      name: "Karanjit Yadav",
      email: "farmer3@agridirect.in",
      digitalId: "KISAN-2026-1003",
      village: "Pilkhuwa",
      coordinates: [77.654, 28.712],
    },
    {
      name: "Balwinder Kaur",
      email: "farmer4@agridirect.in",
      digitalId: "KISAN-2026-1004",
      village: "Loni",
      coordinates: [77.289, 28.752],
    },
  ];

  const createdFarmers = [];
  for (const f of farmersData) {
    const u = await User.create({
      name: f.name,
      email: f.email,
      password: passwordHash,
      role: "farmer",
      digitalId: f.digitalId,
      kycStatus: "verified",
      address: { village: f.village, district: "Ghaziabad", state: "Uttar Pradesh" },
      location: { type: "Point", coordinates: f.coordinates },
    });
    createdFarmers.push(u);
  }

  const driver = await User.create({
    name: "Vikas Driver",
    email: "driver@agridirect.in",
    password: passwordHash,
    role: "driver",
    digitalId: "DRV-2026-1001",
    phone: "9876543220",
  });

  const buyer = await User.create({
    name: "Ananya Gupta",
    email: "buyer@agridirect.in",
    password: passwordHash,
    role: "buyer",
    buyerType: "consumer",
    digitalId: "CON-2026-1001",
    phone: "9876543230",
    address: { line1: "Tower 4, Sector 62", district: "Noida", pincode: "201301" },
    location: { type: "Point", coordinates: [77.3649, 28.628] },
  });

  // 4. Seed Vehicles
  const vehicle = await Vehicle.create({
    driver: driver._id,
    regNo: "UP-14-EV-2026",
    kind: "tempo",
    capacityGrams: 800000, // 800 kg
    costPaisePerKm: 800,
    start: { type: "Point", coordinates: [77.4538, 28.6692] },
    shift: { startHour: 6, endHour: 20 },
    active: true,
  });

  // 5. Seed Produce Listings
  const listingsData = [
    {
      farmer: createdFarmers[0]._id,
      crop: cropMap["tomato"],
      variety: "Desi Hybrid",
      grade: "A",
      organic: true,
      totalGrams: 200000,
      availableGrams: 180000,
      pricePaisePerKg: 2600, // ₹26/kg
      minOrderGrams: 5000,
      pickup: createdFarmers[0].location,
      expiresOn: new Date(Date.now() + 7 * 86400000),
      images: ["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600"],
    },
    {
      farmer: createdFarmers[1]._id,
      crop: cropMap["potato"],
      variety: "Kufri Jyoti",
      grade: "A",
      organic: false,
      totalGrams: 500000,
      availableGrams: 450000,
      pricePaisePerKg: 1600, // ₹16/kg
      minOrderGrams: 10000,
      pickup: createdFarmers[1].location,
      expiresOn: new Date(Date.now() + 25 * 86400000),
      images: ["https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600"],
    },
    {
      farmer: createdFarmers[2]._id,
      crop: cropMap["onion"],
      variety: "Nasik Red",
      grade: "A",
      organic: true,
      totalGrams: 300000,
      availableGrams: 270000,
      pricePaisePerKg: 2200, // ₹22/kg
      minOrderGrams: 5000,
      pickup: createdFarmers[2].location,
      expiresOn: new Date(Date.now() + 20 * 86400000),
      images: ["https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600"],
    },
    {
      farmer: createdFarmers[3]._id,
      crop: cropMap["banana"],
      variety: "Robusta",
      grade: "A",
      organic: false,
      totalGrams: 250000,
      availableGrams: 250000,
      pricePaisePerKg: 2800, // ₹28/kg
      minOrderGrams: 3000,
      pickup: createdFarmers[3].location,
      expiresOn: new Date(Date.now() + 6 * 86400000),
      images: ["https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600"],
    },
  ];

  const createdListings = await Listing.insertMany(listingsData);

  // 6. Seed Price Benchmarks (Historical APMC vs Retail comparison)
  const benchmarksData = [
    {
      crop: cropMap["tomato"],
      market: "Azadpur Mandi",
      state: "Delhi",
      date: new Date(),
      mandiModalPaisePerKg: 1800,
      mandiMinPaisePerKg: 1400,
      mandiMaxPaisePerKg: 2200,
      retailPaisePerKg: 3800,
      source: "Agmarknet Daily Market Report",
    },
    {
      crop: cropMap["potato"],
      market: "Sahibabad Mandi",
      state: "Uttar Pradesh",
      date: new Date(),
      mandiModalPaisePerKg: 1100,
      mandiMinPaisePerKg: 900,
      mandiMaxPaisePerKg: 1300,
      retailPaisePerKg: 2400,
      source: "Agmarknet Daily Market Report",
    },
    {
      crop: cropMap["onion"],
      market: "Azadpur Mandi",
      state: "Delhi",
      date: new Date(),
      mandiModalPaisePerKg: 1500,
      mandiMinPaisePerKg: 1200,
      mandiMaxPaisePerKg: 1800,
      retailPaisePerKg: 3200,
      source: "Agmarknet Daily Market Report",
    },
  ];

  await PriceBenchmark.insertMany(benchmarksData);

  // 7. Seed Ready-to-Optimize Paid Orders for Live Dispatch Demonstration
  const paidOrdersData = [
    {
      orderNo: "AD-260904-101",
      buyer: buyer._id,
      items: [
        {
          listing: createdListings[0]._id,
          farmer: createdFarmers[0]._id,
          crop: cropMap["tomato"],
          grams: 20000, // 20kg
          pricePaisePerKg: 2600,
          lineTotalPaise: 52000,
        },
      ],
      produceSubtotalPaise: 52000,
      logisticsFeePaise: 3800,
      platformFeePaise: 1040,
      totalPaise: 56840,
      deliveryAddress: {
        line1: "Flat 402, Gaur City 2",
        city: "Greater Noida West",
        pincode: "201309",
        point: { type: "Point", coordinates: [77.426, 28.608] },
      },
      deliverySlot: { date: new Date(), startHour: 8, endHour: 12 },
      status: "paid",
    },
    {
      orderNo: "AD-260904-102",
      buyer: buyer._id,
      items: [
        {
          listing: createdListings[1]._id,
          farmer: createdFarmers[1]._id,
          crop: cropMap["potato"],
          grams: 40000, // 40kg
          pricePaisePerKg: 1600,
          lineTotalPaise: 64000,
        },
      ],
      produceSubtotalPaise: 64000,
      logisticsFeePaise: 4200,
      platformFeePaise: 1280,
      totalPaise: 69480,
      deliveryAddress: {
        line1: "Sector 18 Market",
        city: "Noida",
        pincode: "201301",
        point: { type: "Point", coordinates: [77.324, 28.571] },
      },
      deliverySlot: { date: new Date(), startHour: 9, endHour: 13 },
      status: "paid",
    },
  ];

  await Order.insertMany(paidOrdersData);

  console.log("✅ Seed completed successfully!");
  console.log(`Demo Credentials:`);
  console.log(`- Admin:  admin@agridirect.in / Password@123`);
  console.log(`- Farmer: farmer1@agridirect.in / Password@123`);
  console.log(`- Driver: driver@agridirect.in / Password@123`);
  console.log(`- Buyer:  buyer@agridirect.in / Password@123`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
