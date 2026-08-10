const express = require("express")
const router = express.Router()

const { getCoursesBoughtTogether } = require("../controllers/Recommendations")

router.get("/bought-together/:courseId", getCoursesBoughtTogether)

module.exports = router
