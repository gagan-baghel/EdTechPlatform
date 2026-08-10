import { formatDate } from "../../../ui/services/formatDate"

export const metadata = {
  title: "Certificate Verification",
  robots: { index: false, follow: false },
}

async function getCertificate(certificateNumber) {
  try {
    const { connectDB } = await import("../../../api/config/connectDB")
    const Certificate = (await import("../../../api/models/Certificate")).default
    await connectDB()

    return await Certificate.findOne({ certificateNumber })
      .populate("user", "firstName lastName")
      .populate("course", "courseName")
      .lean()
  } catch (error) {
    console.error("getCertificate failed", error)
    return null
  }
}

export default async function CertificateVerificationPage({ params }) {
  const certificate = await getCertificate(params.certificateNumber)

  if (!certificate) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900 px-4 text-center text-white">
        <div>
          <h1 className="text-2xl font-semibold">Certificate not found</h1>
          <p className="mt-2 text-richblack-300">
            No certificate exists with the number &ldquo;{params.certificateNumber}&rdquo;.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900 px-4 py-12 text-white">
      <div className="w-full max-w-2xl rounded-lg border-4 border-yellow-50 bg-richblack-800 p-12 text-center">
        <p className="text-sm uppercase tracking-widest text-richblack-300">Certificate of Completion</p>
        <h1 className="mt-4 text-3xl font-bold text-richblack-5">
          {certificate.user.firstName} {certificate.user.lastName}
        </h1>
        <p className="mt-4 text-richblack-200">has successfully completed</p>
        <p className="mt-2 text-2xl font-semibold text-yellow-50">{certificate.course.courseName}</p>
        <p className="mt-8 text-sm text-richblack-400">
          Issued {formatDate(certificate.issuedAt)} · Certificate No. {certificate.certificateNumber}
        </p>
        <p className="mt-1 text-xs text-richblack-500">Verified by IntelleCraft</p>
      </div>
    </div>
  )
}
