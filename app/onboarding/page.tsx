"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Wordmark } from "@/components/Logo";
import type { PythonLevel } from "@/lib/storage";
import type { Lang } from "@/lib/types";

/** The one prerequisite: how much Python the learner already reads. It decides the recommended first stop. */
const PYTHON_OPTIONS: Array<{ value: PythonLevel; title: string; body: string }> = [
  { value: "beginner", title: "I'm new to Python", body: "I have not written Python before, or only a little." },
  { value: "basics", title: "I know the basics", body: "Variables, if statements and loops look familiar." },
  { value: "comfortable", title: "I'm comfortable", body: "I can write functions and work with lists." },
];

/** Only allow redirects to pages inside the app. */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

const LANGUAGE_OPTIONS: Array<{ value: Lang; title: string; sample: string }> = [
  {
    value: "en",
    title: "English",
    sample: "“The Hadamard gate creates a superposition of |0⟩ and |1⟩.”",
  },
  {
    value: "hi",
    title: "English + Hinglish",
    sample:
      "“Hadamard gate ek qubit ko superposition state mein le ja sakta hai, jahan measurement ke time |0⟩ ya |1⟩ milne ki probability hoti hai.”",
  },
];

function Onboarding() {
  const { ready, state, actions } = useApp();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [step, setStep] = useState(0);
  const [python, setPython] = useState<PythonLevel | null>(null);
  const [language, setLanguage] = useState<Lang | null>(null);

  const profile = state.profile;
  useEffect(() => {
    if (ready && !profile) router.replace("/login");
  }, [ready, profile, router]);

  if (!ready || !profile) return null;

  const finish = (href: string) => {
    if (!language || !python) return;
    actions.completeOnboarding(language, python);
    router.push(href);
  };

  const hinglish = language === "hi";
  const beginner = python === "beginner";
  const threshold = state.settings.masteryThreshold;
  const points = hinglish
    ? [
        "Har concept 13 chhote stages mein hai: Discover se Next Challenge tak.",
        `Next stage tab open hota hai jab current stage ${threshold}% par pahunche. Jitni baar chaho retry karo.`,
        "Circuit run karne se pehle aap hamesha predict karte ho, phir result explain karte ho.",
        "Aapka level hum poochhte nahi — woh aapke kaam se samjha jaata hai aur difficulty usi se adjust hoti hai.",
      ]
    : [
        "Every concept is 13 short stages, from Discover to Next Challenge.",
        `The next stage opens when the current one reaches ${threshold}%. Retry as often as you like.`,
        "You always predict before a circuit runs, then explain the result in your own words.",
        "We never ask your level — it is worked out from what you do, and the difficulty adjusts to it.",
      ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Wordmark compact />
        <p className="text-sm text-mute" aria-live="polite">
          Step {step + 1} of 3
        </p>
      </header>

      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={3}
        className="mt-5 grid grid-cols-3 gap-2"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 rounded-full ${i <= step ? "bg-ket" : "bg-white/10"}`} />
        ))}
      </div>

      <main id="main" className="flex flex-1 flex-col justify-center py-10">
        {step === 0 && (
          <section aria-labelledby="python-title" className="animate-rise">
            <p className="text-mute">Hi {profile.name}. One prerequisite check before you start.</p>
            <h1 id="python-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              How comfortable are you with Python?
            </h1>
            <p className="mt-2 max-w-[60ch] text-mute">
              Quantum circuits are often written as Python code. Your answer only decides where we suggest you begin.
              Your quantum level is never asked: it is worked out from what you do.
            </p>
            <div role="radiogroup" aria-labelledby="python-title" className="mt-7 grid gap-3">
              {PYTHON_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.value}
                  selected={python === option.value}
                  onSelect={() => setPython(option.value)}
                  title={option.title}
                  body={option.body}
                />
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="language-title" className="animate-rise">
            <h1 id="language-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              How would you like to learn?
            </h1>
            <p className="mt-2 max-w-[60ch] text-mute">
              Hinglish is conversational, not a Hindi translation. Quantum terms such as qubit,
              superposition and measurement stay exactly the same. You can switch any time.
            </p>
            <div role="radiogroup" aria-labelledby="language-title" className="mt-7 grid gap-3">
              {LANGUAGE_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.value}
                  selected={language === option.value}
                  onSelect={() => setLanguage(option.value)}
                  title={option.title}
                  body={option.sample}
                />
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="start-title" className="animate-rise">
            <p className="text-mute">{hinglish ? "Aap ready ho." : "You are ready."}</p>
            <h1 id="start-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {hinglish ? "Quantum Nexus aise kaam karta hai" : "How Quantum Nexus works"}
            </h1>
            <ul className="mt-5 flex max-w-[62ch] flex-col gap-3">
              {points.map((point) => (
                <li key={point} className="flex gap-3 text-lg leading-relaxed text-ink/90">
                  <Check size={20} className="mt-1 shrink-0 text-ok" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className="mt-5 max-w-[62ch] rounded-xl border border-line bg-white/[0.03] px-4 py-3 leading-relaxed text-ink/90">
              {beginner
                ? hinglish
                  ? "Aapne bataya ki Python aapke liye naya hai. Pehle chhota Python Foundations warm-up recommended hai — variables, conditions, loops, functions aur lists. Ise kabhi bhi skip kar sakte ho."
                  : "You said Python is new to you. We recommend the short Python Foundations warm-up first: variables, conditions, loops, functions and lists. You can skip it at any time."
                : hinglish
                  ? "Aapko Python aata hai, isliye seedha qubits se start karo. Python Foundations Learn page par refresher ke liye available rahega."
                  : "You already read Python, so start straight with qubits. Python Foundations stays on the Learn page if you want a refresher."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {next && (
                <button type="button" onClick={() => finish(next)} className="btn btn-primary px-5 py-3 text-base">
                  {next === "/lab" ? (hinglish ? "Quantum Lab kholo" : "Open the Quantum Lab") : hinglish ? "Continue karo" : "Continue"}
                  <ArrowRight size={18} aria-hidden />
                </button>
              )}
              {beginner ? (
                <>
                  <button
                    type="button"
                    onClick={() => finish("/learn/python")}
                    className={`btn px-5 py-3 text-base ${next ? "btn-secondary" : "btn-primary"}`}
                  >
                    {hinglish ? "Python Foundations start karo" : "Start Python Foundations"}
                    {!next && <ArrowRight size={18} aria-hidden />}
                  </button>
                  <button type="button" onClick={() => finish("/learn/qubit")} className="btn btn-secondary px-5 py-3 text-base">
                    {hinglish ? "Skip karke Qubit Fundamentals start karo" : "Skip to Qubit Fundamentals"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => finish("/learn/qubit")}
                    className={`btn px-5 py-3 text-base ${next ? "btn-secondary" : "btn-primary"}`}
                  >
                    {hinglish ? "Qubit Fundamentals start karo" : "Start Qubit Fundamentals"}
                    {!next && <ArrowRight size={18} aria-hidden />}
                  </button>
                  <button type="button" onClick={() => finish("/dashboard")} className="btn btn-secondary px-5 py-3 text-base">
                    {hinglish ? "Pehle dashboard dekho" : "See my dashboard first"}
                  </button>
                </>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn btn-ghost"
        >
          <ArrowLeft size={17} aria-hidden />
          Back
        </button>
        {step < 2 && (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 0 ? !python : !language}
            className="btn btn-primary px-5"
          >
            Continue
            <ArrowRight size={17} aria-hidden />
          </button>
        )}
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  );
}

function ChoiceCard({
  selected,
  onSelect,
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
        selected ? "border-ket bg-ket/10" : "border-line bg-white/[0.03] hover:border-ink/30"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-ket bg-ket text-void" : "border-line"
        }`}
      >
        {selected && <Check size={15} />}
      </span>
      <span>
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-0.5 block leading-relaxed text-mute">{body}</span>
      </span>
    </button>
  );
}
