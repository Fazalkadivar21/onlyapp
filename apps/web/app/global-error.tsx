"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global app failure", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", background: "#f4f4f5", padding: 24, color: "#09090b", fontFamily: "system-ui, sans-serif" }}>
          <section style={{ margin: "15vh auto", maxWidth: 560, borderRadius: 28, background: "white", padding: 32, textAlign: "center", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <p style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>Fatal error</p>
            <h1 style={{ marginTop: 12, fontSize: 30, lineHeight: 1.15 }}>mark-1 failed to render.</h1>
            <p style={{ marginTop: 12, color: "#52525b", fontSize: 14, lineHeight: 1.6 }}>Retry the app shell. Error details are kept out of the UI to avoid exposing workspace data.</p>
            <button type="button" onClick={reset} style={{ marginTop: 24, border: 0, borderRadius: 16, background: "#09090b", color: "white", padding: "12px 20px", fontWeight: 600 }}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
