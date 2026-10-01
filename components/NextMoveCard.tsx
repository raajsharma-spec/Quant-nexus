"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { getRecommendation } from "@/lib/recommendationEngine";
import { useApp } from "./AppProvider";

/** "Your next move" — the dashboard's recommendation, with the reason it was chosen. */
export function NextMoveCard() {
  const { state, t } = useApp();
  const rec = getRecommendation(state);
  return (
    <section aria-labelledby="next-move-title" className="panel flex h-full flex-col p-5 sm:p-6">
      <h2 id="next-move-title" className="flex items-center gap-2 text-sm font-semibold text-phase">
        <Compass size={17} aria-hidden />
        Your next move
      </h2>
      <p className="mt-3 text-2xl font-semibold leading-tight tracking-tight">{t(rec.title)}</p>
      <p className="mt-2.5 leading-relaxed text-mute">{t(rec.reason)}</p>
      <details className="mt-3 text-sm text-dim">
        <summary className="cursor-pointer rounded hover:text-mute">How was this chosen?</summary>
        <p className="mt-2 rounded-lg border border-line bg-void/50 p-3 leading-relaxed">
          A rule, not a trained model: <span className="text-mute">{rec.rule}</span>
        </p>
      </details>
      <div className="mt-auto pt-5">
        <Link href={rec.href} className="btn btn-primary">
          {t(rec.cta)}
          <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
