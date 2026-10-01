"use client";

import { Languages } from "lucide-react";
import type { Lang } from "@/lib/types";
import { useApp } from "./AppProvider";

const OPTIONS: Array<{ value: Lang; short: string; full: string }> = [
  { value: "en", short: "EN", full: "English" },
  { value: "hi", short: "HI-ENG", full: "English + Hinglish" },
];

/** Switches explanations between English and Hinglish. Quantum terms never change. */
export function LanguageToggle() {
  const { lang, actions } = useApp();
  return (
    <div
      role="group"
      aria-label="Learning language"
      className="flex items-center gap-1 rounded-xl border border-line bg-white/[0.03] p-1"
    >
      <Languages size={15} className="ml-1.5 text-dim max-sm:hidden" aria-hidden />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => actions.setLanguage(option.value)}
          aria-pressed={lang === option.value}
          title={option.full}
          className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold transition-colors sm:px-2.5 ${
            lang === option.value ? "bg-phase/25 text-ink" : "text-mute hover:text-ink"
          }`}
        >
          {option.short}
          <span className="sr-only"> — {option.full}</span>
        </button>
      ))}
    </div>
  );
}
