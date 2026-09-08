import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  ShieldCheck,
  CreditCard,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Truck,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import "./Checkout.css";

// Utility to load Razorpay script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const { items, clearCart, subtotalPaise } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Address state
  const [address, setAddress] = useState({
    line1: user?.address?.line1 || "B-42, Sector 62",
    city: user?.address?.district || "Noida",
    pincode: user?.address?.pincode || "201301",
    point: {
      type: "Point",
      coordinates: user?.location?.coordinates || [77.3649, 28.628], // [lng, lat]
    },
  });

  // Slot state
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [deliveryDate, setDeliveryDate] = useState(tomorrowStr);
  const [selectedSlot, setSelectedSlot] = useState("morning"); // "morning" | "afternoon" | "evening"

  const slots = [
    {
      id: "morning",
      label: "Morning Express",
      time: "06:00 AM - 10:00 AM",
      startHour: 6,
      endHour: 10,
      desc: "Fresh morning farm harvest drop",
    },
    {
      id: "afternoon",
      label: "Midday Slot",
      time: "12:00 PM - 04:00 PM",
      startHour: 12,
      endHour: 16,
      desc: "Standard cold-chain aggregation",
    },
    {
      id: "evening",
      label: "Evening Transit",
      time: "04:00 PM - 08:00 PM",
      startHour: 16,
      endHour: 20,
      desc: "Residential evening delivery",
    },
  ];

  // Logistics quote state
  const [logisticsQuote, setLogisticsQuote] = useState({
    feePaise: 3800, // ₹38 default
    distanceKm: 12.4,
    etaMinutes: 45,
    loading: false,
  });

  const [loadingPayment, setLoadingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch logistics quote when items or address coordinates change
  useEffect(() => {
    if (items.length === 0) return;

    let isMounted = true;
    const fetchQuote = async () => {
      setLogisticsQuote((prev) => ({ ...prev, loading: true }));
      try {
        const payload = {
          items: items.map((i) => ({
            listingId: i.listing._id,
            grams: i.grams,
          })),
          dropLng: address.point.coordinates[0],
          dropLat: address.point.coordinates[1],
        };

        const res = await api.post("/api/logistics/quote", payload);
        if (isMounted && res.data) {
          setLogisticsQuote({
            feePaise: res.data.feePaise || 3800,
            distanceKm: res.data.distanceKm || 10,
            etaMinutes: res.data.etaMinutes || 40,
            loading: false,
          });
        }
      } catch (err) {
        console.warn("Logistics quote failed, using fallback:", err);
        if (isMounted) {
          setLogisticsQuote((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    fetchQuote();
    return () => {
      isMounted = false;
    };
  }, [items, address.pincode]);

  // Calculations
  const produceSubtotalRs = Math.round(subtotalPaise / 100);
  const platformFeeRs = Math.max(2, Math.round((subtotalPaise * 0.02) / 100));
  const logisticsFeeRs = Math.round(logisticsQuote.feePaise / 100);
  const totalAmountRs = produceSubtotalRs + platformFeeRs + logisticsFeeRs;

  // Checkout submission handler
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (items.length === 0) {
      setErrorMessage("Your cart is empty. Please add farm produce first.");
      return;
    }

    if (!user) {
      navigate("/login?redirect=/checkout");
      return;
    }

    if (!address.line1.trim() || !address.city.trim() || !address.pincode.trim()) {
      setErrorMessage("Please fill in complete delivery address details.");
      return;
    }

    const slotConfig = slots.find((s) => s.id === selectedSlot) || slots[0];

    setLoadingPayment(true);

    try {
      // 1. Create order on backend (reserves stock atomically)
      const orderPayload = {
        items: items.map((i) => ({
          listingId: i.listing._id,
          grams: i.grams,
        })),
        deliveryAddress: address,
        deliverySlot: {
          date: new Date(deliveryDate),
          startHour: slotConfig.startHour,
          endHour: slotConfig.endHour,
        },
      };

      const orderRes = await api.post("/api/orders", orderPayload);
      const createdOrder = orderRes.data.order;

      if (!createdOrder || !createdOrder._id) {
        throw new Error("Invalid order response from server");
      }

      // 2. Request payment intent
      const intentRes = await api.post("/api/payments/intent", {
        orderId: createdOrder._id,
      });

      const intentData = intentRes.data;

      // 3. Handle Mock Payment mode (if backend MOCK_PAYMENTS=true or sandbox fallback)
      if (intentData.mock === true) {
        const verifyRes = await api.post("/api/payments/verify", {
          orderId: createdOrder._id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_order_id: `order_mock_${Date.now()}`,
          razorpay_signature: "mock_signature",
        });

        if (verifyRes.data.ok) {
          clearCart();
          navigate(`/orders/${createdOrder._id}`);
          return;
        }
      }

      // 4. Handle Live Razorpay flow
      const isRzpReady = await loadRazorpayScript();
      if (!isRzpReady) {
        throw new Error("Failed to load Razorpay payment gateway SDK.");
      }

      const options = {
        key: intentData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_mock",
        amount: intentData.amount,
        currency: intentData.currency || "INR",
        name: "AgriDirect Marketplace",
        description: `Order #${createdOrder.orderNo} - Direct Farm Produce`,
        order_id: intentData.razorpayOrderId,
        prefill: {
          name: user?.name || "AgriDirect Buyer",
          email: user?.email || "buyer@agridirect.in",
          contact: user?.phone || "9876543210",
        },
        theme: {
          color: "#1a7a4a",
        },
        handler: async function (response) {
          try {
            const verifyPayload = {
              orderId: createdOrder._id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            };

            const verifyRes = await api.post("/api/payments/verify", verifyPayload);
            if (verifyRes.data.ok) {
              clearCart();
              navigate(`/orders/${createdOrder._id}`);
            } else {
              setErrorMessage("Payment verification returned incomplete status.");
            }
          } catch (vErr) {
            console.error("Verification error:", vErr);
            setErrorMessage(
              vErr.response?.data?.error || "Payment verification failed. Please contact support."
            );
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPayment(false);
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch (err) {
      console.error("Checkout submission failed:", err);
      setErrorMessage(
        err.response?.data?.error ||
          err.message ||
          "Order processing failed. Please check network or try again."
      );
      setLoadingPayment(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Your basket is empty</h2>
          <p className="mt-2 text-xs text-slate-500">
            Please add fresh farm produce from our storefront before checking out.
          </p>
          <Link
            to="/market"
            className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition min-h-[44px]"
          >
            Browse Farm Market
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Direct Farm Checkout
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Guaranteed zero intermediaries · 91% direct farmer payout · AI route pooled delivery
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto">
            <ShieldCheck size={16} />
            <span>Escrow Guaranteed</span>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Delivery Address & Time Slot */}
          <div className="lg:col-span-7 space-y-6">
            {/* Delivery Address Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <MapPin className="text-emerald-700" size={20} />
                <h2 className="text-base font-bold text-slate-900">1. Delivery Address</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Street / Flat / House No.
                  </label>
                  <input
                    type="text"
                    required
                    value={address.line1}
                    onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                    placeholder="e.g. Flat 402, Green Meadows, Sector 62"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      City / District
                    </label>
                    <input
                      type="text"
                      required
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="e.g. Noida"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Postal Pincode
                    </label>
                    <input
                      type="text"
                      required
                      pattern="[0-9]{6}"
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                      placeholder="e.g. 201301"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Date & Slot Picker */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <Calendar className="text-emerald-700" size={20} />
                <h2 className="text-base font-bold text-slate-900">2. Scheduled Delivery Window</h2>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Target Harvest & Delivery Date
                </label>
                <input
                  type="date"
                  min={tomorrowStr}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full sm:w-64 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-h-[44px]"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Select Aggregation Time Window
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {slots.map((s) => {
                    const isSelected = selectedSlot === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSlot(s.id)}
                        className={`cursor-pointer rounded-2xl p-4 border transition flex flex-col justify-between ${
                          isSelected
                            ? "bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/30 shadow-sm"
                            : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-slate-900">{s.label}</span>
                          <input
                            type="radio"
                            name="slotGroup"
                            checked={isSelected}
                            onChange={() => setSelectedSlot(s.id)}
                            className="text-emerald-600 focus:ring-emerald-500 mt-0.5"
                          />
                        </div>
                        <div className="mt-2.5">
                          <div className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <Clock size={12} />
                            <span>{s.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Produce Summary preview list */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Reserved Produce Items ({items.length})</h3>
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const lineTotal = (
                    (item.grams * item.listing.pricePaisePerKg) /
                    100000
                  ).toFixed(0);
                  return (
                    <div key={item.listing._id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 text-sm">{item.listing.crop?.name}</strong>
                        <p className="text-slate-500 text-[11px]">
                          {item.grams / 1000} kg · Grade {item.listing.grade} · Farmer:{" "}
                          {item.listing.farmer?.name || "Local Farmer"}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 text-sm">₹{lineTotal}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Economics & Pay Button */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5 sticky top-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Order Cost Breakdown</span>
                <span className="text-xs font-normal text-slate-500">Live AI Rate</span>
              </h3>

              {/* Line items */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Fresh Produce Subtotal</span>
                  <span className="font-semibold text-slate-900 text-sm">₹{produceSubtotalRs}</span>
                </div>

                <div className="flex justify-between text-slate-600 items-center">
                  <div>
                    <span className="block text-slate-700 font-medium">Pooled Logistics Fee</span>
                    <span className="text-[11px] text-slate-400">
                      OR-Tools route optimized (~{logisticsQuote.distanceKm} km transit)
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm">
                    {logisticsQuote.loading ? "Calculating..." : `₹${logisticsFeeRs}`}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 items-center">
                  <div>
                    <span className="block text-slate-700 font-medium">Platform Service Fee (2%)</span>
                    <span className="text-[11px] text-slate-400">Escrow security & quality assurance</span>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm">₹{platformFeeRs}</span>
                </div>

                {/* Total */}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-slate-900">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-600 block">
                      Total Payable
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Farmer receives ₹{produceSubtotalRs} (100% of produce value)
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-800">
                    ₹{totalAmountRs}
                  </div>
                </div>
              </div>

              {/* Transparency pill */}
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 space-y-1.5 text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles size={14} className="text-emerald-700" />
                  <span>Fair Trade Transparency</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  In a traditional mandi system, a farmer would earn just ~₹
                  {Math.round(produceSubtotalRs * 0.48)} for this batch. AgriDirect transfers 91% of consumer spend directly to the grower.
                </p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loadingPayment || items.length === 0}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-sm sm:text-base rounded-2xl shadow-md transition flex items-center justify-center gap-2 min-h-[52px]"
              >
                {loadingPayment ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Processing Secure Gateway...</span>
                  </span>
                ) : (
                  <>
                    <CreditCard size={18} />
                    <span>Pay ₹{totalAmountRs} & Lock Farm Order</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck size={14} className="text-slate-500" />
                <span>256-Bit SSL Encrypted · Razorpay & UPI Supported</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
