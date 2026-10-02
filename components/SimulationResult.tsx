"use client";

import { CheckCircle2, HelpCircle, Lightbulb } from "lucide-react";
import { BACKEND_LABEL, type BackendId } from "@/lib/execution";
import type { Explanation } from "@/lib/explain";
import { ket, type Distribution } from "@/lib/prediction";
import { basisLabels, type SimulationSuccess } from "@/lib/quantumSimulator";
import type { L } from "@/lib/types";
import { BlochSphere } from "./BlochSphere";
import { ProbabilityBars } from "./ProbabilityBars";

export type Outcome = "correct" | "incorrect" | "unsure";

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

const observedShare = (result: SimulationSuccess) => {
  const observed: Record<string, number> = {};
  Object.keys(result.counts).forEach((bits) => (observed[bits] = result.counts[bits] / result.shots));
  return observed;
};

const oneDecimal = (value: number) => `${(Math.round(value * 1000) / 10).toFixed(1)}%`;

/** Shots, counts and percentages — the raw measurement data, never mixed up with amplitudes. */
export function MeasurementTable({
  result,
  backend = "browser",
  t,
}: {
  result: SimulationSuccess;
  backend?: BackendId;
  t: (text: L) => string;
}) {
  const labels = Object.keys(result.counts).sort();
  const measured = result.measuredQubits.map((q) => `q${q}`).join(" ");
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[19rem] text-left text-sm">
          <caption className="sr-only">Measurement counts for each result</caption>
          <thead className="text-mute">
            <tr>
              <th scope="col" className="py-1.5 pr-3 font-medium">{t({ en: "Result", hi: "Result" })}</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t({ en: "Count", hi: "Count" })}</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t({ en: "Measured", hi: "Measured" })}</th>
              <th scope="col" className="py-1.5 text-right font-medium">{t({ en: "Exact probability", hi: "Exact probability" })}</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((bits) => (
              <tr key={bits} className="border-t border-line">
                <th scope="row" className="ket py-1.5 pr-3 font-medium">{ket(bits)}</th>
                <td className="py-1.5 pr-3 text-right tabular-nums">{result.counts[bits].toLocaleString()}</td>
                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-ket">
                  {oneDecimal(result.counts[bits] / result.shots)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-mute">{oneDecimal(result.probabilities[bits] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-dim">
        {t({
          en: `${result.shots.toLocaleString()} shots · measured ${measured} in the 0/1 (computational) basis · ${BACKEND_LABEL[backend]}. A count is how often a result appeared; the exact probability comes from the state.`,
          hi: `${result.shots.toLocaleString()} shots · ${measured} ko 0/1 (computational) basis mein measure kiya · ${BACKEND_LABEL[backend]}. Count matlab result kitni baar aaya; exact probability state se aati hai.`,
        })}
      </p>
    </div>
  );
}

/** Your prediction, side by side with what actually happened. */
export function ResultComparison({
  result,
  predictionLabel,
  predictionDistribution,
  outcome,
  t,
}: {
  result: SimulationSuccess;
  predictionLabel: string;
  predictionDistribution: Distribution | null;
  outcome: Outcome;
  t: (text: L) => string;
}) {
  return (
    <>
      <p
        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 font-medium ${
          outcome === "correct" ? "border-ok/40 bg-ok/10 text-ok" : "border-warn/40 bg-warn/10 text-warn"
        }`}
      >
        {outcome === "correct" ? <CheckCircle2 size={20} aria-hidden /> : <HelpCircle size={20} aria-hidden />}
        {t(VERDICT[outcome])}
      </p>

      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl border border-phase/40 bg-phase/[0.06] p-4">
          <h3 className="mb-3 text-sm font-semibold text-phase">
            {t({ en: "Your prediction", hi: "Aapki prediction" })}
          </h3>
          {predictionDistribution ? (
            <ProbabilityBars values={predictionDistribution} tone="phase" label="Your predicted probabilities" />
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
            values={observedShare(result)}
            counts={result.counts}
            expected={result.probabilities}
            approx
            label="Measured results"
          />
          <p className="mt-3 text-xs leading-relaxed text-mute">
            {t({
              en: "The white tick marks the exact probability. A small gap between bar and tick is normal sampling variation.",
              hi: "White tick exact probability dikhata hai. Bar aur tick ke beech chhota gap normal sampling variation hai.",
            })}
          </p>
        </div>
      </div>
    </>
  );
}

/** "Why did this happen?" — the step-by-step explanation and where each qubit points. */
export function WhyPanel({
  result,
  explanation,
  t,
}: {
  result: SimulationSuccess;
  explanation: Explanation;
  t: (text: L) => string;
}) {
  return (
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
          <div className="flex flex-wrap justify-center gap-3">
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
  );
}

/** For learners who want it: the state vector, amplitude by amplitude. */
export function StateVectorTable({ result, t }: { result: SimulationSuccess; t: (text: L) => string }) {
  const qubits = Math.round(Math.log2(result.stateVector.length));
  const labels = basisLabels(qubits);
  const format = (value: number) => (Math.abs(value) < 5e-4 ? "0" : value.toFixed(3));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-left text-sm">
        <caption className="mb-2 text-left text-xs text-dim">
          {t({
            en: "State vector just before measurement. Probability = |amplitude|². An amplitude is not a probability.",
            hi: "Measurement se just pehle ka state vector. Probability = |amplitude|². Amplitude probability nahi hai.",
          })}
        </caption>
        <thead className="text-mute">
          <tr>
            <th scope="col" className="py-1.5 pr-3 font-medium">Basis state</th>
            <th scope="col" className="py-1.5 pr-3 text-right font-medium">Amplitude</th>
            <th scope="col" className="py-1.5 text-right font-medium">|amplitude|²</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((bits, index) => {
            const a = result.stateVector[index];
            const probability = a.re * a.re + a.im * a.im;
            const imaginary = Math.abs(a.im) < 5e-4 ? "" : ` ${a.im < 0 ? "−" : "+"} ${format(Math.abs(a.im))}i`;
            return (
              <tr key={bits} className={`border-t border-line ${probability < 5e-4 ? "text-dim" : ""}`}>
                <th scope="row" className="ket py-1.5 pr-3 font-medium">{ket(bits)}</th>
                <td className="ket py-1.5 pr-3 text-right tabular-nums">
                  {format(a.re)}
                  {imaginary}
                </td>
                <td className="py-1.5 text-right tabular-nums">{oneDecimal(probability)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  result: SimulationSuccess;
  predictionLabel: string;
  /** Present when the prediction was a probability distribution. */
  predictionDistribution: Distribution | null;
  outcome: Outcome;
  explanation: Explanation;
  backend?: BackendId;
  /** Show the state vector without the learner having to expand it. */
  advanced?: boolean;
  t: (text: L) => string;
  children?: React.ReactNode;
}

/** Your prediction vs what actually happened, the measurement data, then the "why". */
export function SimulationResult({
  result,
  predictionLabel,
  predictionDistribution,
  outcome,
  explanation,
  backend = "browser",
  advanced = false,
  t,
  children,
}: Props) {
  return (
    <section aria-live="polite" className="flex animate-rise flex-col gap-4">
      <ResultComparison
        result={result}
        predictionLabel={predictionLabel}
        predictionDistribution={predictionDistribution}
        outcome={outcome}
        t={t}
      />

      <div className="panel p-4 sm:p-5">
        <h3 className="mb-3 text-base font-semibold">{t({ en: "Measurement data", hi: "Measurement data" })}</h3>
        <MeasurementTable result={result} backend={backend} t={t} />
        <details className="mt-3" open={advanced}>
          <summary className="cursor-pointer rounded text-sm font-medium text-mute hover:text-ink">
            {t({ en: "Advanced: state vector and amplitudes", hi: "Advanced: state vector aur amplitudes" })}
          </summary>
          <div className="mt-3">
            <StateVectorTable result={result} t={t} />
          </div>
        </details>
      </div>

      <WhyPanel result={result} explanation={explanation} t={t} />

      {children}
    </section>
  );
}
