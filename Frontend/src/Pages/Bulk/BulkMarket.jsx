import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import {
  Package,
  TrendingDown,
  Truck,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Filter,
} from "lucide-react";
import "./BulkMarket.css";

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

export default function BulkMarket() {
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("kg"); // kg or quintals
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
    <div className="bulk-market-page">
      {/* Header Banner */}
      <div className="bulk-header-banner">
        <div className="bulk-header-content">
          <span className="badge-b2b">B2B & Institutional Procurement</span>
          <h1>Direct Farm Bulk Aggregation Portal</h1>
          <p>
            Procure farm-fresh harvest directly from FPO collectives and regional farmer clusters in bulk quantities (Quintals & Tonnes) with AI route optimization and transparent mandi-benchmarked pricing.
          </p>
        </div>
      </div>

      <div className="bulk-layout-grid">
        {/* Left Column: RFQ Configurator Form */}
        <div className="rfq-config-card">
          <div className="card-title-row">
            <Building2 size={20} className="icon-green" />
            <h2>Instant Bulk RFQ Engine</h2>
          </div>
          <p className="card-subtitle">
            Configure your commercial harvest requirements to instantly match with regional farmer lots.
          </p>

          <form onSubmit={handleGenerateRFQ} className="rfq-form">
            <div className="form-group">
              <label>Select Crop / Produce</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                required
              >
                {crops.map((c) => (
                  <option key={c._id} value={c.slug || c.name.toLowerCase()}>
                    {c.name} {c.nameHi ? `(${c.nameHi})` : ""} · {c.category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group flex-2">
                <label>Procurement Volume</label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  value={quantityValue}
                  onChange={(e) => setQuantityValue(e.target.value)}
                  required
                />
              </div>
              <div className="form-group flex-1">
                <label>Unit</label>
                <select
                  value={quantityUnit}
                  onChange={(e) => setQuantityUnit(e.target.value)}
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="quintal">Quintals (100 kg)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Quality Sorting Grade</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="A">Grade A (Export / Premium Retail)</option>
                  <option value="B">Grade B (Standard Commercial)</option>
                  <option value="C">Grade C (Processing / Economy)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Delivery Destination Hub</label>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group checkbox-wrapper">
              <label>
                <input
                  type="checkbox"
                  checked={organicOnly}
                  onChange={(e) => setOrganicOnly(e.target.checked)}
                />
                <span>🌿 Verified Organic cultivation lots only</span>
              </label>
            </div>

            <button type="submit" className="btn-rfq-submit" disabled={loadingRFQ}>
              <Sparkles size={18} />
              <span>{loadingRFQ ? "Aggregating Regional Lots..." : "Generate AI RFQ & Match Lots"}</span>
            </button>
          </form>

          {/* Value props for bulk buyers */}
          <div className="bulk-props-list">
            <div className="prop-item">
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Direct farmer contracts with Escrow protection</span>
            </div>
            <div className="prop-item">
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Traceable farm batch sorting and grading</span>
            </div>
            <div className="prop-item">
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Consolidated single-invoice multimodal freight</span>
            </div>
          </div>
        </div>

        {/* Right Column: Matched Aggregate Result */}
        <div className="rfq-results-column">
          {rfqResult ? (
            <div className="rfq-summary-card">
              <div className="summary-header">
                <div>
                  <span className="summary-tag">AI RFQ Breakdown</span>
                  <h3>
                    {rfqResult.crop?.name} {rfqResult.crop?.nameHi ? `(${rfqResult.crop.nameHi})` : ""} · {rfqResult.requestedKg} kg ({ (rfqResult.requestedKg / 100).toFixed(1) } Quintals)
                  </h3>
                </div>
                <span className={`feasibility-badge ${rfqResult.feasible ? "feasible" : "partial"}`}>
                  {rfqResult.feasible ? "✓ 100% Supply Matched" : `Partial Supply (${rfqResult.availableKg} kg)`}
                </span>
              </div>

              {/* Price & Savings Highlight Cards */}
              <div className="savings-highlight-grid">
                <div className="highlight-box primary">
                  <span className="box-label">Blended Farm-Gate Price</span>
                  <div className="box-val">
                    ₹{(rfqResult.blendedPricePaisePerKg / 100).toFixed(2)}
                    <span className="unit">/ kg</span>
                  </div>
                  <span className="box-sub">
                    (₹{((rfqResult.blendedPricePaisePerKg * 100) / 100).toFixed(0)} / Quintal)
                  </span>
                </div>

                <div className="highlight-box savings">
                  <span className="box-label">Buyer Savings vs City Mandi</span>
                  <div className="box-val green">
                    ₹{((rfqResult.estimatedSavingsPaise || 450000) / 100).toFixed(0)}
                  </div>
                  <span className="box-sub green-sub">
                    ~{rfqResult.savingsPct || 22}% below wholesale market
                  </span>
                </div>
              </div>

              {/* Cost Breakdown Table */}
              <div className="cost-breakdown-box">
                <h4>Commercial Quotation Breakdown</h4>
                <div className="cost-line">
                  <span>Farm Produce Subtotal ({rfqResult.feasible ? rfqResult.requestedKg : rfqResult.availableKg} kg)</span>
                  <strong>₹{(rfqResult.produceSubtotalPaise / 100).toFixed(0)}</strong>
                </div>
                <div className="cost-line">
                  <span>AI Route-Optimized Logistics ({city} Hub)</span>
                  <span>₹{(rfqResult.logisticsFeePaise / 100).toFixed(0)}</span>
                </div>
                <div className="cost-line">
                  <span>Quality Assurance & Platform Fee (1.5%)</span>
                  <span>₹{(rfqResult.platformFeePaise / 100).toFixed(0)}</span>
                </div>
                <div className="cost-line total-line">
                  <span>Estimated Total Landed Cost</span>
                  <strong>₹{(rfqResult.totalEstimatedPaise / 100).toFixed(0)}</strong>
                </div>
              </div>

              {/* Matched Farmer Lots List */}
              <div className="matched-lots-section">
                <h4>Participating Farmer Lots & FPOs ({rfqResult.matchedListings?.length || 0})</h4>
                <div className="lots-scroll-container">
                  {rfqResult.matchedListings?.map((lot, idx) => (
                    <div key={idx} className="matched-lot-item">
                      <div className="lot-info">
                        <strong>{lot.farmerName}</strong>
                        {lot.fpoName && <span className="fpo-tag">FPO: {lot.fpoName}</span>}
                        <span className="lot-location">{lot.address}</span>
                      </div>
                      <div className="lot-allocation">
                        <span className="lot-qty">{lot.allocatedKg} kg allocated</span>
                        <span className="lot-rate">₹{(lot.pricePaisePerKg / 100).toFixed(0)}/kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {orderPlaced ? (
                <div className="order-confirmed-banner">
                  <CheckCircle2 size={24} color="#16a34a" />
                  <div>
                    <strong>Bulk RFQ Contract Initiated!</strong>
                    <p>Our regional FPO logistics coordinator has locked the farm lots and will contact your team for delivery scheduling.</p>
                  </div>
                </div>
              ) : (
                <div className="rfq-actions-row">
                  <button className="btn-confirm-bulk" onClick={handlePlaceBulkOrder}>
                    <span>Lock Bulk Order & Reserve Lots</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rfq-empty-state">
              <Package size={48} className="empty-icon" />
              <h3>No Active Bulk RFQ Generated</h3>
              <p>
                Fill in the procurement parameters on the left and click <strong>"Generate AI RFQ & Match Lots"</strong> to instantly aggregate farmer harvests across North Indian agricultural clusters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
