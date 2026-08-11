import React from "react"

// The 22 bare `<div className="spinner">` usages across the app rendered
// a loading state with no role="status" and no aria-live — every async
// state change on screen reader/assistive tech was announced to nobody.
// Same CSS class (.spinner, globals.css), now with the missing semantics.
export default function Spinner(): React.JSX.Element {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
    </div>
  )
}
