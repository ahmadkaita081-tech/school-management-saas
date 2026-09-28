"use client";

import Link from "next/link";

/**
 * Root failure screen.
 *
 * This replaces the whole document when the layout itself fails, so it
 * cannot rely on shared stylesheets — everything here is inline and
 * dependency-free by necessity.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f8fa", color: "#0b1524" }}>
        <main style={{ maxWidth: "32rem", margin: "4rem auto", padding: "2rem", background: "#ffffff", borderRadius: "16px", border: "1px solid #dde2e9" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>Horizons could not start this page</h1>
          <p style={{ lineHeight: 1.6, color: "#253449" }}>
            Something failed while loading. Your data is safe — try again, or return to the home page.
          </p>
          <p style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ minHeight: "44px", padding: "0 1.25rem", borderRadius: "12px", border: 0, background: "#1a56db", color: "#fff", fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 1.25rem", borderRadius: "12px", border: "1px solid #7a8394", color: "#0b1524", fontWeight: 600, textDecoration: "none" }}
            >
              Home page
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
