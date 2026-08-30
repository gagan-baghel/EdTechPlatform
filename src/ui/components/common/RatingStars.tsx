import React, { useMemo } from "react"
import {
  TiStarFullOutline,
  TiStarHalfOutline,
  TiStarOutline,
} from "react-icons/ti"

export interface RatingStarsProps {
  Review_Count: number
  Star_Size?: number
}

function RatingStars({ Review_Count, Star_Size }: RatingStarsProps): React.JSX.Element {
  // Derived entirely from the prop — no state or effect needed.
  const starCount = useMemo(() => {
    const wholeStars = Math.floor(Review_Count) || 0
    return {
      full: wholeStars,
      half: Number.isInteger(Review_Count) ? 0 : 1,
      empty: Number.isInteger(Review_Count) ? 5 - wholeStars : 4 - wholeStars,
    }
  }, [Review_Count])

  return (
    <div className="flex gap-1 text-yellow-100">
      {[...new Array(starCount.full)].map((_, i) => {
        return <TiStarFullOutline key={i} size={Star_Size || 20} />
      })}
      {[...new Array(starCount.half)].map((_, i) => {
        return <TiStarHalfOutline key={i} size={Star_Size || 20} />
      })}
      {[...new Array(starCount.empty)].map((_, i) => {
        return <TiStarOutline key={i} size={Star_Size || 20} />
      })}
    </div>
  )
}

export default RatingStars
