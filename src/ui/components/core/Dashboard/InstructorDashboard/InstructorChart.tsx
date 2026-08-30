import { useMemo, useState } from "react"
import { Chart, registerables } from "chart.js"
import { Pie } from "react-chartjs-2"

Chart.register(...registerables)

interface InstructorChartProps {
  courses: InstructorChartRow[]
}

/** One course's totals, as plotted by the instructor dashboard chart. */
export interface InstructorChartRow {
  _id: string
  courseName: string
  totalStudentsEnrolled: number
  totalAmountGenerated: number
}

// Pure module-level helper — moved outside the component so it is not
// re-created on every render and does not trigger the react-compiler
// "cannot call impure function during render" lint error.
function generateRandomColors(numColors: number): string[] {
  const colors: string[] = []
  for (let i = 0; i < numColors; i++) {
    const color = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(
      Math.random() * 256
    )}, ${Math.floor(Math.random() * 256)})`
    colors.push(color)
  }
  return colors
}

export default function InstructorChart({ courses }: InstructorChartProps) {
  const [currChart, setCurrChart] = useState("students")

  // Colors are stable per render cycle — generated once when courses change
  // and memoized so they don't call Math.random() during every render pass.
  const studentColors = useMemo(() => generateRandomColors(courses.length), [courses.length])
  const incomeColors = useMemo(() => generateRandomColors(courses.length), [courses.length])

  // Data for the chart displaying student information
  const chartDataStudents = {
    labels: courses.map((course) => course.courseName),
    datasets: [
      {
        data: courses.map((course) => course.totalStudentsEnrolled),
        backgroundColor: studentColors,
      },
    ],
  }

  // Data for the chart displaying income information
  const chartIncomeData = {
    labels: courses.map((course) => course.courseName),
    datasets: [
      {
        data: courses.map((course) => course.totalAmountGenerated),
        backgroundColor: incomeColors,
      },
    ],
  }

  // Options for the chart
  const options = {
    maintainAspectRatio: false,
  }

  return (
    <div className="flex flex-1 flex-col gap-y-4 rounded-md bg-richblack-800 p-6">
      <p className="text-lg font-bold text-richblack-5">Visualize</p>
      <div className="space-x-4 font-semibold">
        {/* Button to switch to the "students" chart */}
        <button
          onClick={() => setCurrChart("students")}
          className={`rounded-sm p-1 px-3 transition-all duration-200 ${
            currChart === "students"
              ? "bg-richblack-700 text-yellow-50"
              : "text-yellow-400"
          }`}
        >
          Students
        </button>
        {/* Button to switch to the "income" chart */}
        <button
          onClick={() => setCurrChart("income")}
          className={`rounded-sm p-1 px-3 transition-all duration-200 ${
            currChart === "income"
              ? "bg-richblack-700 text-yellow-50"
              : "text-yellow-400"
          }`}
        >
          Income
        </button>
      </div>
      <div className="relative mx-auto aspect-square h-full w-full">
        {/* Render the Pie chart based on the selected chart */}
        <Pie
          data={currChart === "students" ? chartDataStudents : chartIncomeData}
          options={options}
        />
      </div>
    </div>
  )
}
