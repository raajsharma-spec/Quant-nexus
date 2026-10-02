"use client";

import Link from "next/link";
import { ArrowRight, Code2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { LearningRoadmap } from "@/components/LearningRoadmap";
import { PageHeader, StatusBadge } from "@/components/ui";
import { CURRICULUM } from "@/data/curriculum";
import { PYTHON_TOPIC } from "@/data/topics";
import { topicStatus } from "@/lib/mastery";
import { STAGES } from "@/lib/types";

export default function LearnPage() {
  const { state, t } = useApp();
  const pythonStatus = topicStatus(state, "python");
  const threshold = state.settings.masteryThreshold;

  return (
    <>
      <PageHeader
        title="Learn"
        lead={t({
          en: `Each concept is a guided journey of 13 stages. A stage opens when the one before it reaches ${threshold}%, and mastering a concept unlocks the next.`,
          hi: `Har concept 13 stages ki guided journey hai. Stage tab open hota hai jab usse pehle wala ${threshold}% par pahunche, aur concept master karne par next unlock hota hai.`,
        })}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <section aria-labelledby="roadmap-title" className="panel p-5 sm:p-6">
          <h2 id="roadmap-title" className="mb-4 text-lg font-semibold">
            Learning roadmap
          </h2>
          <LearningRoadmap showBlurb />
          <p className="mt-4 text-sm text-dim">
            {CURRICULUM.title} · curriculum v{CURRICULUM.version}. Modules 01 to 04 are fully interactive in this
            build. Modules 05 to 08 are planned for the full release and stay locked. The curriculum is data: a
            university can change it without touching the interface.
          </p>
        </section>

        <div className="flex flex-col gap-5">
          {/* Prerequisite */}
          <section
            aria-labelledby="python-title"
            className="panel p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-mute">
                <Code2 size={17} aria-hidden />
                Optional warm-up
              </span>
              <StatusBadge status={pythonStatus} />
            </div>
            <h2 id="python-title" className="mt-2 text-lg font-semibold">
              {PYTHON_TOPIC.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-mute">{t(PYTHON_TOPIC.blurb)}</p>
            <p className="mt-2 text-sm text-dim">
              {t({
                en: "Optional. It never blocks the quantum concepts.",
                hi: "Optional. Yeh quantum concepts ko kabhi block nahi karta.",
              })}
            </p>
            <Link href="/learn/python" className="btn btn-secondary mt-4 text-sm">
              {pythonStatus === "AVAILABLE" ? "Start Python Foundations" : "Open Python Foundations"}
              <ArrowRight size={15} aria-hidden />
            </Link>
          </section>

          <section aria-labelledby="shape-title" className="panel p-5">
            <h2 id="shape-title" className="text-lg font-semibold">
              {t({ en: "How a concept works", hi: "Ek concept kaise chalta hai" })}
            </h2>
            <ol className="mt-3 flex flex-col gap-1.5 text-sm">
              {STAGES.map((stage) => (
                <li key={stage.id} className="flex items-baseline gap-3">
                  <span className="ket w-6 shrink-0 text-xs text-dim">{stage.number}</span>
                  <span className="font-medium">{stage.label}</span>
                  <span className="text-mute">{t(stage.hint)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-dim">
              {t({
                en: `Locked stages stay visible. Each one opens at ${threshold}% in the stage before it.`,
                hi: `Locked stages visible rehte hain. Har ek pichhle stage mein ${threshold}% par open hota hai.`,
              })}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
