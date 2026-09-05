import React, { useState, useEffect } from "react";
import "./Landing.css";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";

function Landing() {
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationMethod, setLocationMethod] = useState(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 3) {
        fetchLocations(query);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchLocations = async (text) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/location/autocomplete?q=${encodeURIComponent(text)}`);
      if (res.data?.results?.length > 0) {
        setSuggestions(
          res.data.results.map((r) => ({
            name: r.formatted,
            lat: r.lat,
            lng: r.lon,
          }))
        );
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("❌ Geolocation not supported by your browser");
      return;
    }

    setLocationStatus("📡 Getting your location...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Use our backend proxy to avoid exposing API key in frontend
          const res = await api.get(
            `/api/location/reverse?lat=${latitude}&lng=${longitude}`
          );
          const addr = res.data?.formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setSelectedLocation({ name: addr, lat: latitude, lng: longitude });
          setLocationStatus(`✅ Your Location: ${addr}`);
        } catch (err) {
          console.error("Reverse geocode error:", err);
          // Fallback to raw coordinates
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setSelectedLocation({ name: fallback, lat: latitude, lng: longitude });
          setLocationStatus(`✅ Location: ${fallback}`);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        if (err.code === 1) {
          setLocationStatus("❌ Permission denied. Please allow location access.");
        } else if (err.code === 2) {
          setLocationStatus("⚠️ Position unavailable. Try again.");
        } else if (err.code === 3) {
          setLocationStatus("⌛ Timeout. Please retry.");
        } else {
          setLocationStatus("❌ Location error: " + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const canProceed = selectedLanguage && selectedLocation;

  const handleGetStarted = (e) => {
    e.preventDefault();
    if (!canProceed) {
      alert("Please select both language and location before continuing.");
      return;
    }
    localStorage.setItem("farmAssistLanguage", selectedLanguage);
    localStorage.setItem("farmAssistLocation", JSON.stringify(selectedLocation));
    navigate("/home");
  };

  return (
    <div className="landing-wrapper">
      {/* Background video */}
      <video autoPlay muted loop id="bgVideo" playsInline>
        <source
          src="https://v1.pinimg.com/videos/mc/720p/49/b6/77/49b6774e53615eaad5cc2d816e4658ba.mp4"
          type="video/mp4"
        />
      </video>

      {/* Main UI */}
      <div className="container">
        <div className="main-wrapper">
          {/* Logo */}
          <div className="logo-section">
            <div className="logo"></div>
            <h1 className="title">Farm Assist</h1>
          </div>

          {/* Card */}
          <div className="logincard">
            <div className="card-header">
              <h2 className="card-title">Welcome to Farm Assist</h2>
              <p className="card-description">Get instant agricultural advice tailored for you.</p>
            </div>

            <div className="card-content">
              {/* Language */}
              <div className="form-group">
                <label htmlFor="language">Choose Language:</label>
                <select
                  id="language"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="select"
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="bengali">Bengali</option>
                  <option value="marathi">Marathi</option>
                </select>
              </div>

              {/* Location */}
              <div className="form-group">
                <label>Select Location:</label>
                <div className="button-group">
                  <button
                    className={`btn btn-outline ${locationMethod === "search" ? "active" : ""}`}
                    onClick={() => setLocationMethod("search")}
                  >
                    Search Location
                  </button>
                  <button
                    className={`btn btn-outline ${locationMethod === "live" ? "active" : ""}`}
                    onClick={() => setLocationMethod("live")}
                  >
                    Use Live Location
                  </button>
                </div>

                {/* Search Section */}
                {locationMethod === "search" && (
                  <div className="location-section">
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Type to search for your location..."
                        className="search-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      {loading && <div className="loader">Loading...</div>}
                      {suggestions.length > 0 && (
                        <div className="suggestions">
                          {suggestions.map((s, i) => (
                            <div
                              key={i}
                              className="suggestion-item"
                              onClick={() => {
                                setSelectedLocation(s);
                                setQuery(s.name);
                                setSuggestions([]);
                              }}
                            >
                              {s.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Live Section */}
                {locationMethod === "live" && (
                  <div className="location-section">
                    <div className="location-status">
                      <button className="btn btn-outline full-width" onClick={handleLiveLocation}>
                        Get My Current Location
                      </button>
                      {locationStatus && <p>{locationStatus}</p>}
                    </div>
                  </div>
                )}

                {/* Selected Location */}
                {selectedLocation && (
                  <div className="selected-location">
                    <p className="location-label">Selected Location:</p>
                    <p className="location-name">{selectedLocation.name}</p>
                  </div>
                )}
              </div>

              {/* Get Started */}
              <button
                className={`btn btn-primary full-width ${!canProceed ? "disabled" : ""}`}
                onClick={handleGetStarted}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
