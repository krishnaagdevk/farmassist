import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Package, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import "./OrderList.css";

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
      paid: { text: "Farm Locked & Paid", class: "status-paid" },
      routed: { text: "In AI Route Plan", class: "status-routed" },
      picked_up: { text: "Picked Up from Farm", class: "status-pickup" },
      delivered: { text: "Delivered", class: "status-delivered" },
      cancelled: { text: "Cancelled", class: "status-cancelled" },
    };
    const s = statusMap[status] || { text: status, class: "status-default" };
    return <span className={`order-status-badge ${s.class}`}>{s.text}</span>;
  };

  return (
    <div className="order-list-page">
      <div className="order-list-header">
        <h1>My Orders & Traceability</h1>
        <p>Monitor real-time pickup status, driver coordinates, and price transparency ledgers.</p>
      </div>

      {loading ? (
        <div className="order-loading">Loading order records...</div>
      ) : orders.length === 0 ? (
        <div className="no-orders-box">
          <Package size={44} className="no-orders-icon" />
          <h3>No Orders Found</h3>
          <p>You have not placed any direct farm orders yet.</p>
          <Link to="/market" className="start-shopping-btn">
            Browse Storefront
          </Link>
        </div>
      ) : (
        <div className="orders-container">
          {orders.map((order) => (
            <div key={order._id} className="order-card-row">
              <div className="order-primary-info">
                <div className="order-header-line">
                  <span className="order-number">Order #{order.orderNo}</span>
                  {getStatusBadge(order.status)}
                </div>
                <span className="order-timestamp">
                  Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>

                <div className="order-crop-items">
                  {order.items.map((it, idx) => (
                    <span key={idx} className="item-crop-tag">
                      {it.crop?.name || "Produce"} ({it.grams / 1000}kg)
                    </span>
                  ))}
                </div>
              </div>

              <div className="order-secondary-info">
                <div className="order-price-block">
                  <span className="order-total-price">₹{(order.totalPaise / 100).toFixed(0)}</span>
                  <span className="order-farmer-sub">
                    ₹{(order.produceSubtotalPaise / 100).toFixed(0)} direct to farmers
                  </span>
                </div>

                <Link to={`/orders/${order._id}`} className="view-tracking-link">
                  <span>Track & Ledger</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
