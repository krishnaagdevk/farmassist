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
  console.log("🌱 Connecting to MongoDB for full SIH demo deterministic seeding...");
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

  // 1. Seed Chain Assumptions (Modelled APMC vs Direct transparency margins)
  await ChainAssumption.create({
    commissionAgentPct: 8,
    wholesalerMarginPct: 12,
    retailerMarginPct: 40,
    logisticsLossPct: 15,
    source: "APMC Mandi Price Survey & Supply Chain Margin Studies (NITI Aayog & Agmarknet)",
  });
  console.log("✅ Seeded Chain Assumptions");

  // 2. Seed 8 Standard Crops Catalog
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
    {
      slug: "chilli",
      name: "Green Chilli",
      nameHi: "हरी मिर्च",
      category: "vegetable",
      shelfLifeDays: 10,
      imageUrl: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600",
      msppaisePerKg: 3500,
    },
    {
      slug: "cabbage",
      name: "Cabbage",
      nameHi: "पत्ता गोभी",
      category: "vegetable",
      shelfLifeDays: 12,
      imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600",
      msppaisePerKg: 1100,
    },
  ];

  const createdCrops = await Crop.insertMany(cropsData);
  const cropMap = {};
  createdCrops.forEach((c) => (cropMap[c.slug] = c._id));
  console.log(`✅ Seeded ${createdCrops.length} Crops`);

  // 3. Seed 26 Users
  const passwordHash = await bcrypt.hash("Password@123", 10);

  // 1 Admin
  const admin = await User.create({
    name: "Dr. Ashok Sharma (Admin)",
    email: "admin@agridirect.in",
    password: passwordHash,
    role: "admin",
    digitalId: "ADM-2026-0001",
    phone: "9876543210",
  });

  // 1 FPO
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

  // 12 Farmers across Western UP / NCR
  const farmersMeta = [
    { name: "Rameshwar Singh", email: "farmer1@agridirect.in", id: "KISAN-2026-1001", village: "Muradnagar", coords: [77.502, 28.775] },
    { name: "Suresh Pal", email: "farmer2@agridirect.in", id: "KISAN-2026-1002", village: "Modinagar", coords: [77.581, 28.831] },
    { name: "Karanjit Yadav", email: "farmer3@agridirect.in", id: "KISAN-2026-1003", village: "Pilkhuwa", coords: [77.654, 28.712] },
    { name: "Balwinder Kaur", email: "farmer4@agridirect.in", id: "KISAN-2026-1004", village: "Loni", coords: [77.289, 28.752] },
    { name: "Harish Chandra", email: "farmer5@agridirect.in", id: "KISAN-2026-1005", village: "Dadri", coords: [77.553, 28.552] },
    { name: "Om Prakash Tyagi", email: "farmer6@agridirect.in", id: "KISAN-2026-1006", village: "Dankaur", coords: [77.561, 28.351] },
    { name: "Mahendra Singh", email: "farmer7@agridirect.in", id: "KISAN-2026-1007", village: "Hapur Rural", coords: [77.781, 28.731] },
    { name: "Jagdish Prasad", email: "farmer8@agridirect.in", id: "KISAN-2026-1008", village: "Jewar", coords: [77.552, 28.125] },
    { name: "Dinesh Chaudhary", email: "farmer9@agridirect.in", id: "KISAN-2026-1009", village: "Dasna", coords: [77.525, 28.681] },
    { name: "Ravindra Bhati", email: "farmer10@agridirect.in", id: "KISAN-2026-1010", village: "Sikandrabad", coords: [77.695, 28.452] },
    { name: "Satnam Singh", email: "farmer11@agridirect.in", id: "KISAN-2026-1011", village: "Meerut Bypass", coords: [77.651, 28.942] },
    { name: "Govind Ram", email: "farmer12@agridirect.in", id: "KISAN-2026-1012", village: "Sahibabad Village", coords: [77.345, 28.672] },
  ];

  const createdFarmers = [];
  for (const fm of farmersMeta) {
    const f = await User.create({
      name: fm.name,
      email: fm.email,
      password: passwordHash,
      role: "farmer",
      digitalId: fm.id,
      kycStatus: "verified",
      address: { village: fm.village, district: "Ghaziabad", state: "Uttar Pradesh" },
      location: { type: "Point", coordinates: fm.coords },
      phone: `987654${Math.floor(1000 + Math.random() * 9000)}`,
    });
    createdFarmers.push(f);
  }

  // 6 Consumers
  const consumersMeta = [
    { name: "Ananya Gupta", email: "buyer1@agridirect.in", addr: "Tower 4, Sector 62", city: "Noida", pin: "201301", coords: [77.3649, 28.628] },
    { name: "Rohit Verma", email: "buyer2@agridirect.in", addr: "Gaur City 1, Sector 4", city: "Greater Noida West", pin: "201009", coords: [77.426, 28.608] },
    { name: "Pooja Malhotra", email: "buyer3@agridirect.in", addr: "Shipra Sun City", city: "Indirapuram", pin: "201014", coords: [77.375, 28.638] },
    { name: "Kunal Mehra", email: "buyer4@agridirect.in", addr: "Express Garden", city: "Vaishali", pin: "201010", coords: [77.342, 28.649] },
    { name: "Sunita Deshmukh", email: "buyer5@agridirect.in", addr: "Sector 14", city: "Vasundhara", pin: "201012", coords: [77.361, 28.662] },
    { name: "Alok Saxena", email: "buyer6@agridirect.in", addr: "Raj Nagar Extension", city: "Ghaziabad", pin: "201017", coords: [77.428, 28.711] },
  ];

  const createdConsumers = [];
  for (let i = 0; i < consumersMeta.length; i++) {
    const cm = consumersMeta[i];
    const b = await User.create({
      name: cm.name,
      email: cm.email,
      password: passwordHash,
      role: "buyer",
      buyerType: "consumer",
      digitalId: `CON-2026-${1001 + i}`,
      address: { line1: cm.addr, district: cm.city, pincode: cm.pin },
      location: { type: "Point", coordinates: cm.coords },
      phone: `981111${Math.floor(1000 + Math.random() * 9000)}`,
    });
    createdConsumers.push(b);
  }

  // 2 Bulk Buyers
  const bulkBuyersMeta = [
    { name: "FreshMart Retail Chains", email: "bulk1@agridirect.in", org: "FreshMart India Pvt. Ltd.", coords: [77.382, 28.535] },
    { name: "Taj Central Commissary", email: "bulk2@agridirect.in", org: "Taj Hospitality Supplies", coords: [77.218, 28.613] },
  ];
  for (let i = 0; i < bulkBuyersMeta.length; i++) {
    const bm = bulkBuyersMeta[i];
    await User.create({
      name: bm.name,
      email: bm.email,
      password: passwordHash,
      role: "buyer",
      buyerType: "bulk",
      orgName: bm.org,
      digitalId: `BLK-2026-${2001 + i}`,
      address: { line1: "Commercial Hub", district: "NCR", pincode: "201301" },
      location: { type: "Point", coordinates: bm.coords },
      phone: `982222${Math.floor(1000 + Math.random() * 9000)}`,
    });
  }

  // 4 Drivers
  const driversMeta = [
    { name: "Vikas Driver", email: "driver1@agridirect.in" },
    { name: "Satish Kumar", email: "driver2@agridirect.in" },
    { name: "Deepak Rawat", email: "driver3@agridirect.in" },
    { name: "Manoj Yadav", email: "driver4@agridirect.in" },
  ];
  const createdDrivers = [];
  for (let i = 0; i < driversMeta.length; i++) {
    const dm = driversMeta[i];
    const d = await User.create({
      name: dm.name,
      email: dm.email,
      password: passwordHash,
      role: "driver",
      digitalId: `DRV-2026-${1001 + i}`,
      phone: `983333${Math.floor(1000 + Math.random() * 9000)}`,
    });
    createdDrivers.push(d);
  }
  console.log("✅ Seeded 26 Users (Admin, FPO, Farmers, Buyers, Drivers)");

  // 4. Seed 4 Transit Vehicles
  const vehiclesData = [
    {
      driver: createdDrivers[0]._id,
      regNo: "UP-14-EV-2026",
      kind: "tempo",
      capacityGrams: 900000, // 900 kg
      refrigerated: false,
      costPaisePerKm: 800,
      start: { type: "Point", coordinates: [77.4538, 28.6692] },
      shift: { startHour: 6, endHour: 20 },
      active: true,
    },
    {
      driver: createdDrivers[1]._id,
      regNo: "UP-16-AG-4412",
      kind: "truck",
      capacityGrams: 1500000, // 1500 kg
      refrigerated: true,
      costPaisePerKm: 1200,
      start: { type: "Point", coordinates: [77.3649, 28.628] },
      shift: { startHour: 6, endHour: 22 },
      active: true,
    },
    {
      driver: createdDrivers[2]._id,
      regNo: "DL-01-EV-8820",
      kind: "tempo",
      capacityGrams: 800000, // 800 kg
      refrigerated: false,
      costPaisePerKm: 750,
      start: { type: "Point", coordinates: [77.345, 28.672] },
      shift: { startHour: 7, endHour: 19 },
      active: true,
    },
    {
      driver: createdDrivers[3]._id,
      regNo: "UP-15-CL-3011",
      kind: "tempo",
      capacityGrams: 1000000, // 1000 kg
      refrigerated: false,
      costPaisePerKm: 850,
      start: { type: "Point", coordinates: [77.502, 28.775] },
      shift: { startHour: 6, endHour: 20 },
      active: true,
    },
  ];
  await Vehicle.insertMany(vehiclesData);
  console.log("✅ Seeded 4 Fleet Vehicles");

  // 5. Seed 40 Produce Listings across all 12 Farmers and 8 Crops
  const cropList = [
    { slug: "tomato", variety: "Desi Hybrid", price: 2600, img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600" },
    { slug: "potato", variety: "Kufri Jyoti", price: 1600, img: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600" },
    { slug: "onion", variety: "Nasik Red", price: 2200, img: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600" },
    { slug: "brinjal", variety: "Pusa Purple", price: 2000, img: "https://images.unsplash.com/photo-1628773822503-930a84d436cf?w=600" },
    { slug: "banana", variety: "G9 Robusta", price: 2800, img: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600" },
    { slug: "wheat", variety: "Sharbati Certified", price: 2800, img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600" },
    { slug: "chilli", variety: "G4 Teja", price: 4800, img: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600" },
    { slug: "cabbage", variety: "Golden Acre", price: 1500, img: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600" },
  ];

  const listingsData = [];
  let listingCount = 0;
  for (let fIdx = 0; fIdx < createdFarmers.length; fIdx++) {
    const farmer = createdFarmers[fIdx];
    // Each farmer lists 3-4 distinct crops
    const farmerCrops = [
      cropList[fIdx % cropList.length],
      cropList[(fIdx + 2) % cropList.length],
      cropList[(fIdx + 4) % cropList.length],
      cropList[(fIdx + 6) % cropList.length],
    ];

    for (let cIdx = 0; cIdx < farmerCrops.length; cIdx++) {
      if (listingCount >= 40) break;
      const c = farmerCrops[cIdx];
      const isA = (fIdx + cIdx) % 2 === 0;
      const totalGrams = 200000 + ((fIdx * 50000 + cIdx * 30000) % 600000);

      listingsData.push({
        farmer: farmer._id,
        crop: cropMap[c.slug],
        variety: c.variety,
        grade: isA ? "A" : "B",
        organic: (fIdx + cIdx) % 3 === 0,
        totalGrams,
        availableGrams: totalGrams - 20000,
        pricePaisePerKg: isA ? c.price : Math.round(c.price * 0.85),
        minOrderGrams: 2000,
        pickup: farmer.location,
        expiresOn: new Date(Date.now() + (10 + (fIdx % 20)) * 86400000),
        images: [c.img],
      });
      listingCount++;
    }
  }

  const createdListings = await Listing.insertMany(listingsData);
  console.log(`✅ Seeded ${createdListings.length} Produce Listings`);

  // 6. Seed 12-Month Daily Price Benchmarks (~2,920 records)
  console.log("⏳ Synthesizing 365-day PriceBenchmark dataset for all crops...");
  const benchmarksData = [];
  const basePrices = {
    tomato: 1800,
    potato: 1200,
    onion: 1600,
    brinjal: 1400,
    banana: 2200,
    wheat: 2275,
    chilli: 3500,
    cabbage: 1100,
  };

  const todayMs = Date.now();
  for (const cropSlug of Object.keys(basePrices)) {
    const baseP = basePrices[cropSlug];
    const cropId = cropMap[cropSlug];

    for (let dayOffset = 365; dayOffset >= 0; dayOffset--) {
      const rowDate = new Date(todayMs - dayOffset * 86400000);
      const dayOfYear = Math.floor((rowDate - new Date(rowDate.getFullYear(), 0, 0)) / 86400000);

      // Realistic annual seasonality + weekly fluctuations
      const seasonalFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.22;
      const weeklyFactor = Math.sin((dayOffset % 7 / 7) * 2 * Math.PI) * 0.05;
      const modal = Math.round(baseP * (1 + seasonalFactor + weeklyFactor));
      const minP = Math.round(modal * 0.82);
      const maxP = Math.round(modal * 1.22);
      const retail = Math.round(modal * 1.85); // Mandi vs City Retail spread (+85%)

      benchmarksData.push({
        crop: cropId,
        market: dayOffset % 2 === 0 ? "Azadpur Mandi" : "Sahibabad Mandi",
        state: dayOffset % 2 === 0 ? "Delhi" : "Uttar Pradesh",
        date: rowDate,
        mandiModalPaisePerKg: modal,
        mandiMinPaisePerKg: minP,
        mandiMaxPaisePerKg: maxP,
        retailPaisePerKg: retail,
        source: "Agmarknet Daily Market Report",
      });
    }
  }

  await PriceBenchmark.insertMany(benchmarksData);
  console.log(`✅ Seeded ${benchmarksData.length} Historical Daily Price Benchmarks`);

  // 7. Seed 120 Historical Delivered Orders (last 90 days)
  console.log("⏳ Synthesizing 120 historical delivered orders...");
  const historicalOrders = [];
  for (let i = 1; i <= 120; i++) {
    const buyer = createdConsumers[i % createdConsumers.length];
    const listing = createdListings[i % createdListings.length];
    const farmer = createdFarmers[i % createdFarmers.length];
    const kg = 5 + (i % 25);
    const grams = kg * 1000;
    const pricePaisePerKg = listing.pricePaisePerKg;
    const produceSubtotalPaise = Math.round((grams * pricePaisePerKg) / 1000);
    const logisticsFeePaise = 3200 + (i % 20) * 100;
    const platformFeePaise = Math.round(produceSubtotalPaise * 0.02);
    const totalPaise = produceSubtotalPaise + logisticsFeePaise + platformFeePaise;

    const pastDate = new Date(todayMs - (1 + (i % 88)) * 86400000);

    historicalOrders.push({
      orderNo: `AD-HIST-${10000 + i}`,
      buyer: buyer._id,
      items: [
        {
          listing: listing._id,
          farmer: farmer._id,
          crop: listing.crop,
          grams,
          pricePaisePerKg,
          lineTotalPaise: produceSubtotalPaise,
        },
      ],
      produceSubtotalPaise,
      logisticsFeePaise,
      platformFeePaise,
      totalPaise,
      deliveryAddress: {
        line1: buyer.address.line1,
        city: buyer.address.district,
        pincode: buyer.address.pincode,
        point: buyer.location,
      },
      deliverySlot: {
        date: pastDate,
        startHour: 8,
        endHour: 12,
      },
      status: "delivered",
      payment: {
        provider: "razorpay",
        orderId: `order_hist_${i}`,
        paymentId: `pay_hist_${i}`,
        signature: "verified_mock_sig",
        paidAt: pastDate,
      },
      createdAt: pastDate,
      updatedAt: pastDate,
    });
  }
  await Order.insertMany(historicalOrders);
  console.log(`✅ Seeded ${historicalOrders.length} Historical Delivered Orders`);

  // 8. Seed 10 Paid & Unrouted Orders dated Today for Demo Route Optimization
  console.log("⏳ Seeding 10 fresh paid unrouted orders for live dispatch demonstration...");
  const unroutedOrders = [];
  const demoDropLocations = [
    { line1: "Flat 402, Gaur City 2", city: "Greater Noida West", pin: "201309", coords: [77.426, 28.608] },
    { line1: "Shop 12, Sector 18 Market", city: "Noida", pin: "201301", coords: [77.324, 28.571] },
    { line1: "Tower B, Supertech Capetown", city: "Sector 74, Noida", pin: "201301", coords: [77.391, 28.582] },
    { line1: "Plot 88, Nyay Khand 1", city: "Indirapuram", pin: "201014", coords: [77.368, 28.641] },
    { line1: "House 204, Sector 4", city: "Vaishali", pin: "201010", coords: [77.339, 28.647] },
    { line1: "A-50, Sector 16", city: "Vasundhara", pin: "201012", coords: [77.371, 28.665] },
    { line1: "Block C, Raj Nagar", city: "Ghaziabad", pin: "201002", coords: [77.441, 28.685] },
    { line1: "Green Park Colony", city: "Crossings Republik", pin: "201016", coords: [77.442, 28.625] },
    { line1: "Apex Athena, Sector 75", city: "Noida", pin: "201304", coords: [77.385, 28.579] },
    { line1: "Mahagun Moderne, Sector 78", city: "Noida", pin: "201305", coords: [77.399, 28.573] },
  ];

  for (let i = 0; i < 10; i++) {
    const loc = demoDropLocations[i];
    const buyer = createdConsumers[i % createdConsumers.length];
    const listing = createdListings[i * 2];
    const farmer = createdFarmers[i];
    const grams = 15000 + i * 5000; // 15kg to 60kg
    const pricePaisePerKg = listing.pricePaisePerKg;
    const produceSubtotalPaise = Math.round((grams * pricePaisePerKg) / 1000);
    const logisticsFeePaise = 3800 + i * 80;
    const platformFeePaise = Math.round(produceSubtotalPaise * 0.02);
    const totalPaise = produceSubtotalPaise + logisticsFeePaise + platformFeePaise;

    unroutedOrders.push({
      orderNo: `AD-DEMO-${260907 + i}`,
      buyer: buyer._id,
      items: [
        {
          listing: listing._id,
          farmer: farmer._id,
          crop: listing.crop,
          grams,
          pricePaisePerKg,
          lineTotalPaise: produceSubtotalPaise,
        },
      ],
      produceSubtotalPaise,
      logisticsFeePaise,
      platformFeePaise,
      totalPaise,
      deliveryAddress: {
        line1: loc.line1,
        city: loc.city,
        pincode: loc.pin,
        point: { type: "Point", coordinates: loc.coords },
      },
      deliverySlot: {
        date: new Date(),
        startHour: 8,
        endHour: 14,
      },
      status: "paid",
      payment: {
        provider: "razorpay",
        orderId: `order_demo_${i}`,
        paymentId: `pay_demo_${i}`,
        signature: "verified_mock_sig",
        paidAt: new Date(),
      },
      createdAt: new Date(),
    });
  }

  await Order.insertMany(unroutedOrders);
  console.log(`✅ Seeded ${unroutedOrders.length} Paid Unrouted Orders (Ready for OR-Tools Dispatch Demo)`);

  console.log("\n=======================================================");
  console.log("🎉 AGRI-DIRECT MASTER SEED COMPLETED SUCCESSFULLY!");
  console.log("=======================================================");
  console.log("🔑 Demo Credentials (Password: Password@123):");
  console.log("  • Admin:   admin@agridirect.in");
  console.log("  • FPO:     fpo@agridirect.in");
  console.log("  • Farmer:  farmer1@agridirect.in (up to farmer12@agridirect.in)");
  console.log("  • Buyer:   buyer1@agridirect.in (up to buyer6@agridirect.in)");
  console.log("  • Bulk:    bulk1@agridirect.in, bulk2@agridirect.in");
  console.log("  • Driver:  driver1@agridirect.in (up to driver4@agridirect.in)");
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
