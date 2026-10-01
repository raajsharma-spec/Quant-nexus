"use client";

import Link from "next/link";
import { Crosshair } from "lucide-react";
import { useApp } from "./AppProvider";

/** Highlights the product's signature habit: predicting before running. */
export function PredictionInsight() {
  const { state, insights, t } = useApp();
  const { total, correct, accuracy } = insights.prediction;
  const recent = state.predictions.slice(-16);

  // Compare the newer half with the older half to see the direction of travel.
  let message = t({
    en: "Make your first prediction in the Quantum Lab. It is the fastest way to build intuition.",
    hi: "Quantum Lab mein apni pehli prediction karo. Intuition banane ka yahi fastest tareeka hai.",
  });
  if (total > 0) {
    const half = Math.floor(state.predictions.length / 2);
    const rate = (list: typeof state.predictions) =>
      list.length === 0 ? 0 : list.filter((p) => p.correct).length / list.length;
    const improving =
      state.predictions.length >= 4 &&
      rate(state.predictions.slice(half)) > rate(state.predictions.slice(0, half));
    message = improving
      ? t({
          en: "Your predictions are improving. Try another circuit to strengthen your intuition.",
          hi: "Aapki predictions improve ho rahi hain. Intuition strong karne ke liye ek aur circuit try karo.",
        })
      : t({
          en: "Every miss comes with an explanation. Try another circuit to strengthen your intuition.",
          hi: "Har miss ke saath ek explanation milta hai. Intuition strong karne ke liye ek aur circuit try karo.",
        });
  }

  return (
    <section aria-labelledby="insight-title" className="panel flex h-full flex-col p-5 sm:p-6">
      <h2 id="insight-title" className="flex items-center gap-2 text-sm font-semibold text-ket">
        <Crosshair size={17} aria-hidden />
        Prediction insight
      </h2>

      {total === 0 ? (
        <p className="mt-3 text-xl font-semibold leading-snug">No predictions yet.</p>
      ) : (
        <>
          <p className="mt-3 text-xl font-semibold leading-snug">
            You&apos;ve made {total} prediction{total === 1 ? "" : "s"}.
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="well px-2 py-2.5">
              <dd className="text-2xl font-semibold tabular-nums text-ok">{correct}</dd>
              <dt className="text-xs text-mute">correct</dt>
            </div>
            <div className="well px-2 py-2.5">
              <dd className="text-2xl font-semibold tabular-nums text-warn">{total - correct}</dd>
              <dt className="text-xs text-mute">incorrect</dt>
            </div>
            <div className="well px-2 py-2.5">
              <dd className="text-2xl font-semibold tabular-nums">{accuracy}%</dd>
              <dt className="text-xs text-mute">accuracy</dt>
            </div>
          </dl>

          {/* One mark per prediction, oldest to newest. */}
          <div className="mt-4">
            <p className="mb-1.5 text-xs text-dim">Your last {recent.length}, oldest to newest</p>
            <ol
              aria-label={`Last ${recent.length} predictions: ${recent
                .map((p) => (p.correct ? "correct" : "missed"))
                .join(", ")}`}
              className="flex flex-wrap gap-1.5"
            >
              {recent.map((p) => (
                <li
                  key={p.id}
                  title={`${p.circuit} — ${p.correct ? "matched" : "missed"}`}
                  className={`h-3.5 w-3.5 rounded-[4px] ${
                    p.correct ? "bg-ok" : "border-2 border-warn bg-transparent"
                  }`}
                />
              ))}
            </ol>
          </div>
        </>
      )}

      <p className="mt-4 leading-relaxed text-mute">{message}</p>
      <div className="mt-auto pt-4">
        <Link href="/lab" className="btn btn-secondary text-sm">
          {t({ en: "Make a prediction", hi: "Prediction karo" })}
        </Link>
      </div>
    </section>
  );
}
