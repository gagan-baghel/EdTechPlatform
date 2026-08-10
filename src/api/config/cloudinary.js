const cloudinary = require("cloudinary").v2; //! Cloudinary is being required

exports.cloudinaryConnect = () => {
	// No try/catch: cloudinary.config() itself never throws (it just stores
	// whatever it's given, including undefined), so the old empty catch
	// caught nothing — it was dead code. A missing env var still only
	// surfaces later as an opaque failure on the first actual upload call;
	// removing the catch here doesn't change that, it just stops
	// pretending this function could fail when it can't.
	cloudinary.config({
		cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
		api_key: process.env.CLOUDINARY_API_KEY,
		api_secret: process.env.CLOUDINARY_API_SECRET,
	});
};