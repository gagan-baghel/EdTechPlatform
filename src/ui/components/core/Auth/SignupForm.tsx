import React, { useState } from "react"
import { toast } from "react-hot-toast"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { useDispatch } from "react-redux"
import { useNavigate } from "@/ui/lib/router"
import type { AppDispatch } from "../../../store"

import { sendOtp } from "../../../services/operations/authAPI"
import { setSignupData } from "../../../slices/authSlice"
import { ACCOUNT_TYPE } from "../../../utils/constants"
import Tab from "../../common/Tab"

const MIN_PASSWORD_LENGTH = 8

function SignupForm() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const inputClass =
    "auth-input"

  const [accountType, setAccountType] = useState(ACCOUNT_TYPE.STUDENT)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { firstName, lastName, email, password, confirmPassword } = formData

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }))
  }

  const handleOnSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (password !== confirmPassword) {
      toast.error("The passwords do not match.")
      return
    }
    const signupData = {
      ...formData,
      accountType,
    }

    dispatch(setSignupData(signupData))
    dispatch(sendOtp(formData.email, navigate))

    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
    setAccountType(ACCOUNT_TYPE.STUDENT)
  }

  const tabData = [
    {
      id: 1,
      tabName: "Student",
      type: ACCOUNT_TYPE.STUDENT,
    },
    {
      id: 2,
      tabName: "Instructor",
      type: ACCOUNT_TYPE.INSTRUCTOR,
    },
  ]

  return (
    <div>
      <Tab tabData={tabData} field={accountType} setField={setAccountType} />
      <form onSubmit={handleOnSubmit} className="flex w-full flex-col gap-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-richblack-300">
              First Name <sup className="text-pink-200">*</sup>
            </p>
            <input
              required
              type="text"
              name="firstName"
              value={firstName}
              onChange={handleOnChange}
              placeholder="First name"
              autoComplete="given-name"
              className={inputClass}
            />
          </label>
          <label>
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-richblack-300">
              Last Name <sup className="text-pink-200">*</sup>
            </p>
            <input
              required
              type="text"
              name="lastName"
              value={lastName}
              onChange={handleOnChange}
              placeholder="Last name"
              autoComplete="family-name"
              className={inputClass}
            />
          </label>
        </div>
        <label className="w-full">
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-richblack-300">
            Email Address <sup className="text-pink-200">*</sup>
          </p>
          <input
            required
            type="email"
            name="email"
            value={email}
            onChange={handleOnChange}
            placeholder="you@institution.edu"
            autoComplete="email"
            spellCheck={false}
            className={inputClass}
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="relative">
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-richblack-300">
              Create Password <sup className="text-pink-200">*</sup>
            </p>
            <input
              required
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={handleOnChange}
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              aria-describedby="password-hint"
              className={`${inputClass} pr-12`}
            />
            <p id="password-hint" className="mt-1 text-xs text-richblack-300">
              At least {MIN_PASSWORD_LENGTH} characters
            </p>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-[45px] z-[10] cursor-pointer text-richblack-300 transition hover:text-richblack-5"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <AiOutlineEyeInvisible className="h-6 w-6" />
              ) : (
                <AiOutlineEye className="h-6 w-6" />
              )}
            </button>
          </label>
          <label className="relative">
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-richblack-300">
              Confirm Password <sup className="text-pink-200">*</sup>
            </p>
            <input
              required
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleOnChange}
              placeholder="Confirm your password"
              autoComplete="new-password"
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-4 top-[45px] z-[10] cursor-pointer text-richblack-300 transition hover:text-richblack-5"
              aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
            >
              {showConfirmPassword ? (
                <AiOutlineEyeInvisible className="h-6 w-6" />
              ) : (
                <AiOutlineEye className="h-6 w-6" />
              )}
            </button>
          </label>
        </div>
        <button
          type="submit"
          className="auth-submit"
        >
          Create Account
        </button>
      </form>
    </div>
  )
}

export default SignupForm
