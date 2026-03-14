import { FooterLink2 } from "../../data/footer-links";
import { Link, useLocation } from "@/ui/lib/router";
import { FaFacebook, FaGoogle, FaTwitter, FaYoutube } from "react-icons/fa";

const socialIcons = [FaFacebook, FaGoogle, FaTwitter, FaYoutube];

const Footer = () => {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const sectionBorderClass = isHomePage ? "border-white/10" : "border-richblack-700";
  const footerLinkClass = isHomePage
    ? "!text-richblack-100 transition-colors duration-200 hover:!text-white"
    : "text-richblack-400 transition-colors duration-200 hover:text-richblack-5";
  const eyebrowTextClass = isHomePage ? "!text-richblack-300" : "text-richblack-400";
  const bodyTextClass = isHomePage ? "!text-richblack-100" : "text-richblack-300";
  const mutedTextClass = isHomePage ? "!text-richblack-300" : "text-richblack-400";
  const socialIconClass = isHomePage
    ? "border-white/10 bg-white/5 !text-richblack-25"
    : "border-richblack-700 bg-richblack-700 text-richblack-100";

  return (
    <footer className={isHomePage ? "bg-[#08111f] text-richblack-100" : "bg-richblack-800 text-richblack-300"}>
      <div
        className={`mx-auto ${
          isHomePage ? "w-11/12 max-w-[1280px] py-16" : "w-11/12 max-w-maxContent py-14"
        }`}
      >
        <div
          className={`grid gap-12 border-y ${sectionBorderClass} py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]`}
        >
          <div className="max-w-md space-y-6">
            <Link to="/" className="inline-flex items-center gap-4">
              <div className="rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
                <img
                  src="/logo.png"
                  alt="IntelleCraft logo"
                  width={44}
                  height={44}
                  className="h-11 w-11 object-contain invert"
                />
              </div>
              <div>
                <span className="block text-2xl font-semibold tracking-tight text-white">
                  IntelleCraft
                </span>
                <span className={`text-sm ${eyebrowTextClass}`}>
                  Connected tools for modern education teams
                </span>
              </div>
            </Link>

            <p className={`text-base leading-7 ${bodyTextClass}`}>
              Bring admissions, scheduling, parent communication, and student performance into one clean platform built for day-to-day school operations.
            </p>

            <div className="flex items-center gap-3">
              {socialIcons.map((Icon, index) => (
                <span
                  key={index}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${socialIconClass}`}
                >
                  <Icon className="text-lg" />
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {FooterLink2.map((section) => (
              <div key={section.title} className="space-y-4">
                <h2 className={isHomePage ? "text-lg font-semibold text-white" : "text-lg font-semibold text-richblack-5"}>
                  {section.title}
                </h2>
                <div className="flex flex-col gap-3">
                  {section.links.map((link) => (
                    <Link key={link.title} to={link.link} className={footerLinkClass}>
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`flex flex-col gap-3 pt-6 text-sm md:flex-row md:items-center md:justify-between ${mutedTextClass}`}
        >
          <p>© 2026 IntelleCraft. All rights reserved.</p>
          <p>Built for admissions, finance, and classroom operations.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
