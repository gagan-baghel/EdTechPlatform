import ChangeProfilePicture from "./ChangeProfilePicture"
import DeleteAccount from "./DeleteAccount"
import EditProfile from "./EditProfile"
import NotificationPreferencesPanel from "./NotificationPreferencesPanel"
import PreferencesPanel from "./PreferencesPanel"
import SessionsPanel from "./SessionsPanel"
import UpdatePassword from "./UpdatePassword"
import { PageHeader } from "../../../common/DashKit"

/** In-page anchors — the page is long, and each group is one jump away. */
const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "learning", label: "Learning" },
  { id: "appearance", label: "Appearance" },
  { id: "accessibility", label: "Accessibility" },
  { id: "privacy", label: "Privacy & data" },
  { id: "account", label: "Delete account" },
]

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" meta="Account, preferences and privacy" />
      <nav
        aria-label="Settings sections"
        className="z-10 -mt-6 mb-10 flex overflow-x-auto border-b border-richblack-600 bg-richblack-900 [scrollbar-width:none] md:sticky md:top-0 [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="stamp -mb-px shrink-0 border-b-2 border-transparent px-4 py-3 text-richblack-400 hover:border-richblack-400 hover:text-richblack-5"
          >
            {s.label}
          </a>
        ))}
      </nav>
      <section id="profile" className="scroll-mt-20">
        <ChangeProfilePicture />
        <EditProfile />
      </section>
      <section id="security" className="scroll-mt-20">
        <UpdatePassword />
        <SessionsPanel />
      </section>
      <section id="notifications" className="scroll-mt-20">
        <NotificationPreferencesPanel />
      </section>
      {/* Learning, appearance, accessibility and privacy carry their own anchors. */}
      <PreferencesPanel />
      <section id="account" className="scroll-mt-20">
        <DeleteAccount />
      </section>
    </>
  )
}
