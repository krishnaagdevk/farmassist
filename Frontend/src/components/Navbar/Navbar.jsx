import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  ShoppingBag,
  Store,
  Truck,
  TrendingUp,
  User,
  LogOut,
  Menu,
  X,
  MapPin,
  Sparkles,
  LayoutDashboard,
  Building2,
  Users,
} from "lucide-react";
import ProfileModal from "../ProfileModal/ProfileModal";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout, userLocation } = useAuth();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const locationLabel =
    userLocation?.city ||
    userLocation?.label?.split(",")[0] ||
    "Ghaziabad, NCR";

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo — Farm Assist */}
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="Farm Assist" className="nav-logo-img" />
          <div className="brand-text">
            <span className="brand-title">Farm Assist</span>
            <span className="brand-tagline">Direct from Soil</span>
          </div>
        </Link>

        {/* User Location Chip */}
        <div className="location-chip" title="Active Delivery Location">
          <MapPin size={14} className="location-icon" />
          <span className="location-text">{locationLabel}</span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav">
          <Link to="/market" className="nav-link">
            <Store size={18} />
            <span>Market</span>
          </Link>

          <Link to="/bulk" className="nav-link">
            <Building2 size={18} />
            <span>Bulk RFQ</span>
          </Link>

          <Link to="/dashboard" className="nav-link">
            <LayoutDashboard size={18} />
            <span>AI Advisory</span>
          </Link>

          {user && ["farmer", "fpo", "admin"].includes(user.role) && (
            <Link to="/farmer" className="nav-link">
              <TrendingUp size={18} />
              <span>Farmer Hub</span>
            </Link>
          )}

          {user && ["fpo", "farmer", "admin"].includes(user.role) && (
            <Link to="/fpo" className="nav-link">
              <Users size={18} />
              <span>FPO Hub</span>
            </Link>
          )}

          {user && ["driver", "admin"].includes(user.role) && (
            <Link to="/driver" className="nav-link">
              <Truck size={18} />
              <span>Driver Run</span>
            </Link>
          )}

          {user && user.role === "admin" && (
            <Link to="/dispatch" className="nav-link highlight">
              <Sparkles size={18} />
              <span>AI Dispatch</span>
            </Link>
          )}
        </nav>

        {/* Right Action Icons & Mobile Menu Toggle */}
        <div className="nav-actions">
          <Link to="/cart" className="cart-btn" aria-label="Shopping Cart">
            <ShoppingBag size={20} />
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </Link>

          {user ? (
            <div className="user-dropdown">
              <button
                className="user-profile-btn"
                title={`${user.name || "User"} (${user.role})`}
                onClick={() => setShowProfileModal(true)}
              >
                <div className="user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="user-name-text">
                  {user.name?.split(" ")[0]}
                </span>
              </button>

              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-nav-btn">
              Sign In
            </Link>
          )}

          {/* Hamburger Menu Toggle (Mobile) */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          {user && (
            <div
              className="mobile-user-card cursor-pointer"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowProfileModal(true);
              }}
            >
              <strong>{user.name}</strong>
              <span className="role-tag">
                {user.role ? user.role.toUpperCase() : "BUYER"} · Edit Profile
              </span>
            </div>
          )}

          <Link
            to="/market"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Store size={20} />
            <span>Produce Storefront</span>
          </Link>

          <Link
            to="/bulk"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Building2 size={20} />
            <span>B2B Bulk RFQ</span>
          </Link>

          <Link
            to="/dashboard"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <LayoutDashboard size={20} />
            <span>AI Advisory & Weather</span>
          </Link>

          <Link
            to="/cart"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <ShoppingBag size={20} />
            <span>My Cart ({itemCount})</span>
          </Link>

          <Link
            to="/orders"
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <User size={20} />
            <span>My Orders & Tracking</span>
          </Link>

          {user && ["farmer", "fpo", "admin"].includes(user.role) && (
            <Link
              to="/farmer"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <TrendingUp size={20} />
              <span>Farmer Portal & Insights</span>
            </Link>
          )}

          {user && ["fpo", "farmer", "admin"].includes(user.role) && (
            <Link
              to="/fpo"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users size={20} />
              <span>FPO Federation Hub</span>
            </Link>
          )}

          {user && ["driver", "admin"].includes(user.role) && (
            <Link
              to="/driver"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Truck size={20} />
              <span>Driver Run Sheet</span>
            </Link>
          )}

          {user && user.role === "admin" && (
            <Link
              to="/dispatch"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Sparkles size={20} />
              <span>AI Route Optimization Board</span>
            </Link>
          )}

          {user ? (
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Sign Out ({user.email})</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="mobile-login-btn"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In / Register
            </Link>
          )}
        </div>
      )}

      {/* Global Profile Management Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
}
