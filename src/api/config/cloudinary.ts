import { v2 as cloudinary } from "cloudinary"

import { getEnv } from "./env"

export const cloudinaryConnect = (): void => {
	// No try/catch: cloudinary.config() itself never throws (it just stores
	// whatever it's given, including undefined), so the old empty catch
	// caught nothing — it was dead code. Reading through getEnv() is what
	// changed: a missing credential is now a named startup error instead of
	// an opaque failure on the first actual upload call.
	const env = getEnv()
	cloudinary.config({
		cloud_name: env.CLOUDINARY_CLOUD_NAME,
		api_key: env.CLOUDINARY_API_KEY,
		api_secret: env.CLOUDINARY_API_SECRET,
	})
}

export { cloudinary }
