import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import ListingCard from "../../components/ListingCard/ListingCard";
import {
  Map as MapIcon,
  List,
  SlidersHorizontal,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Banner & Location Pill */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white pt-8 pb-10 px-4 sm:px-6 lg:px-8 border-b border-emerald-800/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 mb-3">
              Direct Farmer Network
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Direct Farm Market
            </h1>
            <p className="mt-1 text-sm sm:text-base text-emerald-200/80 max-w-2xl leading-relaxed">
              Fresh harvest sourced directly from regional farmers with zero intermediary margins.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm text-xs font-medium text-emerald-100 border border-white/10">
              <MapPin size={14} className="text-emerald-400 shrink-0" />
              <span>
                Delivery near: <strong className="text-white">{userLocation?.label || "Ghaziabad, NCR"}</strong>
              </span>
            </div>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition min-h-[40px] ${
                viewMode === "grid"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
              onClick={() => setViewMode("grid")}
            >
              <List size={16} />
              <span>List View</span>
            </button>
            <button
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition min-h-[40px] ${
                viewMode === "map"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
              onClick={() => setViewMode("map")}
            >
              <MapIcon size={16} />
              <span>Farm Map</span>
            </button>
            <button
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-700/60 min-h-[40px]"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Crop Categories Horizontal Scroll Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto no-scrollbar flex items-center gap-2">
          <button
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[38px] ${
              selectedCrop === ""
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setSelectedCrop("")}
          >
            All Produce
          </button>
          {crops.map((c) => (
            <button
              key={c._id}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 min-h-[38px] ${
                selectedCrop === c.slug
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => setSelectedCrop(selectedCrop === c.slug ? "" : c.slug)}
            >
              <span>{c.name}</span>
              {c.nameHi && <span className="opacity-75 font-normal">({c.nameHi})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Storefront Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Filters Rail */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-36 space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Filter Harvest</h3>

            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                <span>Search Radius</span>
                <span className="text-emerald-600">{radiusKm} km</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              >
                <option value="distance">Nearest Farm First</option>
                <option value="price">Lowest Price First</option>
                <option value="freshness">Freshest Harvest First</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Quality Grade
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["", "A", "B", "C"].map((g) => (
                  <button
                    key={g}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition min-h-[40px] ${
                      selectedGrade === g
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                    onClick={() => setSelectedGrade(g)}
                  >
                    {g ? `Grade ${g}` : "All Grades"}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={organicOnly}
                  onChange={(e) => setOrganicOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>🌱 100% Organic Only</span>
              </label>
            </div>

            <button
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition min-h-[44px]"
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

          {/* Mobile Filters Drawer Modal */}
          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
              <div className="w-full max-w-xs bg-white h-full p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">Filter Harvest</h3>
                    <button
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      onClick={() => setFiltersOpen(false)}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                      <span>Search Radius</span>
                      <span className="text-emerald-600">{radiusKm} km</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 min-h-[44px]"
                    >
                      <option value="distance">Nearest Farm First</option>
                      <option value="price">Lowest Price First</option>
                      <option value="freshness">Freshest Harvest First</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                      Quality Grade
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["", "A", "B", "C"].map((g) => (
                        <button
                          key={g}
                          className={`py-2 px-3 rounded-xl text-xs font-medium border transition min-h-[44px] ${
                            selectedGrade === g
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                          onClick={() => setSelectedGrade(g)}
                        >
                          {g ? `Grade ${g}` : "All Grades"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={organicOnly}
                        onChange={(e) => setOrganicOnly(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <span>🌱 100% Organic Only</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <button
                    className="w-full py-3 bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-md min-h-[48px]"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Apply Filters ({listings.length} Results)
                  </button>
                  <button
                    className="w-full py-2.5 text-xs text-slate-600 hover:text-slate-900 min-h-[44px]"
                    onClick={() => {
                      setSelectedCrop("");
                      setRadiusKm(35);
                      setOrganicOnly(false);
                      setSelectedGrade("");
                      setSortBy("distance");
                    }}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Listings Grid or Leaflet Map Container */}
          <main className="col-span-1 lg:col-span-9">
            {loading ? (
              <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
                <RefreshCw className="animate-spin mx-auto text-emerald-600 mb-4" size={36} />
                <p className="text-sm font-medium text-slate-600">Locating verified fresh farm batches...</p>
              </div>
            ) : viewMode === "map" ? (
              /* Map View */
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-[560px]">
                <MapContainer
                  center={[userLocation?.lat || 28.6692, userLocation?.lng || 77.4538]}
                  zoom={11}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* User Location Center Pin */}
                  <Marker position={[userLocation?.lat || 28.6692, userLocation?.lng || 77.4538]}>
                    <Popup>
                      <strong className="text-xs">📍 Your Delivery Location</strong>
                      <br />
                      <span className="text-xs text-slate-600">{userLocation?.label || "Selected Delivery Point"}</span>
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
                          <div className="p-1 text-xs">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {l.crop?.name} ({l.variety})
                            </h4>
                            <p className="text-slate-600 mt-1">🧑‍🌾 {l.farmer?.name}</p>
                            <p className="mt-1 font-semibold text-emerald-700">
                              ₹{(l.pricePaisePerKg / 100).toFixed(0)}/kg · {l.availableGrams / 1000}kg left
                            </p>
                            <a
                              href={`/market/${l._id}`}
                              className="mt-2 inline-block px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                            >
                              View Batch
                            </a>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            ) : listings.length === 0 ? (
              /* Empty State */
              <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
                <div className="text-4xl mb-3">🌾</div>
                <h3 className="text-lg font-bold text-slate-900">No Active Harvest in this Radius</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Try widening your search radius or changing crop categories.
                </p>
                <button
                  onClick={() => setRadiusKm(100)}
                  className="mt-5 inline-flex items-center justify-center px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition min-h-[44px]"
                >
                  Search within 100 km
                </button>
              </div>
            ) : (
              /* Produce Card Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <ListingCard key={listing._id} listing={listing} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
