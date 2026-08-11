import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { CourseDetail, CourseSection } from "../types"

/** Per-lecture playback position, mirrored from CourseProgress.watchState. */
export interface WatchStateEntry {
  subSection: string
  positionSeconds: number
}

export interface ViewCourseState {
  courseSectionData: CourseSection[]
  courseEntireData: CourseDetail | null
  completedLectures: string[]
  totalNoOfLectures: number
  watchState: WatchStateEntry[]
}

const initialState: ViewCourseState = {
  courseSectionData: [],
  // Was `[]`, which is what the player checks against — but every writer sets
  // an object. `null` is the honest empty value for a single course.
  courseEntireData: null,
  completedLectures: [],
  totalNoOfLectures: 0,
  // Progress v2: per-lecture watch position, [{ subSection, positionSeconds }].
  watchState: [],
}

const viewCourseSlice = createSlice({
  name: "viewCourse",
  initialState,
  reducers: {
    setCourseSectionData: (state, action: PayloadAction<CourseSection[]>) => {
      state.courseSectionData = action.payload
    },
    setEntireCourseData: (state, action: PayloadAction<CourseDetail | null>) => {
      state.courseEntireData = action.payload
    },
    setTotalNoOfLectures: (state, action: PayloadAction<number>) => {
      state.totalNoOfLectures = action.payload
    },
    setCompletedLectures: (state, action: PayloadAction<string[]>) => {
      state.completedLectures = action.payload
    },
    updateCompletedLectures: (state, action: PayloadAction<string>) => {
      state.completedLectures = [...state.completedLectures, action.payload]
    },
    setWatchState: (state, action: PayloadAction<WatchStateEntry[]>) => {
      state.watchState = action.payload
    },
  },
})

export const {
  setCourseSectionData,
  setEntireCourseData,
  setTotalNoOfLectures,
  setCompletedLectures,
  updateCompletedLectures,
  setWatchState,
} = viewCourseSlice.actions

export default viewCourseSlice.reducer
