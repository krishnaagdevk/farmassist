import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  ShoppingBag,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import "./Cart.css";

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
      <div className="order-confirmed-container">
        <div className="confirm-icon">🎉</div>
        <h2>Order Confirmed & Farm Locked!</h2>
        <p className="order-no-pill">Order #{orderSuccess.orderNo}</p>
        <p className="confirm-desc">
          Your produce lot has been atomically reserved from verified farms and submitted to the AI dispatch optimizer.
        </p>
        <div className="confirm-actions">
          <Link to={`/orders/${orderSuccess._id}`} className="view-tracking-btn">
            Track Delivery & View Economics Ledger
          </Link>
          <Link to="/market" className="continue-shop-btn">
            Explore More Fresh Harvest
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-cart-container">
        <ShoppingBag size={48} className="empty-icon-svg" />
        <h2>Your Farm Basket is Empty</h2>
        <p>Explore directly listed farm batches near your location with zero middleman markups.</p>
        <Link to="/market" className="browse-btn">
          Browse Farm Storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page-container">
      <h1 className="cart-title">Your Farm Direct Basket</h1>

      <div className="cart-grid">
        {/* Left Column: Basket Items List */}
        <div className="cart-items-section">
          {items.map((item) => {
            const itemKg = item.grams / 1000;
            const lineTotal = ((item.grams * item.listing.pricePaisePerKg) / 100000).toFixed(0);

            return (
              <div key={item.listing._id} className="cart-item-card">
                <img
                  src={
                    item.listing.images?.[0] ||
                    item.listing.crop?.imageUrl ||
                    "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200"
                  }
                  alt={item.listing.crop?.name}
                  className="item-thumbnail"
                />

                <div className="item-info">
                  <div className="item-title-row">
                    <h3>{item.listing.crop?.name}</h3>
                    <span className="item-farmer">🧑‍🌾 {item.listing.farmer?.name || "Local Farmer"}</span>
                  </div>
                  <p className="item-unit-price">
                    ₹{(item.listing.pricePaisePerKg / 100).toFixed(0)}/kg · Grade {item.listing.grade}
                  </p>

                  <div className="item-actions-row">
                    <div className="cart-stepper">
                      <button
                        onClick={() => updateQuantity(item.listing._id, item.grams - 1000)}
                        disabled={item.grams <= (item.listing.minOrderGrams || 1000)}
                      >
                        -
                      </button>
                      <span>{itemKg} kg</span>
                      <button onClick={() => updateQuantity(item.listing._id, item.grams + 1000)}>
                        +
                      </button>
                    </div>

                    <span className="line-price">₹{lineTotal}</span>

                    <button
                      className="delete-item-btn"
                      onClick={() => removeItem(item.listing._id)}
                      title="Remove from basket"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Address, Delivery Slot & Checkout Summary */}
        <div className="checkout-summary-section">
          <div className="delivery-form-card">
            <h3>Delivery Details</h3>

            <div className="form-group">
              <label>Delivery Address</label>
              <input
                type="text"
                value={deliveryAddress.line1}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line1: e.target.value })}
                placeholder="House / Street / Sector"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City / District</label>
                <input
                  type="text"
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={deliveryAddress.pincode}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Preferred Delivery Date</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Delivery Window Slot</label>
              <div className="slots-grid">
                {[
                  { hour: 7, label: "Morning (7 AM - 11 AM)" },
                  { hour: 12, label: "Afternoon (12 PM - 4 PM)" },
                  { hour: 17, label: "Evening (5 PM - 9 PM)" },
                ].map((slot) => (
                  <button
                    key={slot.hour}
                    type="button"
                    className={`slot-chip ${deliverySlotHour === slot.hour ? "active" : ""}`}
                    onClick={() => setDeliverySlotHour(slot.hour)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing & Fee Breakdown */}
          <div className="summary-card">
            <h3>Payment Summary</h3>

            <div className="summary-row">
              <span>Produce Subtotal ({totalGrams / 1000} kg)</span>
              <span>₹{produceSubtotalRs}</span>
            </div>
            <div className="summary-row">
              <span>Farmer Share (100% direct)</span>
              <span className="farmer-share-badge">₹{produceSubtotalRs} (100%)</span>
            </div>
            <div className="summary-row">
              <span>Logistics & Transport Fee</span>
              <span>₹{logisticsFeeRs}</span>
            </div>
            <div className="summary-row">
              <span>Platform Fee (2%)</span>
              <span>₹{platformFeeRs}</span>
            </div>

            <div className="summary-total-row">
              <span>Total Payable</span>
              <strong>₹{totalAmountRs}</strong>
            </div>

            <button
              className="checkout-proceed-btn"
              onClick={handlePlaceOrder}
              disabled={loadingOrder}
            >
              <CreditCard size={18} />
              <span>{loadingOrder ? "Securing Farm Batch..." : `Pay ₹${totalAmountRs}`}</span>
            </button>

            <div className="security-notice">
              <ShieldCheck size={14} />
              <span>Direct farmer payouts held in escrow until delivery is verified.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
