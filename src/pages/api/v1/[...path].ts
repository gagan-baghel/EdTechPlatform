import express from "express"
import type { NextApiRequest, NextApiResponse } from "next"

import { createApiApp } from "@/api/app"

/**
 * The whole Express API mounted behind one Next catch-all route, so the
 * existing /api/v1/* paths keep working without a separate backend process.
 *
 * This file was the last CommonJS module in the API path, and its
 * `const { createApiApp } = require("../../../api/app")` silently resolved to
 * `undefined` once app.ts became ESM — the build still passed and every single
 * endpoint returned a 500. Hence the real import.
 *
 * Built once at module scope: on a warm serverless instance the app is reused
 * across requests, where rebuilding it per request would re-register every
 * route on every call.
 */
const apiApp = createApiApp()
const rootApp = express()

rootApp.use("/api", apiApp)

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Next's Api types and Express's types describe the same underlying Node
  // request/response objects; only the declarations differ.
  return rootApp(
    req as unknown as express.Request,
    res as unknown as express.Response
  )
}

export const config = {
  api: {
    // Express does its own body parsing — including express.raw() on the
    // Razorpay webhook, which needs the exact received bytes to verify the
    // signature. Letting Next parse first would break that verification.
    bodyParser: false,
    externalResolver: true,
  },
  maxDuration: 60,
}
