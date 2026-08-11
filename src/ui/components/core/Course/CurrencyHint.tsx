"use client"

import React from "react"
import { CURRENCY_RATES, approximateForeignPrice } from "../../../utils/currencyRates"
import { useCurrencyPreference } from "../../../hooks/useCurrencyPreference"

interface CurrencyHintProps {
  amountRupees: number
}

export default function CurrencyHint({ amountRupees }: CurrencyHintProps) {
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
      {currency && <span>≈ {approximateForeignPrice(amountRupees, currency as string)}</span>}
    </div>
  )
}
