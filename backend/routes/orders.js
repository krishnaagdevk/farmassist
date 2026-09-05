const express = require("express");
const Order = require("../models/Order");
const Listing = require("../models/Listing");
const PriceBenchmark = require("../models/PriceBenchmark");
const ChainAssumption = require("../models/ChainAssumption");
const { reserve, release } = require("../services/inventory");
const { calculateOrderTotals, quoteLogistics } = require("../services/pricing");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/orders
 * Buyer checkout: server calculates prices, reserves inventory atomically
 */
router.post("/", verifyToken, async (req, res) => {
  const { items, deliveryAddress, deliverySlot } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "no_items_in_order" });
  }

  if (!deliveryAddress || !deliveryAddress.line1 || !deliveryAddress.point) {
    return res.status(400).json({ error: "valid_delivery_address_required" });
  }

  const reservedListings = [];

  try {
    const enrichedItems = [];

    // 1. Process and atomically reserve each line item
    for (const item of items) {
      const { listingId, grams } = item;
      const weightGrams = parseInt(grams);

      if (!listingId || isNaN(weightGrams) || weightGrams <= 0) {
        throw { status: 400, message: "invalid_item_parameters" };
      }

      const listing = await reserve(listingId, weightGrams);
      if (!listing) {
        throw {
          status: 409,
          message: "insufficient_stock",
          listingId,
        };
      }
      reservedListings.push({ listingId, grams: weightGrams });

      const lineTotalPaise = Math.round((weightGrams / 1000) * listing.pricePaisePerKg);

      enrichedItems.push({
        listing: listing._id,
        farmer: listing.farmer,
        crop: listing.crop,
        grams: weightGrams,
        pricePaisePerKg: listing.pricePaisePerKg,
        lineTotalPaise,
      });
    }

    // 2. Logistics quote calculation
    const totalGrams = enrichedItems.reduce((s, i) => s + i.grams, 0);
    const logisticsFeePaise = quoteLogistics({ distanceKm: 12, grams: totalGrams });

    // 3. Central pricing authority calculation
    const totals = calculateOrderTotals({
      items: enrichedItems,
      logisticsFeePaise,
    });

    // 4. Generate Order ID
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `AD-${dateStr}-${randomHex}`;

    // 5. Build payouts structure (100% of produce subtotal goes to respective farmers)
    const payouts = enrichedItems.map((item) => ({
      farmer: item.farmer,
      amountPaise: item.lineTotalPaise,
      status: "held",
    }));

    const order = await Order.create({
      orderNo,
      buyer: req.user.sub,
      items: enrichedItems,
      produceSubtotalPaise: totals.produceSubtotalPaise,
      logisticsFeePaise: totals.logisticsFeePaise,
      platformFeePaise: totals.platformFeePaise,
      totalPaise: totals.totalPaise,
      deliveryAddress: {
        line1: deliveryAddress.line1,
        city: deliveryAddress.city || "Ghaziabad",
        pincode: deliveryAddress.pincode || "201001",
        point: {
          type: "Point",
          coordinates: deliveryAddress.point.coordinates || [77.4538, 28.6692],
        },
      },
      deliverySlot: deliverySlot || {
        date: new Date(Date.now() + 86400000),
        startHour: 9,
        endHour: 18,
      },
      status: process.env.MOCK_PAYMENTS === "true" ? "paid" : "pending_payment",
      payouts,
      statusLog: [
        {
          status: process.env.MOCK_PAYMENTS === "true" ? "paid" : "pending_payment",
          by: req.user.sub,
          note: "Order placed by buyer",
        },
      ],
    });

    return res.status(201).json({ order });
  } catch (err) {
    // Compensate and release any stock reserved prior to failure
    for (const resItem of reservedListings) {
      await release(resItem.listingId, resItem.grams);
    }

    console.error("Order placement error:", err);
    return res.status(err.status || 500).json({
      error: err.message || "order_creation_failed",
      listingId: err.listingId,
    });
  }
});

/**
 * GET /api/orders
 * Role-scoped order list
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    let query = {};

    if (req.user.role === "buyer") {
      query.buyer = req.user.sub;
    } else if (["farmer", "fpo"].includes(req.user.role)) {
      query["items.farmer"] = req.user.sub;
    }

    if (status) {
      query.status = status;
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("items.crop", "name nameHi category imageUrl")
      .populate("items.farmer", "name phone address")
      .populate("buyer", "name email phone")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.json({
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Fetch orders error:", err);
    return res.status(500).json({ error: "failed_to_fetch_orders" });
  }
});

/**
 * GET /api/orders/:id
 * Single order details
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.crop")
      .populate("items.farmer", "name phone address")
      .populate("buyer", "name email phone")
      .populate({
        path: "shipment",
        populate: { path: "vehicle driver" },
      })
      .lean();

    if (!order) return res.status(404).json({ error: "order_not_found" });

    // Authorization check
    const isOwner =
      req.user.role === "admin" ||
      order.buyer._id.toString() === req.user.sub ||
      order.items.some((i) => i.farmer._id.toString() === req.user.sub);

    if (!isOwner) {
      return res.status(403).json({ error: "unauthorized" });
    }

    return res.json({ order });
  } catch (err) {
    console.error("Order detail error:", err);
    return res.status(500).json({ error: "failed_to_fetch_order" });
  }
});

/**
 * GET /api/orders/:id/ledger
 * Transparency ledger breakdown comparing Direct vs Traditional Supply Chain
 */
router.get("/:id/ledger", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.crop")
      .lean();

    if (!order) return res.status(404).json({ error: "order_not_found" });

    let assumptions = await ChainAssumption.findOne().lean();
    if (!assumptions) {
      assumptions = {
        commissionAgentPct: 8,
        wholesalerMarginPct: 12,
        retailerMarginPct: 40,
        source: "Modelled from published supply chain & APMC mandi studies; configurable",
      };
    }

    const farmerReceivesPaise = order.produceSubtotalPaise;
    const consumerPaysPaise = order.totalPaise;
    const directFarmerSharePct = parseFloat(
      ((farmerReceivesPaise / consumerPaysPaise) * 100).toFixed(1)
    );

    // Traditional supply chain estimation
    // In traditional mandi system: farmer gets ~40-45% of retail price
    const traditionalConsumerPaysPaise = Math.round(consumerPaysPaise * 1.25);
    const commissionAgentPaise = Math.round(
      traditionalConsumerPaysPaise * (assumptions.commissionAgentPct / 100)
    );
    const wholesalerPaise = Math.round(
      traditionalConsumerPaysPaise * (assumptions.wholesalerMarginPct / 100)
    );
    const retailerPaise = Math.round(
      traditionalConsumerPaysPaise * (assumptions.retailerMarginPct / 100)
    );
    const traditionalFarmerReceivesPaise = Math.round(
      traditionalConsumerPaysPaise -
        (commissionAgentPaise + wholesalerPaise + retailerPaise)
    );
    const traditionalFarmerSharePct = parseFloat(
      (
        (traditionalFarmerReceivesPaise / traditionalConsumerPaysPaise) *
        100
      ).toFixed(1)
    );

    const farmerGainsPaise = farmerReceivesPaise - traditionalFarmerReceivesPaise;
    const farmerGainsPct = parseFloat(
      (
        (farmerGainsPaise / (traditionalFarmerReceivesPaise || 1)) *
        100
      ).toFixed(1)
    );
    const consumerSavesPaise =
      traditionalConsumerPaysPaise - consumerPaysPaise;
    const consumerSavesPct = parseFloat(
      (
        (consumerSavesPaise / traditionalConsumerPaysPaise) *
        100
      ).toFixed(1)
    );

    const ledger = {
      direct: {
        farmerReceivesPaise,
        platformFeePaise: order.platformFeePaise,
        logisticsFeePaise: order.logisticsFeePaise,
        consumerPaysPaise,
        farmerSharePct: directFarmerSharePct,
      },
      traditional: {
        farmerReceivesPaise: traditionalFarmerReceivesPaise,
        commissionAgentPaise,
        wholesalerPaise,
        retailerPaise,
        consumerPaysPaise: traditionalConsumerPaysPaise,
        farmerSharePct: traditionalFarmerSharePct,
      },
      savings: {
        farmerGainsPaise,
        farmerGainsPct,
        consumerSavesPaise,
        consumerSavesPct,
      },
      assumptions,
    };

    return res.json({ ledger });
  } catch (err) {
    console.error("Ledger calculation error:", err);
    return res.status(500).json({ error: "failed_to_generate_ledger" });
  }
});

/**
 * POST /api/orders/:id/cancel
 * Cancel order and release reserved stock
 */
router.post("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "order_not_found" });

    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({ error: "cannot_cancel_in_current_status" });
    }

    // Release stock back
    for (const item of order.items) {
      await release(item.listing, item.grams);
    }

    order.status = "cancelled";
    order.statusLog.push({
      status: "cancelled",
      by: req.user.sub,
      note: req.body.reason || "Cancelled by user",
    });
    await order.save();

    return res.json({ ok: true, order });
  } catch (err) {
    console.error("Cancel order error:", err);
    return res.status(500).json({ error: "cancel_failed" });
  }
});

module.exports = router;
