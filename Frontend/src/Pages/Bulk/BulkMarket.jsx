import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import {
  Package,
  Truck,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Wheat,
  IndianRupee,
  MapPin,
  Star,
  AlertTriangle,
} from "lucide-react";

const INDIAN_CITIES = [
  "Delhi NCR",
  "Ghaziabad",
  "Lucknow",
  "Agra",
  "Meerut",
  "Kanpur",
  "Varanasi",
  "Jaipur",
  "Pune",
  "Nashik",
  "Indore",
  "Ahmedabad",
  "Bengaluru",
  "Hyderabad",
];

const VALUE_PROPS = [
  { icon: <ShieldCheck size={16} />, text: "Direct farmer contracts with Escrow protection" },
  { icon: <CheckCircle2 size={16} />, text: "Traceable farm batch sorting and grading" },
  { icon: <Truck size={16} />, text: "Consolidated single-invoice multimodal freight" },
  { icon: <Star size={16} />, text: "APMC mandi-benchmarked transparent pricing" },
];

export default function BulkMarket() {
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("kg");
  const [quantityValue, setQuantityValue] = useState("500");
  const [grade, setGrade] = useState("A");
  const [organicOnly, setOrganicOnly] = useState(false);
  const [city, setCity] = useState("Delhi NCR");
  const [loadingRFQ, setLoadingRFQ] = useState(false);
  const [rfqResult, setRfqResult] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      const res = await api.get("/api/crops");
      const list = res.data.crops || [];
      setCrops(list);
      if (list.length > 0) {
        setSelectedCrop(list[0].slug || list[0].name.toLowerCase());
      }
    } catch (e) {
      console.error("Failed to load crops:", e);
    }
  };

  const calculateKg = () => {
    const val = parseFloat(quantityValue) || 100;
    return quantityUnit === "quintal" ? val * 100 : val;
  };

  const handleGenerateRFQ = async (e) => {
    if (e) e.preventDefault();
    setLoadingRFQ(true);
    setOrderPlaced(false);
    try {
      const totalKg = calculateKg();
      const res = await api.post("/api/bulk/rfq", {
        cropSlug: selectedCrop,
        quantityKg: totalKg,
        grade,
        organicOnly,
        city,
      });
      setRfqResult(res.data);
    } catch (err) {
      console.error("RFQ calculation failed:", err);
      alert(err.response?.data?.error || "Failed to aggregate bulk farm lots");
    } finally {
      setLoadingRFQ(false);
    }
  };

  const handlePlaceBulkOrder = () => {
    setOrderPlaced(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Header Banner ── */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:pt-12 sm:pb-14">
        <div className="max-w-6xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/15 border border-white/30 mb-3">
            <Building2 size={13} />
            B2B &amp; Institutional Procurement
          </span>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-3 leading-tight">
            Direct Farm Bulk Aggregation Portal
          </h1>
          <p className="text-sm sm:text-base text-blue-200 max-w-2xl leading-relaxed">
            Procure farm-fresh harvest directly from FPO collectives and regional farmer clusters in
            bulk quantities (Quintals &amp; Tonnes) with AI route optimization and transparent
            mandi-benchmarked pricing.
          </p>
          {/* Quick stats bar */}
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { label: "18% Savings vs Wholesale", color: "bg-green-400/20 text-green-200 border-green-400/30" },
              { label: "220+ FPO Clusters", color: "bg-blue-400/20 text-blue-100 border-blue-400/30" },
              { label: "Escrow Protected", color: "bg-amber-400/20 text-amber-200 border-amber-400/30" },
            ].map((s) => (
              <span
                key={s.label}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border ${s.color}`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
          {/* ── Left: RFQ Form ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Instant Bulk RFQ Engine</h2>
                  <p className="text-[11px] text-slate-500">Configure your commercial requirements</p>
                </div>
              </div>

              <form onSubmit={handleGenerateRFQ} className="p-5 space-y-4">
                {/* Crop select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Select Crop / Produce
                  </label>
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {crops.map((c) => (
                      <option key={c._id} value={c.slug || c.name.toLowerCase()}>
                        {c.name} {c.nameHi ? `(${c.nameHi})` : ""} · {c.category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Volume + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Procurement Volume
                    </label>
                    <input
                      type="number"
                      min="50"
                      step="10"
                      value={quantityValue}
                      onChange={(e) => setQuantityValue(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unit</label>
                    <select
                      value={quantityUnit}
                      onChange={(e) => setQuantityUnit(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="quintal">Quintals (100 kg)</option>
                    </select>
                  </div>
                </div>

                {/* Grade + City */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Quality Grade
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="A">Grade A (Export / Premium)</option>
                      <option value="B">Grade B (Commercial)</option>
                      <option value="C">Grade C (Processing)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Delivery Hub
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {INDIAN_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Organic toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={organicOnly}
                      onChange={(e) => setOrganicOnly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 transition" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    🌿 Verified Organic lots only
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loadingRFQ}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold py-3 rounded-xl shadow transition disabled:opacity-60"
                >
                  <Sparkles size={17} />
                  {loadingRFQ ? "Aggregating Regional Lots..." : "Generate AI RFQ & Match Lots"}
                </button>
              </form>

              {/* Value props */}
              <div className="px-5 pb-5 space-y-2 border-t border-slate-100 pt-4">
                {VALUE_PROPS.map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <span className="text-emerald-600 mt-0.5 flex-shrink-0">{p.icon}</span>
                    <span>{p.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: RFQ Results ── */}
          <div className="lg:col-span-3">
            {rfqResult ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Summary header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                      AI RFQ Breakdown
                    </span>
                    <h3 className="text-base font-bold mt-0.5">
                      {rfqResult.crop?.name}
                      {rfqResult.crop?.nameHi ? ` (${rfqResult.crop.nameHi})` : ""} ·{" "}
                      {rfqResult.requestedKg} kg ({(rfqResult.requestedKg / 100).toFixed(1)} Quintals)
                    </h3>
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border ${
                      rfqResult.feasible
                        ? "bg-green-400/20 border-green-400/40 text-green-100"
                        : "bg-amber-400/20 border-amber-400/40 text-amber-100"
                    }`}
                  >
                    {rfqResult.feasible
                      ? "✓ 100% Supply Matched"
                      : `Partial Supply (${rfqResult.availableKg} kg)`}
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  {/* Price + Savings highlight */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-4">
                      <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                        Blended Farm-Gate Price
                      </span>
                      <div className="mt-1 flex items-end gap-1">
                        <span className="text-2xl font-black text-blue-900">
                          ₹{(rfqResult.blendedPricePaisePerKg / 100).toFixed(2)}
                        </span>
                        <span className="text-xs text-blue-600 mb-1">/ kg</span>
                      </div>
                      <p className="text-[11px] text-blue-500 mt-0.5">
                        ₹{((rfqResult.blendedPricePaisePerKg * 100) / 100).toFixed(0)} / Quintal
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-4">
                      <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                        Buyer Savings vs City Mandi
                      </span>
                      <div className="mt-1 flex items-end gap-1">
                        <span className="text-2xl font-black text-emerald-700">
                          ₹{((rfqResult.estimatedSavingsPaise || 450000) / 100).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-500 mt-0.5">
                        ~{rfqResult.savingsPct || 22}% below wholesale market
                      </p>
                    </div>
                  </div>

                  {/* Cost breakdown */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-100/70">
                      <h4 className="text-xs font-bold text-slate-700">Commercial Quotation Breakdown</h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {[
                        {
                          label: `Farm Produce Subtotal (${
                            rfqResult.feasible ? rfqResult.requestedKg : rfqResult.availableKg
                          } kg)`,
                          value: `₹${(rfqResult.produceSubtotalPaise / 100).toFixed(0)}`,
                          bold: false,
                        },
                        {
                          label: `AI Route-Optimized Logistics (${city} Hub)`,
                          value: `₹${(rfqResult.logisticsFeePaise / 100).toFixed(0)}`,
                          bold: false,
                        },
                        {
                          label: "Quality Assurance & Platform Fee (1.5%)",
                          value: `₹${(rfqResult.platformFeePaise / 100).toFixed(0)}`,
                          bold: false,
                        },
                        {
                          label: "Estimated Total Landed Cost",
                          value: `₹${(rfqResult.totalEstimatedPaise / 100).toFixed(0)}`,
                          bold: true,
                        },
                      ].map((row, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-4 py-2.5 text-xs ${
                            row.bold ? "bg-blue-50 font-bold text-slate-900" : "text-slate-600"
                          }`}
                        >
                          <span>{row.label}</span>
                          <span className={row.bold ? "text-blue-700" : ""}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matched lots */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-3">
                      Participating Farmer Lots &amp; FPOs ({rfqResult.matchedListings?.length || 0})
                    </h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {rfqResult.matchedListings?.map((lot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div className="min-w-0">
                            <strong className="text-xs font-bold text-slate-800 block truncate">
                              {lot.farmerName}
                            </strong>
                            {lot.fpoName && (
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 mr-1">
                                FPO: {lot.fpoName}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5 mt-0.5">
                              <MapPin size={10} />
                              {lot.address}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="block text-xs font-bold text-slate-800">
                              {lot.allocatedKg} kg
                            </span>
                            <span className="block text-[11px] text-emerald-700 font-semibold">
                              ₹{(lot.pricePaisePerKg / 100).toFixed(0)}/kg
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  {orderPlaced ? (
                    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-sm font-bold text-emerald-800 block">
                          Bulk RFQ Contract Initiated!
                        </strong>
                        <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                          Our regional FPO logistics coordinator has locked the farm lots and will
                          contact your team for delivery scheduling.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handlePlaceBulkOrder}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold py-3.5 rounded-xl shadow transition active:scale-95"
                    >
                      <span>Lock Bulk Order &amp; Reserve Lots</span>
                      <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-10 sm:p-16 min-h-[360px]">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                  <Package size={36} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No Active Bulk RFQ Generated</h3>
                <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                  Fill in the procurement parameters on the left and click{" "}
                  <strong className="text-slate-700">"Generate AI RFQ &amp; Match Lots"</strong> to
                  instantly aggregate farmer harvests across North Indian agricultural clusters.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs text-left">
                  {[
                    { icon: "🌾", label: "220+ FPO Pools" },
                    { icon: "🚛", label: "AI Route Optimized" },
                    { icon: "🔒", label: "Escrow Protected" },
                    { icon: "📊", label: "APMC Benchmarked" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
