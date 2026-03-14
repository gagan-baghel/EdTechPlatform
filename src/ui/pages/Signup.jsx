import Template from "../components/core/Auth/Template"

function Signup() {
  return (
    <Template
      eyebrow="Launch your school OS"
      title={
        <>
          Start your{" "}
          <span className="bg-gradient-to-r from-[#c3ebfa] via-white to-[#fae27c] bg-clip-text text-transparent">
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
