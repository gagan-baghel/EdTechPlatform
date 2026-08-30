import React from "react"
import Template from "../components/core/Auth/Template"

function Signup() {
  return (
    <Template
      eyebrow="Launch your school OS"
      title={
        <>
          Start your{" "}
          <span className="brand-gradient">
            IntelleCraft workspace.
          </span>
        </>
      }
      subtitle="Create your account."
      image="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2622&auto=format&fit=crop"
      formType="signup"
    />
  )
}

export default Signup
