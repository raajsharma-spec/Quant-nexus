"use client";

import { CheckCircle2, HelpCircle, Lightbulb } from "lucide-react";
import type { Explanation } from "@/lib/explain";
import type { Distribution } from "@/lib/prediction";
import type { SimulationSuccess } from "@/lib/quantumSimulator";
import type { L } from "@/lib/types";
import { BlochSphere } from "./BlochSphere";
import { ProbabilityBars } from "./ProbabilityBars";

export type Outcome = "correct" | "incorrect" | "unsure";

interface Props {
  result: SimulationSuccess;
  predictionLabel: string;
  /** Present when the prediction was a probability distribution. */
  predictionDistribution: Distribution | null;
  outcome: Outcome;
  explanation: Explanation;
  t: (text: L) => string;
  children?: React.ReactNode;
}

const VERDICT: Record<Outcome, L> = {
  correct: {
    en: "Prediction matched the expected result.",
    hi: "Prediction expected result se match hui.",
  },
  incorrect: {
    en: "Not quite — let's understand why.",
    hi: "Not quite — chalo samajhte hain kyun.",
  },
  unsure: {
    en: "No guess this time. Here's what actually happened.",
    hi: "Is baar koi guess nahi. Yeh actually hua.",
  },
};

/** Your prediction vs what actually happened, followed by the "why". */
export function SimulationResult({
  result,
  predictionLabel,
  predictionDistribution,
  outcome,
  explanation,
  t,
  children,
}: Props) {
  const observed: Record<string, number> = {};
  Object.keys(result.counts).forEach((bits) => (observed[bits] = result.counts[bits] / result.shots));
  const measured = result.measuredQubits.map((q) => `q${q}`).join(" ");

  return (
    <section aria-live="polite" className="flex animate-rise flex-col gap-4">
      {/* Verdict */}
      <p
        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 font-medium ${
          outcome === "correct"
            ? "border-ok/40 bg-ok/10 text-ok"
            : "border-warn/40 bg-warn/10 text-warn"
        }`}
      >
        {outcome === "correct" ? (
          <CheckCircle2 size={20} aria-hidden />
        ) : (
          <HelpCircle size={20} aria-hidden />
        )}
        {t(VERDICT[outcome])}
      </p>

      {/* Comparison */}
      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl border border-phase/40 bg-phase/[0.06] p-4">
          <h3 className="mb-3 text-sm font-semibold text-phase">
            {t({ en: "Your prediction", hi: "Aapki prediction" })}
          </h3>
          {predictionDistribution ? (
            <ProbabilityBars
              values={predictionDistribution}
              tone="phase"
              label="Your predicted probabilities"
            />
          ) : (
            <p className="ket text-base leading-relaxed">{predictionLabel}</p>
          )}
        </div>

        <div aria-hidden className="flex items-center justify-center text-sm font-semibold text-dim">
          vs
        </div>

        <div className="rounded-2xl border border-ket/40 bg-ket/[0.06] p-4">
          <h3 className="mb-3 text-sm font-semibold text-ket">
            {t({ en: "What actually happened", hi: "Actually kya hua" })}
          </h3>
          <ProbabilityBars
            values={observed}
            counts={result.counts}
            expected={result.probabilities}
            approx
            label="Measured results"
          />
          <p className="mt-3 text-xs leading-relaxed text-mute">
            {t({
              en: `${result.shots.toLocaleString()} runs in the local simulator, measuring ${measured}. The white tick marks the exact probability.`,
              hi: `Local simulator mein ${result.shots.toLocaleString()} runs, ${measured} measure kiya. White tick exact probability dikhata hai.`,
            })}
          </p>
        </div>
      </div>

      {/* Why */}
      <div className="panel p-4 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Lightbulb size={18} className="text-warn" aria-hidden />
          {t({ en: "Why did this happen?", hi: "Yeh kyun hua?" })}
        </h3>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <ol className="flex flex-col gap-2 text-[0.9375rem] leading-relaxed">
              {explanation.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="ket mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-xs text-mute">
                    {index + 1}
                  </span>
                  <span>{t(step)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-xl border border-line bg-void/50 px-3.5 py-2.5 text-[0.9375rem] font-medium leading-relaxed">
              {t(explanation.summary)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-3">
              {result.bloch.map((vector, q) => (
                <BlochSphere key={q} vector={vector} title={`q${q}`} />
              ))}
            </div>
            <p className="max-w-[18rem] text-center text-xs text-dim">
              {t({
                en: "Where each qubit points just before measurement.",
                hi: "Measurement se just pehle har qubit kahan point karta hai.",
              })}
            </p>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}
