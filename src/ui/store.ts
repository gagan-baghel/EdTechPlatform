/**
 * Re-exports the RootState and AppDispatch types that every selector,
 * thunk, and typed-dispatch call needs — derived from rootReducer rather
 * than from a configured store instance so there's no circular import
 * between AppProviders (which calls configureStore) and the slices.
 */
import { configureStore } from "@reduxjs/toolkit"
import rootReducer from "./reducer"

// Derive types from a dummy store instance — this is the idiomatic RTK
// pattern when the real store is created inside a component (AppProviders).
const _typeStore = configureStore({ reducer: rootReducer })

export type RootState = ReturnType<typeof _typeStore.getState>
export type AppDispatch = typeof _typeStore.dispatch
