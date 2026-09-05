const Listing = require("../models/Listing");

/**
 * Atomically reserve stock on a listing
 * Returns updated listing or null if insufficient stock
 */
async function reserve(listingId, grams) {
  const res = await Listing.findOneAndUpdate(
    {
      _id: listingId,
      status: "active",
      availableGrams: { $gte: grams },
    },
    {
      $inc: { availableGrams: -grams },
    },
    { new: true }
  );

  if (!res) return null;

  if (res.availableGrams === 0) {
    await Listing.updateOne({ _id: listingId }, { $set: { status: "sold_out" } });
  }

  return res;
}

/**
 * Release reserved stock back to available inventory (compensation on failure or cancellation)
 */
async function release(listingId, grams) {
  await Listing.updateOne(
    { _id: listingId },
    {
      $inc: { availableGrams: grams },
      $set: { status: "active" },
    }
  );
}

module.exports = {
  reserve,
  release,
};
