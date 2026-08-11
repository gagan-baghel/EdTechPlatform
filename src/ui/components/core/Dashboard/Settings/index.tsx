import ChangeProfilePicture from "./ChangeProfilePicture"
import DeleteAccount from "./DeleteAccount"
import EditProfile from "./EditProfile"
import NotificationPreferencesPanel from "./NotificationPreferencesPanel"
import PreferencesPanel from "./PreferencesPanel"
import SessionsPanel from "./SessionsPanel"
import UpdatePassword from "./UpdatePassword"

export default function Settings() {
  return (
    <>
      <h1 className="mb-14 text-3xl font-medium text-richblack-5">
        Edit Profile
      </h1>
      {/* Change Profile Picture */}
      <ChangeProfilePicture />
      {/* Profile */}
      <EditProfile />
      {/* Password */}
      <UpdatePassword />
      {/* Security & sessions */}
      <SessionsPanel />
      {/* Notification preferences */}
      <NotificationPreferencesPanel />
      {/* Learning, playback, accessibility, data export */}
      <PreferencesPanel />
      {/* Delete Account */}
      <DeleteAccount />
    </>
  )
}
