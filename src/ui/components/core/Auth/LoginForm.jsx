import { useState } from "react"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { useDispatch } from "react-redux"
import { Link, useNavigate } from "@/ui/lib/router"

import { login } from "../../../services/operations/authAPI"

function LoginForm() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-richblack-900/80 px-4 py-4 text-base text-richblack-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-all placeholder:text-richblack-400 focus:border-[#c3ebfa]/60 focus:ring-4 focus:ring-[#c3ebfa]/10"
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const [showPassword, setShowPassword] = useState(false)

  const { email, password } = formData

  const handleOnChange = (e) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }))
  }

  const handleOnSubmit = (e) => {
    e.preventDefault()
    dispatch(login(email, password, navigate))
  }

  return (
    <form
      onSubmit={handleOnSubmit}
      className="flex w-full flex-col gap-y-5"
    >
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
      <label className="relative">
        <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-richblack-300">
          Password <sup className="text-pink-200">*</sup>
        </p>
        <input
          required
          type={showPassword ? "text" : "password"}
          name="password"
          value={password}
          onChange={handleOnChange}
          placeholder="Enter your password"
          autoComplete="current-password"
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
        <div className="mt-3 flex items-center justify-end gap-4">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-[#c3ebfa] transition hover:text-white"
          >
            Forgot password?
          </Link>
        </div>
      </label>
      <button
        type="submit"
        className="mt-2 rounded-full bg-white px-6 py-4 text-base font-bold text-richblack-900 shadow-[0_18px_45px_rgba(255,255,255,0.14)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_22px_55px_rgba(255,255,255,0.2)] active:scale-[0.99]"
      >
        Sign In
      </button>
    </form>
  )
}

export default LoginForm
