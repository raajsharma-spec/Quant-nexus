"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Wordmark } from "@/components/Logo";
import type { Lang } from "@/lib/types";

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

export default function OnboardingPage() {
  const { ready, state, actions } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<Lang | null>(null);

  const profile = state.profile;
  useEffect(() => {
    if (ready && !profile) router.replace("/login");
  }, [ready, profile, router]);

  if (!ready || !profile) return null;

  const finish = (href: string) => {
    if (!language) return;
    actions.completeOnboarding(language);
    router.push(href);
  };

  const hinglish = language === "hi";
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
          Step {step + 1} of 2
        </p>
      </header>

      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={2}
        className="mt-5 grid grid-cols-2 gap-2"
      >
        {[0, 1].map((i) => (
          <span key={i} className={`h-1.5 rounded-full ${i <= step ? "bg-ket" : "bg-white/10"}`} />
        ))}
      </div>

      <main id="main" className="flex flex-1 flex-col justify-center py-10">
        {step === 0 && (
          <section aria-labelledby="language-title" className="animate-rise">
            <p className="text-mute">Hi {profile.name}. One choice before you start.</p>
            <h1 id="language-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
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

        {step === 1 && (
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

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => finish("/learn/qubit")} className="btn btn-primary px-5 py-3 text-base">
                {hinglish ? "Qubit Fundamentals start karo" : "Start Qubit Fundamentals"}
                <ArrowRight size={18} aria-hidden />
              </button>
              <button type="button" onClick={() => finish("/dashboard")} className="btn btn-secondary px-5 py-3 text-base">
                {hinglish ? "Pehle dashboard dekho" : "See my dashboard first"}
              </button>
            </div>
            <p className="mt-4 text-sm text-dim">
              {hinglish
                ? "Python naya hai? Learn page par ek optional Python Foundations warm-up hai. Yeh kuch block nahi karta."
                : "New to Python? There is an optional Python Foundations warm-up on the Learn page. It never blocks anything."}
            </p>
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
        {step < 1 && (
          <button type="button" onClick={() => setStep(1)} disabled={!language} className="btn btn-primary px-5">
            Continue
            <ArrowRight size={17} aria-hidden />
          </button>
        )}
      </footer>
    </div>
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
