import Template from "../components/core/Auth/Template"

function Login() {
  return (
    <Template
      eyebrow="Secure campus access"
      title={
        <>
          Welcome back to{" "}
          <span className="bg-gradient-to-r from-[#c3ebfa] via-white to-[#fae27c] bg-clip-text text-transparent">
            IntelleCraft.
          </span>
        </>
      }
      subtitle="Sign in."
      image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop"
      formType="login"
    />
  )
}

export default Login
