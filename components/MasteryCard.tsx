"use client";

import { Check, Circle } from "lucide-react";
import { topicTitle } from "@/data/topics";
import { topicMastery, topicStatus } from "@/lib/mastery";
import { passes, progressOf, stageScore, STAGE_WEIGHTS } from "@/lib/stages";
import { stageMeta, type TopicId } from "@/lib/types";
import { useApp } from "./AppProvider";
import { Meter, StatusBadge } from "./ui";

/** One concept's mastery: the bar, plus the evidence behind it. */
export function MasteryCard({ topic, showConditions = true }: { topic: TopicId; showConditions?: boolean }) {
  const { state, t } = useApp();
  const m = topicMastery(state, topic);
  const status = topicStatus(state, topic);
  const threshold = state.settings.masteryThreshold;
  const progress = progressOf(state, topic);
  const explain = stageScore(progress, "explain");
  const challenge = stageScore(progress, "challenge");

  const conditions = [
    {
      met: m.mastered,
      text: t({
        en: `Every stage at ${threshold}% or more`,
        hi: `Har stage ${threshold}% ya zyada par`,
      }),
      detail: m.stage
        ? t({
            en: `${m.completedStages} of ${m.totalStages} · now on ${stageMeta(m.stage).label}`,
            hi: `${m.totalStages} mein se ${m.completedStages} · abhi ${stageMeta(m.stage).label} par`,
          })
        : `${m.completedStages} / ${m.totalStages}`,
    },
    {
      met: passes(explain, threshold),
      text: t({ en: "Explained the result in own words", hi: "Result apne words mein explain kiya" }),
      detail: explain > 0 ? `${explain}%` : t({ en: "not yet", hi: "abhi nahi" }),
    },
    {
      met: m.assessmentPassed,
      text: t({ en: "Adaptive mastery check", hi: "Adaptive mastery check" }),
      detail: m.bestScore === null ? t({ en: "not taken yet", hi: "abhi liya nahi" }) : `${m.bestScore}%`,
    },
    {
      met: passes(challenge, threshold),
      text: t({ en: "Targeted challenge solved", hi: "Targeted challenge solve" }),
      detail: passes(challenge, threshold) ? t({ en: "solved", hi: "solved" }) : t({ en: "not yet", hi: "abhi nahi" }),
    },
  ];

  return (
    <div className="well p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{topicTitle(topic)}</p>
        <StatusBadge status={status} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Meter
          value={m.mastery}
          label={`${topicTitle(topic)} mastery`}
          tone={status === "MASTERED" ? "ok" : "ket"}
          marker={threshold}
        />
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
          <p className="mt-2.5 text-xs leading-relaxed text-dim">
            Mastery % is the weighted average of the 13 stage scores (Assess {STAGE_WEIGHTS.assess}%, Explain{" "}
            {STAGE_WEIGHTS.explain}%, the rest {100 - STAGE_WEIGHTS.assess - STAGE_WEIGHTS.explain}%). The next concept
            unlocks when every stage reaches {threshold}%.
          </p>
        </>
      )}
    </div>
  );
}
