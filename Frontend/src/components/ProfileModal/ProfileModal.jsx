import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import {
  User,
  ShieldCheck,
  MapPin,
  Lock,
  QrCode,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
  Phone,
  Mail,
  RefreshCw,
  Save,
  Wheat,
  Building2,
  ShoppingBag,
  Truck,
  Layers,
} from "lucide-react";

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "address" | "security" | "card"
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    orgName: "",
    line1: "",
    village: "",
    district: "",
    state: "",
    pincode: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        orgName: user.orgName || "",
        line1: user.address?.line1 || "",
        village: user.address?.village || "",
        district: user.address?.district || "Ghaziabad",
        state: user.address?.state || "Uttar Pradesh",
        pincode: user.address?.pincode || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage({ text: "", type: "" });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setMessage({ text: "New password must be at least 6 characters.", type: "error" });
        setSaving(false);
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ text: "New password and confirm password do not match.", type: "error" });
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        orgName: formData.orgName,
        address: {
          line1: formData.line1,
          village: formData.village,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
        },
      };

      if (formData.newPassword) {
        payload.newPassword = formData.newPassword;
        payload.currentPassword = formData.currentPassword;
      }

      const res = await api.patch("/api/auth/profile", payload);

      if (res.data?.user) {
        updateUser(res.data.user);
      }

      setMessage({ text: "✅ Profile and credentials updated successfully!", type: "success" });
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      console.error("Profile update error:", err);
      const errMsg =
        err.response?.data?.error === "current_password_incorrect"
          ? "Current password entered is incorrect."
          : err.response?.data?.error || "Failed to update profile.";
      setMessage({ text: `❌ ${errMsg}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    window.location.href = "/";
  };

  const getRoleTheme = (role) => {
    switch (role) {
      case "farmer":
        return {
          icon: <Wheat size={20} className="text-emerald-400" />,
          title: "Kisan Farmer Producer",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
          accent: "from-emerald-900 to-slate-900",
        };
      case "fpo":
        return {
          icon: <Building2 size={20} className="text-purple-400" />,
          title: "FPO Federation Cooperative",
          badge: "bg-purple-500/20 text-purple-300 border-purple-400/40",
          accent: "from-purple-900 to-slate-900",
        };
      case "driver":
        return {
          icon: <Truck size={20} className="text-orange-400" />,
          title: "Logistics Fleet Pilot",
          badge: "bg-orange-500/20 text-orange-300 border-orange-400/40",
          accent: "from-orange-900 to-slate-900",
        };
      case "admin":
        return {
          icon: <Layers size={20} className="text-teal-400" />,
          title: "Platform Administrator",
          badge: "bg-teal-500/20 text-teal-300 border-teal-400/40",
          accent: "from-teal-900 to-slate-900",
        };
      case "buyer":
      default:
        return user.buyerType === "bulk"
          ? {
              icon: <Building size={20} className="text-amber-400" />,
              title: "Commercial & Bulk Buyer",
              badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",
              accent: "from-amber-900 to-slate-900",
            }
          : {
              icon: <ShoppingBag size={20} className="text-blue-400" />,
              title: "Direct Consumer Household",
              badge: "bg-blue-500/20 text-blue-300 border-blue-400/40",
              accent: "from-blue-900 to-slate-900",
            };
    }
  };

  const theme = getRoleTheme(user.role);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className={`bg-gradient-to-r ${theme.accent} p-5 sm:p-6 text-white relative shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              {theme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${theme.badge}`}>
                  {user.digitalId || "USER-2026-1001"}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                  <ShieldCheck size={13} />
                  <span>{user.kycStatus === "verified" ? "KYC Verified" : "AgriStack Registered"}</span>
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">{user.name}</h2>
              <span className="text-xs text-slate-300 font-medium">{theme.title}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "profile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User size={13} />
            <span>Profile Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("address")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "address" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin size={13} />
            <span>Mandi &amp; Address</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "security" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock size={13} />
            <span>Password &amp; Security</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "card" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode size={13} />
            <span>AgriStack Smart Pass</span>
          </button>
        </div>

        {/* Modal Form Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {message.text && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-red-50 text-red-900 border border-red-200"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-4">
            {/* TAB 1: BASIC PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name / Primary Contact</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Mobile Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address (Read Only)</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium cursor-not-allowed"
                  />
                </div>

                {["fpo", "buyer", "farmer"].includes(user.role) && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Organization / Business / Farm Name
                    </label>
                    <input
                      type="text"
                      value={formData.orgName}
                      onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                      placeholder="e.g. Kisan Samriddhi FPO / Green Organic Farms"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ADDRESS & LOCATION */}
            {activeTab === "address" && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Street / Mandi Address</label>
                  <input
                    type="text"
                    value={formData.line1}
                    onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                    placeholder="Plot / Farm No., Road, Mandi Yard"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Village / Gram Panchayat</label>
                    <input
                      type="text"
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      placeholder="e.g. Muradnagar"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">District / Mandi Cluster</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="e.g. Ghaziabad"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g. Uttar Pradesh"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="e.g. 201001"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SECURITY & PASSWORD */}
            {activeTab === "security" && (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Current Password (if changing)</label>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    placeholder="Enter existing password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">New Password</label>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-type new password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SMART PASS QR VIEW */}
            {activeTab === "card" && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white text-center space-y-3">
                <div className="w-24 h-24 bg-white rounded-xl p-2 flex items-center justify-center mx-auto shadow-inner">
                  <div className="w-full h-full border-2 border-dashed border-slate-900 flex items-center justify-center text-slate-900 font-mono text-[9px] font-bold text-center leading-tight">
                    [QR PASS]<br />
                    {user.digitalId || "USER-2026"}
                  </div>
                </div>
                <div>
                  <strong className="text-sm font-bold text-white block">{user.name}</strong>
                  <span className="text-xs text-emerald-400 font-mono font-bold block mt-0.5">
                    {user.digitalId}
                  </span>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-sm mx-auto">
                    Official AgriDirect Digital Identity for mandi drop-offs, buyer verification &amp; driver logistics handshakes.
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="profile-form"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? "Saving..." : "Save Updates"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
