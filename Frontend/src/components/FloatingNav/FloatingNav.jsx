import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Store, LayoutDashboard, Sparkles, X } from "lucide-react";
import "./FloatingNav.css";

export default function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);

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
            <span className="floating-item-sub">Produce & Store</span>
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
            <span className="floating-item-sub">Weather & Guidance</span>
          </div>
        </Link>
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
  );
}
