import { AiOutlineShoppingCart } from "react-icons/ai"
import { useSelector } from "react-redux"
import { Link } from "@/ui/lib/router"

import RenderCartCourses from "./RenderCartCourses"
import RenderTotalAmount from "./RenderTotalAmount"
import type { RootState } from "../../../../store"

export default function Cart() {
  const { total, totalItems } = useSelector((state: RootState) => state.cart)

  return (
    <>
      <h1 className="mb-14 text-3xl font-medium text-richblack-5">Cart</h1>
      <p className="border-b border-b-richblack-400 pb-2 font-semibold text-richblack-400">
        {totalItems} Courses in Cart
      </p>
      {total > 0 ? (
        <div className="mt-8 flex flex-col-reverse items-start gap-x-10 gap-y-6 lg:flex-row">
          <RenderCartCourses />
          <RenderTotalAmount />
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-richblack-600 bg-richblack-800/40 px-6 py-14 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-richblack-700">
            <AiOutlineShoppingCart className="text-3xl text-yellow-50" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-richblack-5">
            Your cart is empty
          </h2>
          <p className="mt-2 max-w-sm text-richblack-300">
            Add a course to get started. Anything you add stays here until you
            check out.
          </p>
          <Link
            to="/catalog/web-development"
            className="mt-6 rounded-md bg-yellow-50 px-6 py-3 font-semibold text-ink transition hover:bg-yellow-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-offset-2 focus-visible:ring-offset-richblack-900"
          >
            Browse courses
          </Link>
        </div>
      )}
    </>
  )
}
