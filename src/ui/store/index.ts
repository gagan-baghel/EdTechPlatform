import { configureStore } from "@reduxjs/toolkit"
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux"

import rootReducer from "../reducer"

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]

/**
 * Use these instead of the bare `useDispatch`/`useSelector` everywhere.
 *
 * The plain hooks type state as `unknown` (or `any` before this migration),
 * so `state.profile.user` was unchecked at ~90 call sites — a renamed slice
 * field would have failed silently at runtime rather than at build time.
 * These two lines are what make every one of those reads checked.
 */
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

/**
 * The thunk signature this codebase uses. Its operations are hand-written
 * thunks (`(dispatch) => { ... }`), not createAsyncThunk, so this describes
 * what they actually are rather than imposing a pattern they don't follow.
 */
export type AppThunk<ReturnType = void> = (
  dispatch: AppDispatch,
  getState: () => RootState
) => ReturnType
