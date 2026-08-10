import fs from "fs/promises"
import type { UploadApiOptions, UploadApiResponse } from "cloudinary"
import type { UploadedFile } from "express-fileupload"

import { cloudinary } from "../config/cloudinary"

export const uploadImageToCloudinary = async (
    file: UploadedFile,
    folder: string,
    height?: number,
    quality?: number
): Promise<UploadApiResponse> => {

    const options: UploadApiOptions = { folder }
    if(height) options.height=height
    if(quality) options.quality=quality

    options.resource_type ="auto"

    try {
        return await cloudinary.uploader.upload(file.tempFilePath, options)
    } finally {
        // express-fileupload only cleans up its own temp file on error paths,
        // never on success — every upload otherwise leaks a file into /tmp,
        // and a warm serverless instance accumulates them across requests
        // until it fills. All uploads (course thumbnails, avatars, videos)
        // route through this one function, so one fix covers every caller.
        await fs.unlink(file.tempFilePath).catch(() => {})
    }

}
