import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Package, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/orders");
      setOrders(res.data.orders || []);
    } catch (e) {
      console.error("Failed to load orders:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      paid: { text: "Farm Locked & Paid", bg: "bg-emerald-100 text-emerald-800" },
      routed: { text: "In AI Route Plan", bg: "bg-blue-100 text-blue-800" },
      picked_up: { text: "Picked Up from Farm", bg: "bg-amber-100 text-amber-800" },
      delivered: { text: "Delivered", bg: "bg-teal-100 text-teal-800" },
      cancelled: { text: "Cancelled", bg: "bg-red-100 text-red-800" },
    };
    const s = statusMap[status] || { text: status, bg: "bg-slate-100 text-slate-700" };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.bg}`}>{s.text}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            My Orders & Traceability
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor real-time pickup status, driver coordinates, and price transparency ledgers.
          </p>
        </div>

        {loading ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <p className="text-slate-500 font-medium text-sm animate-pulse">Loading order records...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Orders Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">You have not placed any direct farm orders yet.</p>
            <Link
              to="/market"
              className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition min-h-[44px]"
            >
              Browse Storefront
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 hover:border-emerald-300 shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Order #{order.orderNo}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {order.items.map((it, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700"
                      >
                        {it.crop?.name || "Produce"} ({it.grams / 1000}kg)
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-3">
                  <div className="text-left sm:text-right">
                    <span className="text-lg sm:text-xl font-black text-slate-900 block">
                      ₹{(order.totalPaise / 100).toFixed(0)}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      ₹{(order.produceSubtotalPaise / 100).toFixed(0)} direct to farmers
                    </span>
                  </div>

                  <Link
                    to={`/orders/${order._id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl transition min-h-[40px]"
                  >
                    <span>Track & Ledger</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
