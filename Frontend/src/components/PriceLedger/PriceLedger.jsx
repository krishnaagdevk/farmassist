import React from "react";
import { ShieldCheck, TrendingUp, Sparkles, Scale, Info } from "lucide-react";

export default function PriceLedger({ ledger }) {
  if (!ledger) return null;

  const { direct, traditional, savings, assumptions } = ledger;

  const directFarmerRs = direct?.farmerReceivesPaise ? (direct.farmerReceivesPaise / 100).toFixed(0) : "0";
  const directPlatformRs = direct?.platformFeePaise ? (direct.platformFeePaise / 100).toFixed(0) : "0";
  const directLogisticsRs = direct?.logisticsFeePaise ? (direct.logisticsFeePaise / 100).toFixed(0) : "0";
  const directTotalRs = direct?.consumerPaysPaise ? (direct.consumerPaysPaise / 100).toFixed(0) : "0";
  const directFarmerShare = direct?.farmerSharePct || 91;

  const tradFarmerRs = traditional?.farmerReceivesPaise ? (traditional.farmerReceivesPaise / 100).toFixed(0) : "0";
  const tradCommissionRs = traditional?.commissionAgentPaise ? (traditional.commissionAgentPaise / 100).toFixed(0) : "0";
  const tradWholesalerRs = traditional?.wholesalerPaise ? (traditional.wholesalerPaise / 100).toFixed(0) : "0";
  const tradRetailerRs = traditional?.retailerPaise ? (traditional.retailerPaise / 100).toFixed(0) : "0";
  const tradTotalRs = traditional?.consumerPaysPaise ? (traditional.consumerPaysPaise / 100).toFixed(0) : "0";
  const tradFarmerShare = traditional?.farmerSharePct || 44;

  const farmerGainsPct = savings?.farmerGainsPct || 66;
  const consumerSavesPct = savings?.consumerSavesPct || 18.8;
  const farmerGainsRs = savings?.farmerGainsPaise ? (savings.farmerGainsPaise / 100).toFixed(0) : "0";
  const consumerSavesRs = savings?.consumerSavesPaise ? (savings.consumerSavesPaise / 100).toFixed(0) : "0";

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Supply Chain Transparency Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Direct Farmer Marketplace vs. Multi-Tier Mandi Intermediary Chain
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <ShieldCheck size={14} />
          <span>Zero Middleman Certified</span>
        </div>
      </div>

      {/* Main Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Direct (AgriDirect) */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border-2 border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-xs font-black tracking-wider uppercase text-emerald-950">
                Direct (AgriDirect)
              </span>
            </div>
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black tracking-wide shadow-sm">
              {directFarmerShare}% to Farmer
            </span>
          </div>

          <div className="space-y-2.5 text-xs pt-1">
            <div className="flex justify-between items-center py-1 border-b border-emerald-100/80">
              <span className="text-slate-700 font-medium">Farmer Direct Payout</span>
              <strong className="text-sm font-black text-emerald-800">₹{directFarmerRs}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-emerald-100/80">
              <span className="text-slate-600">AI Route Pooled Logistics</span>
              <span className="font-semibold text-slate-800">₹{directLogisticsRs}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-emerald-100/80">
              <span className="text-slate-600">Platform Maintenance (2%)</span>
              <span className="font-semibold text-slate-800">₹{directPlatformRs}</span>
            </div>
            <div className="flex justify-between items-center pt-2 text-slate-900 font-black text-sm">
              <span>You Pay (Total)</span>
              <span className="text-emerald-700 font-black text-base">₹{directTotalRs}</span>
            </div>
          </div>
        </div>

        {/* Traditional Mandi Chain */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider uppercase text-slate-600">
              Traditional Mandi Chain
            </span>
            <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-full text-xs font-bold">
              {tradFarmerShare}% to Farmer
            </span>
          </div>

          <div className="space-y-2.5 text-xs pt-1">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-600">Farmer Sells At Mandi</span>
              <span className="font-semibold text-slate-700">₹{tradFarmerRs}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500">Commission Agent (Arhtiya)</span>
              <span className="text-slate-600 font-medium">₹{tradCommissionRs}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500">Wholesaler Margin & Wastage</span>
              <span className="text-slate-600 font-medium">₹{tradWholesalerRs}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
              <span className="text-slate-500">Retailer Markup</span>
              <span className="text-slate-600 font-medium">₹{tradRetailerRs}</span>
            </div>
            <div className="flex justify-between items-center pt-2 text-slate-900 font-bold text-sm">
              <span className="text-slate-500 font-medium">Retailer Market Price</span>
              <span className="line-through text-slate-500 text-sm">₹{tradTotalRs}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Large Impact Callout Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-base sm:text-lg font-black text-emerald-300">
              Farmer earns {farmerGainsPct}% MORE. You save {consumerSavesPct}%.
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Net farmer gain +₹{farmerGainsRs} · Consumer direct savings ₹{consumerSavesRs} on this transaction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
            ⚡ Algorithmic Disintermediation
          </span>
        </div>
      </div>

      {/* Source footnote */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Info size={13} className="shrink-0" />
        <span>
          {assumptions?.source || "Economics based on NITI Aayog & APMC supply chain benchmark models (commission, transit wastage, and retail distribution markups)." }
        </span>
      </div>
    </div>
  );
}
