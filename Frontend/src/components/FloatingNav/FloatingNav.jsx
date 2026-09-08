import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Store,
  LayoutDashboard,
  Sparkles,
  X,
  Building2,
  TrendingUp,
  Users,
  Truck,
  User,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ProfileModal from "../ProfileModal/ProfileModal";
import "./FloatingNav.css";

export default function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);
  const { user } = useAuth();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="floating-nav-container" ref={navRef}>
        {/* Floating Action Menu Items */}
        <div className={`floating-menu ${isOpen ? "open" : ""}`}>
          <Link
            to="/market"
            className={`floating-menu-item market-item ${location.pathname.startsWith("/market") ? "active" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            <div className="floating-item-icon">
              <Store size={20} />
            </div>
            <div className="floating-item-text">
              <span className="floating-item-title">Market</span>
              <span className="floating-item-sub">Retail Produce</span>
            </div>
          </Link>

          <Link
            to="/bulk"
            className={`floating-menu-item bulk-item ${location.pathname.startsWith("/bulk") ? "active" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            <div className="floating-item-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <Building2 size={20} />
            </div>
            <div className="floating-item-text">
              <span className="floating-item-title">Bulk RFQ</span>
              <span className="floating-item-sub">B2B & FPO Pools</span>
            </div>
          </Link>

          <Link
            to="/dashboard"
            className={`floating-menu-item advisory-item ${location.pathname === "/dashboard" || location.pathname === "/advisory" ? "active" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            <div className="floating-item-icon">
              <LayoutDashboard size={20} />
            </div>
            <div className="floating-item-text">
              <span className="floating-item-title">AI Advisory</span>
              <span className="floating-item-sub">Weather & Insights</span>
            </div>
          </Link>

          {user && (
            <>
              <Link
                to={
                  user.role === "farmer"
                    ? "/farmer"
                    : user.role === "fpo"
                    ? "/fpo"
                    : user.role === "driver"
                    ? "/driver"
                    : user.role === "admin"
                    ? "/dispatch"
                    : "/market"
                }
                className={`floating-menu-item dashboard-item ${
                  ["/farmer", "/fpo", "/driver", "/dispatch"].includes(location.pathname) ? "active" : ""
                }`}
                onClick={() => setIsOpen(false)}
              >
                <div
                  className="floating-item-icon"
                  style={{
                    background: user.role === "fpo" ? "#faf5ff" : user.role === "farmer" ? "#fff7ed" : "#f0fdf4",
                    color: user.role === "fpo" ? "#7e22ce" : user.role === "farmer" ? "#c2410c" : "#15803d",
                  }}
                >
                  {user.role === "farmer" ? (
                    <TrendingUp size={20} />
                  ) : user.role === "fpo" ? (
                    <Users size={20} />
                  ) : user.role === "driver" ? (
                    <Truck size={20} />
                  ) : (
                    <LayoutDashboard size={20} />
                  )}
                </div>
                <div className="floating-item-text">
                  <span className="floating-item-title">My Console</span>
                  <span className="floating-item-sub">{user.role?.toUpperCase()} Portal</span>
                </div>
              </Link>

              <button
                type="button"
                className="floating-menu-item profile-item text-left w-full border-none cursor-pointer"
                onClick={() => {
                  setIsOpen(false);
                  setShowProfile(true);
                }}
              >
                <div className="floating-item-icon" style={{ background: "#f1f5f9", color: "#0f172a" }}>
                  <User size={20} />
                </div>
                <div className="floating-item-text">
                  <span className="floating-item-title">Profile & ID</span>
                  <span className="floating-item-sub">{user.name?.split(" ")[0]} · Manage</span>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Floating Action Ball / Orb */}
        <button
          className={`floating-ball-trigger ${isOpen ? "active" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Quick Navigation"
          title="Quick Menu (Market & AI Advisory)"
        >
          <div className="ball-glow"></div>
          <div className="ball-inner">
            {isOpen ? (
              <X size={26} className="ball-icon close-icon" />
            ) : (
              <div className="ball-icon-wrapper">
                <span className="sprout-icon">🌱</span>
                <Sparkles size={14} className="sparkle-badge" />
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Global Profile Modal */}
      {showProfile && <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />}
    </>
  );
}
