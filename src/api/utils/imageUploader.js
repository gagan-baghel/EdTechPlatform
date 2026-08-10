const cloudinary = require('cloudinary').v2
const fs = require('fs/promises')

exports.uploadImageToCloudinary = async (file, folder, height, quality) => {

    const options={
        folder
    }
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