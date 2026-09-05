import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import ListingCard from "../../components/ListingCard/ListingCard";
import {
  Filter,
  Map as MapIcon,
  List,
  Search,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./Storefront.css";

// Fix Leaflet Default Marker Icon in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const farmIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function Storefront() {
  const { userLocation } = useAuth();
  const [listings, setListings] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "map"
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters state
  const [selectedCrop, setSelectedCrop] = useState("");
  const [radiusKm, setRadiusKm] = useState(35);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [sortBy, setSortBy] = useState("distance");

  useEffect(() => {
    fetchCrops();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedCrop, radiusKm, organicOnly, selectedGrade, sortBy, userLocation]);

  const fetchCrops = async () => {
    try {
      const res = await api.get("/api/crops");
      setCrops(res.data.crops || []);
    } catch (e) {
      console.error("Failed to load crop catalog:", e);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = {
        radiusKm,
        sort: sortBy,
        page: 1,
        limit: 30,
      };
      if (userLocation?.lat && userLocation?.lng) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }
      if (selectedCrop) params.crop = selectedCrop;
      if (organicOnly) params.organic = "true";
      if (selectedGrade) params.grade = selectedGrade;

      const res = await api.get("/api/listings", { params });
      setListings(res.data.listings || []);
    } catch (e) {
      console.error("Listings fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="storefront-container">
      {/* Top Banner & Location Pill */}
      <div className="storefront-hero">
        <div className="hero-content">
          <h1>Direct Farm Market</h1>
          <p>Fresh harvest sourced directly from regional farmers with zero intermediary margins.</p>
          <div className="location-indicator">
            <MapPin size={16} />
            <span>Delivery near: <strong>{userLocation?.label || "Ghaziabad, NCR"}</strong></span>
          </div>
        </div>

        {/* View Mode Toggle Button */}
        <div className="view-toggle-bar">
          <button
            className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <List size={18} />
            <span>List View</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === "map" ? "active" : ""}`}
            onClick={() => setViewMode("map")}
          >
            <MapIcon size={18} />
            <span>Farm Map</span>
          </button>
          <button className="mobile-filter-btn" onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal size={18} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Crop Categories Quick Scroll Bar */}
      <div className="crops-scroll-bar">
        <button
          className={`crop-chip ${selectedCrop === "" ? "active" : ""}`}
          onClick={() => setSelectedCrop("")}
        >
          All Produce
        </button>
        {crops.map((c) => (
          <button
            key={c._id}
            className={`crop-chip ${selectedCrop === c.slug ? "active" : ""}`}
            onClick={() => setSelectedCrop(selectedCrop === c.slug ? "" : c.slug)}
          >
            <span>{c.name}</span>
            {c.nameHi && <span className="chip-hi">{c.nameHi}</span>}
          </button>
        ))}
      </div>

      {/* Main Storefront Layout */}
      <div className="storefront-layout">
        {/* Desktop / Collapsible Mobile Filters Rail */}
        <aside className={`filters-sidebar ${filtersOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h3>Filter Harvest</h3>
            <button className="close-filter-btn" onClick={() => setFiltersOpen(false)}>✕</button>
          </div>

          <div className="filter-group">
            <label className="filter-label">Farm Search Radius: {radiusKm} km</label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="range-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select-input"
            >
              <option value="distance">Nearest Farm First</option>
              <option value="price">Lowest Price First</option>
              <option value="freshness">Freshest Harvest First</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Quality Grade</label>
            <div className="grade-selector">
              {["", "A", "B", "C"].map((g) => (
                <button
                  key={g}
                  className={`grade-btn ${selectedGrade === g ? "active" : ""}`}
                  onClick={() => setSelectedGrade(g)}
                >
                  {g ? `Grade ${g}` : "All Grades"}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={organicOnly}
                onChange={(e) => setOrganicOnly(e.target.checked)}
              />
              <span>🌱 100% Organic Certified Only</span>
            </label>
          </div>

          <button
            className="reset-filters-btn"
            onClick={() => {
              setSelectedCrop("");
              setRadiusKm(35);
              setOrganicOnly(false);
              setSelectedGrade("");
              setSortBy("distance");
            }}
          >
            Reset All Filters
          </button>
        </aside>

        {/* Listings Grid or Leaflet Map Container */}
        <main className="storefront-main">
          {loading ? (
            <div className="loading-container">
              <RefreshCw className="spinner-icon" size={32} />
              <p>Locating verified fresh farm batches...</p>
            </div>
          ) : viewMode === "map" ? (
            /* Map View */
            <div className="map-view-container">
              <MapContainer
                center={[userLocation?.lat || 28.6692, userLocation?.lng || 77.4538]}
                zoom={11}
                scrollWheelZoom={true}
                className="leaflet-map-element"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* User Location Center Pin */}
                <Marker position={[userLocation?.lat || 28.6692, userLocation?.lng || 77.4538]}>
                  <Popup>
                    <strong>📍 Your Delivery Location</strong>
                    <br />
                    {userLocation?.label || "Selected Delivery Point"}
                  </Popup>
                </Marker>

                {/* Individual Farm Lot Pins */}
                {listings.map((l) => {
                  const coords = l.pickup?.coordinates;
                  if (!coords || coords.length < 2) return null;
                  return (
                    <Marker
                      key={l._id}
                      position={[coords[1], coords[0]]} // [lat, lng]
                      icon={farmIcon}
                    >
                      <Popup>
                        <div className="map-popup-card">
                          <h4>{l.crop?.name} ({l.variety})</h4>
                          <p>🧑‍🌾 {l.farmer?.name}</p>
                          <p><strong>₹{(l.pricePaisePerKg / 100).toFixed(0)}/kg</strong> · {l.availableGrams / 1000}kg left</p>
                          <a href={`/market/${l._id}`} className="popup-link">View Batch</a>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          ) : listings.length === 0 ? (
            /* Empty State */
            <div className="empty-state">
              <div className="empty-icon">🌾</div>
              <h3>No Active Harvest in this Radius</h3>
              <p>Try widening your search radius or changing crop categories.</p>
              <button onClick={() => setRadiusKm(100)} className="widen-radius-btn">
                Search within 100 km
              </button>
            </div>
          ) : (
            /* Produce Card Grid */
            <div className="listings-grid">
              {listings.map((listing) => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
