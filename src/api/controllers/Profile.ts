/** The fields getEnrolledCourses reads off a CourseProgress row. */
interface EnrolledCourseProgress {
  courseID: unknown
  completedVideos?: unknown[]
  lastWatchedSubSection?: unknown
}

import type { Response } from "express"
import { requireFile } from "../lib/request"
import { getEnv } from "../config/env"
import { fail, parseOrThrow } from "../lib/respond"
import { text } from "../lib/schemas"
import { z } from "zod"
import type { AuthedRequest } from "../lib/http"
import Certificate from "../models/Certificate"
import Course from "../models/Course"
import CourseProgress from "../models/CourseProgress"
import Note from "../models/Note"
import Payment from "../models/Payment"
import Profile from "../models/Profile"
import Session from "../models/Session"
import User from "../models/User"
import { uploadImageToCloudinary } from "../utils/imageUploader"
import { convertSecondsToDuration } from "../utils/secToDuration"
/**
 * Every field optional AND absent-means-unchanged.
 *
 * `dateOfBirth` and `about` previously had `.default("")`, so any caller that
 * did not send them — the Settings form updating only a name, for instance —
 * silently wiped whatever the user had already written there.
 */
const UpdateProfileSchema = z.object({
	dateOfBirth: z
		.string()
		.trim()
		.refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
			message: "Date of birth is not a valid date",
		})
		.optional(),
	about: z.string().trim().max(2000, "About must be at most 2000 characters").optional(),
	contactNumber: z.string().trim().max(20).optional(),
	gender: z.string().trim().max(50).optional(),
	firstName: text({ max: 100, label: "First name" }).optional(),
	lastName: text({ max: 100, label: "Last name" }).optional(),
})

// Method for updating a profile
export const updateProfile = async (req: AuthedRequest, res: Response) => {
	try {
		const { dateOfBirth, about, contactNumber, gender, firstName, lastName } = parseOrThrow(UpdateProfileSchema, req.body);
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

		// Only what was actually sent. Assigning unconditionally is what made
		// a partial update destructive.
		if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth;
		if (about !== undefined) profile.about = about;
		if (contactNumber !== undefined) profile.contactNumber = contactNumber;
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
		return fail(res, error, "updateProfile")
	}
};

/**
 * Learning + playback preferences (plan §4 Settings groups) — kept
 * separate from updateProfile, which is bound to the profile-details form
 * and its own required-field semantics (dateOfBirth/about). A settings
 * toggle shouldn't have to round-trip those.
 */
const UpdatePreferencesSchema = z.object({
	// Bounded now that the dashboard divides by it: a negative goal rendered
	// as a progress ring past 100% before anyone had watched a minute.
	weeklyGoalMinutes: z.coerce.number().int().min(0).max(7 * 24 * 60).optional(),
	defaultPlaybackSpeed: z.coerce.number().min(0.25).max(3).optional(),
	autoplayNext: z.boolean().optional(),
	theme: z.enum(["dark", "light"]).optional(),
	locale: z.enum(["en", "hi"]).optional(),
	timezone: z.string().max(100).optional(),
	showOnLeaderboard: z.boolean().optional(),
})

export const updatePreferences = async (req: AuthedRequest, res: Response) => {
	try {
		const { weeklyGoalMinutes, defaultPlaybackSpeed, autoplayNext, theme, locale, timezone, showOnLeaderboard } = parseOrThrow(UpdatePreferencesSchema, req.body)

		const userDetails = await User.findById(req.user.id)
		if (!userDetails) {
			return res.status(404).json({ success: false, message: "User not found" })
		}

		const update: Record<string, unknown> = {}
		if (weeklyGoalMinutes !== undefined) update.weeklyGoalMinutes = weeklyGoalMinutes
		if (defaultPlaybackSpeed !== undefined) update.defaultPlaybackSpeed = defaultPlaybackSpeed
		if (autoplayNext !== undefined) update.autoplayNext = autoplayNext
		if (theme !== undefined) update.theme = theme
		if (locale !== undefined) update.locale = locale
		if (timezone !== undefined) update.timezone = timezone || null
		if (showOnLeaderboard !== undefined) update.showOnLeaderboard = showOnLeaderboard

		const profile = await Profile.findByIdAndUpdate(userDetails.additionalDetails, update, { new: true })

		return res.status(200).json({ success: true, data: profile })
	} catch (error) {
    return fail(res, error, "updatePreferences", "Could not update preferences")
  }
}

/**
 * Privacy & data settings (plan §4): a user's own data, as JSON, on
 * request. Deliberately reads directly from each model rather than
 * introducing a "personal data registry" abstraction — five collections
 * is small enough to just list.
 */
export const exportMyData = async (req: AuthedRequest, res: Response) => {
	try {
		const userId = req.user.id

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
    return fail(res, error, "exportMyData", "Could not export your data")
  }
}

export const deleteAccount = async (req: AuthedRequest, res: Response) => {
	try {
		const id = req.user.id;

		const user = await User.findById(id);
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		/**
		 * An instructor with live courses cannot be deleted.
		 *
		 * Deleting them left every one of their courses with a dangling
		 * `instructor` ref: the catalogue populate resolved to null and the
		 * course detail page crashed, students who had PAID kept an enrolment
		 * in a course with no author, and there was no way to undo it. The
		 * courses have to be transferred or taken down first — which is an
		 * admin decision, not something to silently pick on their behalf.
		 */
		const liveCourses = await Course.countDocuments({
			instructor: user._id,
			deletedAt: null,
		})
		if (liveCourses > 0) {
			return res.status(409).json({
				success: false,
				message:
					"This account still owns published courses. Contact support to transfer or remove them before deleting your account.",
			})
		}

		await Profile.findByIdAndDelete(user.additionalDetails);

		// Unenroll from every course they were enrolled in.
		if (user.courses?.length) {
			await Course.updateMany(
				{ _id: { $in: user.courses } },
				{ $pull: { studentsEnrolled: user._id } }
			)
		}
		await CourseProgress.deleteMany({ userId: user._id })

		/**
		 * Revoke sessions BEFORE the user row goes away.
		 *
		 * A JWT stays signature-valid for its full 24h, and the auth middleware
		 * only rejects it if the matching Session is revoked. Without this, a
		 * just-deleted account kept a working token whose `req.user.id` pointed
		 * at nothing — every controller that does `User.findById(...)` and then
		 * reads a property off the result answered 500 for the next day.
		 */
		await Session.updateMany({ user: user._id }, { $set: { revoked: true } })

		await User.findByIdAndDelete(id);
		res.clearCookie("token")

		res.status(200).json({
			success: true,
			message: "User deleted successfully",
		});
	} catch (error) {
    return fail(res, error, "deleteAccount", "User Cannot be deleted successfully")
  }
};

export const getAllUserDetails = async (req: AuthedRequest, res: Response) => {
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
		return fail(res, error, "getAllUserDetails")
	}
};

export const updateDisplayPicture = async (req: AuthedRequest, res: Response) => {
    try {
      if (!req.files || !req.files.displayPicture) {
        return res.status(400).json({
          success: false,
          message: "Display picture is required",
        })
      }
      const displayPicture = requireFile(req, "displayPicture")
      const userId = req.user.id
      const image = await uploadImageToCloudinary(
        displayPicture,
        getEnv().FOLDER_NAME,
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
      return fail(res, error, "updateDisplayPicture")}
};
  
export const getEnrolledCourses = async (req: AuthedRequest, res: Response) => {
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

	  // One query for every enrolled course's progress instead of one query
	  // per course inside the loop below — the classic N+1, and this endpoint
	  // is what the "My Courses" page loads on every visit.
	  const progressRows = await CourseProgress.find({
		userId,
		courseID: { $in: userDetails.courses.map((course: { _id: unknown }) => course._id) },
	  }).lean()
	  const progressByCourseId = new Map<string, EnrolledCourseProgress>(
		progressRows.map((row: EnrolledCourseProgress) => [String(row.courseID), row])
	  )

	  let SubsectionLength = 0
	  for (let i = 0; i < userDetails.courses.length; i++) {
		let totalDurationInSeconds = 0
		SubsectionLength = 0
		for (let j = 0; j < userDetails.courses[i].courseContent.length; j++) {
		  totalDurationInSeconds += userDetails.courses[i].courseContent[
			j
		  ].subSection.reduce(
					(acc: number, curr: { timeDuration: string }) =>
						acc + parseInt(curr.timeDuration),
					0
				)
		  userDetails.courses[i].totalDuration = convertSecondsToDuration(
			totalDurationInSeconds
		  )
		  SubsectionLength +=
			userDetails.courses[i].courseContent[j].subSection.length
		}
		const courseProgress = progressByCourseId.get(
		  String(userDetails.courses[i]._id)
		)
		const courseProgressCount = courseProgress?.completedVideos?.length ?? 0
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
	  return fail(res, error, "getEnrolledCourses")}
}

/**
 * Marks the first-run onboarding flow done — gates the one-time
 * /onboarding redirect (see authAPI.js's login/signup handlers). Called
 * whether the student picks a goal or hits "Skip"; either way it should
 * never show again for this account.
 */
const CompleteOnboardingSchema = z.object({
	learningGoal: z.string().optional(),
})

export const completeOnboarding = async (req: AuthedRequest, res: Response) => {
	try {
		const { learningGoal } = parseOrThrow(CompleteOnboardingSchema, req.body)

		await User.findByIdAndUpdate(req.user.id, { onboarded: true })

		if (learningGoal) {
			const user = await User.findById(req.user.id).select("additionalDetails")
			if (user) {
				await Profile.findByIdAndUpdate(user.additionalDetails, { learningGoal })
			}
		}

		return res.status(200).json({ success: true, message: "Onboarding complete" })
	} catch (error) {
    return fail(res, error, "completeOnboarding", "Could not complete onboarding")
  }
}
