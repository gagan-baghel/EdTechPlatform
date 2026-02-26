const express = require("express")
const { createApiApp } = require("../../../api/app")

const apiApp = createApiApp()
const rootApp = express()

// Preserve existing endpoint paths (/api/v1/*) without a separate backend process.
rootApp.use("/api", apiApp)

export default function handler(req, res) {
  return rootApp(req, res)
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
}
