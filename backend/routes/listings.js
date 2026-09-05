const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const Listing = require("../models/Listing");
const Crop = require("../models/Crop");
const User = require("../models/User");
const PriceBenchmark = require("../models/PriceBenchmark");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

/**
 * GET /api/listings
 * Public storefront query with geoNear, filters, pagination
 */
router.get("/", async (req, res) => {
  try {
    const {
      crop,
      lat,
      lng,
      radiusKm = 50,
      grade,
      organic,
      minGrams,
      maxPricePaisePerKg,
      sort = "distance",
      page = 1,
      limit = 24,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 24));
    const skip = (pageNum - 1) * limitNum;

    const pipeline = [];

    // 1. GeoNear stage if coordinates provided
    if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      pipeline.push({
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)], // [lng, lat]
          },
          distanceField: "distanceMeters",
          maxDistance: (parseFloat(radiusKm) || 50) * 1000,
          query: { status: "active", availableGrams: { $gt: 0 } },
          spherical: true,
        },
      });
    } else {
      pipeline.push({
        $match: { status: "active", availableGrams: { $gt: 0 } },
      });
    }

    // 2. Crop filter by slug if provided
    if (crop) {
      const cropDoc = await Crop.findOne({ slug: crop.toLowerCase() }).lean();
      if (cropDoc) {
        pipeline.push({ $match: { crop: cropDoc._id } });
      }
    }

    // 3. Other filters
    const additionalMatch = {};
    if (grade) additionalMatch.grade = grade;
    if (organic === "true") additionalMatch.organic = true;
    if (minGrams) additionalMatch.availableGrams = { $gte: parseInt(minGrams) };
    if (maxPricePaisePerKg) {
      additionalMatch.pricePaisePerKg = { $lte: parseInt(maxPricePaisePerKg) };
    }
    if (Object.keys(additionalMatch).length > 0) {
      pipeline.push({ $match: additionalMatch });
    }

    // 4. Lookups
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "farmer",
          foreignField: "_id",
          as: "farmerInfo",
        },
      },
      { $unwind: "$farmerInfo" },
      {
        $lookup: {
          from: "crops",
          localField: "crop",
          foreignField: "_id",
          as: "cropInfo",
        },
      },
      { $unwind: "$cropInfo" }
    );

    // 5. Sorting
    if (sort === "price") {
      pipeline.push({ $sort: { pricePaisePerKg: 1 } });
    } else if (sort === "freshness") {
      pipeline.push({ $sort: { harvestedOn: -1 } });
    } else if (!lat || !lng) {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // 6. Pagination with facet
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limitNum },
          {
            $project: {
              _id: 1,
              variety: 1,
              grade: 1,
              organic: 1,
              totalGrams: 1,
              availableGrams: 1,
              pricePaisePerKg: 1,
              minOrderGrams: 1,
              harvestedOn: 1,
              expiresOn: 1,
              pickup: 1,
              images: 1,
              status: 1,
              distanceKm: {
                $cond: {
                  if: { $ifNull: ["$distanceMeters", false] },
                  then: { $round: [{ $divide: ["$distanceMeters", 1000] }, 1] },
                  else: null,
                },
              },
              freshnessDays: {
                $round: [
                  {
                    $divide: [
                      { $subtract: [new Date(), "$harvestedOn"] },
                      86400000,
                    ],
                  },
                  1,
                ],
              },
              crop: {
                _id: "$cropInfo._id",
                slug: "$cropInfo.slug",
                name: "$cropInfo.name",
                nameHi: "$cropInfo.nameHi",
                category: "$cropInfo.category",
                imageUrl: "$cropInfo.imageUrl",
              },
              farmer: {
                _id: "$farmerInfo._id",
                name: "$farmerInfo.name",
                village: "$farmerInfo.address.village",
                district: "$farmerInfo.address.district",
                ratingAvg: "$farmerInfo.ratingAvg",
                kycStatus: "$farmerInfo.kycStatus",
              },
            },
          },
        ],
      },
    });

    const result = await Listing.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const listings = result[0]?.data || [];

    return res.json({
      listings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Listings fetch error:", err);
    return res.status(500).json({ error: "failed_to_fetch_listings" });
  }
});

/**
 * GET /api/listings/mine
 * Current farmer's listings with aggregate statistics
 */
router.get("/mine", verifyToken, requireRole("farmer", "fpo"), async (req, res) => {
  try {
    const listings = await Listing.find({ farmer: req.user.sub })
      .populate("crop")
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      totalListings: listings.length,
      activeListings: listings.filter((l) => l.status === "active").length,
      totalGramsAvailable: listings.reduce((s, l) => s + (l.status === "active" ? l.availableGrams : 0), 0),
      totalGramsSold: listings.reduce((s, l) => s + (l.totalGrams - l.availableGrams), 0),
    };

    return res.json({ listings, stats });
  } catch (err) {
    console.error("My listings error:", err);
    return res.status(500).json({ error: "failed_to_fetch_my_listings" });
  }
});

/**
 * GET /api/listings/:id
 * Single listing details + price benchmark comparison
 */
router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("crop")
      .populate("farmer", "name phone address kycStatus ratingAvg ratingCount")
      .lean();

    if (!listing) {
      return res.status(404).json({ error: "listing_not_found" });
    }

    // Fetch latest benchmark comparison for this crop
    let priceComparison = null;
    if (listing.crop) {
      const benchmark = await PriceBenchmark.findOne({ crop: listing.crop._id })
        .sort({ date: -1 })
        .lean();

      if (benchmark) {
        priceComparison = {
          farmerPricePaisePerKg: listing.pricePaisePerKg,
          mandiModalPaisePerKg: benchmark.mandiModalPaisePerKg,
          retailPaisePerKg: benchmark.retailPaisePerKg,
          consumerSavingsPaisePerKg: Math.max(0, benchmark.retailPaisePerKg - listing.pricePaisePerKg),
          source: benchmark.source,
          market: benchmark.market,
        };
      }
    }

    return res.json({ listing, priceComparison });
  } catch (err) {
    console.error("Listing detail error:", err);
    return res.status(500).json({ error: "failed_to_fetch_listing" });
  }
});

/**
 * POST /api/listings
 * Create new produce listing
 */
router.post("/", verifyToken, requireRole("farmer", "fpo"), async (req, res) => {
  try {
    const {
      cropId,
      variety,
      grade = "A",
      organic = false,
      totalGrams,
      pricePaisePerKg,
      minOrderGrams = 1000,
      harvestedOn,
      pickup,
      pickupWindow,
      images,
    } = req.body;

    if (!cropId || !totalGrams || !pricePaisePerKg) {
      return res.status(400).json({ error: "missing_required_fields" });
    }

    if (pricePaisePerKg <= 0 || totalGrams <= 0) {
      return res.status(400).json({ error: "values_must_be_positive" });
    }

    const cropDoc = await Crop.findById(cropId);
    if (!cropDoc) {
      return res.status(400).json({ error: "invalid_crop" });
    }

    const harvestDate = harvestedOn ? new Date(harvestedOn) : new Date();
    const expiresOn = new Date(harvestDate.getTime() + (cropDoc.shelfLifeDays || 7) * 86400000);

    let pickupPoint = pickup;
    if (!pickupPoint || !pickupPoint.coordinates) {
      const user = await User.findById(req.user.sub);
      if (user?.location?.coordinates) {
        pickupPoint = user.location;
      } else {
        pickupPoint = { type: "Point", coordinates: [77.4538, 28.6692] }; // Default depot coordinates
      }
    }

    const listing = await Listing.create({
      farmer: req.user.sub,
      fpo: req.user.role === "fpo" ? req.user.sub : null,
      crop: cropDoc._id,
      variety: variety || "Standard",
      grade,
      organic: Boolean(organic),
      totalGrams: Number(totalGrams),
      availableGrams: Number(totalGrams),
      pricePaisePerKg: Number(pricePaisePerKg),
      minOrderGrams: Number(minOrderGrams) || 1000,
      harvestedOn: harvestDate,
      expiresOn,
      pickup: pickupPoint,
      pickupWindow: pickupWindow || { startHour: 6, endHour: 18 },
      images: images || [],
      status: "active",
    });

    return res.status(201).json({ listing });
  } catch (err) {
    console.error("Listing create error:", err);
    return res.status(500).json({ error: "failed_to_create_listing" });
  }
});

/**
 * POST /api/listings/bulk
 * CSV bulk listing upload for FPOs & large farms
 */
router.post("/bulk", verifyToken, requireRole("farmer", "fpo"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "csv_file_required" });
    }

    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const created = [];
    const errors = [];

    const user = await User.findById(req.user.sub);
    const defaultCoords = user?.location?.coordinates || [77.4538, 28.6692];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const cropSlug = (row.crop_slug || row.crop || "").toLowerCase().trim();
        const cropDoc = await Crop.findOne({ slug: cropSlug });
        if (!cropDoc) {
          errors.push({ row: i + 1, message: `Crop not found: ${cropSlug}` });
          continue;
        }

        const totalKg = parseFloat(row.total_kg || row.quantity_kg);
        const pricePerKg = parseFloat(row.price_per_kg || row.price);

        if (isNaN(totalKg) || totalKg <= 0 || isNaN(pricePerKg) || pricePerKg <= 0) {
          errors.push({ row: i + 1, message: "Invalid quantity or price" });
          continue;
        }

        const harvestedOn = row.harvested_on ? new Date(row.harvested_on) : new Date();
        const expiresOn = new Date(harvestedOn.getTime() + (cropDoc.shelfLifeDays || 7) * 86400000);

        const listing = await Listing.create({
          farmer: req.user.sub,
          fpo: req.user.role === "fpo" ? req.user.sub : null,
          crop: cropDoc._id,
          variety: row.variety || "Standard",
          grade: ["A", "B", "C"].includes(row.grade) ? row.grade : "A",
          organic: row.organic === "true" || row.organic === "1",
          totalGrams: Math.round(totalKg * 1000),
          availableGrams: Math.round(totalKg * 1000),
          pricePaisePerKg: Math.round(pricePerKg * 100),
          minOrderGrams: (parseFloat(row.min_order_kg) || 1) * 1000,
          harvestedOn,
          expiresOn,
          pickup: { type: "Point", coordinates: defaultCoords },
          status: "active",
        });

        created.push(listing._id);
      } catch (rowErr) {
        errors.push({ row: i + 1, message: rowErr.message });
      }
    }

    return res.json({
      ok: true,
      createdCount: created.length,
      errorCount: errors.length,
      errors,
    });
  } catch (err) {
    console.error("Bulk upload error:", err);
    return res.status(500).json({ error: "bulk_upload_failed" });
  }
});

/**
 * PATCH /api/listings/:id
 * Update listing price or toggle status
 */
router.patch("/:id", verifyToken, requireRole("farmer", "fpo", "admin"), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "listing_not_found" });

    if (req.user.role !== "admin" && !listing.farmer.equals(req.user.sub)) {
      return res.status(403).json({ error: "unauthorized" });
    }

    const { pricePaisePerKg, status, availableGrams } = req.body;
    if (pricePaisePerKg) listing.pricePaisePerKg = Number(pricePaisePerKg);
    if (status) listing.status = status;
    if (availableGrams !== undefined) {
      listing.availableGrams = Math.min(listing.totalGrams, Number(availableGrams));
    }

    await listing.save();
    return res.json({ listing });
  } catch (err) {
    console.error("Listing update error:", err);
    return res.status(500).json({ error: "update_failed" });
  }
});

module.exports = router;
