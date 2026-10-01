"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { getRecommendation } from "@/lib/recommendationEngine";
import { useApp } from "./AppProvider";

/** A compact "Your next move" used on the Progress and Assessment pages. */
export function RecommendationCard({ heading = "Recommended next step" }: { heading?: string }) {
  const { state, t } = useApp();
  const rec = getRecommendation(state);
  return (
    <div className="rounded-2xl border border-phase/35 bg-phase/[0.06] p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-phase">
        <Compass size={16} aria-hidden />
        {heading}
      </h3>
      <p className="mt-2 text-lg font-semibold">{t(rec.title)}</p>
      <p className="mt-1 text-sm leading-relaxed text-mute">{t(rec.reason)}</p>
      <Link href={rec.href} className="btn btn-secondary mt-3 border-phase/50 text-sm">
        {t(rec.cta)}
        <ArrowRight size={15} aria-hidden />
      </Link>
    </div>
  );
}
