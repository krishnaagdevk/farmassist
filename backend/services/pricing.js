const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 200); // 2.00%
const LOGISTICS_BASE_PAISE = Number(process.env.LOGISTICS_BASE_PAISE ?? 3000); // ₹30 base
const LOGISTICS_PAISE_PER_KM = Number(process.env.LOGISTICS_PAISE_PER_KM ?? 800); // ₹8/km
const LOGISTICS_PAISE_PER_KG = Number(process.env.LOGISTICS_PAISE_PER_KG ?? 100); // ₹1/kg

const CENTRAL_HUB = {
  lat: 28.6692,
  lng: 77.4538,
  name: "AgriDirect Central NCR Hub (Ghaziabad)",
};

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const l1 = Number(lat1);
  const o1 = Number(lon1);
  const l2 = Number(lat2);
  const o2 = Number(lon2);

  if (!Number.isFinite(l1) || !Number.isFinite(o1) || !Number.isFinite(l2) || !Number.isFinite(o2)) {
    return 12.0;
  }

  const R = 6371; // Earth radius in KM
  const dLat = ((l2 - l1) * Math.PI) / 180;
  const dLon = ((o2 - o1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((l1 * Math.PI) / 180) *
      Math.cos((l2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function distanceFromHubKm(lat, lng) {
  const l = Number(lat);
  const g = Number(lng);
  if (!Number.isFinite(l) || !Number.isFinite(g) || Math.abs(l) > 90 || Math.abs(g) > 180) {
    return 12.0;
  }
  const km = calculateHaversineKm(CENTRAL_HUB.lat, CENTRAL_HUB.lng, l, g);
  return Math.max(2.5, Math.min(150, km));
}

function quoteLogistics({ distanceKm = 5, grams = 1000 }) {
  const dist = Math.max(1, Number(distanceKm) || 1);
  const weightKg = (Number(grams) || 1000) / 1000;

  const fee =
    LOGISTICS_BASE_PAISE +
    Math.round(dist * LOGISTICS_PAISE_PER_KM) +
    Math.round(weightKg * LOGISTICS_PAISE_PER_KG);

  return Math.round(fee);
}

function calculateOrderTotals({ items, logisticsFeePaise }) {
  // produceSubtotal: sum of (grams / 1000) * pricePaisePerKg
  const produceSubtotalPaise = items.reduce((sum, item) => {
    const lineTotal = Math.round((item.grams / 1000) * item.pricePaisePerKg);
    return sum + lineTotal;
  }, 0);

  // Platform fee charged to buyer, NEVER deducted from farmer payout
  const platformFeePaise = Math.round((produceSubtotalPaise * PLATFORM_FEE_BPS) / 10000);
  const totalPaise = produceSubtotalPaise + platformFeePaise + logisticsFeePaise;

  return {
    produceSubtotalPaise,
    platformFeePaise,
    logisticsFeePaise,
    totalPaise,
  };
}

module.exports = {
  PLATFORM_FEE_BPS,
  LOGISTICS_BASE_PAISE,
  LOGISTICS_PAISE_PER_KM,
  LOGISTICS_PAISE_PER_KG,
  CENTRAL_HUB,
  calculateHaversineKm,
  distanceFromHubKm,
  quoteLogistics,
  calculateOrderTotals,
};
