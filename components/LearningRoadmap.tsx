"use client";

import Link from "next/link";
import { ROADMAP } from "@/data/topics";
import { currentTopic, topicMastery, topicStatus } from "@/lib/mastery";
import { stageMeta } from "@/lib/types";
import { useApp } from "./AppProvider";
import { Meter, StatusBadge } from "./ui";

/** The eight-module roadmap. The first four are interactive in this build. */
export function LearningRoadmap({ showBlurb = false }: { showBlurb?: boolean }) {
  const { state, t } = useApp();
  const current = currentTopic(state);

  return (
    <ol className="flex flex-col">
      {ROADMAP.map((topic, index) => {
        const status = topicStatus(state, topic.id);
        const m = topic.interactive ? topicMastery(state, topic.id) : null;
        const mastery = m?.mastery ?? 0;
        const isCurrent = topic.id === current && status !== "MASTERED";
        const open = status !== "LOCKED";
        const last = index === ROADMAP.length - 1;

        const body = (
          <div
            className={`flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3.5 py-3 transition-colors ${
              isCurrent
                ? "border-ket/50 bg-ket/[0.07]"
                : open
                  ? "border-line bg-white/[0.02] group-hover:border-ink/25"
                  : "border-transparent"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${open ? "" : "text-dim"}`}>{topic.title}</p>
              {showBlurb && (
                <p className={`mt-0.5 text-sm leading-snug ${open ? "text-mute" : "text-dim"}`}>
                  {t(topic.blurb)}
                </p>
              )}
              {m && open && status !== "MASTERED" && m.stage && (
                <p className="mt-0.5 text-xs text-mute">
                  Stage {stageMeta(m.stage).number} · {stageMeta(m.stage).label} · {m.completedStages} of {m.totalStages}{" "}
                  stages complete
                </p>
              )}
              {!topic.interactive && (
                <p className="mt-0.5 text-xs text-dim">Planned for the full release</p>
              )}
            </div>
            {topic.interactive && open && (
              <div className="flex w-32 items-center gap-2 max-sm:hidden">
                <Meter value={mastery} label={`${topic.title} mastery`} tone={status === "MASTERED" ? "ok" : "ket"} />
                <span className="w-9 text-right text-xs tabular-nums text-mute">{mastery}%</span>
              </div>
            )}
            <StatusBadge status={status} />
          </div>
        );

        return (
          <li key={topic.id} className="flex gap-3" aria-current={isCurrent ? "step" : undefined}>
            {/* number and connecting wire */}
            <div className="flex flex-col items-center">
              <span
                className={`ket flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${
                  status === "MASTERED"
                    ? "border-ok/50 bg-ok/10 text-ok"
                    : isCurrent
                      ? "border-ket bg-ket text-void"
                      : open
                        ? "border-signal/50 text-signal"
                        : "border-line text-dim"
                }`}
              >
                {topic.number}
              </span>
              {!last && (
                <span
                  aria-hidden
                  className={`w-px flex-1 ${status === "MASTERED" ? "bg-ok/50" : "bg-line"}`}
                />
              )}
            </div>
            <div className={`flex flex-1 ${last ? "" : "pb-2.5"}`}>
              {open && topic.interactive ? (
                <Link href={`/learn/${topic.id}`} className="group flex flex-1 rounded-xl">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
