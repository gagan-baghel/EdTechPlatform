const mongoose = require("mongoose");

// Define the RatingAndReview schema
const ratingAndReviewSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "User",
	},
	rating: {
		type: Number,
		required: true,
	},
	review: {
		type: String,
		required: true,
	},
	course: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "Course",
		index: true,
	},
});

// createRating checks for an existing review then creates one — a
// find-then-create with no atomic guarantee. This is the guarantee: a
// second concurrent request for the same {user, course} fails on the
// index instead of creating a duplicate review. See
// scripts/ensure-indexes.js; autoIndex is off (connectDB.js).
ratingAndReviewSchema.index({ user: 1, course: 1 }, { unique: true });

// Export the RatingAndReview model
module.exports =
  mongoose.models.RatingAndReview ||
  mongoose.model("RatingAndReview", ratingAndReviewSchema);
