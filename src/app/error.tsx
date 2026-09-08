"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container">
      <div className="empty">
        <h1>Something interrupted the conversation.</h1>
        <p className="muted">
          Please try again. Saved survey metadata remains in your browser
          workspace; unsent form text is cleared when you leave this page.
        </p>
        <button type="button" className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
