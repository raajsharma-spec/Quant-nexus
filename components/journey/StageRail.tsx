"use client";

import { Check, CircleDot, Loader, Lock } from "lucide-react";
import { stageScore, stageState, type StageState } from "@/lib/stages";
import type { ConceptProgress } from "@/lib/storage";
import { STAGES, type L, type StageId } from "@/lib/types";

const STATE_LABEL: Record<StageState, L> = {
  completed: { en: "Completed", hi: "Completed" },
  "in-progress": { en: "In progress", hi: "In progress" },
  active: { en: "Open", hi: "Open" },
  locked: { en: "Locked", hi: "Locked" },
};

function StateIcon({ state }: { state: StageState }) {
  if (state === "completed") return <Check size={14} aria-hidden />;
  if (state === "locked") return <Lock size={13} aria-hidden />;
  if (state === "in-progress") return <Loader size={14} aria-hidden />;
  return <CircleDot size={14} aria-hidden />;
}

interface Props {
  progress: ConceptProgress;
  threshold: number;
  /** The stage currently on screen. */
  viewing: StageId;
  onOpen: (stage: StageId) => void;
  onLocked: (stage: StageId) => void;
  t: (text: L) => string;
  /** A row of small steps instead of the full list (used on the dashboard). */
  compact?: boolean;
}

/**
 * The learning journey of one concept: every stage with its state.
 * Each state has an icon AND a word, so colour is never the only signal.
 * Locked stages stay visible — the learner can see the road ahead — but
 * cannot be opened; clicking one explains what unlocks it.
 */
export function StageRail({ progress, threshold, viewing, onOpen, onLocked, t, compact = false }: Props) {
  return (
    <ol
      aria-label="Learning journey"
      className={
        compact
          ? "grid grid-cols-4 gap-2 sm:grid-cols-7 xl:grid-cols-[repeat(13,minmax(0,1fr))]"
          : "flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0"
      }
    >
      {STAGES.map((stage) => {
        const state = stageState(progress, stage.id, threshold);
        const score = stageScore(progress, stage.id);
        const current = stage.id === viewing;
        const locked = state === "locked";

        const tone =
          state === "completed"
            ? "border-ok/45 bg-ok/[0.07] text-ok"
            : locked
              ? "border-line bg-transparent text-dim"
              : "border-ket/55 bg-ket/10 text-ket";

        if (compact) {
          return (
            <li key={stage.id} aria-current={current ? "step" : undefined}>
              <button
                type="button"
                onClick={() => (locked ? onLocked(stage.id) : onOpen(stage.id))}
                aria-disabled={locked}
                title={`${stage.label}: ${STATE_LABEL[state].en}${locked ? "" : ` · ${score}%`}`}
                className={`flex w-full flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-colors ${tone} ${
                  current ? "ring-2 ring-ket/70" : ""
                } ${locked ? "cursor-not-allowed" : "hover:brightness-125"}`}
              >
                <span className="ket text-[0.65rem] opacity-80">{stage.number}</span>
                <StateIcon state={state} />
                <span className={`text-[0.68rem] font-semibold leading-tight ${locked ? "text-dim" : "text-ink"}`}>
                  {stage.label}
                </span>
                <span className="sr-only">
                  {STATE_LABEL[state].en}
                  {locked ? "" : `, ${score}%`}
                </span>
              </button>
            </li>
          );
        }

        return (
          <li key={stage.id} className="shrink-0 lg:shrink" aria-current={current ? "step" : undefined}>
            <button
              type="button"
              onClick={() => (locked ? onLocked(stage.id) : onOpen(stage.id))}
              aria-disabled={locked}
              className={`flex w-full min-w-[9.5rem] items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                current ? "border-ket bg-ket/[0.12]" : locked ? "border-transparent" : "border-transparent hover:bg-white/[0.05]"
              } ${locked ? "cursor-not-allowed" : ""}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
                <StateIcon state={state} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-semibold ${locked ? "text-dim" : "text-ink"}`}>
                  <span className="ket mr-1.5 text-xs font-normal text-dim">{stage.number}</span>
                  {stage.label}
                </span>
                <span className={`block text-xs ${locked ? "text-dim" : "text-mute"}`}>
                  {t(STATE_LABEL[state])}
                  {!locked && state !== "active" ? ` · ${score}%` : ""}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
