"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container">
      <div className="empty">
        <h1>Something interrupted the conversation.</h1>
        <p className="muted">
          Please try again. Refreshing the page clears local demo surveys and
          form data.
        </p>
        <button type="button" className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
