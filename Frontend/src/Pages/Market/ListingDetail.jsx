import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useCart } from "../../context/CartContext";
import {
  MapPin,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  TrendingDown,
  Info,
  Calendar,
  Layers,
  ChevronLeft,
} from "lucide-react";
import "./ListingDetail.css";

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [listing, setListing] = useState(null);
  const [priceComparison, setPriceComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantityKg, setQuantityKg] = useState(5);
  const [addedNotification, setAddedNotification] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/listings/${id}`);
      setListing(res.data.listing);
      setPriceComparison(res.data.priceComparison);
      if (res.data.listing?.minOrderGrams) {
        setQuantityKg(Math.max(1, res.data.listing.minOrderGrams / 1000));
      }
    } catch (e) {
      console.error("Failed to load listing detail:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !listing) {
    return (
      <div className="listing-detail-loading">
        <p>Loading farm lot details...</p>
      </div>
    );
  }

  const priceRs = (listing.pricePaisePerKg / 100).toFixed(0);
  const totalLineRs = ((quantityKg * listing.pricePaisePerKg) / 100).toFixed(0);
  const minOrderKg = (listing.minOrderGrams / 1000).toFixed(0);
  const maxAvailableKg = (listing.availableGrams / 1000).toFixed(0);

  const handleAddToCart = () => {
    addItem(listing, quantityKg * 1000);
    setAddedNotification(true);
    setTimeout(() => setAddedNotification(false), 3000);
  };

  const cropImage =
    listing.images?.[0] ||
    listing.crop?.imageUrl ||
    "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80";

  return (
    <div className="listing-detail-page">
      <button className="back-nav-btn" onClick={() => navigate(-1)}>
        <ChevronLeft size={18} />
        <span>Back to Marketplace</span>
      </button>

      <div className="detail-grid">
        {/* Left Column: Media & Producer Profile */}
        <div className="media-column">
          <div className="main-image-frame">
            <img src={cropImage} alt={listing.crop?.name} />
            <div className="floating-badges">
              <span className="badge-grade">Grade {listing.grade}</span>
              {listing.organic && <span className="badge-org">🌱 100% Organic</span>}
            </div>
          </div>

          {/* Farmer Farm Profile Card */}
          <div className="farmer-profile-card">
            <div className="farmer-header-row">
              <div className="farmer-avatar-lg">🧑‍🌾</div>
              <div>
                <h3>{listing.farmer?.name || "Local Farmer"}</h3>
                <p className="location-sub">
                  <MapPin size={14} />
                  <span>
                    {listing.farmer?.address?.village ? `${listing.farmer.address.village}, ` : ""}
                    {listing.farmer?.address?.district || "Local Region"}
                  </span>
                </p>
              </div>
            </div>

            <div className="trust-tags">
              {listing.farmer?.kycStatus === "verified" && (
                <div className="trust-tag">
                  <ShieldCheck size={16} />
                  <span>Aadhaar/Kisan KYC Verified</span>
                </div>
              )}
              <div className="trust-tag">
                <Calendar size={16} />
                <span>Harvested {new Date(listing.harvestedOn).toLocaleDateString()}</span>
              </div>
              <div className="trust-tag">
                <Layers size={16} />
                <span>Direct Batch Lot #{listing._id.slice(-6).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing, Economics Ledger & Order Actions */}
        <div className="action-column">
          <div className="crop-header-block">
            <h1>
              {listing.crop?.name}
              {listing.crop?.nameHi && <span className="crop-hindi">({listing.crop.nameHi})</span>}
            </h1>
            <p className="crop-variety">Variety: {listing.variety}</p>

            <div className="price-tag-large">
              <span className="rs-symbol">₹</span>
              <span className="rs-amount">{priceRs}</span>
              <span className="rs-unit">/ kg</span>
            </div>
          </div>

          {/* Price Transparency & Anti-Middleman Comparison Ledger */}
          <div className="transparency-ledger-card">
            <div className="ledger-header">
              <Sparkles size={18} className="sparkle-icon" />
              <h4>Price Transparency Comparison</h4>
            </div>

            <div className="comparison-table">
              <div className="comp-row highlight">
                <span>AgriDirect Price (Farmer-Direct)</span>
                <strong>₹{priceRs}/kg</strong>
              </div>
              <div className="comp-row">
                <span>APMC Mandi Modal Price</span>
                <span>₹{((priceComparison?.mandiModalPaisePerKg || 1800) / 100).toFixed(0)}/kg</span>
              </div>
              <div className="comp-row">
                <span>City Retail Market Price</span>
                <span className="retail-strikethrough">
                  ₹{((priceComparison?.retailPaisePerKg || 3800) / 100).toFixed(0)}/kg
                </span>
              </div>
            </div>

            <div className="ledger-callout">
              <Info size={14} />
              <span>
                Farmer gets <strong>100%</strong> of crop value. You save ~
                <strong>
                  {Math.round(
                    ((priceComparison?.retailPaisePerKg || 3800) - listing.pricePaisePerKg) / 100
                  )}
                  /kg
                </strong>{" "}
                by eliminating 4 middlemen tiers.
              </span>
            </div>
          </div>

          {/* Quantity Stepper & Order Execution Card */}
          <div className="order-box-card">
            <label className="stepper-label">Select Quantity (kg)</label>
            <div className="quantity-stepper">
              <button
                onClick={() => setQuantityKg(Math.max(parseInt(minOrderKg), quantityKg - 1))}
                disabled={quantityKg <= parseInt(minOrderKg)}
              >
                -
              </button>
              <input
                type="number"
                min={minOrderKg}
                max={maxAvailableKg}
                value={quantityKg}
                onChange={(e) => setQuantityKg(Math.max(parseInt(minOrderKg), parseInt(e.target.value) || parseInt(minOrderKg)))}
              />
              <button
                onClick={() => setQuantityKg(Math.min(parseInt(maxAvailableKg), quantityKg + 1))}
                disabled={quantityKg >= parseInt(maxAvailableKg)}
              >
                +
              </button>
            </div>

            <div className="order-total-preview">
              <span>Estimated Produce Total:</span>
              <strong>₹{totalLineRs}</strong>
            </div>

            <button className="primary-buy-btn" onClick={handleAddToCart}>
              <ShoppingBag size={20} />
              <span>Add {quantityKg} kg to Basket</span>
            </button>

            {addedNotification && (
              <div className="toast-success">
                ✅ Added {quantityKg} kg to your basket!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
