"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

/**
 * Shown when a page fails unexpectedly. The learner sees what to do next —
 * never a stack trace. Saved progress is not affected by a display error.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main id="main" className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
      <div role="alert" className="panel p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-warn/40 bg-warn/10 text-warn">
          <TriangleAlert size={22} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">This page could not be shown</h1>
        <p className="mt-2 leading-relaxed text-mute">
          Something went wrong while drawing this page. Your saved progress is safe — it is stored separately in this
          browser. Try again, or go back to your dashboard.
        </p>
        {error.digest && <p className="ket mt-3 text-xs text-dim">Reference: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => retry()} className="btn btn-primary">
            <RotateCcw size={16} aria-hidden />
            Try again
          </button>
          <Link href="/dashboard" className="btn btn-secondary">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
