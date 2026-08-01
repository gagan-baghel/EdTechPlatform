"use client"

// Last-resort boundary: catches errors in the root layout itself, where the
// normal error.jsx cannot render because the layout never mounted.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ background: "#000814", color: "#F1F2FF", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ maxWidth: "32rem" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>
              IntelleCraft ran into a problem
            </h1>
            <p style={{ marginTop: "0.75rem", color: "#838894" }}>
              Please reload the page. If this keeps happening, contact support.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: "1.5rem", padding: "0.75rem 1.5rem", borderRadius: "0.375rem",
                background: "#FFD60A", color: "#000814", fontWeight: 600,
                border: "none", cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
