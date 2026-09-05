import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Sparkles, CheckCircle2, ShieldCheck, ShoppingCart } from "lucide-react";
import { useCart } from "../../context/CartContext";
import "./ListingCard.css";

export default function ListingCard({ listing }) {
  const { addItem } = useCart();

  const priceRs = (listing.pricePaisePerKg / 100).toFixed(0);
  const totalKg = (listing.availableGrams / 100).toFixed(0) / 10;
  const minOrderKg = (listing.minOrderGrams / 1000).toFixed(0);

  // Approximate retail benchmark comparison (modelled saving)
  const estimatedRetailRs = Math.round(listing.pricePaisePerKg * 1.38 / 100);
  const savingsPerKg = Math.max(0, estimatedRetailRs - parseInt(priceRs));

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(listing, listing.minOrderGrams || 1000);
  };

  const cropImage =
    listing.images?.[0] ||
    listing.crop?.imageUrl ||
    "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=60";

  return (
    <div className="listing-card">
      <Link to={`/market/${listing._id}`} className="card-link">
        {/* Card Image Banner */}
        <div className="card-media">
          <img src={cropImage} alt={listing.crop?.name || "Produce"} loading="lazy" />
          <div className="grade-badge">Grade {listing.grade || "A"}</div>
          {listing.organic && <div className="organic-badge">🌱 100% Organic</div>}
          {listing.distanceKm !== null && listing.distanceKm !== undefined && (
            <div className="distance-badge">
              <MapPin size={12} />
              <span>{listing.distanceKm} km away</span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="card-body">
          <div className="card-header">
            <h3 className="crop-title">
              {listing.crop?.name || "Farm Produce"}
              {listing.crop?.nameHi && <span className="hi-name">({listing.crop.nameHi})</span>}
            </h3>
            <span className="variety-text">{listing.variety || "Fresh Harvest"}</span>
          </div>

          {/* Farmer Attribution */}
          <div className="farmer-info">
            <div className="farmer-avatar">🧑‍🌾</div>
            <div className="farmer-meta">
              <span className="farmer-name">
                {listing.farmer?.name || "Verified Local Farmer"}
                {listing.farmer?.kycStatus === "verified" && (
                  <ShieldCheck size={14} className="kyc-icon" title="KYC Verified" />
                )}
              </span>
              <span className="farmer-village">
                {listing.farmer?.village ? `${listing.farmer.village}, ` : ""}
                {listing.farmer?.district || "Local Region"}
              </span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="pricing-row">
            <div className="price-box">
              <span className="current-price">₹{priceRs}</span>
              <span className="unit-label">/ kg</span>
            </div>

            {savingsPerKg > 0 && (
              <div className="savings-tag" title="Compared to APMC city retail average">
                <Sparkles size={12} />
                <span>Save ₹{savingsPerKg}/kg</span>
              </div>
            )}
          </div>

          {/* Stock Availability Bar */}
          <div className="stock-info">
            <div className="stock-text">
              <span>{totalKg} kg remaining</span>
              <span className="min-order">Min: {minOrderKg} kg</span>
            </div>
            <div className="stock-bar-bg">
              <div
                className="stock-bar-fill"
                style={{
                  width: `${Math.min(100, Math.max(15, (listing.availableGrams / listing.totalGrams) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </Link>

      {/* Quick Add to Cart Action */}
      <div className="card-footer">
        <button className="add-cart-btn" onClick={handleQuickAdd}>
          <ShoppingCart size={16} />
          <span>Add to Cart ({minOrderKg}kg)</span>
        </button>
      </div>
    </div>
  );
}
