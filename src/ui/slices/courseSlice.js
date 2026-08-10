import { createSlice } from "@reduxjs/toolkit"

const STORAGE_KEY = "courseWizardDraft"

// Recoverable draft: previously a refresh or accidental navigation lost
// the instructor's wizard position entirely — step/course lived only in
// memory. Persisting to localStorage means a refresh resumes exactly
// where they were; see SidebarLink.jsx for the other half of this fix
// (it no longer wipes this on every sidebar click, only on "Add Course").
const getStoredWizardState = () => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const persistWizardState = (state) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step: state.step, course: state.course, editCourse: state.editCourse })
    )
  } catch {
    // Storage can throw (quota, private browsing) — losing the draft
    // persistence is not worth crashing the wizard over.
  }
}

const stored = getStoredWizardState()

const initialState = {
  step: stored?.step ?? 1,
  course: stored?.course ?? null,
  editCourse: stored?.editCourse ?? false,
  paymentLoading: false,
}

const courseSlice = createSlice({
  name: "course",
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.step = action.payload
      persistWizardState(state)
    },
    setCourse: (state, action) => {
      state.course = action.payload
      persistWizardState(state)
    },
    setEditCourse: (state, action) => {
      state.editCourse = action.payload
      persistWizardState(state)
    },
    setPaymentLoading: (state, action) => {
      state.paymentLoading = action.payload
    },
    resetCourseState: (state) => {
      state.step = 1
      state.course = null
      state.editCourse = false
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY)
      }
    },
  },
})

export const {
  setStep,
  setCourse,
  setEditCourse,
  setPaymentLoading,
  resetCourseState,
} = courseSlice.actions

export default courseSlice.reducer
