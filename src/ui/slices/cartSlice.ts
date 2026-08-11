import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { toast } from "react-hot-toast"

import type { CourseDetail } from "../types"

export interface CartState {
  cart: CourseDetail[]
  total: number
  totalItems: number
}

const isBrowser = typeof window !== "undefined"

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback
  const value = localStorage.getItem(key)
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    // A corrupt entry previously threw during store creation, which blanked
    // the app until storage was cleared by hand.
    return fallback
  }
}

const persistCartState = (state: CartState): void => {
  if (!isBrowser) return
  localStorage.setItem("cart", JSON.stringify(state.cart))
  localStorage.setItem("total", JSON.stringify(state.total))
  localStorage.setItem("totalItems", JSON.stringify(state.totalItems))
}

const clearCartState = (): void => {
  if (!isBrowser) return
  localStorage.removeItem("cart")
  localStorage.removeItem("total")
  localStorage.removeItem("totalItems")
}

const initialState: CartState = {
  cart: readStorage<CourseDetail[]>("cart", []),
  total: readStorage<number>("total", 0),
  totalItems: readStorage<number>("totalItems", 0),
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CourseDetail>) => {
      const course = action.payload
      const index = state.cart.findIndex((item) => item._id === course._id)

      if (index >= 0) {
        // If the course is already in the cart, do not modify the quantity
        toast.error("Course already in cart")
        return
      }
      // If the course is not in the cart, add it to the cart
      state.cart.push(course)
      // Update the total quantity and price
      state.totalItems++
      state.total += course.price
      // Update to localstorage
      persistCartState(state)
      // show toast
      toast.success("Course added to cart")
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      const courseId = action.payload
      const index = state.cart.findIndex((item) => item._id === courseId)

      if (index >= 0) {
        // If the course is found in the cart, remove it
        state.totalItems--
        state.total -= state.cart[index]!.price
        state.cart.splice(index, 1)
        // Update to localstorage
        persistCartState(state)
        // show toast
        toast.success("Course removed from cart")
      }
    },
    resetCart: (state) => {
      state.cart = []
      state.total = 0
      state.totalItems = 0
      clearCartState()
    },
  },
})

export const { addToCart, removeFromCart, resetCart } = cartSlice.actions

export default cartSlice.reducer
