const express = require("express");
const axios = require("axios");

const router = express.Router();

function iconFor(weatherId) {
  if (!weatherId) return "🌤️";
  if (weatherId >= 200 && weatherId < 300) return "⛈️";
  if (weatherId >= 300 && weatherId < 600) return "🌧️";
  if (weatherId >= 600 && weatherId < 700) return "❄️";
  if (weatherId >= 700 && weatherId < 800) return "🌫️";
  if (weatherId === 800) return "☀️";
  return "⛅";
}

router.get("/", async (req, res) => {
  try {
    const { lat, lon, location } = req.query;
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    let url;

    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    } else if (location) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=metric&appid=${API_KEY}`;
    } else {
      return res.status(400).json({ error: "lat/lon or location is required" });
    }

    const { data } = await axios.get(url);

    return res.json({
      weather: {
        location: data.name || location || "Your Area",
        current: {
          icon: iconFor(data.weather?.[0]?.id),
          temp: Math.round(data.main.temp),
          condition: data.weather?.[0]?.description || "Clear",
          feelsLike: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          wind: `${data.wind?.speed || 0} m/s`,
          uv: "—", // ponytail: UV omitted, One Call API 3.0 if asked
          visibility: `${((data.visibility || 10000) / 1000).toFixed(1)} km`,
          pressure: `${data.main.pressure} hPa`,
        },
      },
    });
  } catch (err) {
    console.error("Weather API error:", err.message);
    if (err.response?.status === 404) {
      return res.status(404).json({ error: "City not found" });
    }
    return res.status(500).json({ error: "Weather fetch failed" });
  }
});

module.exports = router;
