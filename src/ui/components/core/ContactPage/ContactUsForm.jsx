import React, { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import CountryCode from "../../../data/countrycode.json"
import { apiConnector } from "../../../services/apiconnector"
import { contactusEndpoint } from "../../../services/apis"

const ContactUsForm = () => {
  const [loading, setLoading] = useState(false)
  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-richblack-900/80 px-4 py-4 text-base text-richblack-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-all placeholder:text-richblack-400 focus:border-[#c3ebfa]/60 focus:ring-4 focus:ring-[#c3ebfa]/10"
  const labelClass =
    "text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-richblack-300"
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm()

  const submitContactForm = async (data) => {
    try {
      setLoading(true)
      await apiConnector(
        "POST",
        contactusEndpoint.CONTACT_US_API,
        data
      )
    } catch (_error) {
      // Keep the form responsive even if the request fails.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset({
        email: "",
        firstname: "",
        lastname: "",
        message: "",
        phoneNo: "",
        countrycode: "+91",
      })
    }
  }, [reset, isSubmitSuccessful])

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={handleSubmit(submitContactForm)}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="firstname" className={labelClass}>
            First Name
          </label>
          <input
            type="text"
            name="firstname"
            id="firstname"
            placeholder="First name"
            className={inputClass}
            autoComplete="given-name"
            {...register("firstname", { required: true })}
          />
          {errors.firstname && (
            <span className="-mt-1 text-[12px] text-yellow-100">
              Please enter your name.
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="lastname" className={labelClass}>
            Last Name
          </label>
          <input
            type="text"
            name="lastname"
            id="lastname"
            placeholder="Last name"
            className={inputClass}
            autoComplete="family-name"
            {...register("lastname")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>
          Email Address
        </label>
        <input
          type="email"
          name="email"
          id="email"
          placeholder="you@institution.edu"
          className={inputClass}
          autoComplete="email"
          {...register("email", { required: true })}
        />
        {errors.email && (
          <span className="-mt-1 text-[12px] text-yellow-100">
            Please enter your Email address.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phonenumber" className={labelClass}>
          Phone Number
        </label>

        <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <select
              name="countrycode"
              id="countrycode"
              className={inputClass}
              {...register("countrycode", { required: true })}
              defaultValue="+91"
            >
              {CountryCode.map((ele, i) => {
                return (
                  <option key={i} value={ele.code}>
                    {ele.code} -{ele.country}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="tel"
              name="phonenumber"
              id="phonenumber"
              placeholder="12345 67890"
              className={inputClass}
              autoComplete="tel"
              {...register("phoneNo", {
                required: {
                  value: true,
                  message: "Please enter your Phone Number.",
                },
                maxLength: { value: 12, message: "Invalid Phone Number" },
                minLength: { value: 10, message: "Invalid Phone Number" },
              })}
            />
          </div>
        </div>
        {errors.phoneNo && (
          <span className="-mt-1 text-[12px] text-yellow-100">
            {errors.phoneNo.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className={labelClass}>
          Message
        </label>
        <textarea
          name="message"
          id="message"
          cols="30"
          rows="7"
          placeholder="Tell us what you need."
          className={`${inputClass} min-h-[180px] resize-y`}
          {...register("message", { required: true })}
        />
        {errors.message && (
          <span className="-mt-1 text-[12px] text-yellow-100">
            Please enter your Message.
          </span>
        )}
      </div>

      <button
        disabled={loading}
        type="submit"
        className={`rounded-full bg-white px-6 py-4 text-center text-sm font-bold text-richblack-900 shadow-[0_18px_45px_rgba(255,255,255,0.14)] 
         ${
           !loading &&
           "transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_22px_55px_rgba(255,255,255,0.2)]"
         } disabled:bg-richblack-500`}
      >
        {loading ? "Sending..." : "Send message"}
      </button>
    </form>
  )
}

export default ContactUsForm
