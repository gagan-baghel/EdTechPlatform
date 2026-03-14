import React, { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { AiOutlineArrowRight } from "react-icons/ai"
import { useSelector } from "react-redux"
import { Link, useParams } from "@/ui/lib/router"

import Footer from "../components/common/Footer"
import { getCatalogaPageData } from "../services/operations/pageAndComponentData.js"
import { fetchCategoriesCached } from "../services/sharedData"
import Course_Card from "../components/core/Catalog/Course_Card"
import Error from "./Error"

const CourseSlider = dynamic(() => import("../components/core/Catalog/CourseSlider"), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full rounded-[28px] bg-richblack-800/60" />,
})

const heroImage =
  "https://plus.unsplash.com/premium_photo-1661284896386-0ff76f0b4ae0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTU4NDh8MHwxfHNlYXJjaHwxfHxQZXhlbHMlMjBjbGFzc3Jvb20lMjBzdHVkZW50cyUyMGxhcHRvcCUyMGVkdWNhdGlvbiUyMHBob3RvfGVufDB8fHx8MTc2NzQwNDYwM3ww&ixlib=rb-4.1.0&q=85"

function Catalog() {
  const { loading } = useSelector((state) => state.profile)
  const { catalogName } = useParams()
  const [active, setActive] = useState(1)
  const [catalogPageData, setCatalogPageData] = useState(null)
  const [latest, setLatest] = useState([])

  useEffect(() => {
    let ignore = false

    const getCategoryDetails = async () => {
      try {
        const categoryList = await fetchCategoriesCached()
        const categoryId =
          categoryList?.find(
            (ct) => ct.name.split(" ").join("-").toLowerCase() === catalogName
          )?._id || ""

        if (!categoryId || ignore) {
          setCatalogPageData({ success: false })
          setLatest([])
          return
        }

        const res = await getCatalogaPageData(categoryId)
        if (ignore) return

        setCatalogPageData(res)
        const arr = [...(res?.data?.selectedCategory?.courses || [])]
        setLatest(arr.reverse())
      } catch (_error) {
        if (!ignore) {
          setCatalogPageData({ success: false })
          setLatest([])
        }
      }
    }

    getCategoryDetails()

    return () => {
      ignore = true
    }
  }, [catalogName])

  if (loading || !catalogPageData) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center bg-richblack-900">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!loading && !catalogPageData.success) {
    return <Error />
  }

  const selectedCategory = catalogPageData?.data?.selectedCategory
  const differentCategory = catalogPageData?.data?.differentCategory
  const mostSellingCourses = catalogPageData?.data?.mostSellingCourses || []
  const featuredCourses = active === 1 ? selectedCategory?.courses : latest

  return (
    <div className="bg-richblack-900 text-white">
      <section className="relative overflow-hidden px-6 py-20 sm:px-8 lg:px-10 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(195,235,250,0.18),_transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-sm text-richblack-300">
              <Link to="/" className="transition hover:text-richblack-5">
                Home
              </Link>{" "}
              / Catalog /{" "}
              <span className="text-[#c3ebfa]">{selectedCategory?.name}</span>
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-tighter text-white sm:text-6xl lg:text-7xl">
              {selectedCategory?.name},{" "}
              <span className="bg-gradient-to-r from-[#c3ebfa] via-white to-[#fae27c] bg-clip-text text-transparent">
                curated cleanly.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-richblack-100 sm:text-lg">
              {selectedCategory?.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-richblack-100">
                {selectedCategory?.courses?.length || 0} courses
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-richblack-100">
                Related picks ready
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-richblack-800/70 shadow-[0_30px_90px_rgba(0,8,20,0.42)]">
            <Image
              src={heroImage}
              alt="Students collaborating with laptops"
              width={1200}
              height={900}
              className="h-[320px] w-full object-cover sm:h-[420px]"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="px-6 pb-6 sm:px-8 lg:px-10 lg:pb-10">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/10 bg-richblack-800/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-300">
                Featured
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Courses to get started
              </h2>
            </div>

            <div className="flex rounded-full border border-white/10 bg-richblack-900/70 p-1">
              <button
                type="button"
                onClick={() => setActive(1)}
                className={`rounded-full px-5 py-3 text-sm font-semibold transition-all ${
                  active === 1
                    ? "bg-white text-richblack-900"
                    : "text-richblack-300 hover:text-richblack-5"
                }`}
              >
                Popular
              </button>
              <button
                type="button"
                onClick={() => setActive(2)}
                className={`rounded-full px-5 py-3 text-sm font-semibold transition-all ${
                  active === 2
                    ? "bg-white text-richblack-900"
                    : "text-richblack-300 hover:text-richblack-5"
                }`}
              >
                New
              </button>
            </div>
          </div>

          <div className="mt-8">
            <CourseSlider Courses={featuredCourses} />
          </div>
        </div>
      </section>

      {differentCategory?.courses?.length ? (
        <section className="px-6 py-6 sm:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-white/10 bg-richblack-800/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-8">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-300">
              Related category
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Top courses in {differentCategory?.name}
            </h2>
            <div className="mt-8">
              <CourseSlider Courses={differentCategory?.courses} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-6 py-6 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/10 bg-richblack-800/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-richblack-300">
                Best sellers
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Frequently bought
              </h2>
            </div>
            <AiOutlineArrowRight className="hidden h-7 w-7 text-[#fae27c] sm:block" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {mostSellingCourses?.slice(0, 4).map((course, i) => (
              <Course_Card course={course} key={i} Height={"h-[260px]"} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Catalog
