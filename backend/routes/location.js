const express = require("express");
const axios = require("axios");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "too_many_location_requests_try_later" },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helper to extract Indian address components from Google Geocoding / Place Details
 */
function extractGoogleAddressComponents(components = []) {
  let city = "";
  let district = "";
  let state = "";
  let pincode = "";

  if (!Array.isArray(components)) return { city: "", district: "", state: "", pincode: "" };

  for (const c of components) {
    if (c.types && c.types.includes("locality")) {
      city = c.long_name;
    } else if (c.types && c.types.includes("administrative_area_level_2")) {
      district = c.long_name;
    } else if (c.types && c.types.includes("administrative_area_level_1")) {
      state = c.long_name;
    } else if (c.types && c.types.includes("postal_code")) {
      pincode = c.long_name;
    }
  }

  return {
    city: city || district,
    district,
    state,
    pincode,
  };
}

/**
 * GET /api/location/autocomplete
 * High-performance Indian places autocomplete returning predictions without N+1 Google Places billing drains
 */
router.get("/autocomplete", geoLimiter, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.status(400).json({ error: "query_required" });

  const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  try {
    if (googleKey) {
      const gRes = await axios.get("https://maps.googleapis.com/maps/api/place/autocomplete/json", {
        params: {
          input: q,
          components: "country:in",
          language: "en",
          key: googleKey,
        },
        timeout: 4000,
      });

      if (gRes.data.status === "OK" && Array.isArray(gRes.data.predictions)) {
        return res.json({
          results: gRes.data.predictions.slice(0, 5).map((p) => ({
            formatted: p.description,
            name: p.structured_formatting?.main_text || p.description,
            placeId: p.place_id,
          })),
          source: "google_places",
        });
      }
    }

    // Fallback: OpenStreetMap Nominatim
    const osmRes = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q,
        format: "json",
        countrycodes: "in",
        limit: 5,
      },
      headers: { "User-Agent": "AgriDirectApp/1.0" },
      timeout: 4000,
    });

    const results = (osmRes.data || []).map((r) => ({
      formatted: r.display_name,
      name: r.name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      lng: parseFloat(r.lon),
      city: r.name,
    }));

    return res.json({ results, source: "osm_nominatim" });
  } catch (err) {
    console.error("Autocomplete error:", err.message);
    return res.status(500).json({ error: "autocomplete_failed" });
  }
});

/**
 * GET /api/location/place-details
 * Fetch geometry & detailed address metadata on-demand for a chosen Place ID
 */
router.get("/place-details", geoLimiter, async (req, res) => {
  const placeId = typeof req.query.placeId === "string" ? req.query.placeId.trim() : "";
  if (!placeId) return res.status(400).json({ error: "placeId_required" });

  const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!googleKey) return res.status(503).json({ error: "google_places_key_not_configured" });

  try {
    const dRes = await axios.get("https://maps.googleapis.com/maps/api/place/details/json", {
      params: {
        place_id: placeId,
        fields: "name,formatted_address,geometry,address_components",
        key: googleKey,
      },
      timeout: 4000,
    });

    if (dRes.data.status !== "OK") {
      return res.status(400).json({ error: dRes.data.status || "failed_to_fetch_place_details" });
    }

    const det = dRes.data.result;
    const geo = det?.geometry?.location;
    const meta = extractGoogleAddressComponents(det?.address_components);

    return res.json({
      name: det?.name,
      formatted: det?.formatted_address,
      lat: geo?.lat,
      lon: geo?.lng,
      lng: geo?.lng,
      city: meta.city,
      district: meta.district,
      state: meta.state,
      pincode: meta.pincode,
      source: "google_places",
    });
  } catch (err) {
    console.error("Place details error:", err.message);
    return res.status(500).json({ error: "place_details_failed" });
  }
});

/**
 * Shared reverse geocoding handler mounted safely on both /reverse-geocode and /reverse
 */
async function reverseGeocodeHandler(req, res) {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon ?? req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: "valid_lat_and_lon_required" });
  }

  const googleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  try {
    if (googleKey) {
      const gRes = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          latlng: `${lat},${lon}`,
          key: googleKey,
        },
        timeout: 4000,
      });

      if (gRes.data.status === "OK" && gRes.data.results?.[0]) {
        const best = gRes.data.results[0];
        const meta = extractGoogleAddressComponents(best.address_components);

        return res.json({
          address: best.formatted_address,
          formatted: best.formatted_address,
          city: meta.city,
          district: meta.district,
          state: meta.state,
          pincode: meta.pincode,
          source: "google_geocoding",
        });
      }
    }

    // Fallback: OpenStreetMap Nominatim
    const osmRes = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat, lon, format: "json" },
      headers: { "User-Agent": "AgriDirectApp/1.0" },
      timeout: 4000,
    });

    return res.json({
      address: osmRes.data.display_name,
      formatted: osmRes.data.display_name,
      city: osmRes.data.address?.city || osmRes.data.address?.town || osmRes.data.address?.county,
      state: osmRes.data.address?.state,
      pincode: osmRes.data.address?.postcode,
      source: "osm_nominatim",
    });
  } catch (err) {
    console.error("Reverse geocode error:", err.message);
    return res.status(500).json({ error: "location_service_failed" });
  }
}

router.get("/reverse-geocode", geoLimiter, reverseGeocodeHandler);
router.get("/reverse", geoLimiter, reverseGeocodeHandler);

module.exports = router;
