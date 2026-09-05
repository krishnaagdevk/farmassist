import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import {
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Sparkles,
  ChevronLeft,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import "./OrderTrack.css";

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
      <div className="track-loading">
        <p>Loading shipment trajectory and transparency ledger...</p>
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
    <div className="order-track-page">
      <button className="back-btn" onClick={() => navigate("/orders")}>
        <ChevronLeft size={18} />
        <span>Back to Orders</span>
      </button>

      <div className="track-header-banner">
        <div>
          <h1>Tracking Order #{order.orderNo}</h1>
          <p>
            Delivery destination: <strong>{order.deliveryAddress?.line1}, {order.deliveryAddress?.city}</strong>
          </p>
        </div>
        <div className="order-total-badge">
          <span>Total Paid</span>
          <strong>₹{(order.totalPaise / 100).toFixed(0)}</strong>
        </div>
      </div>

      {/* Progress Status Stepper */}
      <div className="stepper-card">
        <h3>Live Fulfillment Trajectory</h3>
        <div className="stepper-timeline">
          {steps.map((step, idx) => {
            const isCompleted = idx <= activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <div key={step.key} className={`timeline-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}>
                <div className="step-marker">
                  {isCompleted ? <CheckCircle2 size={18} /> : <span>{idx + 1}</span>}
                </div>
                <div className="step-details">
                  <h4>{step.label}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Logistics Fleet & Dispatch Status Widget */}
      <div className="logistics-support-card" style={{ background: "#ffffff", borderRadius: "12px", padding: "1.5rem", marginBottom: "2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Truck size={22} color="#16a34a" />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>Logistics & Transit Coordination</h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Direct cold-chain & optimized farm-to-door transit</p>
            </div>
          </div>
          <span style={{
            background: order.shipment ? "#dcfce7" : "#f1f5f9",
            color: order.shipment ? "#166534" : "#475569",
            padding: "4px 12px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: "600"
          }}>
            {order.shipment ? `Trip: ${order.shipment.code || "Active"}` : "Logistics: Batch Allocation"}
          </span>
        </div>

        {order.shipment ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Driver & Transit</span>
              <p style={{ margin: "4px 0 0 0", fontWeight: "600", color: "#1e293b" }}>
                {order.shipment.driver?.name || "Verified Logistics Partner"}
              </p>
              <span style={{ fontSize: "0.8rem", color: "#16a34a" }}>
                📞 {order.shipment.driver?.phone || "+91 98765 43210"}
              </span>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Vehicle Assignment</span>
              <p style={{ margin: "4px 0 0 0", fontWeight: "600", color: "#1e293b" }}>
                {order.shipment.vehicle?.regNo || "DL-01-AG-4920 (EV Agri-Van)"}
              </p>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                GPS Telematics Active
              </span>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "600" }}>Route Optimization</span>
              <p style={{ margin: "4px 0 0 0", fontWeight: "600", color: "#1e293b" }}>
                {order.shipment.plannedDistanceKm ? `${order.shipment.plannedDistanceKm} km planned` : "Direct Multistop"}
              </p>
              <span style={{ fontSize: "0.8rem", color: "#2563eb" }}>
                OR-Tools CVRP Optimized
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "1rem", borderRadius: "8px" }}>
            <Clock size={20} color="#64748b" />
            <div>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", fontWeight: "500" }}>
                Order is queued in regional hub. The OR-Tools route optimizer will group this with neighboring farm deliveries for minimal transit time and reduced carbon footprint.
              </p>
              <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: "600" }}>
                Estimated Delivery Window: Next Day 08:00 - 14:00 IST
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-side Transparency Ledger Panel */}
      {ledger && (
        <div className="economic-ledger-card">
          <div className="ledger-card-header">
            <Sparkles size={20} className="sparkle" />
            <div>
              <h3>Supply Chain Transparency Breakdown</h3>
              <p>Comparing Direct Farm Flow vs Traditional 4-Tier Mandi Intermediary Chain</p>
            </div>
          </div>

          <div className="chains-comparison-grid">
            {/* Direct Model (AgriDirect) */}
            <div className="chain-box direct-box">
              <div className="chain-title">
                <span>AgriDirect (This Order)</span>
                <span className="share-pill green">{ledger.direct?.farmerSharePct}% to Farmer</span>
              </div>

              <div className="chain-lines">
                <div className="chain-line">
                  <span>Farmer Receives (100% Produce)</span>
                  <strong>₹{(ledger.direct?.farmerReceivesPaise / 100).toFixed(0)}</strong>
                </div>
                <div className="chain-line">
                  <span>Optimized Logistics Fee</span>
                  <span>₹{(ledger.direct?.logisticsFeePaise / 100).toFixed(0)}</span>
                </div>
                <div className="chain-line">
                  <span>Platform Fee (2%)</span>
                  <span>₹{(ledger.direct?.platformFeePaise / 100).toFixed(0)}</span>
                </div>
                <div className="chain-line total-line">
                  <span>Consumer Paid</span>
                  <strong>₹{(ledger.direct?.consumerPaysPaise / 100).toFixed(0)}</strong>
                </div>
              </div>
            </div>

            {/* Traditional Mandi Model */}
            <div className="chain-box traditional-box">
              <div className="chain-title">
                <span>Traditional APMC Mandi Chain</span>
                <span className="share-pill orange">{ledger.traditional?.farmerSharePct}% to Farmer</span>
              </div>

              <div className="chain-lines">
                <div className="chain-line">
                  <span>Farmer Received</span>
                  <span>₹{(ledger.traditional?.farmerReceivesPaise / 100).toFixed(0)}</span>
                </div>
                <div className="chain-line">
                  <span>Commission Agent (Kachha Arhtiya)</span>
                  <span>₹{(ledger.traditional?.commissionAgentPaise / 100).toFixed(0)}</span>
                </div>
                <div className="chain-line">
                  <span>Wholesaler Margin</span>
                  <span>₹{(ledger.traditional?.wholesalerPaise / 100).toFixed(0)}</span>
                </div>
                <div className="chain-line">
                  <span>City Retailer Margin</span>
                  <span>₹{(ledger.traditional?.retailerPaise / 100).toFixed(0)}</span>
                </div>
                <div className="chain-line total-line">
                  <span>Est. Retailer Consumer Price</span>
                  <strong className="strikethrough">
                    ₹{(ledger.traditional?.consumerPaysPaise / 100).toFixed(0)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Highlight Ribbon */}
          <div className="savings-ribbon">
            <div className="savings-stat">
              <span className="stat-label">Farmer Net Gain</span>
              <span className="stat-val green">
                +₹{(ledger.savings?.farmerGainsPaise / 100).toFixed(0)} (+{ledger.savings?.farmerGainsPct}%)
              </span>
            </div>
            <div className="savings-stat">
              <span className="stat-label">Consumer Saved</span>
              <span className="stat-val blue">
                ₹{(ledger.savings?.consumerSavesPaise / 100).toFixed(0)} ({ledger.savings?.consumerSavesPct}% cheaper)
              </span>
            </div>
          </div>

          <div className="assumptions-footer">
            <p>
              * Source: {ledger.assumptions?.source || "APMC mandi modal price benchmarks; margin studies"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
