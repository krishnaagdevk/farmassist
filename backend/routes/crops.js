const express = require("express");
const Crop = require("../models/Crop");
const router = express.Router();

let cache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

router.get("/", async (req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL_MS) {
      return res.json({ crops: cache });
    }

    const crops = await Crop.find({}).sort({ name: 1 }).lean();
    cache = crops;
    cacheTime = now;

    return res.json({ crops });
  } catch (err) {
    console.error("Error fetching crops:", err);
    return res.status(500).json({ error: "failed_to_fetch_crops" });
  }
});

module.exports = router;
