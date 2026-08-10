import express from "express"
const router = express.Router()

import { getCoursesBoughtTogether } from "../controllers/Recommendations"

router.get("/bought-together/:courseId", getCoursesBoughtTogether)
export default router