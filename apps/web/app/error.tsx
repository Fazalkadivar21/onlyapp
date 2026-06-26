"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App route failed", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950">
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">Something broke</p>
          <h1 className="mt-3 text-3xl font-semibold">This workspace view failed to load.</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Try again. If it keeps happening, check the latest integration/API response rather than refreshing external apps.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={reset} className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">
              Try again
            </button>
            <a href="/" className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Go home
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
