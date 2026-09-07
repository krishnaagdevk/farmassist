import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  Truck,
  CheckCircle2,
  MapPin,
  Phone,
  Navigation,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  QrCode,
} from "lucide-react";

export default function DriverRun() {
  const { user } = useAuth();
  const [activeShipment, setActiveShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverShipments();
  }, []);

  const fetchDriverShipments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/logistics/shipments");
      const list = res.data.shipments || [];
      if (list.length > 0) {
        setActiveShipment(list[0]);
      }
    } catch (e) {
      console.error("Driver shipments fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!activeShipment) return;
    try {
      await api.post(`/api/logistics/shipments/${activeShipment._id}/start`);
      fetchDriverShipments();
    } catch (e) {
      console.error("Failed to start shipment:", e);
    }
  };

  const handleCompleteStop = async (stopId) => {
    if (!activeShipment) return;
    try {
      await api.post(`/api/logistics/shipments/${activeShipment._id}/stops/${stopId}/complete`, {
        proofUrl: "https://example.com/delivery_proof.jpg",
      });
      fetchDriverShipments();
    } catch (e) {
      console.error("Failed to complete stop:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-slate-500 font-medium text-sm animate-pulse">Loading assigned transit run...</p>
      </div>
    );
  }

  if (!activeShipment) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">No Active Trips Assigned</h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Your vehicle is currently idle. Route plans will appear here once optimized by dispatch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Mobile Driver Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white pt-8 pb-10 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-2">
              Trip #{activeShipment.code}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Driver Manifest</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {activeShipment.stops?.length || 0} Total Sequence Stops · {activeShipment.plannedDistanceKm} km Total
            </p>
          </div>

          {activeShipment.status === "planned" && (
            <button
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md transition min-h-[50px] flex items-center justify-center gap-2"
              onClick={handleStartTrip}
            >
              <Truck size={18} />
              <span>Start Delivery Run</span>
            </button>
          )}
        </div>

        {/* Logistics Pilot Digital ID Badge */}
        <div className="max-w-3xl mx-auto mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/40">
              {user?.digitalId || "DRV-2026-1001"}
            </span>
            <span className="text-slate-200 font-semibold">{user?.name || "Vikas Driver"} &middot; Pilot</span>
          </div>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck size={13} />
            Active Fleet Carrier
          </span>
        </div>
      </div>

      {/* Ordered Stop-by-Stop Run Sheet */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 space-y-4">
        {activeShipment.stops?.map((stop) => {
          const isDone = stop.status === "done";
          const coords = stop.point?.coordinates || [77.4538, 28.6692];
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`;

          return (
            <div
              key={stop._id}
              className={`bg-white rounded-2xl p-5 border transition shadow-sm ${
                isDone
                  ? "border-emerald-200 bg-emerald-50/20 opacity-75"
                  : "border-slate-200 hover:border-blue-400"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    stop.kind === "pickup"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  Stop #{stop.seq} · {stop.kind === "pickup" ? "🌾 Farm Pickup" : "📦 Buyer Drop"}
                </span>
                <span className="text-xs font-semibold text-slate-500">ETA: +{stop.etaMinutes} min</span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">{stop.label}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Load Payload: <strong className="text-slate-800">{Math.abs(stop.loadGrams / 1000)} kg</strong>
              </p>

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <Navigation size={16} className="text-blue-600" />
                  <span>Google Maps</span>
                </a>

                {!isDone ? (
                  <button
                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 min-h-[48px]"
                    onClick={() => handleCompleteStop(stop._id)}
                  >
                    <CheckCircle2 size={16} />
                    <span>Mark Done</span>
                  </button>
                ) : (
                  <span className="flex-1 py-3 px-4 bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 min-h-[48px]">
                    <CheckCircle2 size={16} />
                    <span>Completed</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
