export default function IconBtn({
  text,
  onClick,
  children,
  disabled,
  outline = false,
  customClasses,
  // Defaults to "button" — without this an IconBtn inside a form submits it.
  type = "button",
  ...rest
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center ${
        outline ? "border border-yellow-50 bg-transparent" : "bg-yellow-50"
      } cursor-pointer gap-x-2 rounded-md py-2 px-5 font-semibold text-richblack-900 transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-50 focus-visible:ring-offset-2 focus-visible:ring-offset-richblack-900 disabled:cursor-not-allowed disabled:opacity-60 ${customClasses}`}
      type={type}
      {...rest}
    >
      {children ? (
        <>
          <span className={`${outline && "text-yellow-50"}`}>{text}</span>
          {children}
        </>
      ) : (
        text
      )}
    </button>
  )
}
