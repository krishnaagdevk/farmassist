import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Sparkles, ShieldCheck, ShoppingCart } from "lucide-react";
import { useCart } from "../../context/CartContext";

export default function ListingCard({ listing }) {
  const { addItem } = useCart();

  const priceRs = (listing.pricePaisePerKg / 100).toFixed(0);
  const totalKg = ((listing.availableGrams || 0) / 1000).toFixed(0);
  const minOrderKg = ((listing.minOrderGrams || 1000) / 1000).toFixed(0);

  // Approximate retail benchmark comparison (modelled saving)
  const estimatedRetailRs = Math.round((listing.pricePaisePerKg * 1.38) / 100);
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

  const fillPct = listing.totalGrams
    ? Math.min(100, Math.max(15, (listing.availableGrams / listing.totalGrams) * 100))
    : 75;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <Link to={`/market/${listing._id}`} className="block flex-1">
        {/* Card Image Banner */}
        <div className="relative h-48 sm:h-52 w-full bg-slate-100 overflow-hidden">
          <img
            src={cropImage}
            alt={listing.crop?.name || "Produce"}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900/80 backdrop-blur-sm text-white shadow-sm">
              Grade {listing.grade || "A"}
            </span>
            {listing.organic && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600/90 backdrop-blur-sm text-white shadow-sm">
                🌱 100% Organic
              </span>
            )}
          </div>
          {listing.distanceKm !== null && listing.distanceKm !== undefined && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-slate-800 shadow-sm">
              <MapPin size={12} className="text-emerald-600" />
              <span>{listing.distanceKm} km away</span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 sm:p-5">
          <div className="mb-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
              {listing.crop?.name || "Farm Produce"}
              {listing.crop?.nameHi && (
                <span className="ml-1.5 text-xs font-normal text-slate-500">({listing.crop.nameHi})</span>
              )}
            </h3>
            <span className="text-xs font-medium text-slate-500">{listing.variety || "Fresh Harvest"}</span>
          </div>

          {/* Farmer Attribution */}
          <div className="flex items-center gap-2.5 my-3 p-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              🧑‍🌾
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <div className="flex items-center gap-1 font-semibold text-slate-800 truncate">
                <span className="truncate">{listing.farmer?.name || "Verified Local Farmer"}</span>
                {listing.farmer?.kycStatus === "verified" && (
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" title="KYC Verified" />
                )}
              </div>
              <span className="text-[11px] text-slate-500 truncate block">
                {listing.farmer?.village ? `${listing.farmer.village}, ` : ""}
                {listing.farmer?.district || "Local Region"}
              </span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="flex items-baseline justify-between mt-3 mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">₹{priceRs}</span>
              <span className="text-xs font-medium text-slate-500">/ kg</span>
            </div>

            {savingsPerKg > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold"
                title="Compared to APMC city retail average"
              >
                <Sparkles size={11} />
                <span>Save ₹{savingsPerKg}/kg</span>
              </div>
            )}
          </div>

          {/* Stock Availability Bar */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>{totalKg} kg remaining</span>
              <span>Min: {minOrderKg} kg</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </div>
        </div>
      </Link>

      {/* Quick Add to Cart Action */}
      <div className="p-4 sm:p-5 pt-0">
        <button
          className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
          onClick={handleQuickAdd}
        >
          <ShoppingCart size={16} />
          <span>Add ({minOrderKg} kg min)</span>
        </button>
      </div>
    </div>
  );
}
