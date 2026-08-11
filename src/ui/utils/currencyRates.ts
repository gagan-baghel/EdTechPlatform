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
} as const satisfies Record<string, number>

export type CurrencyCode = keyof typeof CURRENCY_RATES

export function approximateForeignPrice(
  inrAmount: number | string,
  currencyCode: string
): string | null {
  const rate = CURRENCY_RATES[currencyCode as CurrencyCode]
  if (!rate) return null
  const converted = Number(inrAmount) * rate
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(
    converted
  )
}
