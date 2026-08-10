/**
 * Single import surface for shared types:
 *
 *   import type { Course, ApiResponse } from "@/types"
 *
 * Types only — anything with a runtime cost (Zod schemas, the env object)
 * lives beside the code that owns it, so importing a type never drags a
 * server-only module into the client bundle.
 */
export * from "./api"
export * from "./auth"
export * from "./domain"
export * from "./util"
