const express = require("express");
const { requireAdminAuth } = require("../middleware/auth");
const Chat = require("../models/Chat");
const User = require("../models/User");
const Listing = require("../models/Listing");
const Order = require("../models/Order");
const Shipment = require("../models/Shipment");

const router = express.Router();

let statsCache = { at: 0, data: null };

/**
 * GET /api/admin/platform-stats
 * High-level ecosystem metrics with aggregation pipeline and 60s in-memory cache
 */
router.get("/platform-stats", async (req, res) => {
  try {
    if (Date.now() - statsCache.at < 60000 && statsCache.data) {
      return res.json(statsCache.data);
    }

    const [userCounts, orderAgg, shipAgg, activeListingsCount] = await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: { $in: ["paid", "confirmed", "routed", "picked_up", "delivered"] } } },
        {
          $group: {
            _id: null,
            totalGmvPaise: { $sum: "$totalPaise" },
            totalGrams: {
              $sum: {
                $reduce: {
                  input: "$items",
                  initialValue: 0,
                  in: { $add: ["$$value", { $ifNull: ["$$this.grams", 0] }] },
                },
              },
            },
          },
        },
      ]),
      Shipment.aggregate([
        {
          $group: {
            _id: null,
            totalPlannedKm: { $sum: "$plannedDistanceKm" },
            totalNaiveKm: { $sum: "$naiveDistanceKm" },
          },
        },
      ]),
      Listing.countDocuments({ status: "active", availableGrams: { $gt: 0 } }),
    ]);

    const roleMap = {};
    (userCounts || []).forEach((u) => {
      roleMap[u._id] = u.count;
    });

    const farmerCount = roleMap["farmer"] || 0;
    const fpoCount = roleMap["fpo"] || 0;
    const buyerCount = roleMap["buyer"] || 0;

    const orderData = orderAgg?.[0] || { totalGmvPaise: 0, totalGrams: 0 };
    const shipData = shipAgg?.[0] || { totalPlannedKm: 0, totalNaiveKm: 0 };

    const produceTradedKg = Math.round(orderData.totalGrams / 1000);
    const grossMerchandiseValuePaise = orderData.totalGmvPaise;

    // Modelled realizations (24% extra for farmers, 22% savings for consumers)
    const farmerExtraIncomePaise = Math.round(grossMerchandiseValuePaise * 0.24);
    const consumerSavingsPaise = Math.round(grossMerchandiseValuePaise * 0.22);

    const kmSaved = Math.max(0, shipData.totalNaiveKm - shipData.totalPlannedKm);
    const co2SavedKg = Math.round(kmSaved * 0.19 * 10) / 10;
    const mileageSavedPct =
      shipData.totalNaiveKm > 0
        ? Math.round(((shipData.totalNaiveKm - shipData.totalPlannedKm) / shipData.totalNaiveKm) * 100)
        : 0;

    const payload = {
      farmersOnboarded: farmerCount,
      fposOnboarded: fpoCount,
      buyersActive: buyerCount,
      activeListings: activeListingsCount,
      produceTradedKg,
      grossMerchandiseValuePaise,
      farmerExtraIncomePaise,
      consumerSavingsPaise,
      co2SavedKg,
      mileageSavedPct,
      cachedAt: new Date().toISOString(),
    };

    statsCache = { at: Date.now(), data: payload };
    return res.json(payload);
  } catch (err) {
    console.error("Platform stats error:", err);
    return res.status(500).json({ error: "failed_to_fetch_platform_stats" });
  }
});

// Escalation
router.post("/escalate", requireAdminAuth, async (req, res) => {
  const { chatId, reason } = req.body;
  if (!chatId) return res.status(400).json({ error: "chatId_required" });

  const chat = await Chat.findById(chatId);
  if (chat) {
    chat.messages.push({
      role: "system",
      content: `[Escalated to Officer]: ${reason || "User requested human agent"}`,
      timestamp: new Date(),
    });
    await chat.save();
  }
  return res.json({ ok: true, status: "escalated" });
});

module.exports = router;
