"use client";

import Link from "next/link";
import { Flame, LogOut, Menu, RotateCcw, Settings, Sparkles, UserRound } from "lucide-react";
import { XP_PER_LEVEL } from "@/lib/analytics";
import { LEVEL_LABEL } from "@/lib/learnerLevel";
import { useApp } from "./AppProvider";
import { LanguageToggle } from "./LanguageToggle";
import { DemoBadge } from "./ui";

export function TopBar({ onMenu, onReset }: { onMenu: () => void; onReset: () => void }) {
  const { state, insights } = useApp();
  const profile = state.profile;
  const isEducator = profile?.role === "educator";
  const demo = state.mode === "demo";
  const intoLevel = insights.xp % XP_PER_LEVEL;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-void/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 text-mute hover:bg-white/[0.06] hover:text-ink lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} aria-hidden />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="truncate font-semibold">{profile?.name ?? ""}</span>
          {isEducator && <span className="tag border-signal/40 bg-signal/10 text-signal">Educator view</span>}
          {demo && (
            <span className="max-sm:hidden">
              <DemoBadge />
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {!isEducator && (
            <dl className="hidden items-center gap-3 text-sm md:flex">
              <div
                className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 py-1.5"
                title={`${intoLevel} of ${XP_PER_LEVEL} XP toward the next level`}
              >
                <dt className="sr-only">Current level</dt>
                <dd className="font-semibold">Level {insights.level}</dd>
                <span aria-hidden className="h-3.5 w-px bg-line" />
                <dt className="sr-only">Experience points</dt>
                <dd className="flex items-center gap-1 tabular-nums text-mute">
                  <Sparkles size={14} className="text-phase" aria-hidden />
                  {insights.xp} XP
                </dd>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.03] px-3 py-1.5">
                <Flame size={15} className="text-warn" aria-hidden />
                <dt className="sr-only">Streak</dt>
                <dd className="tabular-nums">
                  {insights.streak} day{insights.streak === 1 ? "" : "s"} streak
                </dd>
              </div>
            </dl>
          )}

          <LanguageToggle />

          <details className="group relative">
            <summary
              className="flex cursor-pointer list-none items-center justify-center rounded-xl border border-line bg-white/[0.03] p-2 text-mute hover:text-ink [&::-webkit-details-marker]:hidden"
              aria-label="Profile"
            >
              <UserRound size={18} aria-hidden />
            </summary>
            <div className="panel absolute right-0 top-11 z-40 w-64 bg-deck p-3 shadow-2xl">
              <p className="px-2 font-semibold">{profile?.name}</p>
              <p className="px-2 text-sm text-mute">
                {isEducator ? "Educator" : `${LEVEL_LABEL[insights.learner.level]} · XP level ${insights.level} · ${insights.xp} XP`}
              </p>
              <p className="mt-1 px-2 text-xs text-dim">
                {demo
                  ? "Illustrative demo learner. Not real learner data."
                  : "Live interaction. Saved only on this device."}
              </p>
              <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-mute hover:bg-white/[0.06] hover:text-ink"
                >
                  <Settings size={16} aria-hidden />
                  Settings
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-mute hover:bg-white/[0.06] hover:text-ink"
                >
                  <LogOut size={16} aria-hidden />
                  Switch learner or role
                </Link>
                <button
                  type="button"
                  onClick={onReset}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-mute hover:bg-warn/10 hover:text-warn"
                >
                  <RotateCcw size={16} aria-hidden />
                  Reset demo
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Level, XP and streak drop to a second row on small screens. */}
      {(!isEducator || demo) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-1.5 text-xs text-mute md:hidden">
          {!isEducator && (
            <>
              <span className="font-semibold text-ink">Level {insights.level}</span>
              <span className="tabular-nums">{insights.xp} XP</span>
              <span className="flex items-center gap-1 tabular-nums">
                <Flame size={13} className="text-warn" aria-hidden />
                {insights.streak} day{insights.streak === 1 ? "" : "s"} streak
              </span>
            </>
          )}
          {demo && (
            <span className="ml-auto sm:hidden">
              <DemoBadge />
            </span>
          )}
        </div>
      )}
    </header>
  );
}
