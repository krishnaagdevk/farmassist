// // routes/cropPrice.js
// const express = require("express");
// const axios = require("axios");
// const router = express.Router();

// const DHENU_API_KEY = process.env.DHENU_API_KEY;
// const DHENU_BASE_URL = "https://api.dhenu.ai/v1";

// // GET /api/crop-price?crop=wheat
// router.get("/", async (req, res) => {
//   const { crop } = req.query;
//   if (!crop) return res.status(400).json({ error: "crop required" });

//   try {
//     const dhResp = await axios.post(
//       `${DHENU_BASE_URL}/chat/completions`,
//       {
//         model: "dhenu2-in-8b-preview",
//         messages: [
//           {
//             role: "user",
//             content: `Predict crop price trends for ${crop} in India (next 7 days) in JSON format with date and price fields only.`,
//           },
//         ],
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${DHENU_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const rawText = dhResp.data.choices[0].message.content;
//     let cropPrices = [];
//     try {
//       cropPrices = JSON.parse(rawText);
//     } catch (e) {
//       cropPrices = [];
//     }

//     res.json({ ok: true, crop, prices: cropPrices });
//   } catch (err) {
//     console.error("crop price error", err.message);
//     res.status(500).json({ error: "server_error" });
//   }
// });

// module.exports = router;
// routes/crop.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

const DHENU_API_KEY = process.env.DHENU_API_KEY;
const DHENU_URL = "https://api.dhenu.ai/v1/chat/completions";

// Function to fetch crop price predictions from Dhenu AI
async function fetchCropPriceFromDhenu(crop, lat, lon) {
  const locationText = lat && lon ? ` for location (lat: ${lat}, lon: ${lon})` : "";

  const prompt = `Predict the crop price trend for ${crop}${locationText} for the next 7 days. 
  Return the response strictly in JSON format like this:
  [
    { "date": "YYYY-MM-DD", "price": 2500 }
  ]`;

  try {
    const response = await fetch(DHENU_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DHENU_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dhenu2-in-8b-preview",
        messages: [
          { role: "system", content: "You are an agriculture market price predictor." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    // Extract AI response
    const content = data.choices?.[0]?.message?.content || "[]";

    // Try parsing JSON output
    let prices;
    try {
      prices = JSON.parse(content);
    } catch (err) {
      console.error("JSON parse failed, fallback to empty", err);
      prices = [];
    }

    return prices;
  } catch (err) {
    console.error("Dhenu API error", err);
    return [];
  }
}

// GET /api/crop-price?crop=wheat&lat=..&lon=..
router.get("/crop-price", async (req, res) => {
  try {
    const { crop, lat, lon } = req.query;
    if (!crop) {
      return res.status(400).json({ error: "Crop name is required" });
    }

    const prices = await fetchCropPriceFromDhenu(crop, lat, lon);

    res.json({
      crop,
      location: lat && lon ? { lat, lon } : null,
      prices,
    });
  } catch (err) {
    console.error("crop price error", err);
    res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
