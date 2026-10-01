"use client";

import Link from "next/link";
import { ArrowRight, Code2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { LearningRoadmap } from "@/components/LearningRoadmap";
import { PageHeader, StatusBadge } from "@/components/ui";
import { PYTHON_TOPIC } from "@/data/topics";
import { topicStatus } from "@/lib/mastery";

const MODULE_STEPS = ["Concept", "Visual", "Try it", "Example", "Predict", "Practice", "Mastery check"];

export default function LearnPage() {
  const { state, t } = useApp();
  const pythonStatus = topicStatus(state, "python");
  const beginner = state.profile?.pythonLevel === "beginner";

  return (
    <>
      <PageHeader
        title="Learn"
        lead={t({
          en: "Start where you are. Each module ends with practice and a mastery check that unlocks the next one.",
          hi: "Jahan ho wahin se start karo. Har module ke end mein practice aur mastery check hai jo next module unlock karta hai.",
        })}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <section aria-labelledby="roadmap-title" className="panel p-5 sm:p-6">
          <h2 id="roadmap-title" className="mb-4 text-lg font-semibold">
            Learning roadmap
          </h2>
          <LearningRoadmap showBlurb />
          <p className="mt-4 text-sm text-dim">
            Modules 01 to 04 are fully interactive in this MVP. Modules 05 to 08 are planned for
            the full release and stay locked.
          </p>
        </section>

        <div className="flex flex-col gap-5">
          {/* Prerequisite */}
          <section
            aria-labelledby="python-title"
            className={`panel p-5 ${beginner && pythonStatus !== "MASTERED" ? "border-ket/50" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-mute">
                <Code2 size={17} aria-hidden />
                Prerequisite
              </span>
              <StatusBadge status={pythonStatus} />
            </div>
            <h2 id="python-title" className="mt-2 text-lg font-semibold">
              {PYTHON_TOPIC.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-mute">{t(PYTHON_TOPIC.blurb)}</p>
            <p className="mt-2 text-sm text-dim">
              {beginner
                ? t({
                    en: "Recommended for you, because you said you are new to Python.",
                    hi: "Aapke liye recommended, kyunki aapne bataya ki aap Python mein naye ho.",
                  })
                : t({
                    en: "Optional. It never blocks the quantum modules.",
                    hi: "Optional. Yeh quantum modules ko kabhi block nahi karta.",
                  })}
            </p>
            <Link href="/learn/python" className={`btn mt-4 text-sm ${beginner ? "btn-primary" : "btn-secondary"}`}>
              {pythonStatus === "AVAILABLE" ? "Start Python Foundations" : "Open Python Foundations"}
              <ArrowRight size={15} aria-hidden />
            </Link>
          </section>

          <section aria-labelledby="shape-title" className="panel p-5">
            <h2 id="shape-title" className="text-lg font-semibold">
              How a module works
            </h2>
            <ol className="mt-3 flex flex-col gap-2 text-sm">
              {MODULE_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="ket flex h-6 w-6 items-center justify-center rounded-md border border-line text-xs text-mute">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
