import React from "react"
import { Link } from "@/ui/lib/router"
import { FooterLink2 } from "../../data/footer-links"
import { BrandMark } from "./Brand"

/**
 * Same columns as always, but every link now goes to a page that exists —
 * the old lists (Blog, Forums, Careers, "Chart Sheet", Help Center, three
 * policy pages) were all dead ends, and the policy pages are required before
 * Razorpay will enable live payments.
 */
interface FooterLink {
  label: string
  to: string
}

const CompanyLinks: FooterLink[] = [
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Refer & earn", to: "/dashboard/affiliate" },
]
const BottomFooter: FooterLink[] = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Refund Policy", to: "/refund-policy" },
]
const Resources: FooterLink[] = [
  { label: "Browse courses", to: "/search" },
  { label: "My learning", to: "/dashboard/my-learning" },
  { label: "Scorecard", to: "/dashboard/scorecard" },
  { label: "Enrolled courses", to: "/dashboard/enrolled-courses" },
]
const Plans: FooterLink[] = [
  { label: "Membership", to: "/subscribe" },
  { label: "For students", to: "/signup" },
  { label: "For organizations", to: "/dashboard/organizations" },
]
const Community: FooterLink[] = [
  { label: "Teach on IntelleCraft", to: "/signup" },
  { label: "Instructor dashboard", to: "/dashboard/instructor" },
]

const Footer: React.FC = () => {
  return (
    <div className="bg-richblack-800">
      <div className="flex lg:flex-row gap-8 items-center justify-between w-11/12 max-w-maxContent text-richblack-400 leading-6 mx-auto relative py-14">
        <div className="border-b w-[100%] flex flex-col lg:flex-row pb-5 border-richblack-700">
          {/* Section 1 */}
          <div className="lg:w-[50%] flex flex-wrap flex-row justify-between lg:border-r lg:border-richblack-700 pl-3 lg:pr-5 gap-3">
            <div className="w-[30%] flex flex-col gap-3 lg:w-[30%] mb-7 lg:pl-0">
              {/* The vector mark in the text colour — the PNG's opaque white
                  square showed as a box on the dark footer. */}
              <BrandMark className="h-12 w-12 text-richblack-5" />
              <h1 className="text-richblack-5 font-semibold text-[16px]">
                Company
              </h1>
              <div className="flex flex-col gap-2">
                {CompanyLinks.map((ele) => (
                  <div key={ele.to} className="text-[14px] hover:text-richblack-50 transition-all duration-200">
                    <Link to={ele.to}>{ele.label}</Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-[48%] lg:w-[30%] mb-7 lg:pl-0">
              <h1 className="text-richblack-5 font-semibold text-[16px]">
                Resources
              </h1>

              <div className="flex flex-col gap-2 mt-2">
                {Resources.map((ele) => (
                  <div key={ele.label} className="text-[14px] hover:text-richblack-50 transition-all duration-200">
                    <Link to={ele.to}>{ele.label}</Link>
                  </div>
                ))}
              </div>

              <h1 className="text-richblack-5 font-semibold text-[16px] mt-7">
                Support
              </h1>
              <div className="text-[14px] cursor-pointer hover:text-richblack-50 transition-all duration-200 mt-2">
                <Link to="/contact">Help &amp; contact</Link>
              </div>
            </div>

            <div className="w-[48%] lg:w-[30%] mb-7 lg:pl-0">
              <h1 className="text-richblack-5 font-semibold text-[16px]">
                Plans
              </h1>

              <div className="flex flex-col gap-2 mt-2">
                {Plans.map((ele) => (
                  <div key={ele.label} className="text-[14px] hover:text-richblack-50 transition-all duration-200">
                    <Link to={ele.to}>{ele.label}</Link>
                  </div>
                ))}
              </div>
              <h1 className="text-richblack-5 font-semibold text-[16px] mt-7">
                Community
              </h1>

              <div className="flex flex-col gap-2 mt-2">
                {Community.map((ele) => (
                  <div key={ele.label} className="text-[14px] hover:text-richblack-50 transition-all duration-200">
                    <Link to={ele.to}>{ele.label}</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="lg:w-[50%] flex flex-wrap flex-row justify-between pl-3 lg:pl-5 gap-3">
            {FooterLink2.map((ele, i) => {
              return (
                <div key={i} className="w-[48%] lg:w-[30%] mb-7 lg:pl-0">
                  <h1 className="text-richblack-5 font-semibold text-[16px]">
                    {ele.title}
                  </h1>
                  <div className="flex flex-col gap-2 mt-2">
                    {ele.links.map((link, index) => {
                      return (
                        <div
                          key={index}
                          className="text-[14px] cursor-pointer hover:text-richblack-50 transition-all duration-200"
                        >
                          <Link to={link.link}>{link.title}</Link>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between w-11/12 max-w-maxContent text-richblack-400 mx-auto  pb-14 text-sm">
        <div className="flex justify-between lg:items-start items-center flex-col lg:flex-row gap-3 w-full">
          <div className="flex flex-row">
            {BottomFooter.map((ele, i) => (
              <div
                key={ele.to}
                className={`${
                  BottomFooter.length - 1 === i ? "" : "border-r border-richblack-700"
                } px-3 hover:text-richblack-50 transition-all duration-200`}
              >
                <Link to={ele.to}>{ele.label}</Link>
              </div>
            ))}
          </div>

          <div className="text-center">© {new Date().getFullYear()} IntelleCraft</div>
        </div>
      </div>
    </div>
  )
}

export default Footer
