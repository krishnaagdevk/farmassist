import { useState } from "react";
import axios from "axios";

export default function WeatherCard() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [error, setError] = useState(null);  // <-- NEW

  const getWeather = async () => {
    if (!city) return alert("Please enter a city name");
    setLoading(true);
    setError(null);       // reset old errors
    setWeather(null);     // reset old data

    try {
      const res = await axios.get(`/api/weather?location=${encodeURIComponent(city)}`);
      setWeather(res.data.weather);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setError("City not found. Please try again.");
      } else {
        setError("Failed to fetch weather. Try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-2">🌦 Weather</h2>

      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Enter city (e.g. Ghaziabad)"
        className="w-full px-3 py-2 border rounded-md mb-2"
      />

      <button
        onClick={getWeather}
        className="px-3 py-1 bg-green-600 text-white rounded-md"
        disabled={loading}
      >
        {loading ? "Loading..." : "Get Weather"}
      </button>

      {/* Error message */}
      {error && (
        <p className="mt-3 text-red-600 font-medium">{error}</p>
      )}

      {/* Weather info */}
      {weather && (
        <div className="mt-3">
          {/* <p>🌡 Temp: {weather.temperature}°C</p> */}
          <p>🌡 Temp: {weather?.temperature ?? "N/A"}°C</p>

          <p>💧 Humidity: {weather.humidity}%</p>
          <p>☁ {weather.description}</p>
          <p className="text-xs text-gray-500">Provider: {weather.provider}</p>
        </div>
      )}
    </div>
  );
}
