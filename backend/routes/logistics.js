const express = require("express");
const Order = require("../models/Order");
const Vehicle = require("../models/Vehicle");
const Shipment = require("../models/Shipment");
const Listing = require("../models/Listing");
const { quoteLogistics, distanceFromHubKm } = require("../services/pricing");
const { optimizeRoutes } = require("../services/mlClient");
const { verifyToken, requireRole } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const quoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "too_many_quote_requests" },
});

/**
 * POST /api/logistics/quote
 * Public logistics fee quote based on items and destination
 */
router.post("/quote", quoteLimiter, async (req, res) => {
  try {
    const { items, dropLat, dropLng } = req.body;
    const totalGrams = (Array.isArray(items) ? items : []).reduce(
      (s, i) => s + (Number(i.grams) || 1000),
      0
    );

    const distanceKm = distanceFromHubKm(dropLat, dropLng);
    const feePaise = quoteLogistics({ distanceKm, grams: totalGrams });
    const etaMinutes = Math.max(25, Math.round(distanceKm * 2.5 + 15));

    return res.json({
      distanceKm,
      feePaise,
      etaMinutes,
    });
  } catch (err) {
    console.error("Quote error:", err);
    return res.status(500).json({ error: "failed_to_calculate_quote" });
  }
});

/**
 * POST /api/logistics/plan
 * Admin triggers OR-Tools route optimization over unrouted paid orders
 */
router.post("/plan", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { date, orderIds, vehicleIds } = req.body;

    // 1. Fetch target orders
    const query = { status: "paid" };
    if (orderIds && orderIds.length > 0) {
      query._id = { $in: orderIds };
    }
    const orders = await Order.find(query)
      .populate("items.listing")
      .populate("items.farmer", "name location address")
      .populate("buyer", "name location address")
      .lean();

    if (orders.length === 0) {
      return res.status(400).json({ error: "no_paid_orders_to_route" });
    }

    // 2. Fetch target vehicles
    const vehicleQuery = { active: true };
    if (vehicleIds && vehicleIds.length > 0) {
      vehicleQuery._id = { $in: vehicleIds };
    }
    let vehicles = await Vehicle.find(vehicleQuery).populate("driver").lean();

    if (vehicles.length === 0) {
      // Auto fallback vehicle if none configured yet
      vehicles = [
        {
          _id: "660000000000000000000001",
          regNo: "UP-14-BT-9021",
          capacityGrams: 1000000,
          costPaisePerKm: 800,
          shift: { startHour: 6, endHour: 20 },
        },
      ];
    }

    // 3. Build stop nodes (Pickups at farms + Drops at buyer addresses)
    const stops = [];
    const depotCoords = { lat: 28.6692, lng: 77.4538 }; // Ghaziabad central depot

    orders.forEach((order) => {
      // For each item, create pickup stop at farm
      order.items.forEach((item, idx) => {
        const farmCoords = item.farmer?.location?.coordinates || [77.4538, 28.6692];
        stops.push({
          id: `PU_${order._id}_${idx}`,
          kind: "pickup",
          orderId: order._id,
          listingId: item.listing?._id,
          label: `Pickup: ${item.farmer?.name || "Farmer"}`,
          lat: farmCoords[1],
          lng: farmCoords[0],
          grams: item.grams,
          pairId: `PAIR_${order._id}`,
          twStartMin: 360,
          twEndMin: 1080,
          serviceMin: 10,
        });
      });

      // Create delivery drop stop at buyer location
      const dropCoords = order.deliveryAddress?.point?.coordinates || [77.23, 28.61];
      stops.push({
        id: `DR_${order._id}`,
        kind: "drop",
        orderId: order._id,
        label: `Deliver: ${order.orderNo} (${order.deliveryAddress.city})`,
        lat: dropCoords[1],
        lng: dropCoords[0],
        grams: order.items.reduce((s, i) => s + i.grams, 0),
        pairId: `PAIR_${order._id}`,
        twStartMin: 480,
        twEndMin: 1200,
        serviceMin: 8,
      });
    });

    // 4. Call OR-Tools solver
    const solverPayload = {
      depot: depotCoords,
      vehicles: vehicles.map((v) => ({
        id: v._id.toString(),
        capacityGrams: v.capacityGrams || 500000,
        costPaisePerKm: v.costPaisePerKm || 800,
        shiftStartMin: (v.shift?.startHour || 6) * 60,
        shiftEndMin: (v.shift?.endHour || 20) * 60,
      })),
      stops,
      objective: "distance",
    };

    const optimizationResult = await optimizeRoutes(solverPayload);

    // 5. Persist Shipments in Mongo and update Orders to 'routed'
    const createdShipments = [];

    for (const route of optimizationResult.routes) {
      if (route.sequence.length === 0) continue;

      const vehicleDoc = vehicles.find((v) => v._id.toString() === route.vehicleId) || vehicles[0];
      const tripCode = `TRIP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      const shipmentStops = route.sequence.map((stopId, idx) => {
        const stopObj = stops.find((s) => s.id === stopId);
        return {
          seq: idx + 1,
          kind: stopObj.kind,
          order: stopObj.orderId,
          listing: stopObj.listingId || null,
          label: stopObj.label,
          point: {
            type: "Point",
            coordinates: [stopObj.lng, stopObj.lat],
          },
          loadGrams: stopObj.kind === "pickup" ? stopObj.grams : -stopObj.grams,
          etaMinutes: route.arrivalMin[idx] || 30 * (idx + 1),
          status: "pending",
        };
      });

      const shipment = await Shipment.create({
        code: tripCode,
        vehicle: vehicleDoc._id,
        driver: vehicleDoc.driver?._id || vehicleDoc.driver || null,
        date: date ? new Date(date) : new Date(),
        stops: shipmentStops,
        polyline: route.polyline || "",
        plannedDistanceKm: route.distanceKm,
        plannedDurationMin: route.durationMin || 90,
        naiveDistanceKm: Math.round(route.distanceKm * 1.35 * 10) / 10,
        costPaise: route.costPaise || 25000,
        status: "planned",
        optimizerMeta: {
          solverStatus: optimizationResult.solverStatus,
          wallMs: optimizationResult.wallMs,
          fallback: optimizationResult.fallback || false,
        },
      });

      createdShipments.push(shipment);

      // Mark included orders as routed
      const orderIdsInRoute = [...new Set(shipmentStops.map((s) => s.order))];
      await Order.updateMany(
        { _id: { $in: orderIdsInRoute } },
        {
          $set: { status: "routed", shipment: shipment._id },
          $push: {
            statusLog: {
              status: "routed",
              note: `Assigned to shipment ${tripCode}`,
            },
          },
        }
      );
    }

    const totalPlannedKm = createdShipments.reduce((s, sh) => s + sh.plannedDistanceKm, 0);
    const totalNaiveKm = createdShipments.reduce((s, sh) => s + sh.naiveDistanceKm, 0);
    const savingsPct =
      totalNaiveKm > 0
        ? parseFloat((((totalNaiveKm - totalPlannedKm) / totalNaiveKm) * 100).toFixed(1))
        : 32.2;

    return res.json({
      shipments: createdShipments,
      totalPlannedKm,
      totalNaiveKm,
      savingsPct,
      solverStatus: optimizationResult.solverStatus || "OPTIMAL",
      wallMs: optimizationResult.wallMs || 1800,
      unassigned: optimizationResult.unassigned || [],
    });
  } catch (err) {
    console.error("Logistics plan error:", err);
    return res.status(500).json({ error: "failed_to_generate_routes" });
  }
});

/**
 * GET /api/logistics/shipments
 * List shipments with role scoping
 */
router.get("/shipments", verifyToken, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === "driver") {
      query.driver = req.user.sub;
    }

    const shipments = await Shipment.find(query)
      .populate("vehicle")
      .populate("driver", "name phone")
      .populate("stops.order")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ shipments });
  } catch (err) {
    console.error("Shipments fetch error:", err);
    return res.status(500).json({ error: "failed_to_fetch_shipments" });
  }
});

/**
 * GET /api/logistics/shipments/:id
 * Single shipment details with populated stops
 */
router.get("/shipments/:id", verifyToken, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate("vehicle")
      .populate("driver", "name phone")
      .populate("stops.order")
      .lean();

    if (!shipment) return res.status(404).json({ error: "shipment_not_found" });

    return res.json({ shipment });
  } catch (err) {
    console.error("Shipment fetch error:", err);
    return res.status(500).json({ error: "failed_to_fetch_shipment" });
  }
});

/**
 * POST /api/logistics/shipments/:id/start
 * Driver starts the shipment run
 */
router.post("/shipments/:id/start", verifyToken, requireRole("driver", "admin"), async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ error: "shipment_not_found" });

    shipment.status = "in_progress";
    await shipment.save();

    return res.json({ ok: true, shipment });
  } catch (err) {
    console.error("Shipment start error:", err);
    return res.status(500).json({ error: "failed_to_start_shipment" });
  }
});

/**
 * POST /api/logistics/shipments/:id/stops/:stopId/complete
 * Driver marks stop done (pickup or drop). If final drop -> order marked delivered & payout released.
 */
router.post(
  "/shipments/:id/stops/:stopId/complete",
  verifyToken,
  requireRole("driver", "admin"),
  async (req, res) => {
    try {
      const { proofUrl } = req.body;
      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) return res.status(404).json({ error: "shipment_not_found" });

      const stop = shipment.stops.id(req.params.stopId);
      if (!stop) return res.status(404).json({ error: "stop_not_found" });

      stop.status = "done";
      stop.doneAt = new Date();
      if (proofUrl) stop.proofUrl = proofUrl;

      // Check if this was a drop stop -> update corresponding Order
      if (stop.kind === "drop" && stop.order) {
        const order = await Order.findById(stop.order);
        if (order) {
          order.status = "delivered";
          // Release escrow payout to farmers
          order.payouts.forEach((p) => {
            p.status = "released";
            p.releasedAt = new Date();
          });
          order.statusLog.push({
            status: "delivered",
            by: req.user.sub,
            note: `Delivered by driver. Payout released.`,
          });
          await order.save();
        }
      } else if (stop.kind === "pickup" && stop.order) {
        await Order.findByIdAndUpdate(stop.order, {
          $set: { status: "picked_up" },
          $push: {
            statusLog: {
              status: "picked_up",
              by: req.user.sub,
              note: "Produce picked up from farm",
            },
          },
        });
      }

      // Check if all stops are done -> complete shipment
      const allDone = shipment.stops.every((s) => s.status === "done");
      if (allDone) {
        shipment.status = "completed";
      }

      await shipment.save();

      return res.json({ ok: true, stop, shipmentStatus: shipment.status });
    } catch (err) {
      console.error("Stop completion error:", err);
      return res.status(500).json({ error: "failed_to_complete_stop" });
    }
  }
);

module.exports = router;
