const express = require("express")
const router = express.Router()

const { createOrganization, getMyOrganizations, joinOrganization } = require("../controllers/Organization")
const { auth } = require("../middlewares/auth")

router.post("/", auth, createOrganization)
router.get("/mine", auth, getMyOrganizations)
router.post("/join", auth, joinOrganization)

module.exports = router
