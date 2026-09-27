import React, { useState } from "react"
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai"
import { useDispatch } from "react-redux"
import { Link, useNavigate } from "@/ui/lib/router"
import type { AppDispatch } from "../../../store"

import { login } from "../../../services/operations/authAPI"

function LoginForm() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const [showPassword, setShowPassword] = useState(false)

  const { email, password } = formData

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: e.target.value,
    }))
  }

  const handleOnSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    dispatch(login(email, password, navigate))
  }

  return (
    <form onSubmit={handleOnSubmit} className="mt-6 flex w-full flex-col gap-y-5">
      <label className="w-full">
        <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-richblack-300">
          Email Address <sup className="text-pink-200">*</sup>
        </p>
        <input
          required
          type="text"
          name="email"
          value={email}
          onChange={handleOnChange}
          placeholder="you@example.com"
          autoComplete="email"
          spellCheck={false}
          className="auth-input"
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
          placeholder="Enter Password"
          autoComplete="current-password"
          className="auth-input pr-12"
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
        <div className="mt-2 text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold link-accent underline-offset-4 transition hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </label>
      <button
        type="submit"
        className="auth-submit"
      >
        Sign In
      </button>
    </form>
  )
}

export default LoginForm
