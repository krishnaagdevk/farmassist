import React, { useState, useEffect } from "react";
import "./Landing.css";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import LoginModal from "../Home/LoginModal";
import {
  Wheat,
  Building2,
  ShoppingBag,
  Truck,
  Building,
  ShieldCheck,
  MapPin,
  Globe,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Search,
  Navigation,
  Check,
} from "lucide-react";

function Landing() {
  const [currentStep, setCurrentStep] = useState(1); // 1 = Language & Location, 2 = Entity Role Selection
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [selectedLocation, setSelectedLocation] = useState({
    name: "Ghaziabad, Uttar Pradesh (Delhi NCR)",
    lat: 28.6692,
    lng: 77.4538,
    district: "Ghaziabad",
    state: "Uttar Pradesh",
  });
  const [locationMethod, setLocationMethod] = useState("search");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);
  const [authModal, setAuthModal] = useState(null); // { mode: 'login'|'signup', role: 'farmer'|'fpo'|'buyer'|'bulk'|'driver' }

  const navigate = useNavigate();
  const { updateLocation } = useAuth();

  useEffect(() => {
    // Hydrate existing preferences if stored
    const storedLang = localStorage.getItem("farmAssistLanguage");
    const storedLoc = localStorage.getItem("farmAssistLocation");
    if (storedLang) setSelectedLanguage(storedLang);
    if (storedLoc) {
      try {
        const parsed = JSON.parse(storedLoc);
        setSelectedLocation(parsed);
      } catch (e) {
        // ignore parse error
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 3) {
        fetchLocations(query);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Google Places Autocomplete API query via backend proxy
  const fetchLocations = async (text) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/location/autocomplete?q=${encodeURIComponent(text)}`);
      if (res.data?.results?.length > 0) {
        setSuggestions(
          res.data.results.map((r) => ({
            name: r.formatted || r.name,
            placeId: r.placeId,
            lat: r.lat,
            lng: r.lon || r.lng,
          }))
        );
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Google Places Autocomplete error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // When a Google Places prediction is selected, fetch exact geometry via Place Details API
  const handleSelectSuggestion = async (s) => {
    setQuery(s.name);
    setSuggestions([]);
    setLoading(true);

    if (s.placeId) {
      try {
        const det = await api.get(`/api/location/place-details?placeId=${encodeURIComponent(s.placeId)}`);
        if (det.data) {
          const locObj = {
            name: det.data.formatted || s.name,
            lat: det.data.lat || s.lat || 28.6692,
            lng: det.data.lng || s.lng || 77.4538,
            city: det.data.city,
            district: det.data.district || "NCR",
            state: det.data.state || "Uttar Pradesh",
            pincode: det.data.pincode,
            source: "google_places",
          };
          setSelectedLocation(locObj);
          updateLocation(locObj);
          setLocationStatus(`✅ Google Maps Verified: ${locObj.name}`);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Place details fetch error, using basic coords:", err);
      }
    }

    const locObj = {
      name: s.name,
      lat: s.lat || 28.6692,
      lng: s.lng || 77.4538,
      source: "google_places_basic",
    };
    setSelectedLocation(locObj);
    updateLocation(locObj);
    setLocationStatus(`✅ Selected: ${locObj.name}`);
    setLoading(false);
  };

  // Google Maps Reverse Geocoding for live GPS location
  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("❌ Geolocation not supported by your browser");
      return;
    }

    setLocationStatus("📡 Resolving GPS with Google Maps Geocoding...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await api.get(
            `/api/location/reverse?lat=${latitude}&lng=${longitude}`
          );
          const addr = res.data?.formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          const locObj = {
            name: addr,
            lat: latitude,
            lng: longitude,
            district: res.data?.district || "Local Region",
            state: res.data?.state || "India",
            pincode: res.data?.pincode || "",
            source: "google_geocoding",
          };
          setSelectedLocation(locObj);
          updateLocation(locObj);
          setLocationStatus(`✅ GPS Verified: ${addr}`);
        } catch (err) {
          console.error("Google reverse geocode error:", err);
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          const locObj = { name: fallback, lat: latitude, lng: longitude };
          setSelectedLocation(locObj);
          updateLocation(locObj);
          setLocationStatus(`✅ Location: ${fallback}`);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        if (err.code === 1) {
          setLocationStatus("❌ Permission denied. Please allow location access.");
        } else if (err.code === 2) {
          setLocationStatus("⚠️ Position unavailable. Try searching your city above.");
        } else if (err.code === 3) {
          setLocationStatus("⌛ Location timeout. Try searching your city.");
        } else {
          setLocationStatus("❌ Location error: " + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const persistPreferences = () => {
    localStorage.setItem("farmAssistLanguage", selectedLanguage);
    if (selectedLocation) {
      localStorage.setItem("farmAssistLocation", JSON.stringify(selectedLocation));
      updateLocation(selectedLocation);
    }
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert("Please select your mandi/delivery location to proceed.");
      return;
    }
    persistPreferences();
    setCurrentStep(2); // Progress to Step 2
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenAuth = (mode, role) => {
    persistPreferences();
    setAuthModal({ mode, role });
  };

  const handleBrowseGuest = () => {
    persistPreferences();
    navigate("/market");
  };

  const ENTITIES = [
    {
      id: "farmer",
      name: "Kisan / Farmer Producer",
      badge: "KISAN-2026-XXXX",
      tagline: "AgriStack Unique ID",
      icon: <Wheat size={26} className="text-emerald-500" />,
      color: "emerald",
      benefits: "Direct farm listings · +35% above Mandi prices · AI Crop Advisory · Escrow payouts",
      dashboard: "/farmer",
    },
    {
      id: "fpo",
      name: "FPO Federation Hub",
      badge: "FPO-2026-XXXX",
      tagline: "Cooperative Registration",
      icon: <Building2 size={26} className="text-purple-500" />,
      color: "purple",
      benefits: "Collective harvest pools · Multi-tonnage CSV upload · Direct B2B institutional RFQs",
      dashboard: "/fpo",
    },
    {
      id: "buyer",
      name: "Direct Consumer Household",
      badge: "CON-2026-XXXX",
      tagline: "Farm-to-Fork Direct",
      icon: <ShoppingBag size={26} className="text-blue-500" />,
      color: "blue",
      benefits: "Zero middleman markups · Farm traceability · Verified grade produce",
      dashboard: "/market",
    },
    {
      id: "bulk",
      name: "Commercial & Bulk Buyer",
      badge: "BULK-2026-XXXX",
      tagline: "Institutional Procurement",
      icon: <Building size={26} className="text-amber-500" />,
      color: "amber",
      benefits: "High-tonnage aggregation · Contract quotes vs Mandi · Cold chain delivery",
      dashboard: "/bulk",
    },
    {
      id: "driver",
      name: "Logistics Fleet Pilot",
      badge: "DRV-2026-XXXX",
      tagline: "OR-Tools Route Optimization",
      icon: <Truck size={26} className="text-orange-500" />,
      color: "orange",
      benefits: "Optimized pickup/drop routes · Digital run sheet · Instant escrow disbursement",
      dashboard: "/driver",
    },
  ];

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
      <div className={`container ${currentStep === 2 ? "landing-expanded-container" : "landing-compact-container"}`}>
        <div className="main-wrapper">
          {/* Header */}
          <div className="logo-section">
            <div className="logo"></div>
            <div>
              <h1 className="title">AgriDirect</h1>
              <p className="landing-subtitle text-slate-100 font-medium text-sm text-center">
                National Direct Agricultural Marketplace &amp; AI Logistics Gateway
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="step-indicator-bar">
            <div className={`step-pill ${currentStep === 1 ? "active" : "completed"}`}>
              <span className="step-num">{currentStep > 1 ? <Check size={14} /> : "1"}</span>
              <span className="step-text">Language &amp; Location</span>
            </div>
            <div className="step-divider"></div>
            <div className={`step-pill ${currentStep === 2 ? "active" : ""}`}>
              <span className="step-num">2</span>
              <span className="step-text">Marketplace Role</span>
            </div>
          </div>

          {/* STEP 1: Language & Google Maps Location */}
          {currentStep === 1 && (
            <div className="logincard step-card animate-in fade-in zoom-in-95">
              <div className="card-header">
                <h2 className="card-title">1. Regional Language &amp; Delivery Location</h2>
                <p className="card-description">
                  Powered by Google Maps Places &amp; Geocoding for accurate farm distance and mandi quotes.
                </p>
              </div>

              <form onSubmit={handleStep1Submit} className="card-content">
                {/* Language Selection */}
                <div className="form-group">
                  <label htmlFor="language" className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Globe size={16} className="text-emerald-600" /> Choose Language:
                  </label>
                  <select
                    id="language"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="select"
                  >
                    <option value="english">English (Default)</option>
                    <option value="hindi">हिन्दी (Hindi)</option>
                    <option value="bengali">বাংলা (Bengali)</option>
                    <option value="marathi">मराठी (Marathi)</option>
                  </select>
                </div>

                {/* Location Selection */}
                <div className="form-group">
                  <label className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <MapPin size={16} className="text-emerald-600" /> Choose Location / Mandi:
                  </label>
                  <div className="button-group">
                    <button
                      type="button"
                      className={`btn btn-outline ${locationMethod === "search" ? "active" : ""}`}
                      onClick={() => setLocationMethod("search")}
                    >
                      <Search size={15} />
                      <span>Google Places Search</span>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-outline ${locationMethod === "live" ? "active" : ""}`}
                      onClick={() => {
                        setLocationMethod("live");
                        handleLiveLocation();
                      }}
                    >
                      <Navigation size={15} />
                      <span>GPS Live Location</span>
                    </button>
                  </div>

                  {/* Search Section with Google Places */}
                  {locationMethod === "search" && (
                    <div className="location-section">
                      <div className="search-container">
                        <input
                          type="text"
                          placeholder="Search city, mandi, district or pincode (e.g. Meerut, Ghaziabad)..."
                          className="search-input"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          autoFocus
                        />
                        {loading && <div className="loader">Searching Google Places...</div>}
                        {suggestions.length > 0 && (
                          <div className="suggestions">
                            {suggestions.map((s, i) => (
                              <div
                                key={i}
                                className="suggestion-item"
                                onClick={() => handleSelectSuggestion(s)}
                              >
                                <MapPin size={14} className="text-emerald-600 shrink-0" />
                                <span>{s.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Live GPS Geocoding Status */}
                  {locationMethod === "live" && locationStatus && (
                    <div className="location-section">
                      <div className="location-status">
                        <p className="text-xs font-semibold">{locationStatus}</p>
                      </div>
                    </div>
                  )}

                  {/* Selected Location Card with Google Maps Verified Badge */}
                  {selectedLocation && (
                    <div className="selected-location">
                      <div className="flex items-center justify-between gap-2">
                        <span className="location-label flex items-center gap-1">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          Google Maps Verified Mandi Region:
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {selectedLocation.lat?.toFixed(2)}, {selectedLocation.lng?.toFixed(2)}
                        </span>
                      </div>
                      <p className="location-name mt-1 font-semibold text-slate-800">
                        {selectedLocation.name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Step 1 Button */}
                <button
                  type="submit"
                  className="btn btn-primary full-width font-bold flex items-center justify-center gap-2 text-sm shadow-lg mt-2"
                >
                  <span>Proceed to Role Selection</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Marketplace Entity Selection (Revealed ONLY after Step 1 submission) */}
          {currentStep === 2 && (
            <div className="logincard step-card entity-portal-card animate-in fade-in zoom-in-95">
              <div className="card-header entity-header">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={24} className="text-emerald-100" />
                    <div>
                      <h2 className="card-title text-left">2. Select Your Marketplace Role</h2>
                      <p className="card-description text-left">
                        Choose your entity to access your verified digital identity &amp; dedicated operational portal.
                      </p>
                    </div>
                  </div>

                  {/* Back to Step 1 Button */}
                  <button
                    type="button"
                    className="btn-back-step"
                    onClick={() => {
                      setCurrentStep(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    title="Change location or language"
                  >
                    <ArrowLeft size={14} />
                    <span>Change Location ({selectedLocation?.district || "Edit"})</span>
                  </button>
                </div>
              </div>

              {/* Active Context Banner */}
              <div className="active-context-pill">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin size={14} className="text-emerald-600" />
                  Region: <strong>{selectedLocation?.name}</strong>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Globe size={14} className="text-emerald-600" />
                  Language: <strong>{selectedLanguage.toUpperCase()}</strong>
                </span>
              </div>

              {/* Entity 5-Card Grid */}
              <div className="entity-grid">
                {ENTITIES.map((ent) => (
                  <div key={ent.id} className="entity-card">
                    <div className="entity-top">
                      <div className="entity-icon-wrap">{ent.icon}</div>
                      <div className="entity-title-block">
                        <h3 className="entity-name">{ent.name}</h3>
                        <div className="entity-badge-row">
                          <span className="digital-id-pill font-mono">{ent.badge}</span>
                          <span className="digital-id-tagline">{ent.tagline}</span>
                        </div>
                      </div>
                    </div>

                    <p className="entity-desc">{ent.benefits}</p>

                    <div className="entity-actions">
                      <button
                        type="button"
                        className="btn-entity-register"
                        onClick={() => handleOpenAuth("signup", ent.id)}
                      >
                        Register
                      </button>
                      <button
                        type="button"
                        className="btn-entity-login"
                        onClick={() => handleOpenAuth("login", ent.id)}
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guest Storefront Button */}
              <div className="guest-action-footer">
                <button
                  type="button"
                  className="btn-guest-browse"
                  onClick={handleBrowseGuest}
                >
                  <span>Browse Storefront Directly as Guest</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Auth Modal */}
      {authModal && (
        <LoginModal
          mode={authModal.mode}
          initialRole={authModal.role}
          onClose={() => setAuthModal(null)}
        />
      )}
    </div>
  );
}

export default Landing;
