"use client"

import { CURRENCY_RATES, approximateForeignPrice } from "../../../utils/currencyRates"
import { useCurrencyPreference } from "../../../hooks/useCurrencyPreference"

// Approximate-only display next to the real (INR) price — see
// currencyRates.js for why this isn't real multi-currency checkout.
// The choice persists (useCurrencyPreference) so picking USD once on a
// course card shows USD everywhere else too, not just on this card.
export default function CurrencyHint({ amountRupees }) {
  const [currency, setCurrency] = useCurrencyPreference()

  if (!amountRupees) return null

  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-richblack-400">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="bg-transparent text-xs text-richblack-400"
        aria-label="Show approximate price in another currency"
      >
        <option value="">≈ other currency</option>
        {Object.keys(CURRENCY_RATES).map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      {currency && <span>≈ {approximateForeignPrice(amountRupees, currency)}</span>}
    </div>
  )
}
