import React from "react"
import Template from "../components/core/Auth/Template"

function Signup() {
  return (
    <Template
      eyebrow="Learn or teach"
      title={
        <>
          Start your{" "}
          <span className="brand-gradient">
            IntelleCraft workspace.
          </span>
        </>
      }
      subtitle="Create your account."
      image="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2000&auto=format&fit=crop"
      formType="signup"
    />
  )
}

export default Signup
