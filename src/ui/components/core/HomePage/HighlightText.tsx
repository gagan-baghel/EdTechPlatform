import React from "react"

interface HighlightTextProps {
  text: string
}

const HighlightText: React.FC<HighlightTextProps> = ({ text }) => {
  return (
    <span className="font-bold text-richblue-200">
      {" "}
      {text}
    </span>
  )
}

export default HighlightText
