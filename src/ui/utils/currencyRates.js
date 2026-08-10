// Static, approximate INR conversion rates for DISPLAY only — actual
// checkout always charges INR via Razorpay (an INR-configured merchant
// account); building real multi-currency charging needs Razorpay
// international account configuration, which isn't something this can
// provision. Update periodically; there's no live FX API call here on
// purpose, to avoid a new external dependency for a "nice to have" hint.
export const CURRENCY_RATES = {
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
}

export function approximateForeignPrice(inrAmount, currencyCode) {
  const rate = CURRENCY_RATES[currencyCode]
  if (!rate) return null
  const converted = Number(inrAmount) * rate
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(
    converted
  )
}
