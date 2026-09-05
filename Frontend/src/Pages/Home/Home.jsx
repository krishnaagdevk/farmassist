import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import Chatbox from "./Chatbox";
import LoginModal from "./LoginModal";
import LearningHub from "./LearningHub";
import RewardsModal from "./RewardsModal";
import ImpactStats from "../../components/ImpactStats/ImpactStats";
import {
  TrendingUp,
  ShoppingBag,
  Building2,
  Truck,
  ShieldCheck,
  Bot,
  BookOpen,
  Award,
  ArrowRight,
  Layers,
  BarChart3,
  Users,
  LogOut,
  UserCheck,
  Menu,
  X,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [modal, setModal] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queryCount, setQueryCount] = useState(1240);

  useEffect(() => {
    let count = 1240;
    const target = 1480;
    const interval = setInterval(() => {
      if (count < target) {
        count += 5;
        setQueryCount(count);
      } else {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleDashboardRedirect = () => {
    setMobileMenuOpen(false);
    if (!user) {
      setModal("login");
      return;
    }
    const role = user.role;
    if (role === "farmer") navigate("/farmer");
    else if (role === "fpo") navigate("/fpo");
    else if (role === "driver") navigate("/driver");
    else if (role === "admin") navigate("/dispatch");
    else navigate("/market");
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* ===== TOP NAVBAR / HEADER ===== */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => navigate("/")}
          >
            <img
              src={logo}
              alt="AgriDirect Logo"
              className="h-9 sm:h-12 w-auto object-contain hover:scale-105 active:scale-95 transition-transform"
            />
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/market"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-sm hover:shadow"
            >
              <ShoppingBag size={15} />
              <span>Consumer Store</span>
            </Link>
            <Link
              to="/bulk"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-sm hover:shadow"
            >
              <Building2 size={15} />
              <span>B2B Bulk Buyers</span>
            </Link>
            <Link
              to="/farmer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all shadow-sm hover:shadow"
            >
              <TrendingUp size={15} />
              <span>Farmer Hub</span>
            </Link>
            <Link
              to="/fpo"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all shadow-sm hover:shadow"
            >
              <Users size={15} />
              <span>FPO Federation</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {user ? (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                  <UserCheck size={14} className="text-emerald-600" />
                  <span>
                    {user.name?.split(" ")[0]} ({user.role?.toUpperCase()})
                  </span>
                </div>
                <button
                  onClick={handleDashboardRedirect}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm hover:shadow active:scale-95"
                >
                  <LayoutDashboard size={14} />
                  <span>My Console</span>
                </button>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-200 transition active:scale-95"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setModal("login")}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition shadow-sm hover:shadow active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Header Action Controls */}
          <div className="flex lg:hidden items-center gap-2">
            {user ? (
              <button
                onClick={handleDashboardRedirect}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{user.role?.toUpperCase()}</span>
              </button>
            ) : (
              <button
                onClick={() => setModal("login")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm"
              >
                Sign In
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition border border-slate-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* ===== MOBILE NAVIGATION DRAWER & BACKDROP ===== */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-300 lg:hidden ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <img src={logo} alt="AgriDirect" className="h-8 w-auto object-contain" />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* User Profile Card */}
          {user ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{user.name}</h4>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Role: {user.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleDashboardRedirect}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl shadow-sm"
                >
                  <LayoutDashboard size={14} />
                  <span>Open Console</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-white text-rose-600 border border-rose-200"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-2.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Sign in to access your customized Kisan, FPO, Buyer, or Logistics console.
              </p>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setModal("login");
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm"
              >
                Sign In / Create Account
              </button>
            </div>
          )}

          {/* Marketplace Navigation Section */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Marketplace Portals
            </span>
            <div className="space-y-1.5">
              <Link
                to="/market"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-slate-800">Consumer Fresh Store</strong>
                  <span className="text-[11px] text-slate-500 truncate">Farm-fresh produce direct from growers</span>
                </div>
              </Link>

              <Link
                to="/bulk"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-slate-800">B2B Bulk Buyer RFQ</strong>
                  <span className="text-[11px] text-slate-500 truncate">Procure Quintals & Tonnes from FPOs</span>
                </div>
              </Link>

              <Link
                to="/farmer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-slate-800">Farmer Command Hub</strong>
                  <span className="text-[11px] text-slate-500 truncate">14-day AI forecast & lot listings</span>
                </div>
              </Link>

              <Link
                to="/fpo"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-100 hover:border-purple-200 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <Users size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-slate-800">FPO Federation Pooling</strong>
                  <span className="text-[11px] text-slate-500 truncate">Collective aggregation clusters</span>
                </div>
              </Link>

              <Link
                to="/dispatch"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
                  <Truck size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-slate-800">AI Logistics Dispatch</strong>
                  <span className="text-[11px] text-slate-500 truncate">Google OR-Tools CVRP Multi-Drop</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Interactive AI Tools Section */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              AI Agronomy & Learning
            </span>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setModal("chatbox");
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-yellow-50 border border-slate-100 hover:border-yellow-200 transition text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center flex-shrink-0">
                  <Bot size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-slate-800">Multilingual AI Agronomist</strong>
                  <span className="text-[11px] text-slate-500 truncate">Instant crop diagnosis & voice chat</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setModal("learning");
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-slate-800">Farmer Learning Hub</strong>
                  <span className="text-[11px] text-slate-500 truncate">Soil health & organic practices</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setModal("rewards");
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 transition text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <Award size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-slate-800">AgriCoins & Rewards</strong>
                  <span className="text-[11px] text-slate-500 truncate">Referrals & sustainable badges</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 border-t border-slate-100 text-center text-[11px] text-slate-400 bg-slate-50">
          AgriDirect · Mobile Optimized & Capacitor Ready
        </div>
      </aside>

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white pt-8 pb-12 sm:pt-16 sm:pb-20 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15] mb-4 sm:mb-6">
            Direct Farm-to-Consumer & Bulk Marketplace
          </h1>

          {/* Description */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            Connecting Indian smallholder farmers and FPOs directly with consumers and institutional buyers. Powered by AI demand forecasting, transparent APMC mandi pricing benchmarks, and Google OR-Tools multi-drop route optimization.
          </p>

          {/* Quick Metrics Ticker Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-300 shadow-sm">
              🌱 <strong>+24% Realization</strong> for Farmers
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-blue-800 bg-blue-100/90 border border-blue-300 shadow-sm">
              🛒 <strong>22% Savings</strong> for Consumers
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold text-purple-800 bg-purple-100/90 border border-purple-300 shadow-sm">
              🚚 <strong>32% Fuel Saved</strong> via AI Routing
            </span>
          </div>

          {/* 3 Primary Stakeholder Access Portals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-6xl mx-auto text-left">
            {/* 1. Consumer Storefront */}
            <div
              onClick={() => navigate("/market")}
              className="group relative bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute top-5 right-5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300">
                Consumers
              </div>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <ShoppingBag size={26} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Consumer Fresh Market</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Order grade-sorted farm-fresh produce directly from regional growers. Up to 25% cheaper than city supermarkets with verified harvest traceability.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
                <span>Browse Local Farm Store</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 2. Bulk Buyers / Institutional */}
            <div
              onClick={() => navigate("/bulk")}
              className="group relative bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-500 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute top-5 right-5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 border border-blue-300">
                Bulk & B2B
              </div>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Building2 size={26} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">B2B Bulk Buyer Portal</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Procure in Quintals and Tonnes directly from FPO aggregation pools and farmer clusters. Instant AI RFQ matching with single-invoice freight.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-blue-600 group-hover:text-blue-700">
                <span>Generate Instant Bulk RFQ</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 3. Farmers & FPOs */}
            <div
              onClick={() => navigate("/farmer")}
              className="group relative bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber-500 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute top-5 right-5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300">
                Farmers & FPOs
              </div>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <TrendingUp size={26} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Farmer & FPO Command</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  Publish harvest lots, view LightGBM 14-day regional demand forecasts, get AI Mandi price advice, and pool harvests in FPO federations.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-amber-600 group-hover:text-amber-700">
                <span>Access Farmer Console</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLATFORM IMPACT & BENEFITS STATS STRIP ===== */}
      <ImpactStats />

      {/* ===== SUPPLY CHAIN INNOVATION SHOWCASE ===== */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1.5 block">
              Core Technological Pillars
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
              How AgriDirect Solves Supply Chain Inefficiencies
            </h2>
            <p className="text-xs sm:text-base text-slate-600 leading-relaxed">
              Eliminating intermediaries, minimizing food transit spoilage, and democratizing market transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <BarChart3 size={26} />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">AI Demand Forecasting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Multi-step LightGBM time-series prediction models forecast 14-day crop consumption demand with 80% confidence bands.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Truck size={26} />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">OR-Tools Route Optimization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Solves Capacitated Vehicle Routing Problems (CVRP) with delivery time windows over regional road networks, reducing transport mileage by 32%.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <Layers size={26} />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">FPO Harvest Aggregation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Allows Farmer Producer Organizations to pool smallholder harvests into commercial B2B lots, bypassing middleman cuts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-lg transition">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <ShieldCheck size={26} />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">Transparent Economic Ledger</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every order comes with an immutable price breakdown showing farmer realization vs arthiya deductions, backed by atomic escrow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INTERACTIVE FARMING ADVISORY SUITE ===== */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-100/70 border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1 block">
                Farmer Intelligence Suite
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Multilingual AI Agronomist & Advisory Tools
              </h2>
              <p className="text-xs sm:text-base text-slate-600 mt-1">
                Equipping Indian farmers with climate-resilient crop insights and agronomy assistance.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-300 shadow-sm text-xs font-bold text-emerald-800 self-start sm:self-auto">
              <span>🌾 {queryCount}+ AI Queries Solved</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div
              onClick={() => setModal("chatbox")}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-emerald-500 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <Bot size={22} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-1.5">Multilingual AI Agronomist</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Chat in Hindi, English, Punjabi, Marathi & regional languages for instant disease diagnosis.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600">Open AI Assistant →</span>
            </div>

            <div
              onClick={() => setModal("learning")}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-blue-500 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                  <BookOpen size={22} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-1.5">Farmer Learning Hub</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Interactive video tutorials, soil nutrition modules, and organic farming techniques.
                </p>
              </div>
              <span className="text-xs font-bold text-blue-600">Explore Modules →</span>
            </div>

            <div
              onClick={() => setModal("rewards")}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-amber-500 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                  <Award size={22} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-1.5">AgriCoins & Rewards</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Earn reward coins on prompt harvest fulfillment, sustainable farming badges, and leaderboard status.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-600">View Rewards →</span>
            </div>

            <div
              onClick={() => navigate("/dispatch")}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-purple-500 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                  <Truck size={22} />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-1.5">Logistics Dispatch Console</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Admin and fleet operators launch Google OR-Tools CVRP routing runs across active regional shipments.
                </p>
              </div>
              <span className="text-xs font-bold text-purple-600">Open Dispatch →</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-950 text-slate-400 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <strong className="text-white text-sm font-bold block mb-1">
              AgriDirect · SIH 2024 Digital Agricultural Marketplace
            </strong>
            <p className="text-xs text-slate-400">
              Empowering Indian Farmers & Consumers through AI-Optimized Direct Supply Chains.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold">
            <Link to="/market" className="text-slate-300 hover:text-emerald-400 transition">Storefront</Link>
            <Link to="/bulk" className="text-slate-300 hover:text-emerald-400 transition">Bulk RFQ</Link>
            <Link to="/farmer" className="text-slate-300 hover:text-emerald-400 transition">Farmer Hub</Link>
            <Link to="/fpo" className="text-slate-300 hover:text-emerald-400 transition">FPO Federation</Link>
            <Link to="/dispatch" className="text-slate-300 hover:text-emerald-400 transition">AI Dispatch</Link>
          </div>
        </div>
      </footer>

      {/* ===== INTERACTIVE MODALS ===== */}
      {modal === "chatbox" && <Chatbox onClose={() => setModal(null)} />}
      {modal === "learning" && <LearningHub onClose={() => setModal(null)} />}
      {modal === "rewards" && <RewardsModal onClose={() => setModal(null)} />}
      {modal === "login" && <LoginModal mode="login" onClose={() => setModal(null)} />}
      {modal === "signup" && <LoginModal mode="signup" onClose={() => setModal(null)} />}
    </div>
  );
}

