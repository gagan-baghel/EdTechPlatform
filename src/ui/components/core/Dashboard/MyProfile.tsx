import Image from "next/image"
import { RiEditBoxLine } from "react-icons/ri"
import { useSelector } from "react-redux"

import { useNavigate } from "@/ui/lib/router"
import { formattedDate } from "../../../utils/dateFormatter"
import { normalizeAvatarUrl } from "../../../utils/avatar"
import Card from "../../common/Card"
import IconBtn from "../../common/IconBtn"

import type { RootState } from "../../../store"

/** Padding that actually fits a phone. `p-8 px-12` left 279px of usable width at 375px. */
const CARD_PADDING = "p-5 sm:p-6 lg:p-8"

/**
 * A labelled value in the details grid. Long values (an email, a long name)
 * must be able to wrap rather than force the grid wider than the screen.
 */
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs uppercase tracking-wide text-richblack-300">{label}</p>
      <p className="break-words text-sm font-medium text-richblack-5">{value}</p>
    </div>
  )
}

/**
 * Header row for a card: a title on the left, an Edit action on the right.
 *
 * `min-w-0` on the title is the fix for the overlap — without it the text
 * block refuses to shrink below its content width, so on a narrow screen the
 * Edit button was drawn on top of the user's name and email.
 */
function CardHeader({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="min-w-0 text-lg font-semibold text-richblack-5">{title}</p>
      <IconBtn text="Edit" onClick={onEdit}>
        <RiEditBoxLine />
      </IconBtn>
    </div>
  )
}

export default function MyProfile() {
  const { user } = useSelector((state: RootState) => state.profile)
  const navigate = useNavigate()
  const goToSettings = () => navigate("/dashboard/settings")

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-2xl font-medium text-richblack-5 sm:text-3xl">My Profile</h1>

      <Card padding={CARD_PADDING}>
        {/* Wraps below sm: at 375px the avatar, a full name, an email and a
            button cannot share one row without the text sliding under the
            button, which is exactly what it did. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Image
              src={normalizeAvatarUrl(user?.userImage, user?.firstName, user?.lastName)}
              alt=""
              width={64}
              height={64}
              className="aspect-square h-14 w-14 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
              unoptimized
            />
            <div className="min-w-0 space-y-1">
              <p className="truncate text-lg font-semibold text-richblack-5">
                {user?.firstName} {user?.lastName}
              </p>
              {/* `break-all`: an email has no spaces to break on, so without it
                  a long address pushes the card wider than the viewport. */}
              <p className="break-all text-sm text-richblack-300">{user?.email}</p>
            </div>
          </div>
          <div className="shrink-0">
            <IconBtn text="Edit" onClick={goToSettings}>
              <RiEditBoxLine />
            </IconBtn>
          </div>
        </div>
      </Card>

      <Card padding={CARD_PADDING} className="space-y-4">
        <CardHeader title="About" onEdit={goToSettings} />
        <p
          className={`text-sm font-medium ${
            user?.additionalDetails?.about ? "text-richblack-5" : "text-richblack-400"
          }`}
        >
          {user?.additionalDetails?.about || "Write something about yourself"}
        </p>
      </Card>

      <Card padding={CARD_PADDING} className="space-y-5">
        <CardHeader title="Personal Details" onEdit={goToSettings} />
        {/* One column on a phone, two from sm. It was a fixed two-column
            `justify-between` row, which is unreadable at 375px. */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="First Name" value={user?.firstName} />
          <Detail label="Last Name" value={user?.lastName} />
          <Detail label="Email" value={user?.email} />
          <Detail
            label="Phone Number"
            value={user?.additionalDetails?.contactNumber || "Add a contact number"}
          />
          <Detail
            label="Gender"
            value={user?.additionalDetails?.gender || "Add gender"}
          />
          <Detail
            label="Date Of Birth"
            value={
              formattedDate(user?.additionalDetails?.dateOfBirth as string) ||
              "Add date of birth"
            }
          />
        </div>
      </Card>
    </div>
  )
}
