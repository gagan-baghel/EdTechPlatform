import type { Request } from "express"
import type { UploadedFile } from "express-fileupload"

import { AppError } from "./AppError"

/**
 * Readers for the parts of a request Express types loosely.
 *
 * `req.query.page` is `string | string[] | ParsedQs | ParsedQs[] | undefined`,
 * because a caller can send `?page=1&page=2` or `?page[x]=1` and Express will
 * faithfully hand you an array or a nested object. Under `any` that was
 * invisible and every reader silently assumed "string" — `Number(req.query.page)`
 * on an array is NaN, and a filter built from a ParsedQs is an object where a
 * string was expected, which is how query parameters turn into unintended
 * Mongo operators. These collapse the union at the boundary, once.
 */

/** First value if repeated; `undefined` for absent or structured input. */
export function queryString(req: Request, key: string): string | undefined {
  const value = req.query[key]
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === "string" ? first : undefined
  }
  return undefined
}

export function queryNumber(req: Request, key: string): number | undefined {
  const raw = queryString(req, key)
  if (raw === undefined || raw.trim() === "") return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function queryBoolean(req: Request, key: string): boolean | undefined {
  const raw = queryString(req, key)
  if (raw === undefined) return undefined
  return raw === "true" || raw === "1"
}

/** Clamped so a caller cannot request an unbounded page and scan a collection. */
export function pagination(
  req: Request,
  { defaultSize = 20, maxSize = 100 } = {}
): { page: number; pageSize: number; skip: number } {
  const page = Math.max(1, Math.floor(queryNumber(req, "page") ?? 1))
  const requested = Math.floor(queryNumber(req, "pageSize") ?? defaultSize)
  const pageSize = Math.min(Math.max(1, requested), maxSize)
  return { page, pageSize, skip: (page - 1) * pageSize }
}

/**
 * express-fileupload gives `UploadedFile | UploadedFile[]` because a form can
 * repeat a field name. Every upload path in this app wants exactly one file.
 */
export function singleFile(req: Request, field: string): UploadedFile | undefined {
  const file = req.files?.[field]
  if (!file) return undefined
  return Array.isArray(file) ? file[0] : file
}

export function requireFile(req: Request, field: string): UploadedFile {
  const file = singleFile(req, field)
  if (!file) {
    throw AppError.validation(`${field} is required.`)
  }
  return file
}

/**
 * Reads a string field from a JSON body without trusting its type.
 *
 * `req.body` is `any` in Express's typings, so this is where a body value
 * stops being `any` for callers that don't have a full Zod schema yet.
 */
export function bodyString(req: Request, key: string): string | undefined {
  const value = (req.body as Record<string, unknown> | undefined)?.[key]
  return typeof value === "string" ? value : undefined
}
