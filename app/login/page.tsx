"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, GraduationCap, PlayCircle, UserRound } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Wordmark } from "@/components/Logo";
import { DemoBadge } from "@/components/ui";
import { DEMO_LEARNER_NAME } from "@/lib/demoSeed";
import { loadState } from "@/lib/storage";
import { store } from "@/lib/store";

/** Only allow redirects to pages inside the app. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function Entry() {
  const { ready, state, actions } = useApp();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Look in the live slot, even if the demo learner is currently loaded.
  const liveProfile = ready ? (state.mode === "live" ? state.profile : loadState("live").profile) : null;
  const existing = liveProfile?.role === "learner" && liveProfile.onboarded ? liveProfile : null;

  const continueExisting = () => {
    store.switchMode("live");
    router.push(next ?? "/dashboard");
  };

  const enterLearner = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Type a name so we know what to call you.");
      return;
    }
    actions.enterAsLearner(name);
    const profile = store.getSnapshot().profile;
    router.push(profile?.onboarded ? next ?? "/dashboard" : "/onboarding");
  };

  const enterEducator = () => {
    actions.enterAsEducator();
    router.push("/educator");
  };

  const startDemo = () => {
    actions.startDemo();
    router.push(next ?? "/dashboard");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
      <header>
        <Link href="/" className="inline-block rounded-lg">
          <Wordmark />
        </Link>
      </header>

      <main id="main" className="flex flex-1 flex-col justify-center py-10">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Enter Quantum Nexus</h1>
        <p className="mt-3 max-w-[48ch] text-lg text-mute">
          Your journey from confusion to quantum clarity starts here.
        </p>

        <div className="mt-9 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Live interaction */}
          <section aria-labelledby="live-title" className="panel-lead p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="live-title" className="text-xl font-semibold">
                Live Interaction
              </h2>
              <span className="tag border-ket/40 bg-ket/10 text-ket">Your own data</span>
            </div>
            <p className="mt-1.5 text-mute">
              Use the product for real. Every number you see comes from your own clicks.
            </p>

            {existing && (
              <button
                type="button"
                onClick={continueExisting}
                className="btn btn-primary mt-5 w-full justify-between px-5 py-3 text-base"
              >
                Continue as {existing.name}
                <ArrowRight size={18} aria-hidden />
              </button>
            )}

            {asking ? (
              <form onSubmit={enterLearner} className="mt-5" noValidate>
                <label htmlFor="learner-name" className="block text-base font-semibold">
                  What&apos;s your name?
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    id="learner-name"
                    autoFocus
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setError("");
                    }}
                    maxLength={40}
                    autoComplete="given-name"
                    placeholder="e.g. Priya"
                    aria-invalid={!!error}
                    aria-describedby={error ? "name-error" : undefined}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-void/70 px-4 py-3 text-base placeholder:text-dim"
                  />
                  <button type="submit" className="btn btn-primary px-5">
                    Continue
                    <ArrowRight size={17} aria-hidden />
                  </button>
                </div>
                {error && (
                  <p id="name-error" role="alert" className="mt-2 text-sm text-warn">
                    {error}
                  </p>
                )}
                <p className="mt-2 text-sm text-dim">No email. No password. Saved only in this browser.</p>
              </form>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAsking(true)}
                  className={`btn justify-start px-4 py-3.5 text-base ${existing ? "btn-secondary" : "btn-primary"}`}
                >
                  <UserRound size={18} aria-hidden />
                  {existing ? "Continue as a new learner" : "Continue as Learner"}
                </button>
                <button
                  type="button"
                  onClick={enterEducator}
                  className="btn btn-secondary justify-start px-4 py-3.5 text-base"
                >
                  <GraduationCap size={18} aria-hidden />
                  Continue as Educator
                </button>
              </div>
            )}
          </section>

          {/* Demo */}
          <section aria-labelledby="demo-title" className="panel flex flex-col p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="demo-title" className="text-xl font-semibold">
                Start Demo
              </h2>
              <DemoBadge />
            </div>
            <p className="mt-1.5 text-mute">
              Short on time? Load {DEMO_LEARNER_NAME}, an illustrative learner who is midway through
              Superposition, and see every screen filled in.
            </p>
            <p className="mt-2 text-sm text-dim">
              Demo records are sample data, kept separate from live interaction and labelled
              wherever they appear.
            </p>
            <button
              type="button"
              onClick={startDemo}
              className="btn btn-secondary mt-5 justify-start px-4 py-3.5 text-base"
            >
              <PlayCircle size={18} aria-hidden />
              Use Demo Learner
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Entry />
    </Suspense>
  );
}
