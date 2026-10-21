"use client";

/** Shown when the root layout itself fails. Keeps the page usable instead of a bare 500. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f1e9d6", color: "#1d2a24", margin: 0 }}>
        <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
          <p style={{ color: "#55594a" }}>Please try again in a moment. If it keeps happening, let us know.</p>
          {error.digest ? <p style={{ fontSize: 12, color: "#55594a" }}>Reference {error.digest}</p> : null}
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, background: "#0e4b3b", color: "#faf5e8", fontWeight: 600 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
