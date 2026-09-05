const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * Location Autocomplete Proxy (Proxies Geoapify or OSM Nominatim without exposing API keys to browser)
 */
router.get("/autocomplete", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "query_required" });

  try {
    const geoapifyKey = process.env.GEOAPIFY_API_KEY;
    if (geoapifyKey) {
      const geoRes = await axios.get("https://api.geoapify.com/v1/geocode/autocomplete", {
        params: {
          text: q,
          apiKey: geoapifyKey,
          filter: "countrycode:in",
          format: "json",
        },
      });

      const results = (geoRes.data.results || []).map((r) => ({
        formatted: r.formatted,
        lat: r.lat,
        lon: r.lon,
        city: r.city || r.county || r.state,
      }));
      return res.json({ results });
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
    });

    const results = (osmRes.data || []).map((r) => ({
      formatted: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      city: r.name,
    }));

    return res.json({ results });
  } catch (err) {
    console.error("Autocomplete error:", err.message);
    return res.status(500).json({ error: "autocomplete_failed" });
  }
});

// Reverse Geocode
router.get("/reverse-geocode", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat & lon required" });
  }

  try {
    const osmRes = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat, lon, format: "json" },
      headers: { "User-Agent": "AgriDirectApp/1.0" },
    });

    return res.json({
      address: osmRes.data.display_name,
      city: osmRes.data.address?.city || osmRes.data.address?.town || osmRes.data.address?.county,
      state: osmRes.data.address?.state,
      pincode: osmRes.data.address?.postcode,
      raw: osmRes.data,
    });
  } catch (osmErr) {
    console.error("OSM reverse error:", osmErr.message);
    return res.status(500).json({ error: "location_service_failed" });
  }
});

// /reverse alias — accepts lng (frontend convention) as well as lon
router.get("/reverse", async (req, res) => {
  const lat = req.query.lat;
  const lon = req.query.lon || req.query.lng;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat & lon/lng required" });
  }

  try {
    const osmRes = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat, lon, format: "json" },
      headers: { "User-Agent": "AgriDirectApp/1.0" },
    });

    return res.json({
      formatted: osmRes.data.display_name,
      city: osmRes.data.address?.city || osmRes.data.address?.town || osmRes.data.address?.county,
      state: osmRes.data.address?.state,
      pincode: osmRes.data.address?.postcode,
    });
  } catch (err) {
    console.error("Reverse geocode error:", err.message);
    return res.status(500).json({ error: "location_service_failed" });
  }
});

module.exports = router;
