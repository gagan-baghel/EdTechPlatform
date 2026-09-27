"use client"

import { useEffect, useRef, useState } from "react"
import { FiTrash2 } from "react-icons/fi"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "react-hot-toast"
import { useNavigate } from "@/ui/lib/router"

import { deleteProfile } from "../../../../services/operations/SettingsAPI"
import type { RootState, AppDispatch } from "../../../../store"

export default function DeleteAccount() {
  const { token } = useSelector((state: RootState) => state.auth)
  const { user } = useSelector((state: RootState) => state.profile)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState("")
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const expected = user?.email ?? ""
  const canDelete = typed.trim().toLowerCase() === expected.toLowerCase() && !deleting

  const closeDialog = () => {
    setConfirming(false)
    setTyped("")
  }

  useEffect(() => {
    if (!confirming) return

    inputRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) closeDialog()
    }
    document.addEventListener("keydown", onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [confirming, deleting])

  async function handleDeleteAccount() {
    if (!canDelete) return

    setDeleting(true)
    try {
      await dispatch(deleteProfile(token as string, navigate))
    } catch {
      // Never fail silently — the user must know the account still exists.
      toast.error("We could not delete your account. Please try again or contact support.")
      setDeleting(false)
      return
    }
    setDeleting(false)
    closeDialog()
  }

  return (
    <>
      <div className="my-10 flex flex-col gap-x-5 gap-y-4 rounded-md border-[1px] border-pink-700 bg-pink-900 p-6 sm:flex-row sm:p-8 sm:px-12">
        <div className="flex aspect-square h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-700">
          <FiTrash2 className="text-3xl text-pink-200" />
        </div>
        <div className="flex flex-col space-y-2">
          <h2 className="text-lg font-semibold text-richblack-5">Delete account</h2>
          <div className="text-pink-25 sm:w-3/5">
            <p>Deleting your account is permanent and cannot be undone.</p>
            <p>
              You will immediately lose access to every course you have purchased,
              along with all of your progress.
            </p>
          </div>
          <button
            type="button"
            className="w-fit rounded-md border border-pink-300 px-4 py-2 text-sm font-semibold text-pink-200 transition hover:bg-pink-700/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
            onClick={() => setConfirming(true)}
          >
            Delete my account
          </button>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[1000] grid place-items-center overflow-auto bg-black/70 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-desc"
            className="w-full max-w-md rounded-lg border border-richblack-400 bg-richblack-800 p-6"
          >
            <h3 id="delete-account-title" className="text-xl font-semibold text-richblack-5">
              Permanently delete your account?
            </h3>
            <p id="delete-account-desc" className="mt-3 text-sm text-richblack-200">
              This removes your profile, your enrolled courses, and your learning
              progress. This action cannot be reversed and purchased courses are not
              refunded automatically.
            </p>

            <label
              htmlFor="confirm-email"
              className="mt-5 block text-sm text-richblack-200"
            >
              Type <span className="font-semibold text-richblack-5">{expected}</span> to confirm
            </label>
            <input
              id="confirm-email"
              ref={inputRef}
              type="text"
              value={typed}
              autoComplete="off"
              disabled={deleting}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-2 w-full rounded-md border border-richblack-600 bg-richblack-700 px-3 py-2 text-richblack-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={deleting}
                className="rounded-md bg-richblack-300 px-5 py-2 font-semibold text-ink transition hover:bg-richblack-200 disabled:opacity-60"
              >
                Keep my account
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={!canDelete}
                className="rounded-md bg-pink-700 px-5 py-2 font-semibold text-paper transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
