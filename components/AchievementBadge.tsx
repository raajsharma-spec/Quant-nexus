"use client";

import { Atom, Cpu, Crosshair, Lock, Target, Unlock, Waves, type LucideIcon } from "lucide-react";
import type { Achievement } from "@/data/achievements";
import { useApp } from "./AppProvider";

const ICONS: Record<Achievement["icon"], LucideIcon> = {
  target: Target,
  cpu: Cpu,
  crosshair: Crosshair,
  atom: Atom,
  waves: Waves,
  unlock: Unlock,
};

/** One achievement. Earned ones glow; locked ones show how to earn them. */
export function AchievementBadge({
  achievement,
  compact = false,
}: {
  achievement: Achievement;
  compact?: boolean;
}) {
  const { state, t } = useApp();
  const earnedAt = state.achievements[achievement.id];
  const earned = !!earnedAt;
  const Icon = ICONS[achievement.icon];
  const progress = achievement.progress?.(state);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
          earned ? "border-ok/35 bg-ok/[0.07]" : "border-line bg-white/[0.02]"
        }`}
      >
        <span className={`rounded-lg p-1.5 ${earned ? "bg-ok/15 text-ok" : "bg-white/[0.05] text-dim"}`}>
          {earned ? <Icon size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
        </span>
        <span className="min-w-0">
          <span className={`block truncate text-sm font-semibold ${earned ? "" : "text-mute"}`}>
            {achievement.title}
          </span>
          <span className="block text-xs text-dim">{earned ? "Earned" : "Not yet earned"}</span>
        </span>
      </div>
    );
  }

  return (
    <article
      className={`panel flex gap-4 p-5 ${earned ? "border-ok/35" : ""}`}
      aria-label={`${achievement.title}: ${earned ? "earned" : "not yet earned"}`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
          earned ? "border-ok/50 bg-ok/15 text-ok" : "border-line bg-white/[0.03] text-dim"
        }`}
      >
        {earned ? <Icon size={26} aria-hidden /> : <Lock size={22} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-lg font-semibold ${earned ? "" : "text-mute"}`}>{achievement.title}</h3>
          <span className={`tag ${earned ? "border-ok/40 bg-ok/10 text-ok" : "text-dim"}`}>
            {earned ? "Earned" : "Locked"}
          </span>
        </div>
        <p className="mt-1 text-mute">{t(achievement.criteria)}</p>
        {earned ? (
          <p className="mt-2 text-sm text-dim">
            Earned on {new Date(earnedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </p>
        ) : progress ? (
          <p className="mt-2 text-sm text-dim">
            {progress.value} of {progress.goal} so far
          </p>
        ) : null}
      </div>
    </article>
  );
}
