"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Wordmark } from "@/components/Logo";
import type { PythonLevel } from "@/lib/storage";
import type { Lang } from "@/lib/types";

const PYTHON_OPTIONS: Array<{ value: PythonLevel; title: string; body: string }> = [
  {
    value: "beginner",
    title: "I'm a Beginner",
    body: "I have not written Python before, or only a little.",
  },
  {
    value: "basics",
    title: "I Know the Basics",
    body: "Variables, if statements and loops look familiar.",
  },
  {
    value: "comfortable",
    title: "I'm Comfortable",
    body: "I can write functions and work with lists.",
  },
];

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
  const [python, setPython] = useState<PythonLevel | null>(null);
  const [language, setLanguage] = useState<Lang | null>(null);

  const profile = state.profile;
  useEffect(() => {
    if (ready && !profile) router.replace("/login");
  }, [ready, profile, router]);

  if (!ready || !profile) return null;

  const finish = (href: string) => {
    if (!python || !language) return;
    actions.completeOnboarding(python, language);
    router.push(href);
  };

  const beginner = python === "beginner";
  const hinglish = language === "hi";

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
            <p className="text-mute">
              Hi {profile.name}. Let&apos;s understand where you&apos;re starting.
            </p>
            <h1 id="python-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              How comfortable are you with Python?
            </h1>
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
            <p className="text-mute">
              {hinglish ? "Aapka starting point ready hai." : "Your starting point is ready."}
            </p>
            <h1 id="start-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {beginner
                ? hinglish
                  ? "Pehle Python Foundations"
                  : "First stop: Python Foundations"
                : hinglish
                  ? "Aap Quantum Fundamentals ke liye ready ho"
                  : "You're ready for Quantum Fundamentals"}
            </h1>
            <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-mute">
              {beginner
                ? hinglish
                  ? "Aapne bataya ki aap Python mein beginner ho. Ek chhota warm-up — variables, conditions, loops, functions aur lists — quantum examples ko padhna easy bana dega. Aap ise kabhi bhi skip kar sakte ho."
                  : "You said you are new to Python. A short warm-up — variables, conditions, loops, functions and lists — will make the quantum examples easier to read. You can skip it any time."
                : hinglish
                  ? "Aapko Python aata hai, isliye hum seedha qubits se start karenge. Python Foundations Learn page par available rahega agar kabhi refresh karna ho."
                  : "You already know some Python, so we will go straight to qubits. Python Foundations stays available on the Learn page if you ever want a refresher."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {beginner ? (
                <>
                  <button type="button" onClick={() => finish("/learn/python")} className="btn btn-primary px-5 py-3 text-base">
                    Start Python Foundations
                    <ArrowRight size={18} aria-hidden />
                  </button>
                  <button type="button" onClick={() => finish("/dashboard")} className="btn btn-secondary px-5 py-3 text-base">
                    Skip to my dashboard
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => finish("/dashboard")} className="btn btn-primary px-5 py-3 text-base">
                    Go to my dashboard
                    <ArrowRight size={18} aria-hidden />
                  </button>
                  <button type="button" onClick={() => finish("/learn/qubit")} className="btn btn-secondary px-5 py-3 text-base">
                    Start Qubit Fundamentals
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
