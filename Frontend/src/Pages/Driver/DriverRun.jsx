import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import {
  Truck,
  CheckCircle2,
  MapPin,
  Phone,
  Navigation,
  Camera,
  Layers,
  ArrowRight,
} from "lucide-react";
import "./DriverRun.css";

export default function DriverRun() {
  const [shipments, setShipments] = useState([]);
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
      setShipments(list);
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
    return <div className="driver-loading">Loading assigned transit run...</div>;
  }

  if (!activeShipment) {
    return (
      <div className="no-driver-runs">
        <Truck size={48} className="icon-truck" />
        <h2>No Active Trips Assigned</h2>
        <p>Your vehicle is currently idle. Route plans will appear here once optimized by dispatch.</p>
      </div>
    );
  }

  return (
    <div className="driver-run-page">
      {/* Top Mobile Driver Header */}
      <div className="driver-run-header">
        <div>
          <span className="trip-badge">Trip #{activeShipment.code}</span>
          <h1>Driver Transit Manifest</h1>
          <p>
            {activeShipment.stops?.length || 0} Total Sequence Stops · {activeShipment.plannedDistanceKm} km Total
          </p>
        </div>

        {activeShipment.status === "planned" && (
          <button className="start-trip-btn" onClick={handleStartTrip}>
            Start Delivery Run
          </button>
        )}
      </div>

      {/* Ordered Stop-by-Stop Run Sheet */}
      <div className="stops-timeline-list">
        {activeShipment.stops?.map((stop) => {
          const isDone = stop.status === "done";
          const coords = stop.point?.coordinates || [77.4538, 28.6692];
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`;

          return (
            <div key={stop._id} className={`driver-stop-card ${isDone ? "done" : ""}`}>
              <div className="stop-badge-row">
                <span className={`stop-seq-badge ${stop.kind}`}>
                  Stop #{stop.seq} · {stop.kind === "pickup" ? "🌾 Farm Pickup" : "📦 Buyer Drop"}
                </span>
                <span className="stop-eta">ETA: +{stop.etaMinutes} min</span>
              </div>

              <h3 className="stop-label">{stop.label}</h3>
              <p className="stop-load-info">
                Load: <strong>{Math.abs(stop.loadGrams / 1000)} kg</strong>
              </p>

              <div className="stop-actions-row">
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="nav-maps-btn">
                  <Navigation size={16} />
                  <span>Navigate</span>
                </a>

                {!isDone ? (
                  <button
                    className="complete-stop-btn"
                    onClick={() => handleCompleteStop(stop._id)}
                  >
                    <CheckCircle2 size={16} />
                    <span>Mark Done</span>
                  </button>
                ) : (
                  <span className="done-confirmed-badge">
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
