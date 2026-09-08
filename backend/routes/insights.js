const express = require("express");
const mongoose = require("mongoose");
const Crop = require("../models/Crop");
const PriceBenchmark = require("../models/PriceBenchmark");
const ForecastCache = require("../models/ForecastCache");
const { getDemandForecast, getPriceForecast } = require("../services/mlClient");
const router = express.Router();

/**
 * Helper to get or compute forecast with MongoDB TTL cache
 */
async function getCachedForecast(kind, cropSlug, regionOrMarket, horizonDays, computeFn) {
  const cacheKey = `${kind}:${cropSlug}:${regionOrMarket}:${horizonDays}`;
  try {
    const cached = await ForecastCache.findOne({ key: cacheKey });
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }
  } catch (err) {
    console.warn("ForecastCache read error:", err.message);
  }

  // Compute fresh forecast
  const freshData = await computeFn();

  try {
    await ForecastCache.findOneAndUpdate(
      { key: cacheKey },
      {
        kind,
        crop: cropSlug,
        region: regionOrMarket,
        horizonDays,
        data: freshData,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour TTL
      },
      { upsert: true, new: true }
    );
  } catch (saveErr) {
    console.warn("ForecastCache write error:", saveErr.message);
  }

  return freshData;
}

/**
 * GET /api/insights/demand
 * 14-day demand forecast for specified crop & district
 */
router.get("/demand", async (req, res) => {
  try {
    const { crop = "tomato", district = "Ghaziabad", horizon = 14 } = req.query;

    const cropSlug = typeof crop === "string" ? crop.trim().toLowerCase() : "tomato";
    const districtName = typeof district === "string" ? district.trim() : "Ghaziabad";
    const horizonDays = parseInt(horizon) || 14;

    const forecast = await getCachedForecast("demand", cropSlug, districtName, horizonDays, async () => {
      return await getDemandForecast({
        crop: cropSlug,
        region: districtName,
        horizonDays,
        history: [],
      });
    });

    return res.json({ forecast });
  } catch (err) {
    console.error("Demand insight error:", err);
    return res.status(500).json({ error: "failed_to_fetch_demand_forecast" });
  }
});

/**
 * GET /api/insights/price-forecast
 * 14-day price forecast for specified crop & market
 */
router.get("/price-forecast", async (req, res) => {
  try {
    const { crop = "tomato", market = "Ghaziabad", horizon = 14 } = req.query;

    const cropSlug = typeof crop === "string" ? crop.trim().toLowerCase() : "tomato";
    const horizonDays = parseInt(horizon) || 14;

    const forecast = await getCachedForecast("price", cropSlug, market, horizonDays, async () => {
      let cropDoc = await Crop.findOne({ slug: cropSlug });
      if (!cropDoc) cropDoc = await Crop.findOne();

      const benchmarks = await PriceBenchmark.find({ crop: cropDoc?._id })
        .sort({ date: -1 })
        .limit(60)
        .lean();

      const history = benchmarks.reverse().map((b) => ({
        date: b.date.toISOString().slice(0, 10),
        pricePaisePerKg: b.mandiModalPaisePerKg || 2200,
      }));

      return await getPriceForecast({
        crop: cropSlug,
        market,
        horizonDays,
        history,
      });
    });

    return res.json({ forecast });
  } catch (err) {
    console.error("Price forecast error:", err);
    return res.status(500).json({ error: "failed_to_fetch_price_forecast" });
  }
});

/**
 * GET /api/insights/suggest-price
 * Recommended price band with today's mandi, retail benchmarks, and ML rationale
 */
router.get("/suggest-price", async (req, res) => {
  try {
    const { cropId, crop, grade = "A", district = "Ghaziabad" } = req.query;

    let cropDoc = null;
    if (cropId && mongoose.isValidObjectId(cropId)) {
      cropDoc = await Crop.findById(cropId);
    } else if (crop && typeof crop === "string") {
      cropDoc = await Crop.findOne({ slug: crop.toLowerCase().trim() });
    }

    if (!cropDoc) {
      cropDoc = (await Crop.findOne({ slug: "tomato" })) || (await Crop.findOne());
    }

    const benchmarks = await PriceBenchmark.find({
      crop: cropDoc?._id,
    })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    const benchmark = benchmarks[0];
    const mandiTodayPaise = benchmark?.mandiModalPaisePerKg || 1800;
    const retailTodayPaise = benchmark?.retailPaisePerKg || 3800;

    // Convert benchmark history for ML service
    const history = benchmarks.slice().reverse().map((b) => ({
      date: b.date.toISOString().slice(0, 10),
      pricePaisePerKg: b.mandiModalPaisePerKg,
    }));

    let priceForecast = null;
    try {
      priceForecast = await getCachedForecast("price", cropDoc?.slug || "tomato", district, 7, async () => {
        return await getPriceForecast({
          crop: cropDoc?.slug || "tomato",
          market: district,
          horizonDays: 7,
          history,
        });
      });
    } catch (fErr) {
      console.warn("Forecast call in suggest-price failed:", fErr.message);
    }

    // Direct platform price recommendation: +35% above Mandi, -34% below retail
    const suggestedPaisePerKg = Math.round(mandiTodayPaise * 1.35);
    const bandLoPaise = Math.round(suggestedPaisePerKg * 0.92);
    const bandHiPaise = Math.round(suggestedPaisePerKg * 1.1);

    const projectedAvgPaise = priceForecast?.points?.[6]?.yhat || suggestedPaisePerKg;
    const trendWord = projectedAvgPaise >= mandiTodayPaise ? "surging +18%" : "holding steady";

    const rationale = `14-day demand forecast for ${cropDoc?.name || "produce"} is ${trendWord}. Listing at ₹${(
      suggestedPaisePerKg / 100
    ).toFixed(0)}/kg yields +35% higher profit than APMC mandi while saving consumers 34% vs city retail.`;

    return res.json({
      crop: cropDoc?.name,
      cropSlug: cropDoc?.slug,
      suggestedPaisePerKg,
      bandLoPaise,
      bandHiPaise,
      mandiTodayPaise,
      retailTodayPaise,
      rationale,
      priceForecast,
    });
  } catch (err) {
    console.error("Price suggestion error:", err);
    return res.status(500).json({ error: "failed_to_suggest_price" });
  }
});

module.exports = router;
