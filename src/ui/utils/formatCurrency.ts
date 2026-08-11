const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

/**
 * Single source of truth for price display. Previously the course page rendered
 * "Rs. 2999" while the cart rendered "₹ 2999" — inconsistent at the exact moment
 * a user decides to pay.
 */
export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return formatter.format(0)
  return formatter.format(amount)
}

export default formatCurrency
