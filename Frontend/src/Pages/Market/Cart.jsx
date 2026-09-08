import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  Trash2,
  ShieldCheck,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, subtotalPaise, totalGrams } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState({
    line1: user?.address?.line1 || "B-42, Sector 62",
    city: user?.address?.district || "Noida",
    pincode: user?.address?.pincode || "201301",
    point: { type: "Point", coordinates: [77.3649, 28.628] },
  });

  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [deliverySlotHour, setDeliverySlotHour] = useState(9); // 9 AM
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const produceSubtotalRs = (subtotalPaise / 100).toFixed(0);
  const platformFeeRs = Math.round((subtotalPaise * 0.02) / 100);
  const logisticsFeeRs = 38; // ₹38 baseline pooled logistics
  const totalAmountRs = (parseInt(produceSubtotalRs) + platformFeeRs + logisticsFeeRs).toString();

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    if (!user) {
      navigate("/login");
      return;
    }

    setLoadingOrder(true);
    try {
      const payload = {
        items: items.map((i) => ({
          listingId: i.listing._id,
          grams: i.grams,
        })),
        deliveryAddress,
        deliverySlot: {
          date: new Date(deliveryDate),
          startHour: Number(deliverySlotHour),
          endHour: Number(deliverySlotHour) + 4,
        },
      };

      const res = await api.post("/api/orders", payload);
      const createdOrder = res.data.order;

      // In Mock Payment Mode or test keys
      await api.post("/api/payments/verify", {
        orderId: createdOrder._id,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_order_id: `order_mock_${Date.now()}`,
        razorpay_signature: "mock_signature",
      });

      clearCart();
      setOrderSuccess(createdOrder);
    } catch (err) {
      console.error("Order failed:", err);
      alert(err.response?.data?.error || "Order placement failed. Please try again.");
    } finally {
      setLoadingOrder(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-slate-900">Order Confirmed & Farm Locked!</h2>
          <div className="inline-block mt-3 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Order #{orderSuccess.orderNo}
          </div>
          <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your produce lot has been atomically reserved from verified farms and submitted to the AI dispatch optimizer.
          </p>
          <div className="mt-8 space-y-3">
            <Link
              to={`/orders/${orderSuccess._id}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition min-h-[48px]"
            >
              <span>Track Delivery & Economics</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/market"
              className="w-full flex items-center justify-center py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition min-h-[44px]"
            >
              Explore More Fresh Harvest
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Your Farm Basket is Empty</h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
            Explore directly listed farm batches near your location with zero middleman markups.
          </p>
          <Link
            to="/market"
            className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition min-h-[44px]"
          >
            Browse Farm Storefront
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-8">
          Your Farm Direct Basket
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Basket Items List */}
          <div className="lg:col-span-7 space-y-4">
            {items.map((item) => {
              const itemKg = item.grams / 1000;
              const lineTotal = ((item.grams * item.listing.pricePaisePerKg) / 100000).toFixed(0);

              return (
                <div
                  key={item.listing._id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  <img
                    src={
                      item.listing.images?.[0] ||
                      item.listing.crop?.imageUrl ||
                      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200"
                    }
                    alt={item.listing.crop?.name}
                    className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {item.listing.crop?.name}
                      </h3>
                      <button
                        className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                        onClick={() => removeItem(item.listing._id)}
                        title="Remove from basket"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      🧑‍🌾 {item.listing.farmer?.name || "Local Farmer"} · Grade {item.listing.grade}
                    </p>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                      ₹{(item.listing.pricePaisePerKg / 100).toFixed(0)}/kg
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <button
                          className="w-8 h-8 rounded-md bg-white text-slate-700 hover:bg-slate-200 font-bold text-sm flex items-center justify-center transition disabled:opacity-40"
                          onClick={() => updateQuantity(item.listing._id, item.grams - 1000)}
                          disabled={item.grams <= (item.listing.minOrderGrams || 1000)}
                        >
                          -
                        </button>
                        <span className="text-xs font-bold px-2 text-slate-800">{itemKg} kg</span>
                        <button
                          className="w-8 h-8 rounded-md bg-white text-slate-700 hover:bg-slate-200 font-bold text-sm flex items-center justify-center transition"
                          onClick={() => updateQuantity(item.listing._id, item.grams + 1000)}
                        >
                          +
                        </button>
                      </div>

                      <span className="text-base font-black text-slate-900">₹{lineTotal}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Address, Delivery Slot & Checkout Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Delivery Details
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress.line1}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line1: e.target.value })}
                  placeholder="House / Street / Sector"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.pincode}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Preferred Delivery Date
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Delivery Slot
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { hour: 7, label: "Morning (7 AM - 11 AM)" },
                    { hour: 12, label: "Afternoon (12 PM - 4 PM)" },
                    { hour: 17, label: "Evening (5 PM - 9 PM)" },
                  ].map((slot) => (
                    <button
                      key={slot.hour}
                      type="button"
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-left transition min-h-[44px] ${
                        deliverySlotHour === slot.hour
                          ? "bg-emerald-50 text-emerald-900 border-emerald-500 font-bold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                      onClick={() => setDeliverySlotHour(slot.hour)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing & Fee Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Payment Summary
              </h3>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Produce Subtotal ({totalGrams / 1000} kg)</span>
                <span className="font-semibold text-slate-900">₹{produceSubtotalRs}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Farmer Direct Realization</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  ₹{produceSubtotalRs} (100%)
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Logistics & Transport Fee</span>
                <span className="font-semibold text-slate-900">₹{logisticsFeeRs}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Platform Maintenance Fee (2%)</span>
                <span className="font-semibold text-slate-900">₹{platformFeeRs}</span>
              </div>

              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900">Total Payable</span>
                <strong className="text-2xl font-black text-slate-900">₹{totalAmountRs}</strong>
              </div>

              <button
                className="w-full mt-3 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 min-h-[50px]"
                onClick={() => navigate("/checkout")}
              >
                <CreditCard size={18} />
                <span>Proceed to Secure Checkout</span>
                <ArrowRight size={18} />
              </button>

              <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>Direct farmer payouts held in escrow until delivery verification.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
