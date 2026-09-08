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
  MapPin,
  Globe,
  ArrowRight,
  Search,
  Navigation,
  Zap,
  Layers,
  X,
  Store,
  ChevronDown,
} from "lucide-react";

export default function Landing() {
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [selectedLocation, setSelectedLocation] = useState({
    name: "Ghaziabad, Uttar Pradesh (Delhi NCR)",
    lat: 28.6692,
    lng: 77.4538,
    district: "Ghaziabad",
    state: "Uttar Pradesh",
  });
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);
  const [authModal, setAuthModal] = useState(null); // { mode: 'login'|'signup', role: 'farmer'|'fpo'|'buyer'|'bulk'|'driver' }
  const [demoLoadingRole, setDemoLoadingRole] = useState(null);

  const navigate = useNavigate();
  const { updateLocation, login } = useAuth();

  useEffect(() => {
    const storedLang = localStorage.getItem("farmAssistLanguage");
    const storedLoc = localStorage.getItem("farmAssistLocation");
    if (storedLang) setSelectedLanguage(storedLang);
    if (storedLoc) {
      try {
        const parsed = JSON.parse(storedLoc);
        setSelectedLocation(parsed);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        fetchLocations(query);
      } else {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Real-time Google Places Autocomplete query via backend API proxy
  const fetchLocations = async (text) => {
    setLoadingLocation(true);
    try {
      const res = await api.get(`/api/location/autocomplete?q=${encodeURIComponent(text)}`);
      if (res.data?.results?.length > 0) {
        setSuggestions(
          res.data.results.map((r) => ({
            formatted: r.formatted || r.name,
            name: r.name,
            secondary: r.secondary || "",
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
      setLoadingLocation(false);
    }
  };

  // When a Google Places prediction is selected, fetch exact geometry in real time
  const handleSelectSuggestion = async (s) => {
    setQuery(s.name || s.formatted);
    setSuggestions([]);
    setLoadingLocation(true);

    if (s.placeId) {
      try {
        const det = await api.get(`/api/location/place-details?placeId=${encodeURIComponent(s.placeId)}`);
        if (det.data) {
          const locObj = {
            name: det.data.name || det.data.formatted || s.name,
            formatted: det.data.formatted,
            lat: det.data.lat || s.lat || 28.6692,
            lng: det.data.lng || s.lng || 77.4538,
            city: det.data.city || det.data.district || "Mandi Hub",
            district: det.data.district || "Mandi Hub",
            state: det.data.state || "India",
            pincode: det.data.pincode,
            source: "google_places_realtime",
          };
          setSelectedLocation(locObj);
          updateLocation(locObj);
          localStorage.setItem("farmAssistLocation", JSON.stringify(locObj));
          setLocationStatus(`✅ Google Maps: ${locObj.name}`);
          setLoadingLocation(false);
          setShowLocationSearch(false);
          return;
        }
      } catch (err) {
        console.warn("Place details fetch error:", err);
      }
    }

    const locObj = {
      name: s.formatted || s.name,
      lat: s.lat || 28.6692,
      lng: s.lng || 77.4538,
      source: "google_places_basic",
    };
    setSelectedLocation(locObj);
    updateLocation(locObj);
    localStorage.setItem("farmAssistLocation", JSON.stringify(locObj));
    setLocationStatus(`✅ Selected: ${locObj.name}`);
    setLoadingLocation(false);
    setShowLocationSearch(false);
  };

  // Live GPS
  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("❌ Geolocation not supported");
      return;
    }

    setLocationStatus("📡 Resolving GPS with Google Maps...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await api.get(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
          const addr = res.data?.formatted || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          const locObj = {
            name: addr,
            lat: latitude,
            lng: longitude,
            district: res.data?.district || "Local Region",
            state: res.data?.state || "India",
            pincode: res.data?.pincode || "",
            source: "google_geocoding_realtime",
          };
          setSelectedLocation(locObj);
          updateLocation(locObj);
          localStorage.setItem("farmAssistLocation", JSON.stringify(locObj));
          setLocationStatus(`✅ Google GPS: ${addr}`);
          setShowLocationSearch(false);
        } catch (err) {
          console.error("Reverse geocode error:", err);
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          const locObj = { name: fallback, lat: latitude, lng: longitude };
          setSelectedLocation(locObj);
          updateLocation(locObj);
          localStorage.setItem("farmAssistLocation", JSON.stringify(locObj));
          setLocationStatus(`✅ Location: ${fallback}`);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationStatus("❌ Location permission denied");
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

  const handleOpenAuth = (mode, role) => {
    persistPreferences();
    setAuthModal({ mode, role });
  };

  const handleBrowseGuest = () => {
    persistPreferences();
    navigate("/market");
  };

  // Instant 1-Click Demo Login
  const handleQuickDemoAccess = async (roleId) => {
    setDemoLoadingRole(roleId);
    persistPreferences();

    const DEMO_CREDENTIALS = {
      farmer: { email: "farmer1@agridirect.in", password: "Password@123", path: "/farmer" },
      fpo: { email: "fpo@agridirect.in", password: "Password@123", path: "/fpo" },
      buyer: { email: "buyer1@agridirect.in", password: "Password@123", path: "/market" },
      bulk: { email: "buyer1@agridirect.in", password: "Password@123", path: "/bulk" },
      driver: { email: "driver1@agridirect.in", password: "Password@123", path: "/driver" },
      admin: { email: "admin@agridirect.in", password: "Password@123", path: "/dispatch" },
    };

    const target = DEMO_CREDENTIALS[roleId] || DEMO_CREDENTIALS.farmer;

    try {
      const res = await api.post("/api/auth/login", {
        email: target.email,
        password: target.password,
      });
      login(res.data.user, res.data.token);
      navigate(target.path);
    } catch (err) {
      const mockUser = {
        _id: "demo_" + roleId,
        name: roleId === "farmer" ? "Rameshwar Singh" : roleId === "fpo" ? "Ghaziabad Kisan Samriddhi FPO" : roleId === "driver" ? "Vikas Driver" : "AgriDirect User",
        email: target.email,
        role: roleId === "bulk" ? "buyer" : roleId,
        buyerType: roleId === "bulk" ? "bulk" : "consumer",
        digitalId: `${roleId.toUpperCase()}-2026-DEMO`,
      };
      login(mockUser, "mock_token_" + roleId);
      navigate(target.path);
    } finally {
      setDemoLoadingRole(null);
    }
  };

  const ENTITIES = [
    {
      id: "farmer",
      name: "Kisan / Farmer Producer",
      badge: "KISAN-2026-XXXX",
      tagline: "",
      icon: <Wheat size={24} className="text-emerald-600" />,
      borderHover: "hover:border-emerald-500",
      description: "Direct farm listings, 1-click AI price advice, and instant escrow payouts without middlemen.",
      dashboard: "/farmer",
    },
    {
      id: "fpo",
      name: "FPO Federation Hub",
      badge: "FPO-2026-XXXX",
      tagline: "Cooperative Aggregation",
      icon: <Building2 size={24} className="text-purple-600" />,
      borderHover: "hover:border-purple-500",
      description: "Member harvest pooling, bulk CSV spreadsheet uploads, and direct B2B institutional RFQs.",
      dashboard: "/fpo",
    },
    {
      id: "buyer",
      name: "Direct Consumer Household",
      badge: "CON-2026-XXXX",
      tagline: "Farm-to-Fork Direct",
      icon: <ShoppingBag size={24} className="text-blue-600" />,
      borderHover: "hover:border-blue-500",
      description: "Fresh farm produce delivered directly with transparent supply chain price breakdown.",
      dashboard: "/market",
    },
    {
      id: "bulk",
      name: "Commercial & Bulk Buyer",
      badge: "BULK-2026-XXXX",
      tagline: "Institutional Procurement",
      icon: <Building size={24} className="text-amber-600" />,
      borderHover: "hover:border-amber-500",
      description: "High-tonnage lot aggregation, contract quotes vs APMC Mandi, and cold-chain freight.",
      dashboard: "/bulk",
    },
    {
      id: "driver",
      name: "Logistics Fleet Pilot",
      badge: "DRV-2026-XXXX",
      tagline: "OR-Tools Route Optimization",
      icon: <Truck size={24} className="text-orange-600" />,
      borderHover: "hover:border-orange-500",
      description: "Optimized multi-stop run sheets, turn-by-turn pickup/drop navigation, and instant payouts.",
      dashboard: "/driver",
    },
  ];

  return (
    <div className="landing-wrapper min-h-screen relative flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Background video */}
      <video autoPlay muted loop id="bgVideo" playsInline className="fixed inset-0 w-full h-full object-cover -z-10 brightness-[0.70]">
        <source
          src="https://v1.pinimg.com/videos/mc/720p/49/b6/77/49b6774e53615eaad5cc2d816e4658ba.mp4"
          type="video/mp4"
        />
      </video>

      {/* Main Single-Screen Role Portal Layout */}
      <div className="w-full max-w-6xl space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AgriDirect · National Direct Agricultural Marketplace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">
            Farm-to-Door Direct Marketplace &amp; AI Logistics
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-2xl mx-auto drop-shadow">
            Select your stakeholder role to sign in, register your verified AgriStack ID, or enter portal.
          </p>
        </div>

        {/* Clean Portal Container */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-white/40 shadow-2xl space-y-5">
          {/* Top Hub Bar: Location Selector + Language + Guest Storefront */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900 text-white shadow-inner">
            {/* Active Mandi Location Chip */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                <MapPin size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                  Active Regional Mandi Cluster
                </span>
                <strong className="text-xs sm:text-sm font-bold text-white block truncate">
                  {selectedLocation?.name}
                </strong>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
              <button
                type="button"
                onClick={() => setShowLocationSearch(!showLocationSearch)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              >
                <Search size={12} className="text-emerald-400" />
                <span>{showLocationSearch ? "Close Search" : "Search City/Mandi"}</span>
                <ChevronDown size={12} className={showLocationSearch ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>

              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  localStorage.setItem("farmAssistLanguage", e.target.value);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="english">English</option>
                <option value="hindi">हिन्दी (Hindi)</option>
                <option value="bengali">বাংলা</option>
                <option value="marathi">मराठी</option>
              </select>

              <button
                type="button"
                onClick={handleBrowseGuest}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold transition shadow flex items-center gap-1.5"
              >
                <span>Guest Storefront</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Expandable Real-Time Google Places Mandi Search Bar */}
          {showLocationSearch && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Search size={14} className="text-emerald-600" />
                  <span>Real-Time Google Places Mandi &amp; City Search:</span>
                </span>
                <button
                  type="button"
                  onClick={handleLiveLocation}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Navigation size={13} />
                  <span>Use Live GPS Location</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Type any Indian city, sabzi mandi, APMC (e.g. Azadpur Mandi, Ghaziabad, Nashik, Pune)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 pr-8 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSuggestions([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {loadingLocation && (
                <div className="text-xs text-emerald-600 font-semibold">
                  Searching Google Places API in real time...
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(s)}
                      className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <strong className="text-slate-900 block">{s.name}</strong>
                        {s.secondary && <span className="text-slate-500 text-[11px] block">{s.secondary}</span>}
                      </div>
                      <ArrowRight size={13} className="text-slate-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {locationStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-semibold">
                  {locationStatus}
                </div>
              )}
            </div>
          )}

          {/* 5 Core Stakeholder Entity Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {ENTITIES.map((ent) => (
              <div
                key={ent.id}
                className={`bg-white rounded-2xl p-5 border border-slate-200 ${ent.borderHover} shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group`}
              >
                <div>
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {ent.icon}
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-emerald-400 block w-fit ml-auto">
                        {ent.badge}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                        {ent.tagline}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-extrabold text-slate-900">
                    {ent.name}
                  </h3>

                  {/* Short Clean Description */}
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {ent.description}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAuth("signup", ent.id)}
                      className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition text-center shadow-sm"
                    >
                      Register
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAuth("login", ent.id)}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition text-center border border-slate-200"
                    >
                      Sign In
                    </button>
                  </div>

                  {/* 1-Click Fast Demo Login */}
                  <button
                    type="button"
                    disabled={demoLoadingRole === ent.id}
                    onClick={() => handleQuickDemoAccess(ent.id)}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 text-[11px] font-bold transition border border-dashed border-slate-300 hover:border-emerald-300 flex items-center justify-center gap-1.5"
                  >
                    <Zap size={12} className="text-amber-500" />
                    <span>{demoLoadingRole === ent.id ? "Launching..." : "⚡ Quick Demo Enter"}</span>
                  </button>
                </div>
              </div>
            ))}

            {/* 6th Tile: Admin Dispatch Optimizer Console */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shrink-0">
                    <Layers size={22} />
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/30 text-teal-300 border border-teal-400/40">
                    ADMIN-DISPATCH
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white">
                  Admin Logistics Console
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Google OR-Tools CVRP solver engine, real-time fleet load dispatching, and multi-hub route map visualization.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleQuickDemoAccess("admin")}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold transition shadow flex items-center justify-center gap-1.5"
                >
                  <Zap size={13} />
                  <span>Launch OR-Tools Dispatch Board</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Single-Column Auth Modal */}
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
