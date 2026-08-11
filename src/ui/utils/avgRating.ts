/**
 * Average star rating, rounded to one decimal.
 *
 * The optional chaining here used to hide a real division by zero: an
 * undefined array fell through the `length === 0` guard (`undefined === 0`
 * is false) and divided by `undefined`, yielding NaN on the page. Handled
 * explicitly now.
 */
export default function GetAvgRating(
  ratingArr: { rating: number }[] | undefined | null
): number {
  if (!ratingArr?.length) return 0

  const totalReviewCount = ratingArr.reduce((acc, curr) => acc + curr.rating, 0)

  const multiplier = Math.pow(10, 1)
  return Math.round((totalReviewCount / ratingArr.length) * multiplier) / multiplier
}
