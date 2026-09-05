const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 200); // 2.00%
const LOGISTICS_BASE_PAISE = Number(process.env.LOGISTICS_BASE_PAISE ?? 3000); // ₹30 base
const LOGISTICS_PAISE_PER_KM = Number(process.env.LOGISTICS_PAISE_PER_KM ?? 800); // ₹8/km
const LOGISTICS_PAISE_PER_KG = Number(process.env.LOGISTICS_PAISE_PER_KG ?? 100); // ₹1/kg

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
  quoteLogistics,
  calculateOrderTotals,
};
