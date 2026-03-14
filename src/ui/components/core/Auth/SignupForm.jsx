import { useState } from "react"
import { toast } from "react-hot-toast"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { useDispatch } from "react-redux"
import { useNavigate } from "@/ui/lib/router"

import { sendOtp } from "../../../services/operations/authAPI"
import { setSignupData } from "../../../slices/authSlice"
import { ACCOUNT_TYPE } from "../../../utils/constants"
import Tab from "../../common/Tab"

function SignupForm() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-richblack-900/80 px-4 py-4 text-base text-richblack-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-all placeholder:text-richblack-400 focus:border-[#c3ebfa]/60 focus:ring-4 focus:ring-[#c3ebfa]/10"

  // student or instructor
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

  // Handle input fields, when some value changes
  const handleOnChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }))
  }

  // Handle Form Submission
  const handleOnSubmit = (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords Do Not Match")
      return
    }
    const signupData = {
      ...formData,
      accountType,
    }

    // Setting signup data to state
    // To be used after otp verification
    dispatch(setSignupData(signupData))
    // Send OTP to user for verification
    dispatch(sendOtp(formData.email, navigate))

    // Reset
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
    setAccountType(ACCOUNT_TYPE.STUDENT)
  }

  // data to pass to Tab component
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
              className={`${inputClass} pr-12`}
            />
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
          className="mt-2 rounded-full bg-white px-6 py-4 text-base font-bold text-richblack-900 shadow-[0_18px_45px_rgba(255,255,255,0.14)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_22px_55px_rgba(255,255,255,0.2)] active:scale-[0.99]"
        >
          Create Account
        </button>
      </form>
    </div>
  )
}

export default SignupForm
