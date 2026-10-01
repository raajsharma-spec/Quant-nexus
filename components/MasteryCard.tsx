"use client";

import { Check, Circle } from "lucide-react";
import { topicTitle } from "@/data/topics";
import { hasUnresolvedError, MASTERY_WEIGHTS, topicMastery, topicStatus } from "@/lib/mastery";
import type { TopicId } from "@/lib/types";
import { useApp } from "./AppProvider";
import { Meter, StatusBadge } from "./ui";

/** One topic's mastery: the bar, plus the three conditions that unlock the next topic. */
export function MasteryCard({ topic, showConditions = true }: { topic: TopicId; showConditions?: boolean }) {
  const { state, t } = useApp();
  const m = topicMastery(state, topic);
  const status = topicStatus(state, topic);
  const threshold = state.settings.masteryThreshold;
  const errorOpen = hasUnresolvedError(state);

  const conditions = [
    {
      met: m.assessmentPassed,
      text: t({
        en: `Mastery check at ${threshold}% or more`,
        hi: `Mastery check mein ${threshold}% ya zyada`,
      }),
      detail: m.bestScore === null ? t({ en: "not taken yet", hi: "abhi liya nahi" }) : `best ${m.bestScore}%`,
    },
    {
      met: m.practiceDone,
      text: t({ en: "Required practice solved", hi: "Required practice solve" }),
      detail: `${m.practiceSolved} of ${m.practiceTotal}`,
    },
    {
      met: !errorOpen,
      text: t({ en: "No unresolved circuit error", hi: "Koi unresolved circuit error nahi" }),
      detail: errorOpen
        ? t({ en: "last lab run failed", hi: "last lab run fail hua" })
        : t({ en: "clear", hi: "clear" }),
    },
  ];

  return (
    <div className="well p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{topicTitle(topic)}</p>
        <StatusBadge status={status} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Meter value={m.mastery} label={`${topicTitle(topic)} mastery`} tone={status === "MASTERED" ? "ok" : "ket"} />
        <span className="w-10 text-right text-sm font-semibold tabular-nums">{m.mastery}%</span>
      </div>
      {showConditions && (
        <>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {conditions.map((c) => (
              <li key={c.text} className="flex items-start gap-2">
                {c.met ? (
                  <Check size={16} className="mt-0.5 shrink-0 text-ok" aria-label="Met" />
                ) : (
                  <Circle size={16} className="mt-0.5 shrink-0 text-dim" aria-label="Not met yet" />
                )}
                <span className={c.met ? "" : "text-mute"}>
                  {c.text} <span className="text-dim">({c.detail})</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs text-dim">
            Mastery % = {MASTERY_WEIGHTS.assessment}% mastery check + {MASTERY_WEIGHTS.practice}% practice +{" "}
            {MASTERY_WEIGHTS.lesson}% lesson.
          </p>
        </>
      )}
    </div>
  );
}
