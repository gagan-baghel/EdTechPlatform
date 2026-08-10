const Course = require("../models/Course");
const CourseProgress = require("../models/CourseProgress");
const Profile = require("../models/Profile");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const { convertSecondsToDuration } = require("../utils/secToDuration");
// Method for updating a profile
exports.updateProfile = async (req, res) => {
	try {
		const { dateOfBirth = "", about = "", contactNumber, gender, firstName, lastName } = req.body;
		const id = req.user.id;

		// Find the profile by id
		const userDetails = await User.findById(id);
		if (!userDetails) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}
		const profile = await Profile.findById(userDetails.additionalDetails);
		if (!profile) {
			return res.status(404).json({
				success: false,
				message: "Profile not found",
			});
		}

		// Update the profile fields. gender was previously destructured
		// nowhere above — the form has always collected it and the
		// response always reported success, but it was silently discarded.
		profile.dateOfBirth = dateOfBirth;
		profile.about = about;
		profile.contactNumber = contactNumber;
		if (gender !== undefined) profile.gender = gender;

		// Save the updated profile
		await profile.save();

		// firstName/lastName live on User, not Profile — same silent-discard
		// bug: the form sends and requires them, but nothing ever wrote them.
		if (firstName !== undefined) userDetails.firstName = firstName;
		if (lastName !== undefined) userDetails.lastName = lastName;
		if (firstName !== undefined || lastName !== undefined) {
			await userDetails.save();
		}

		const updatedUserDetails = await User.findById(id)
			.populate("additionalDetails")
			.exec()

		return res.json({
			success: true,
			message: "Profile updated successfully",
			updatedUserDetails,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

/**
 * Learning + playback preferences (plan §4 Settings groups) — kept
 * separate from updateProfile, which is bound to the profile-details form
 * and its own required-field semantics (dateOfBirth/about). A settings
 * toggle shouldn't have to round-trip those.
 */
exports.updatePreferences = async (req, res) => {
	try {
		const { weeklyGoalMinutes, defaultPlaybackSpeed, autoplayNext, theme, locale, timezone } = req.body

		const userDetails = await User.findById(req.user.id)
		if (!userDetails) {
			return res.status(404).json({ success: false, message: "User not found" })
		}

		const update = {}
		if (weeklyGoalMinutes !== undefined) update.weeklyGoalMinutes = Number(weeklyGoalMinutes)
		if (defaultPlaybackSpeed !== undefined) update.defaultPlaybackSpeed = Number(defaultPlaybackSpeed)
		if (autoplayNext !== undefined) update.autoplayNext = Boolean(autoplayNext)
		if (theme !== undefined && ["dark", "light"].includes(theme)) update.theme = theme
		if (locale !== undefined && ["en", "hi"].includes(locale)) update.locale = locale
		if (timezone !== undefined) update.timezone = timezone || null

		const profile = await Profile.findByIdAndUpdate(userDetails.additionalDetails, update, { new: true })

		return res.status(200).json({ success: true, data: profile })
	} catch (error) {
		return res.status(500).json({ success: false, message: "Could not update preferences" })
	}
}

/**
 * Privacy & data settings (plan §4): a user's own data, as JSON, on
 * request. Deliberately reads directly from each model rather than
 * introducing a "personal data registry" abstraction — five collections
 * is small enough to just list.
 */
exports.exportMyData = async (req, res) => {
	try {
		const userId = req.user.id
		const [Certificate, QuizAttempt, Payment, Note, CourseProgress] = [
			require("../models/Certificate"),
			require("../models/QuizAttempt"),
			require("../models/Payment"),
			require("../models/Note"),
			require("../models/CourseProgress"),
		]

		const [user, payments, certificates, notes, courseProgress] = await Promise.all([
			User.findById(userId).populate("additionalDetails").select("-password").lean(),
			Payment.find({ consumer: userId }).select("-__v").lean(),
			Certificate.find({ user: userId }).select("-__v").lean(),
			Note.find({ user: userId }).select("-__v").lean(),
			CourseProgress.find({ userId }).select("-__v").lean(),
		])

		return res.status(200).json({
			success: true,
			exportedAt: new Date().toISOString(),
			data: { profile: user, payments, certificates, notes, courseProgress },
		})
	} catch (error) {
		return res.status(500).json({ success: false, message: "Could not export your data" })
	}
}

exports.deleteAccount = async (req, res) => {
	try {
		// TODO: Find More on Job Schedule
		// const job = schedule.scheduleJob("10 * * * * *", function () {
		// });
		const id = req.user.id;
		
		const user = await User.findById({ _id: id });
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}
		// Delete Assosiated Profile with the User
		await Profile.findByIdAndDelete({ _id: user.additionalDetails });
			// Unenroll User From All the Enrolled Courses
			if (user.courses?.length) {
				await Course.updateMany(
					{ _id: { $in: user.courses } },
					{ $pull: { studentsEnrolled: user._id } }
				)
			}
			// Remove course progress entries for the user
			await CourseProgress.deleteMany({ userId: user._id })
			// Now Delete User
		await User.findByIdAndDelete({ _id: id });
		res.status(200).json({
			success: true,
			message: "User deleted successfully",
		});
	} catch (error) {
		res
			.status(500)
			.json({ success: false, message: "User Cannot be deleted successfully" });
	}
};

exports.getAllUserDetails = async (req, res) => {
	try {
		const id = req.user.id;
		const userDetails = await User.findById(id)
			.populate("additionalDetails")
			.exec();
		res.status(200).json({
			success: true,
			message: "User Data fetched successfully",
			data: userDetails,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

exports.updateDisplayPicture = async (req, res) => {
    try {
      if (!req.files || !req.files.displayPicture) {
        return res.status(400).json({
          success: false,
          message: "Display picture is required",
        })
      }
      const displayPicture = req.files.displayPicture
      const userId = req.user.id
      const image = await uploadImageToCloudinary(
        displayPicture,
        process.env.FOLDER_NAME,
        1000,
        1000
      )
      const updatedProfile = await User.findByIdAndUpdate(
        { _id: userId },
        { userImage: image.secure_url },
        { new: true }
      )
      res.send({
        success: true,
        message: `Image Updated successfully`,
        data: updatedProfile,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
};
  
exports.getEnrolledCourses = async (req, res) => {
	try {
	  const userId = req.user.id
		  let userDetails = await User.findOne({
			_id: userId,
		  })
		.populate({
		  path: "courses",
		  populate: {
			path: "courseContent",
			options: { sort: { order: 1 } },
			populate: {
			  path: "subSection",
			  options: { sort: { order: 1 } },
			},
		  },
		})
		.exec()

		  if (!userDetails) {
			return res.status(400).json({
			  success: false,
			  message: `Could not find user with id: ${userId}`,
			})
		  }

		  userDetails = userDetails.toObject()
	  var SubsectionLength = 0
	  for (var i = 0; i < userDetails.courses.length; i++) {
		let totalDurationInSeconds = 0
		SubsectionLength = 0
		for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
		  totalDurationInSeconds += userDetails.courses[i].courseContent[
			j
		  ].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)
		  userDetails.courses[i].totalDuration = convertSecondsToDuration(
			totalDurationInSeconds
		  )
		  SubsectionLength +=
			userDetails.courses[i].courseContent[j].subSection.length
		}
		const courseProgress = await CourseProgress.findOne({
		  courseID: userDetails.courses[i]._id,
		  userId: userId,
		})
		const courseProgressCount = courseProgress?.completedVideos.length
		// "Continue learning" reads this instead of always opening
		// courseContent[0].subSection[0] — see EnrolledCourses.jsx.
		userDetails.courses[i].lastWatchedSubSection =
		  courseProgress?.lastWatchedSubSection ?? null
		if (SubsectionLength === 0) {
		  userDetails.courses[i].progressPercentage = 100
		} else {
		  // To make it up to 2 decimal point
		  const multiplier = Math.pow(10, 2)
		  userDetails.courses[i].progressPercentage =
			Math.round(
			  (courseProgressCount / SubsectionLength) * 100 * multiplier
			) / multiplier
		}
	  }
  
	  return res.status(200).json({
		success: true,
		data: userDetails.courses,
	  })
	} catch (error) {
	  return res.status(500).json({
		success: false,
		message: error.message,
	  })
	}
}

exports.instructorDashboard = async(req, res) => {
	try{
		const courseDetails = await Course.find({instructor:req.user.id});
		const courseIds = courseDetails.map((course) => course._id.toString())

		// totalAmountGenerated used to be studentsEnrolled.length * course.price
		// — wrong the moment price changes after a sale, and inflated by any
		// free/comped enrolment. This reads real Payment rows instead, same
		// proportional-split approach as Payout.js's computeInstructorEarnings
		// (a payment can cover multiple courses; Payment stores only the
		// order total, not a per-course breakdown, so each course's share is
		// approximated by its current price relative to the other courses in
		// that same payment).
		const Payment = require("../models/Payment")
		const relevantPayments = await Payment.find({ courses: { $in: courseIds } })
			.populate({ path: "courses", select: "price" })
			.lean()

		const revenueByCourseId = new Map()
		for (const payment of relevantPayments) {
			const coursesInPayment = payment.courses || []
			const totalOfAllCoursesInPayment = coursesInPayment.reduce(
				(sum, course) => sum + (course?.price || 0),
				0
			)
			if (totalOfAllCoursesInPayment <= 0) continue

			for (const course of coursesInPayment) {
				if (!courseIds.includes(course._id.toString())) continue
				const share = (course.price / totalOfAllCoursesInPayment) * payment.amount
				revenueByCourseId.set(
					course._id.toString(),
					(revenueByCourseId.get(course._id.toString()) || 0) + share
				)
			}
		}

		const courseData  = courseDetails.map((course)=> {
			const totalStudentsEnrolled = course.studentsEnrolled.length
			const totalAmountGenerated =
				Math.round((revenueByCourseId.get(course._id.toString()) || 0) * 100) / 100

			//create an new object with the additional fields
			const courseDataWithStats = {
				_id: course._id,
				courseName: course.courseName,
				courseDescription: course.courseDescription,
				totalStudentsEnrolled,
				totalAmountGenerated,
			}
			return courseDataWithStats
		})

		res.status(200).json({courses:courseData});

	}
	catch(error) {
		res.status(500).json({message:"Internal Server Error"});
	}
}

/**
 * Marks the first-run onboarding flow done — gates the one-time
 * /onboarding redirect (see authAPI.js's login/signup handlers). Called
 * whether the student picks a goal or hits "Skip"; either way it should
 * never show again for this account.
 */
exports.completeOnboarding = async (req, res) => {
	try {
		const { learningGoal } = req.body

		await User.findByIdAndUpdate(req.user.id, { onboarded: true })

		if (learningGoal) {
			const user = await User.findById(req.user.id).select("additionalDetails")
			await Profile.findByIdAndUpdate(user.additionalDetails, { learningGoal })
		}

		return res.status(200).json({ success: true, message: "Onboarding complete" })
	} catch (error) {
		return res.status(500).json({ success: false, message: "Could not complete onboarding" })
	}
}
