import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
      <div className="panel p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-white/[0.04] text-ket">
          <Compass size={22} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">This page does not exist</h1>
        <p className="mt-2 leading-relaxed text-mute">
          The address may be mistyped, or the page may have moved. Nothing is wrong with your progress.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            Go to dashboard
          </Link>
          <Link href="/learn" className="btn btn-secondary">
            Open Learn
          </Link>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
