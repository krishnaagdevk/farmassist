const axios = require("axios");

async function getWeatherFromOpenWeather(lat, lon) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  if (!API_KEY) throw new Error("OpenWeather API key missing");

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const { data } = await axios.get(url);

  return {
    temperature: data.main.temp,
    humidity: data.main.humidity,
    description: data.weather[0].description,
    raw: data,
  };
}

module.exports = { getWeatherFromOpenWeather };
