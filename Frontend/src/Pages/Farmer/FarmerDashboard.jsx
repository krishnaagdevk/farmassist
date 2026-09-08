import React, { useState, useEffect, useCallback } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import ProfileModal from "../../components/ProfileModal/ProfileModal";
import {
  Sparkles,
  TrendingUp,
  Package,
  DollarSign,
  PlusCircle,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
  Tag,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  QrCode,
  X,
  Upload,
  Download,
  Trash2,
  Edit3,
  PauseCircle,
  PlayCircle,
  Clock,
  MapPin,
  Calendar,
  ShoppingBag,
  ArrowUpRight,
  Filter,
  Check,
  Layers,
  Leaf,
  User,
  Settings,
} from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
  Line,
} from "recharts";

export default function FarmerDashboard() {
  const { user } = useAuth();
  const [showIdModal, setShowIdModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [farmerOrders, setFarmerOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [crops, setCrops] = useState([]);
  const [demandForecast, setDemandForecast] = useState(null);
  const [priceAdvice, setPriceAdvice] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "new-listing" | "bulk-upload" | "orders"
  const [formMsg, setFormMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Price Modal State
  const [editingListing, setEditingListing] = useState(null);
  const [editPricePerKg, setEditPricePerKg] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // New Listing Form State
  const [formData, setFormData] = useState({
    cropId: "",
    variety: "Desi Special",
    grade: "A",
    organic: false,
    totalKg: "150",
    pricePerKg: "28",
    minOrderKg: "5",
    harvestedOn: new Date().toISOString().split("T")[0],
    pickupTimeWindow: "Morning (6 AM - 12 PM)",
    imageUrl: "",
  });

  const [forecastCrop, setForecastCrop] = useState("tomato");
  const [forecastDistrict, setForecastDistrict] = useState("Ghaziabad");
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");

  const INDIAN_DISTRICTS = [
    "Ghaziabad",
    "Delhi NCR",
    "Lucknow",
    "Agra",
    "Meerut",
    "Kanpur",
    "Varanasi",
    "Patna",
    "Jaipur",
    "Pune",
    "Nashik",
    "Indore",
    "Ahmedabad",
    "Bengaluru",
    "Hyderabad",
    "Guntur",
    "Bhopal",
  ];

  // Fetch farmer's own listings, catalog crops, and incoming orders
  const fetchDashboardData = useCallback(async () => {
    try {
      const [listingsRes, cropsRes, ordersRes] = await Promise.all([
        api.get("/api/listings/mine"),
        api.get("/api/crops"),
        api.get("/api/orders").catch(() => ({ data: { orders: [] } })),
      ]);

      setMyListings(listingsRes.data.listings || []);
      setStats(listingsRes.data.stats);
      setFarmerOrders(ordersRes.data.orders || []);

      const fetchedCrops = cropsRes.data.crops || [];
      setCrops(fetchedCrops);

      if (fetchedCrops.length > 0) {
        setFormData((prev) => ({
          ...prev,
          cropId: prev.cropId || fetchedCrops[0]._id,
        }));
      }
    } catch (e) {
      console.error("Farmer dashboard fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch AI Demand Forecast & Price Suggestion
  const fetchForecastData = useCallback(
    async (signal) => {
      setLoadingForecast(true);
      try {
        const cropSlug = forecastCrop.toLowerCase();
        const [demandRes, priceRes] = await Promise.all([
          api.get(
            `/api/insights/demand?crop=${encodeURIComponent(cropSlug)}&district=${encodeURIComponent(forecastDistrict)}&horizon=14`,
            signal ? { signal } : {}
          ),
          api.get(
            `/api/insights/suggest-price?district=${encodeURIComponent(forecastDistrict)}&crop=${encodeURIComponent(cropSlug)}`,
            signal ? { signal } : {}
          ),
        ]);
        setDemandForecast(demandRes.data.forecast);
        setPriceAdvice(priceRes.data);
      } catch (e) {
        if (!signal?.aborted) {
          console.error("Forecast fetch error:", e);
        }
      } finally {
        if (!signal?.aborted) {
          setLoadingForecast(false);
        }
      }
    },
    [forecastCrop, forecastDistrict]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchForecastData(controller.signal);
    return () => controller.abort();
  }, [fetchForecastData]);

  // When crop selector in form changes, auto-update AI forecast crop
  const handleFormCropChange = (cropId) => {
    const selected = crops.find((c) => c._id === cropId);
    setFormData((prev) => ({
      ...prev,
      cropId,
      imageUrl: selected?.imageUrl || prev.imageUrl,
    }));
    if (selected?.slug) {
      setForecastCrop(selected.slug);
    }
  };

  // 1-Click Apply AI Suggested Price to Form
  const applySuggestedPrice = () => {
    if (priceAdvice?.bandLoPaise && priceAdvice?.bandHiPaise) {
      const avgPrice = Math.round(
        (priceAdvice.bandLoPaise + priceAdvice.bandHiPaise) / 200
      );
      setFormData((prev) => ({ ...prev, pricePerKg: String(avgPrice) }));
    } else {
      setFormData((prev) => ({ ...prev, pricePerKg: "28" }));
    }
  };

  // Submit Single Harvest Lot Listing
  const handleCreateListing = async (e) => {
    e.preventDefault();
    setFormMsg("");
    setSubmitting(true);
    try {
      const selectedCrop = crops.find((c) => c._id === formData.cropId);
      const harvestDate = new Date(formData.harvestedOn || Date.now());

      await api.post("/api/listings", {
        cropId: formData.cropId,
        variety: formData.variety || "Desi Standard",
        grade: formData.grade,
        organic: formData.organic,
        totalGrams: Number(formData.totalKg) * 1000,
        pricePaisePerKg: Number(formData.pricePerKg) * 100,
        minOrderGrams: Number(formData.minOrderKg) * 1000,
        harvestedOn: harvestDate,
        images: formData.imageUrl ? [formData.imageUrl] : (selectedCrop?.imageUrl ? [selectedCrop.imageUrl] : []),
      });

      setFormMsg("✅ Fresh crop lot successfully published to regional storefront!");
      await fetchDashboardData();
      setTimeout(() => {
        setActiveTab("overview");
        setFormMsg("");
      }, 1200);
    } catch (err) {
      setFormMsg(`❌ Error: ${err.response?.data?.error || "Failed to create listing"}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle CSV Bulk Upload
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      alert("Please select a valid CSV file first.");
      return;
    }

    setBulkUploading(true);
    setBulkResult(null);

    try {
      const formPayload = new FormData();
      formPayload.append("file", bulkFile);

      const res = await api.post("/api/listings/bulk", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setBulkResult(res.data);
      fetchDashboardData();
    } catch (err) {
      setBulkResult({
        ok: false,
        error: err.response?.data?.error || "Bulk upload failed. Verify CSV format.",
      });
    } finally {
      setBulkUploading(false);
    }
  };

  // Download Sample CSV Template
  const downloadSampleCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "crop_slug,variety,grade,organic,total_kg,price_per_kg,min_order_kg,harvested_on\n" +
      "tomato,Desi Special,A,true,250,28,5,2026-09-07\n" +
      "potato,Pahari Fresh,A,false,500,18,10,2026-09-06\n" +
      "onion,Nashik Red,B,false,350,22,5,2026-09-07\n" +
      "brinjal,Round Green,A,true,120,24,2,2026-09-07\n" +
      "wheat,Sharbati Gold,A,false,1000,32,25,2026-09-05";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "agridirect_farmer_crops_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Lot Status (Active <-> Paused)
  const handleToggleStatus = async (listingId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await api.patch(`/api/listings/${listingId}`, { status: nextStatus });
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update lot status.");
    }
  };

  // Delete / Delist Crop Lot
  const handleDeleteListing = async (listingId) => {
    if (!window.confirm("Are you sure you want to remove this crop lot from the marketplace?")) {
      return;
    }
    try {
      await api.delete(`/api/listings/${listingId}`);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete listing.");
    }
  };

  // Update Price per Kg
  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    if (!editingListing || !editPricePerKg || Number(editPricePerKg) <= 0) return;

    setUpdatingPrice(true);
    try {
      await api.patch(`/api/listings/${editingListing._id}`, {
        pricePaisePerKg: Math.round(Number(editPricePerKg) * 100),
      });
      setEditingListing(null);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update lot price.");
    } finally {
      setUpdatingPrice(false);
    }
  };

  // Filter listings
  const filteredListings = myListings.filter((l) => {
    const cropName = (l.crop?.name || "").toLowerCase();
    const variety = (l.variety || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = cropName.includes(query) || variety.includes(query);
    const matchesGrade = filterGrade === "all" || l.grade === filterGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Kisan Producer Hub · Direct Farm Marketplace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Farmer Command & Crop Upload Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Publish harvest lots directly to consumers & bulk buyers, get AI price recommendations, and track earnings without middlemen.
          </p>
        </div>

        {/* Tab Switcher Controls */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto overflow-x-auto">
          <button
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === "overview"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            My Produce & AI
          </button>
          <button
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === "new-listing"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("new-listing")}
          >
            <PlusCircle size={14} />
            <span>Upload Crop Info</span>
          </button>
          <button
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === "bulk-upload"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("bulk-upload")}
          >
            <FileSpreadsheet size={14} />
            <span>Bulk CSV Upload</span>
          </button>
          <button
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === "orders"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("orders")}
          >
            <ShoppingBag size={14} />
            <span>Orders & Sales ({farmerOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Kisan Digital Identity Smart Card Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CreditCard size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/50">
                {user?.digitalId || "KISAN-2026-1001"}
              </span>

            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              {user?.name || "Rameshwar Singh"} &middot;{" "}
              <span className="text-emerald-300 font-normal text-sm">
                {user?.address?.district || "Ghaziabad"},{" "}
                {user?.address?.state || "Uttar Pradesh"}
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Official Kisan Digital Smart ID for verified farm lot dispatch, direct logistics handshake, and automated instant escrow payouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-all flex-shrink-0"
            onClick={() => setShowProfileModal(true)}
          >
            <User size={15} />
            <span>Profile & Security</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition-all flex-shrink-0"
            onClick={() => setShowProfileModal(true)}
          >
            <QrCode size={16} />
            <span>Kisan Smart Pass</span>
          </button>
        </div>
      </div>

      {/* Global Profile & Credentials Modal */}
      {showProfileModal && (
        <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      )}

      {/* Kisan Digital ID Card Modal */}
      {showIdModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              onClick={() => setShowIdModal(false)}
            >
              <X size={18} />
            </button>

            {/* Top Emblem Bar */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white text-center relative">
              <div className="text-[10px] font-bold tracking-widest uppercase opacity-80 mb-1">
                AgriDirect National Digital Agriculture Mission
              </div>
              <h3 className="text-xl font-extrabold tracking-tight">Kisan Digital Smart Card</h3>
              <p className="text-xs text-emerald-200 mt-0.5 font-medium">
                Govt. of India &middot; AgriStack Compliant Direct Producer
              </p>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
                    Unique Kisan Producer ID
                  </span>
                  <strong className="text-lg font-mono font-black text-emerald-950">
                    {user?.digitalId || "KISAN-2026-1001"}
                  </strong>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck size={12} />
                  <span>KYC Verified</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Producer Name</span>
                  <strong className="text-slate-900 font-bold text-sm block truncate">
                    {user?.name || "Rameshwar Singh"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Cluster District</span>
                  <strong className="text-slate-900 font-bold text-sm block truncate">
                    {user?.address?.district || "Ghaziabad"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Phone / Contact</span>
                  <strong className="text-slate-900 font-bold block">
                    {user?.phone || "+91 98765 43210"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Valid Through</span>
                  <strong className="text-slate-900 font-bold block">December 2029</strong>
                </div>
              </div>

              {/* QR Code Verification Section */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white text-center flex flex-col items-center justify-center gap-2">
                <div className="w-24 h-24 bg-white rounded-xl p-2 flex items-center justify-center shadow-inner">
                  <div className="w-full h-full border-2 border-dashed border-slate-900 flex items-center justify-center text-slate-900 font-mono text-[10px] font-bold text-center leading-tight">
                    [QR CODE]<br />
                    {user?.digitalId || "KISAN-2026"}
                  </div>
                </div>
                <span className="text-[11px] text-slate-300 font-medium">
                  Scan at Regional Mandi Hub / Driver Dispatch for instant farm lot validation
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
              <button
                type="button"
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                onClick={() => setShowIdModal(false)}
              >
                Close ID Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Core Summary Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Stat 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Package size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Active Crop Lots</span>
            <strong className="text-xl sm:text-2xl font-black text-slate-900">
              {stats?.activeListings || myListings.filter((l) => l.status === "active").length}
            </strong>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Available Inventory</span>
            <strong className="text-xl sm:text-2xl font-black text-slate-900">
              {((stats?.totalGramsAvailable || myListings.reduce((s, l) => s + (l.status === 'active' ? l.availableGrams : 0), 0)) / 1000).toFixed(0)} kg
            </strong>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Sold Produce</span>
            <strong className="text-xl sm:text-2xl font-black text-slate-900">
              {((stats?.totalGramsSold || myListings.reduce((s, l) => s + (l.totalGrams - l.availableGrams), 0)) / 1000).toFixed(0)} kg
            </strong>
          </div>
        </div>

        {/* Stat 4 - Middlemen Elimination Premium */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="text-xs text-amber-800 font-semibold block">Extra Farmer Net Profit</span>
            <strong className="text-xl sm:text-2xl font-black text-amber-900">+₹24,650</strong>
            <span className="text-[10px] text-amber-700 block font-medium">
              vs Local APMC Mandi Rates (+38%)
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: SINGLE CROP INFO UPLOAD FORM */}
      {activeTab === "new-listing" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full mb-1">
                <Leaf size={13} />
                <span>Single Lot Direct Upload</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Upload New Crop Harvest Lot
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Publish grade-sorted farm harvest batches directly to local retail consumers and bulk buyers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("bulk-upload")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold self-start sm:self-auto"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Have Multiple Crops? Use Bulk CSV</span>
            </button>
          </div>

          <form onSubmit={handleCreateListing} className="space-y-6">
            {/* Step 1: Visual Crop Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                1. Select Crop Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {crops.map((c) => {
                  const isSelected = formData.cropId === c._id;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => handleFormCropChange(c._id)}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {c.imageUrl ? (
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <strong className="text-xs font-bold text-slate-900 block truncate">
                          {c.name}
                        </strong>
                        <span className="text-[10px] text-slate-500 block">
                          {c.nameHi || `${c.shelfLifeDays || 7}d shelf`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Variety & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Variety / Cultivar</label>
                <input
                  type="text"
                  value={formData.variety}
                  onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                  placeholder="e.g. Desi Special, Hybrid 402, Sharbati"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm min-h-[44px]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Quality Grade</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white min-h-[44px]"
                >
                  <option value="A">Grade A — Export / Super Premium (No blemishes)</option>
                  <option value="B">Grade B — Standard Retail Market (Minor variance)</option>
                  <option value="C">Grade C — Processing / Institutional Bulk</option>
                </select>
              </div>
            </div>

            {/* Step 3: Harvest Quantity & Asking Price with AI Price Assistant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Total Available Harvest (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.totalKg}
                  onChange={(e) => setFormData({ ...formData, totalKg: e.target.value })}
                  required
                  placeholder="e.g. 250"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Asking Price (₹/kg)
                  </label>
                  {priceAdvice && (
                    <button
                      type="button"
                      onClick={applySuggestedPrice}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 inline-flex items-center gap-1 transition"
                    >
                      <Sparkles size={11} />
                      <span>Use AI Price (₹{((priceAdvice.bandLoPaise + priceAdvice.bandHiPaise) / 200).toFixed(0)}/kg)</span>
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  value={formData.pricePerKg}
                  onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                  required
                  placeholder="e.g. 28"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm min-h-[44px]"
                />
              </div>
            </div>

            {/* Step 4: Min Order & Harvest Date & Pickup Window */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Min Order Qty (kg)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.minOrderKg}
                  onChange={(e) => setFormData({ ...formData, minOrderKg: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Harvest Date</label>
                <input
                  type="date"
                  value={formData.harvestedOn}
                  onChange={(e) => setFormData({ ...formData, harvestedOn: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Pickup Time Window</label>
                <select
                  value={formData.pickupTimeWindow}
                  onChange={(e) => setFormData({ ...formData, pickupTimeWindow: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white min-h-[44px]"
                >
                  <option value="Morning (6 AM - 12 PM)">Morning (6 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 6 PM)">Afternoon (12 PM - 6 PM)</option>
                  <option value="Full Day (6 AM - 8 PM)">Full Day (6 AM - 8 PM)</option>
                </select>
              </div>
            </div>

            {/* Step 5: Optional Lot Image URL / Photo Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Crop Lot Photo URL (Optional)
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/... or leave blank for default crop image"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm min-h-[44px]"
              />
            </div>

            {/* Organic Certification Checkbox */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.organic}
                  onChange={(e) => setFormData({ ...formData, organic: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-900">
                  🌱 100% Certified Organic cultivation (Chemical & Pesticide Free — Eligible for 25% Premium)
                </span>
              </label>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm py-3.5 rounded-2xl shadow-sm hover:shadow transition active:scale-[0.99] disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Publishing Crop Lot to Regional Storefront...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Publish Harvest Lot to Marketplace</span>
                </>
              )}
            </button>

            {formMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 text-center">
                {formMsg}
              </div>
            )}
          </form>
        </div>
      )}

      {/* VIEW 2: BULK CSV CROP UPLOAD (For FPOs and Multi-Acre Farmers) */}
      {activeTab === "bulk-upload" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full mb-1">
                <FileSpreadsheet size={13} />
                <span>Bulk Spreadsheet Import</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Bulk Crop Harvest CSV Upload
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Upload entire farm inventories or FPO member harvest batches in seconds via standardized CSV.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadSampleCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition self-start sm:self-auto"
            >
              <Download size={14} />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Guidelines Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Required CSV Header Columns:</span>
            </h4>
            <div className="font-mono text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800 overflow-x-auto">
              crop_slug, variety, grade, organic, total_kg, price_per_kg, min_order_kg, harvested_on
            </div>
            <p className="text-[11px] text-slate-500">
              Valid crop slugs: <code className="font-bold">tomato, potato, onion, brinjal, banana, wheat, rice</code>. Quality grades: <code className="font-bold">A, B, C</code>.
            </p>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleBulkUpload} className="space-y-5">
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition cursor-pointer">
              <input
                type="file"
                accept=".csv"
                id="bulk-file-input"
                className="hidden"
                onChange={(e) => setBulkFile(e.target.files[0] || null)}
              />
              <label htmlFor="bulk-file-input" className="cursor-pointer block space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Upload size={28} />
                </div>
                <div>
                  <strong className="text-sm font-bold text-slate-900 block">
                    {bulkFile ? bulkFile.name : "Click to select or drag & drop CSV file"}
                  </strong>
                  <span className="text-xs text-slate-500 block mt-1">
                    {bulkFile
                      ? `${(bulkFile.size / 1024).toFixed(1)} KB selected`
                      : "Supports standard .csv format up to 5 MB"}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!bulkFile || bulkUploading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-2xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkUploading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing & Validating Lots...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Upload & Publish Harvest Batches</span>
                  </>
                )}
              </button>

              {bulkFile && (
                <button
                  type="button"
                  onClick={() => {
                    setBulkFile(null);
                    setBulkResult(null);
                  }}
                  className="px-4 py-3 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Bulk Upload Result Card */}
          {bulkResult && (
            <div
              className={`p-5 rounded-2xl border ${
                bulkResult.ok
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-red-50 border-red-200 text-red-950"
              }`}
            >
              <div className="flex items-center gap-2">
                {bulkResult.ok ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={18} className="text-red-600" />
                )}
                <h4 className="font-bold text-sm">
                  {bulkResult.ok
                    ? `Successfully imported ${bulkResult.createdCount} harvest lot(s)!`
                    : `Upload encountered errors (${bulkResult.errorCount || 0} failed rows)`}
                </h4>
              </div>

              {bulkResult.errors?.length > 0 && (
                <div className="mt-3 space-y-1 text-xs">
                  <span className="font-bold block">Validation Errors:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-red-800">
                    {bulkResult.errors.map((err, idx) => (
                      <li key={idx}>
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: INCOMING ORDERS & SALES TAB */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Direct Buyer Orders & Escrow Payouts
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Real-time purchase orders for your farm harvest batches with 100% direct produce value.
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition self-start sm:self-auto"
            >
              <RefreshCw size={13} />
              <span>Refresh Orders</span>
            </button>
          </div>

          {farmerOrders.length === 0 ? (
            <div className="p-10 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
              <ShoppingBag size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                No orders received yet.
              </p>
              <p className="text-xs text-slate-500">
                As soon as retail consumers or bulk buyers checkout produce from your lots, orders will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Produce Items</th>
                    <th className="py-3 px-4">Buyer City</th>
                    <th className="py-3 px-4">Payout Value</th>
                    <th className="py-3 px-4">Delivery Slot</th>
                    <th className="py-3 px-4">Order Status</th>
                    <th className="py-3 px-4 text-right">Escrow Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {farmerOrders.map((ord) => {
                    // Farmer items in this order
                    const myItems = ord.items?.filter(
                      (it) => it.farmer?._id === user?._id || it.farmer === user?._id
                    ) || ord.items || [];
                    const myTotalPaise = myItems.reduce((s, it) => s + (it.lineTotalPaise || 0), 0);

                    return (
                      <tr key={ord._id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {ord.orderNo || ord._id.slice(-6)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {myItems.map((it, idx) => (
                              <div key={idx} className="font-semibold text-slate-800">
                                {it.crop?.name || "Produce"}: {(it.grams / 1000).toFixed(1)} kg
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {ord.deliveryAddress?.city || "Ghaziabad"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          ₹{((myTotalPaise || ord.produceSubtotalPaise) / 100).toFixed(0)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {ord.deliverySlot || "Morning"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ShieldCheck size={12} />
                            <span>Escrow Secured</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: OVERVIEW & AI FORECASTING & LOT MANAGEMENT */}
      {activeTab === "overview" && (
        <div className="space-y-6 sm:space-y-8">
          {/* AI Insights: Demand Forecast Chart + Price Advisor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 14-Day Demand Forecast Chart Card (2 Columns on large screens) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                      14-Day Regional AI Demand Forecast
                    </h3>
                    <p className="text-xs text-slate-500">
                      Multi-step time-series prediction with 80% confidence interval band
                    </p>
                  </div>
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center gap-3 py-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600">Crop:</label>
                    <select
                      value={forecastCrop}
                      onChange={(e) => setForecastCrop(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                    >
                      {crops.length > 0 ? (
                        crops.map((c) => (
                          <option key={c._id} value={c.slug || c.name.toLowerCase()}>
                            {c.name} {c.nameHi ? `(${c.nameHi})` : ""}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="tomato">Tomato (टमाटर)</option>
                          <option value="onion">Onion (प्याज)</option>
                          <option value="potato">Potato (आलू)</option>
                          <option value="wheat">Wheat (गेहूं)</option>
                          <option value="rice">Rice (चावल)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600">Mandi/District:</label>
                    <select
                      value={forecastDistrict}
                      onChange={(e) => setForecastDistrict(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                    >
                      {INDIAN_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => fetchForecastData()}
                    disabled={loadingForecast}
                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={loadingForecast ? "animate-spin" : ""} />
                    <span>{loadingForecast ? "Updating..." : "Refresh"}</span>
                  </button>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="w-full h-64 sm:h-72">
                {demandForecast?.points ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={demandForecast.points}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="kg" />
                      <Tooltip
                        formatter={(val, name) => [
                          `${val} kg`,
                          name === "yhat"
                            ? "Forecast Demand"
                            : name === "hi"
                            ? "Upper Band"
                            : "Lower Band",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="hi"
                        stroke="none"
                        fill="#dcfce7"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="lo"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                      />
                      <Line
                        type="monotone"
                        dataKey="yhat"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#16a34a" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Loading forecast trajectory...
                  </div>
                )}
              </div>

              {/* Benchmark Tag */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                🎯 <strong className="text-slate-700">Accuracy:</strong> LightGBM 8.4% MAPE vs 14.1% Seasonal-Naive Baseline
              </div>
            </div>

            {/* AI Market Price Advisor Card (1 Column) */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">AI Price Advisor</h3>
                </div>

                {/* Price Band Box */}
                <div className="my-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 text-center">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Recommended Listing Band
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">
                    ₹{((priceAdvice?.bandLoPaise || 2400) / 100).toFixed(0)} - ₹
                    {((priceAdvice?.bandHiPaise || 3000) / 100).toFixed(0)}
                    <span className="text-xs font-semibold text-emerald-700 ml-1">/ kg</span>
                  </div>
                </div>

                {/* Mandi & Retail Benchmarks */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <span className="text-slate-600 font-medium">APMC Mandi Modal</span>
                    <strong className="text-slate-900 font-bold">
                      ₹{((priceAdvice?.mandiTodayPaise || 1800) / 100).toFixed(0)} / kg
                    </strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <span className="text-slate-600 font-medium">City Retail Supermarket</span>
                    <strong className="text-slate-900 font-bold">
                      ₹{((priceAdvice?.retailTodayPaise || 3800) / 100).toFixed(0)} / kg
                    </strong>
                  </div>
                </div>
              </div>

              {/* Rationale Notice */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                💡 {priceAdvice?.rationale ||
                  "14-day regional demand is strong. Listing in the recommended band maximizes farmer take-home pay while keeping consumer price well below retail."}
              </div>
            </div>
          </div>

          {/* Active Farm Produce Lots Table Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  My Active Farm Produce Lots
                </h3>
                <p className="text-xs text-slate-500">
                  Manage prices, pause/resume lots, and check real-time stock levels.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search crop or variety..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  <option value="all">All Grades</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
                <button
                  onClick={() => setActiveTab("new-listing")}
                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm"
                >
                  <PlusCircle size={14} />
                  <span>New Lot</span>
                </button>
              </div>
            </div>

            {filteredListings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                <Package size={32} className="mx-auto text-slate-300" />
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  No crop listings found matching your filters.
                </p>
                <button
                  onClick={() => setActiveTab("new-listing")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                >
                  <PlusCircle size={14} />
                  <span>Click here to upload your first harvest lot</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:mx-0">
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Crop Produce</th>
                      <th className="py-3 px-4">Variety</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4">Available / Total</th>
                      <th className="py-3 px-4">Price / kg</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredListings.map((l) => (
                      <tr key={l._id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            {l.crop?.imageUrl ? (
                              <img
                                src={l.crop.imageUrl}
                                alt={l.crop?.name}
                                className="w-8 h-8 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                                {l.crop?.name?.charAt(0) || "C"}
                              </div>
                            )}
                            <div>
                              <span>{l.crop?.name || "Crop Lot"}</span>
                              {l.organic && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Organic
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{l.variety}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Grade {l.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900">
                            {(l.availableGrams / 1000).toFixed(0)} kg
                          </span>
                          <span className="text-slate-400 text-xs ml-1">
                            / {(l.totalGrams / 1000).toFixed(0)} kg
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          ₹{(l.pricePaisePerKg / 100).toFixed(0)}/kg
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              l.status === "active"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : l.status === "paused"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Edit Price */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingListing(l);
                                setEditPricePerKg(String(l.pricePaisePerKg / 100));
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="Edit Price"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Pause / Resume */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(l._id, l.status)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                              title={l.status === "active" ? "Pause Lot" : "Activate Lot"}
                            >
                              {l.status === "active" ? (
                                <PauseCircle size={15} />
                              ) : (
                                <PlayCircle size={15} />
                              )}
                            </button>

                            {/* Delete Lot */}
                            <button
                              type="button"
                              onClick={() => handleDeleteListing(l._id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                              title="Delete Lot"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK PRICE EDIT MODAL */}
      {editingListing && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Update Lot Price</h3>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Editing asking price for{" "}
              <strong className="text-slate-800">
                {editingListing.crop?.name} ({editingListing.variety})
              </strong>
            </p>

            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">New Price (₹/kg)</label>
                <input
                  type="number"
                  min="1"
                  value={editPricePerKg}
                  onChange={(e) => setEditPricePerKg(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPrice}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {updatingPrice ? "Saving..." : "Save Price"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
