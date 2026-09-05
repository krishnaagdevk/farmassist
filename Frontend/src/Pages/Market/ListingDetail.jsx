import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useCart } from "../../context/CartContext";
import {
  MapPin,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Info,
  Calendar,
  Layers,
  ChevronLeft,
} from "lucide-react";

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-500 font-medium text-sm animate-pulse">Loading farm lot details...</p>
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <button
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl mb-6 shadow-sm transition min-h-[44px]"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={18} />
          <span>Back to Marketplace</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Media & Producer Profile */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-md aspect-[4/3] max-h-[440px] w-full">
              <img
                src={cropImage}
                alt={listing.crop?.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 backdrop-blur-md text-white shadow-sm">
                  Grade {listing.grade}
                </span>
                {listing.organic && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600/90 backdrop-blur-md text-white shadow-sm">
                    🌱 100% Organic
                  </span>
                )}
              </div>
            </div>

            {/* Farmer Farm Profile Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-2xl flex items-center justify-center shrink-0">
                  🧑‍🌾
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {listing.farmer?.name || "Local Farmer"}
                  </h3>
                  <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin size={14} className="text-emerald-600 shrink-0" />
                    <span>
                      {listing.farmer?.address?.village ? `${listing.farmer.address.village}, ` : ""}
                      {listing.farmer?.address?.district || "Local Region"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                {listing.farmer?.kycStatus === "verified" && (
                  <div className="p-3 bg-emerald-50 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-900">
                    <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                    <span>KYC Verified</span>
                  </div>
                )}
                <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-xs text-slate-700">
                  <Calendar size={16} className="text-slate-500 shrink-0" />
                  <span>Harvest: {new Date(listing.harvestedOn).toLocaleDateString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-xs text-slate-700">
                  <Layers size={16} className="text-slate-500 shrink-0" />
                  <span>Batch #{listing._id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Economics Ledger & Order Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {listing.crop?.name}
                  {listing.crop?.nameHi && (
                    <span className="ml-2 text-base font-normal text-slate-500">
                      ({listing.crop.nameHi})
                    </span>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Variety: {listing.variety}</p>

                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">₹{priceRs}</span>
                  <span className="text-sm font-semibold text-slate-500">/ kg</span>
                </div>
              </div>

              {/* Price Transparency & Anti-Middleman Comparison Ledger */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wide mb-3">
                  <Sparkles size={16} className="text-emerald-600" />
                  <span>Price Transparency Ledger</span>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1.5 px-2 bg-emerald-600 text-white rounded-lg font-bold">
                    <span>AgriDirect (Farmer-Direct)</span>
                    <span>₹{priceRs}/kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1 px-2 text-slate-700 font-medium">
                    <span>APMC Mandi Modal Price</span>
                    <span>₹{((priceComparison?.mandiModalPaisePerKg || 1800) / 100).toFixed(0)}/kg</span>
                  </div>
                  <div className="flex justify-between items-center py-1 px-2 text-slate-500 font-medium line-through">
                    <span>City Retail Market Price</span>
                    <span>₹{((priceComparison?.retailPaisePerKg || 3800) / 100).toFixed(0)}/kg</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-start gap-2 text-xs text-emerald-900">
                  <Info size={14} className="shrink-0 mt-0.5 text-emerald-700" />
                  <span>
                    Farmer gets <strong>100%</strong> of crop value. You save ~
                    <strong>
                      ₹{Math.max(0, Math.round(((priceComparison?.retailPaisePerKg || 3800) - listing.pricePaisePerKg) / 100))}/kg
                    </strong>{" "}
                    by eliminating 4 middlemen tiers.
                  </span>
                </div>
              </div>

              {/* Quantity Stepper & Order Execution */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    Select Quantity (kg)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-lg font-bold flex items-center justify-center transition disabled:opacity-40 min-h-[44px]"
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
                      onChange={(e) =>
                        setQuantityKg(
                          Math.max(
                            parseInt(minOrderKg),
                            parseInt(e.target.value) || parseInt(minOrderKg)
                          )
                        )
                      }
                      className="flex-1 text-center font-bold text-lg bg-slate-50 border border-slate-300 rounded-xl py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                    />
                    <button
                      className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-lg font-bold flex items-center justify-center transition disabled:opacity-40 min-h-[44px]"
                      onClick={() => setQuantityKg(Math.min(parseInt(maxAvailableKg), quantityKg + 1))}
                      disabled={quantityKg >= parseInt(maxAvailableKg)}
                    >
                      +
                    </button>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 px-1">
                    <span>Min Order: {minOrderKg} kg</span>
                    <span>Available: {maxAvailableKg} kg</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 border-y border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">Estimated Produce Total:</span>
                  <strong className="text-xl font-black text-slate-900">₹{totalLineRs}</strong>
                </div>

                <button
                  className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-2xl shadow-md transition flex items-center justify-center gap-2.5 min-h-[50px]"
                  onClick={handleAddToCart}
                >
                  <ShoppingBag size={20} />
                  <span>Add {quantityKg} kg to Basket</span>
                </button>

                {addedNotification && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-center text-xs font-semibold animate-fade-in">
                    ✅ Added {quantityKg} kg to your basket!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
