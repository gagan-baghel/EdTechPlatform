import express from "express"
import { asyncHandler } from "../lib/http"
const router = express.Router()

import { getCoursesBoughtTogether } from "../controllers/Recommendations"

router.get("/bought-together/:courseId", asyncHandler(getCoursesBoughtTogether, "getCoursesBoughtTogether"))
export default router