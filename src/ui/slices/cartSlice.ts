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

/**
 * Initial state must match what the SERVER renders, which is an empty store.
 *
 * Reading localStorage here ran during the client's first (hydration) render,
 * so the server produced a signed-out tree and the client produced a signed-in
 * one. React cannot reconcile that: it discards the server HTML and
 * re-renders everything on the client, logging a hydration error on every page
 * for every signed-in user — the SSR output was worse than useless.
 *
 * The stored values are applied instead by `hydrateCart`, dispatched
 * once after mount from AppProviders.
 */
const initialState: CartState = {
  cart: [],
  total: 0,
  totalItems: 0,
}

/** The persisted cart, read once after mount. */
export const readStoredCart = (): CartState => ({
  cart: readStorage<CourseDetail[]>("cart", []),
  total: readStorage<number>("total", 0),
  totalItems: readStorage<number>("totalItems", 0),
})

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
    /** Applies the persisted cart once, after mount. */
    hydrateCart: (state, action: PayloadAction<CartState>) => {
      state.cart = action.payload.cart
      state.total = action.payload.total
      state.totalItems = action.payload.totalItems
    },
    resetCart: (state) => {
      state.cart = []
      state.total = 0
      state.totalItems = 0
      clearCartState()
    },
  },
})

export const { addToCart, removeFromCart, resetCart, hydrateCart } = cartSlice.actions

export default cartSlice.reducer
