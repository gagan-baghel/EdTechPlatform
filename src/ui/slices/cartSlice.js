import { createSlice } from "@reduxjs/toolkit"
import { toast } from "react-hot-toast"

const isBrowser = typeof window !== "undefined"
const readStorage = (key, fallback) => {
  if (!isBrowser) return fallback
  const value = localStorage.getItem(key)
  return value ? JSON.parse(value) : fallback
}
const persistCartState = (state) => {
  if (!isBrowser) return
  localStorage.setItem("cart", JSON.stringify(state.cart))
  localStorage.setItem("total", JSON.stringify(state.total))
  localStorage.setItem("totalItems", JSON.stringify(state.totalItems))
}
const clearCartState = () => {
  if (!isBrowser) return
  localStorage.removeItem("cart")
  localStorage.removeItem("total")
  localStorage.removeItem("totalItems")
}

const initialState = {
  cart: readStorage("cart", []),
  total: readStorage("total", 0),
  totalItems: readStorage("totalItems", 0),
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
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
    removeFromCart: (state, action) => {
      const courseId = action.payload
      const index = state.cart.findIndex((item) => item._id === courseId)

      if (index >= 0) {
        // If the course is found in the cart, remove it
        state.totalItems--
        state.total -= state.cart[index].price
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
