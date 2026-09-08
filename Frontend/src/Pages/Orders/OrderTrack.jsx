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

import PriceLedger from "../../components/PriceLedger/PriceLedger";

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
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? "bg-emerald-50 border-emerald-500 shadow-sm"
                      : isCompleted
                      ? "bg-slate-50 border-slate-200 opacity-90"
                      : "bg-white border-slate-100 opacity-40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {isCompleted ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <Clock size={18} className="text-slate-400" />
                    )}
                    <span className="text-xs font-bold text-slate-900">{step.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">{step.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Assigned Shipment & Vehicle Live Telematics */}
          {order.shipment && (
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Assigned Fleet: {order.shipment.vehicle?.name || "EV Van 01"} (
                    {order.shipment.vehicle?.plateNo || "DL-01-EV-4421"})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Driver: {order.shipment.driver?.name || "Ramesh Kumar"} · Route Stop #{order.shipment.stopIndex || 1}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  Live Dispatch Route Active
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Side-by-side Transparency Ledger Panel */}
        {ledger && <PriceLedger ledger={ledger} />}
      </div>
    </div>
  );
}
