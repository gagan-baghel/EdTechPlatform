import React from "react"
import Template from "../components/core/Auth/Template"

function Login() {
  return (
    <Template
      eyebrow="Welcome back"
      title={
        <>
          Welcome back to{" "}
          <span className="brand-gradient">
            IntelleCraft.
          </span>
        </>
      }
      subtitle="Sign in."
      image="https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=2000&auto=format&fit=crop"
      formType="login"
    />
  )
}

export default Login
