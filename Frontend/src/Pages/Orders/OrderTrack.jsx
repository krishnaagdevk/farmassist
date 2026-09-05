import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import {
  CheckCircle2,
  Clock,
  Truck,
  Sparkles,
  ChevronLeft,
} from "lucide-react";

export default function OrderTrack() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderAndLedger();
    const interval = setInterval(fetchOrderAndLedger, 15000); // 15s poll for active tracking
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrderAndLedger = async () => {
    try {
      const [orderRes, ledgerRes] = await Promise.all([
        api.get(`/api/orders/${id}`),
        api.get(`/api/orders/${id}/ledger`),
      ]);
      setOrder(orderRes.data.order);
      setLedger(ledgerRes.data.ledger);
    } catch (e) {
      console.error("Order tracking fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-slate-500 font-medium text-sm animate-pulse">
          Loading shipment trajectory and transparency ledger...
        </p>
      </div>
    );
  }

  const steps = [
    { key: "paid", label: "Paid & Farm Locked", desc: "Atomically reserved from farm stock" },
    { key: "routed", label: "AI Route Optimized", desc: "Assigned to electric transit fleet" },
    { key: "picked_up", label: "Picked Up from Farm", desc: "Driver verified produce batch" },
    { key: "delivered", label: "Delivered & Payout Released", desc: "Escrow funds released to farmer" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm transition min-h-[44px]"
          onClick={() => navigate("/orders")}
        >
          <ChevronLeft size={18} />
          <span>Back to Orders</span>
        </button>

        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Tracking Order #{order.orderNo}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/90 mt-1">
              Destination:{" "}
              <strong>
                {order.deliveryAddress?.line1}, {order.deliveryAddress?.city}
              </strong>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-right self-start sm:self-auto">
            <span className="text-xs text-emerald-200 block">Total Paid</span>
            <strong className="text-2xl font-black text-white">
              ₹{(order.totalPaise / 100).toFixed(0)}
            </strong>
          </div>
        </div>

        {/* Progress Status Stepper */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900">Live Fulfillment Trajectory</h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {steps.map((step, idx) => {
              const isCompleted = idx <= activeIndex;
              const isCurrent = idx === activeIndex;

              return (
                <div
                  key={step.key}
                  className={`p-4 rounded-2xl border transition ${
                    isCurrent
                      ? "bg-emerald-50 border-emerald-500 shadow-sm"
                      : isCompleted
                      ? "bg-slate-50 border-emerald-200"
                      : "bg-white border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {step.label}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Logistics Fleet & Dispatch Status Widget */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Truck size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Logistics & Transit Coordination</h3>
                <p className="text-xs text-slate-500">Direct cold-chain & optimized farm-to-door transit</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold">
              {order.shipment ? `Trip: ${order.shipment.code || "Active"}` : "Logistics: Batch Allocation"}
            </span>
          </div>

          {order.shipment ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                  Driver & Contact
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {order.shipment.driver?.name || "Verified Logistics Partner"}
                </p>
                <span className="text-xs text-emerald-700 block mt-0.5">
                  📞 {order.shipment.driver?.phone || "+91 98765 43210"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                  Vehicle Assignment
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {order.shipment.vehicle?.regNo || "DL-01-AG-4920 (EV Agri-Van)"}
                </p>
                <span className="text-xs text-slate-500 block mt-0.5">GPS Telematics Active</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                  Route Optimization
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {order.shipment.plannedDistanceKm ? `${order.shipment.plannedDistanceKm} km planned` : "Direct Multistop"}
                </p>
                <span className="text-xs text-blue-600 block mt-0.5">OR-Tools CVRP Optimized</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Clock size={20} className="text-slate-400 shrink-0" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Order is queued in regional hub. The OR-Tools route optimizer will group this with neighboring farm deliveries for minimal transit time and reduced carbon footprint.
              </p>
            </div>
          )}
        </div>

        {/* Side-by-side Transparency Ledger Panel */}
        {ledger && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supply Chain Transparency Breakdown</h3>
                <p className="text-xs text-slate-500">Comparing Direct Farm Flow vs Traditional 4-Tier Mandi Intermediary Chain</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Direct Model (AgriDirect) */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    AgriDirect (This Order)
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-xs font-bold">
                    {ledger.direct?.farmerSharePct}% to Farmer
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-2">
                  <div className="flex justify-between text-slate-700">
                    <span>Farmer Receives (100% Produce)</span>
                    <strong className="text-emerald-800">₹{(ledger.direct?.farmerReceivesPaise / 100).toFixed(0)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Optimized Logistics Fee</span>
                    <span>₹{(ledger.direct?.logisticsFeePaise / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Fee (2%)</span>
                    <span>₹{(ledger.direct?.platformFeePaise / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-emerald-200">
                    <span>Consumer Paid</span>
                    <span>₹{(ledger.direct?.consumerPaysPaise / 100).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Traditional Mandi Model */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Traditional APMC Mandi Chain
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-xs font-bold">
                    {ledger.traditional?.farmerSharePct}% to Farmer
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Farmer Received</span>
                    <span>₹{(ledger.traditional?.farmerReceivesPaise / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Commission Agent (Arhtiya)</span>
                    <span>₹{(ledger.traditional?.commissionAgentPaise / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Wholesaler Margin</span>
                    <span>₹{(ledger.traditional?.wholesalerPaise / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>City Retailer Margin</span>
                    <span>₹{(ledger.traditional?.retailerPaise / 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-200">
                    <span>Est. Retailer Consumer Price</span>
                    <span className="line-through text-slate-500">
                      ₹{(ledger.traditional?.consumerPaysPaise / 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Ribbon */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900 text-white rounded-2xl">
              <div>
                <span className="text-[11px] text-emerald-300 block uppercase font-semibold">Farmer Net Gain</span>
                <strong className="text-base sm:text-lg font-bold text-emerald-400">
                  +₹{(ledger.savings?.farmerGainsPaise / 100).toFixed(0)} (+{ledger.savings?.farmerGainsPct}%)
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-blue-300 block uppercase font-semibold">Consumer Saved</span>
                <strong className="text-base sm:text-lg font-bold text-blue-400">
                  ₹{(ledger.savings?.consumerSavesPaise / 100).toFixed(0)} ({ledger.savings?.consumerSavesPct}% cheaper)
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
