const mongoose = require("mongoose");
const Listing = require("../models/Listing");
const User = require("../models/User");
const Crop = require("../models/Crop");
const { reserve, release } = require("../services/inventory");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/agridirect";

async function runInventoryCheck() {
  console.log("\n=======================================================");
  console.log("🧪 [CHECK 1/3] Verifying Atomic Inventory & Anti-Overselling");
  console.log("=======================================================");

  await mongoose.connect(MONGO_URI, {});

  // Find or create test farmer and crop
  let farmer = await User.findOne({ role: "farmer" });
  let crop = await Crop.findOne();

  if (!farmer || !crop) {
    console.warn("⚠️ No farmer/crop found. Running test in standalone mock mode.");
    farmer = { _id: new mongoose.Types.ObjectId() };
    crop = { _id: new mongoose.Types.ObjectId() };
  }

  // 1. Create a controlled test listing with 100,000 grams (100 kg)
  const testListing = await Listing.create({
    farmer: farmer._id,
    crop: crop._id,
    variety: "Test Cherry",
    grade: "A",
    totalGrams: 100000,
    availableGrams: 100000,
    pricePaisePerKg: 2500,
    minOrderGrams: 1000,
    status: "active",
    pickup: { type: "Point", coordinates: [77.45, 28.66] },
    expiresOn: new Date(Date.now() + 86400000),
  });

  console.log(`📦 Created Test Listing: ID=${testListing._id} with 100kg initial available`);

  // 2. Fire 5 concurrent requests reserving 50kg each (total demand 250kg > 100kg supply)
  console.log("⚡ Firing 5 concurrent reservation requests for 50kg each...");
  const attempts = await Promise.all([
    reserve(testListing._id, 50000),
    reserve(testListing._id, 50000),
    reserve(testListing._id, 50000),
    reserve(testListing._id, 50000),
    reserve(testListing._id, 50000),
  ]);

  const successful = attempts.filter((r) => r !== null);
  const failed = attempts.filter((r) => r === null);

  console.log(`📊 Results: Successful = ${successful.length}, Rejected (Protected) = ${failed.length}`);

  if (successful.length !== 2 || failed.length !== 3) {
    throw new Error(
      `❌ Atomic constraint violation! Expected 2 successes and 3 rejections, got ${successful.length} successes and ${failed.length} rejections.`
    );
  }

  // 3. Verify database state
  const updatedListing = await Listing.findById(testListing._id);
  if (updatedListing.availableGrams !== 0 || updatedListing.status !== "sold_out") {
    throw new Error(
      `❌ State mismatch: expected availableGrams=0 and status=sold_out, found availableGrams=${updatedListing.availableGrams} and status=${updatedListing.status}`
    );
  }
  console.log("🔒 Zero-oversell verified: remaining availableGrams = 0 and status = sold_out");

  // 4. Test release compensation (cancellation flow)
  console.log("🔄 Releasing 50kg compensation stock back to listing...");
  await release(testListing._id, 50000);

  const restoredListing = await Listing.findById(testListing._id);
  if (restoredListing.availableGrams !== 50000 || restoredListing.status !== "active") {
    throw new Error(
      `❌ Compensation release failed: expected 50000 grams and active, got ${restoredListing.availableGrams} and ${restoredListing.status}`
    );
  }
  console.log("✅ Stock compensation verified: availableGrams restored to 50kg and status set back to active");

  // Clean up test listing
  await Listing.findByIdAndDelete(testListing._id);
  console.log("🧹 Cleaned test listing artifact.");

  console.log("🎉 [PASS] check-inventory: Atomic concurrency and stock reservation passed 100%!\n");
  await mongoose.disconnect();
}

runInventoryCheck().catch((err) => {
  console.error("❌ Inventory check failed:", err);
  process.exit(1);
});
