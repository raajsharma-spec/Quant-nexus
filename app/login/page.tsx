"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { OrbitVisual } from "@/components/entry/OrbitVisual";
import { ParticleField } from "@/components/entry/ParticleField";
import { Wordmark } from "@/components/Logo";
import { DEMO_LEARNER_NAME } from "@/lib/demoSeed";
import { loadState } from "@/lib/storage";
import { store } from "@/lib/store";

/** Only allow redirects to pages inside the app. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

/** Learn: a wire with thirteen stage marks, the first few lit. */
function LearnGlyph() {
  return (
    <svg viewBox="0 0 132 36" className="path-glyph h-9 w-[8.25rem] shrink-0" aria-hidden>
      <line x1="2" y1="18" x2="130" y2="18" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
      {Array.from({ length: 13 }, (_, i) => (
        <rect
          key={i}
          x={4 + i * 9.7}
          y={i < 5 ? 10 : 13}
          width="5"
          height={i < 5 ? 16 : 10}
          rx="1.5"
          fill="currentColor"
          fillOpacity={i < 5 ? 0.95 : 0.28}
        />
      ))}
      <circle className="glyph-pulse" cx="4" cy="18" r="2.6" fill="#e9edfb" style={{ ["--travel" as string]: "120px" }} />
    </svg>
  );
}

/** Explore: a tiny two-qubit circuit. */
function ExploreGlyph() {
  return (
    <svg viewBox="0 0 132 36" className="path-glyph h-9 w-[8.25rem] shrink-0" aria-hidden>
      <line x1="2" y1="10" x2="130" y2="10" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
      <line x1="2" y1="27" x2="130" y2="27" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
      <rect x="20" y="2" width="16" height="16" rx="4" fill="#0b1124" stroke="currentColor" strokeWidth="1.2" />
      <path d="M25 6v8M31 6v8M25 10h6" stroke="currentColor" strokeWidth="1.2" />
      <line x1="64" y1="10" x2="64" y2="27" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="64" cy="10" r="3" fill="currentColor" />
      <circle cx="64" cy="27" r="6" fill="#0b1124" stroke="currentColor" strokeWidth="1.2" />
      <path d="M64 23v8M60 27h8" stroke="currentColor" strokeWidth="1.2" />
      <rect x="96" y="2" width="16" height="16" rx="4" fill="#0b1124" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" />
      <path d="M100 13a4 4 0 0 1 8 0M104 13l3 -5" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle className="glyph-pulse" cx="4" cy="10" r="2.6" fill="#e9edfb" style={{ ["--travel" as string]: "120px" }} />
    </svg>
  );
}

/** Teach: a small class chart — one bar per learner against a threshold line. */
function TeachGlyph() {
  const bars = [14, 22, 9, 26, 18, 24, 12];
  return (
    <svg viewBox="0 0 132 36" className="path-glyph h-9 w-[8.25rem] shrink-0" aria-hidden>
      {bars.map((height, i) => (
        <rect key={i} x={4 + i * 17} y={34 - height} width="10" height={height} rx="2" fill="currentColor" fillOpacity={height >= 22 ? 0.95 : 0.35} />
      ))}
      <line x1="0" y1="11" x2="124" y2="11" stroke="#e9edfb" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 4" />
    </svg>
  );
}

function Entry() {
  const { ready, state, actions } = useApp();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  /** Where a learner lands after entering: the page that sent them here, or the lab when they chose Explore. */
  const [destination, setDestination] = useState<string | null>(next);
  const nameInput = useRef<HTMLInputElement>(null);

  // Look in the live slot, even if the demo learner is currently loaded.
  const liveProfile = ready ? (state.mode === "live" ? state.profile : loadState("live").profile) : null;
  const existing = liveProfile?.role === "learner" && liveProfile.onboarded ? liveProfile : null;

  const continueExisting = (to: string | null = next) => {
    store.switchMode("live");
    router.push(to ?? "/dashboard");
  };

  const enterLearner = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Type a name so we know what to call you.");
      return;
    }
    actions.enterAsLearner(name);
    const profile = store.getSnapshot().profile;
    if (profile?.onboarded) router.push(destination ?? "/dashboard");
    else router.push(destination ? `/onboarding?next=${encodeURIComponent(destination)}` : "/onboarding");
  };

  const askName = (to: string | null) => {
    setDestination(to);
    setAsking(true);
    window.setTimeout(() => nameInput.current?.focus(), 0);
  };

  const exploreLab = () => {
    if (existing) continueExisting("/lab");
    else askName("/lab");
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
    <div className="relative min-h-screen overflow-x-clip">
      <ParticleField />
      <div className="relative z-[1] mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-5 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-block rounded-lg">
            <Wordmark compact />
          </Link>
          <Link href="/" className="rounded text-sm text-mute hover:text-ink">
            About the platform
          </Link>
        </header>

        <main id="main" className="flex flex-1 flex-col justify-center">
          {/* Hero */}
          <section className="grid items-center gap-x-10 gap-y-2 pt-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-0">
            <div className="animate-rise">
              <h1 className="display text-[2.7rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
                From confusion
                <br />
                to quantum clarity
              </h1>
              <p className="mt-4 max-w-[46ch] text-[1.0625rem] leading-relaxed text-mute sm:text-lg">
                Quantum Nexus teaches quantum computing by experiment. Predict what a circuit will do, run it, then
                explain why.
              </p>
              <p className="ket mt-4 text-sm text-dim" aria-hidden>
                |ψ⟩ = α|confusion⟩ + β|clarity⟩ <span className="text-ket">→ measure → |clarity⟩</span>
              </p>
            </div>
            <OrbitVisual className="mx-auto w-full max-w-[14rem] sm:max-w-[19rem] lg:max-w-[23rem]" />
          </section>

          {/* Paths */}
          <section aria-labelledby="paths-title" className="mt-2 lg:-mt-4">
            <h2 id="paths-title" className="display text-2xl sm:text-[1.75rem]">
              Choose your path
            </h2>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
              {/* Learn */}
              <div className="path-card p-5 sm:p-6" style={{ ["--path" as string]: "#5ad7f0" }}>
                <LearnGlyph />
                <h3 className="mt-4 text-xl font-semibold">Learn</h3>
                <p className="mt-1 max-w-[44ch] text-[0.9375rem] leading-relaxed text-mute">
                  Thirteen short stages per concept, from first idea to mastery. Your progress is saved in this
                  browser.
                </p>

                <div className="mt-auto pt-5">
                  {existing && (
                    <button
                      type="button"
                      onClick={() => continueExisting()}
                      className="btn btn-primary mb-3 w-full justify-between px-5 py-3 text-base"
                    >
                      Continue as {existing.name}
                      <ArrowRight size={18} aria-hidden />
                    </button>
                  )}

                  {asking ? (
                    <form onSubmit={enterLearner} noValidate>
                      <label htmlFor="learner-name" className="block font-semibold">
                        What&apos;s your name?
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          id="learner-name"
                          ref={nameInput}
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
                      <p className="mt-2 text-sm text-dim">
                        No email. No password.{destination === "/lab" ? " You will land in the Quantum Lab." : ""}
                      </p>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => askName(next)}
                      className={`btn w-full justify-between px-5 py-3 text-base ${existing ? "btn-secondary" : "btn-primary"}`}
                    >
                      {existing ? "Continue as a new learner" : "Continue as Learner"}
                      <ArrowRight size={18} aria-hidden />
                    </button>
                  )}
                </div>
              </div>

              {/* Explore */}
              <div className="path-card p-5 sm:p-6" style={{ ["--path" as string]: "#a892ff" }}>
                <ExploreGlyph />
                <h3 className="mt-4 text-xl font-semibold">Explore</h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-mute">
                  Go straight to the Quantum Lab. Build a circuit, run it, and read it as Qiskit, Cirq, PennyLane or
                  OpenQASM.
                </p>
                <div className="mt-auto pt-5">
                  <button type="button" onClick={exploreLab} className="btn btn-secondary w-full justify-between px-5 py-3 text-base">
                    Explore the Quantum Lab
                    <ArrowRight size={18} aria-hidden />
                  </button>
                </div>
              </div>

              {/* Teach */}
              <div className="path-card p-5 sm:p-6" style={{ ["--path" as string]: "#6394ff" }}>
                <TeachGlyph />
                <h3 className="mt-4 text-xl font-semibold">Teach</h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-mute">
                  The instructor dashboard: each learner&apos;s progress, weak areas and possible misconceptions.
                </p>
                <div className="mt-auto pt-5">
                  <button type="button" onClick={enterEducator} className="btn btn-secondary w-full justify-between px-5 py-3 text-base">
                    Continue as Educator
                    <ArrowRight size={18} aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            {/* Demo: a smaller, secondary way in */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-line bg-white/[0.025] px-4 py-3 sm:px-5">
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-mute">
                <span className="font-semibold text-ink">Short on time?</span> Load {DEMO_LEARNER_NAME}, a sample
                learner midway through Superposition, and see every screen filled in. Sample records are always
                labelled.
              </p>
              <button type="button" onClick={startDemo} className="btn btn-ghost border border-line px-4 py-2 text-sm">
                <PlayCircle size={16} aria-hidden />
                Use Demo Learner
              </button>
            </div>
          </section>
        </main>

        <footer className="mt-5 text-xs text-dim">
          Smart India Hackathon 2026, problem statement 26140. Circuits run in a simulator.
        </footer>
      </div>
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
