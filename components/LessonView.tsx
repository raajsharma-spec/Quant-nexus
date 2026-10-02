"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock, Lock } from "lucide-react";
import type { CircuitSpec } from "@/data/challenges";
import { SECTION_LABEL, type Lesson, type LessonSection } from "@/data/concepts";
import { INTERACTIVE_TOPICS, topicMeta, topicTitle } from "@/data/topics";
import { topicStatus } from "@/lib/mastery";
import { buildCircuit } from "@/lib/quantumSimulator";
import type { TopicId } from "@/lib/types";
import { useApp } from "./AppProvider";
import { ExperimentFlow } from "./ExperimentFlow";
import { LessonWidget } from "./LessonWidgets";
import { RunExample } from "./RunExample";
import { StatusBadge } from "./ui";

export function LessonView({ topic, lesson }: { topic: TopicId; lesson: Lesson }) {
  const { state, t, actions } = useApp();
  const meta = topicMeta(topic);
  const status = topicStatus(state, topic);
  const saved = state.lessons[topic];
  const total = lesson.sections.length; // the wrap-up screen is step `total`
  const [step, setStep] = useState(() => Math.min(saved?.step ?? 0, total));
  const opened = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  const locked = status === "LOCKED";

  // Record that the lesson was opened (once per visit).
  useEffect(() => {
    if (opened.current || locked) return;
    opened.current = true;
    actions.openLesson(topic);
  }, [actions, topic, locked]);

  if (locked) {
    const index = INTERACTIVE_TOPICS.indexOf(topic);
    const previous = INTERACTIVE_TOPICS[Math.max(0, index - 1)];
    return (
      <div className="panel mx-auto max-w-2xl p-6 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white/[0.04] text-mute">
          <Lock size={24} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{meta.title} is locked for now</h1>
        <p className="mx-auto mt-2 max-w-[48ch] text-mute">
          {t({
            en: `Master ${topicTitle(previous)} to unlock it: finish the required practice and score ${state.settings.masteryThreshold}% or more in the mastery check. You can retry as many times as you like.`,
            hi: `Ise unlock karne ke liye ${topicTitle(previous)} master karo: required practice complete karo aur mastery check mein ${state.settings.masteryThreshold}% ya zyada score karo. Jitni baar chaho retry kar sakte ho.`,
          })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/learn/${previous}`} className="btn btn-primary">
            Go to {topicTitle(previous)}
          </Link>
          <Link href={`/assessment?topic=${previous}`} className="btn btn-secondary">
            Take its mastery check
          </Link>
        </div>
      </div>
    );
  }

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(total, next));
    setStep(clamped);
    actions.setLessonStep(topic, clamped);
    if (clamped === total) actions.completeLesson(topic);
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const section = step < total ? lesson.sections[step] : null;
  const hasPractice = false;

  return (
    <div ref={top} className="scroll-mt-24">
      <header className="mb-6">
        <Link href="/learn" className="mb-3 inline-flex items-center gap-1.5 rounded text-sm text-mute hover:text-ink">
          <ArrowLeft size={15} aria-hidden />
          All modules
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="ket rounded-lg border border-line px-2 py-1 text-sm text-mute">{meta.number}</span>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{meta.title}</h1>
          <StatusBadge status={status} />
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-mute">
          <span>{t(lesson.intro)}</span>
          <span className="flex items-center gap-1.5 text-sm text-dim">
            <Clock size={14} aria-hidden />
            about {lesson.minutes} min
          </span>
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
        {/* Step list */}
        <nav aria-label="Lesson steps" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {lesson.sections.map((s, index) => (
              <StepButton
                key={s.id}
                index={index}
                label={SECTION_LABEL[s.kind]}
                title={t(s.title)}
                active={index === step}
                done={index < step || !!saved?.completed}
                onClick={() => go(index)}
              />
            ))}
            <StepButton
              index={total}
              label={hasPractice ? "Practice and assess" : "Wrap up"}
              title={t({ en: "What's next", hi: "Aage kya" })}
              active={step === total}
              done={!!saved?.completed}
              onClick={() => go(total)}
            />
          </ol>
        </nav>

        {/* Current step */}
        <div className="min-w-0">
          {section ? (
            <SectionCard key={section.id} section={section} topic={topic} />
          ) : (
            <WrapUp lesson={lesson} topic={topic} hasPractice={hasPractice} />
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="btn btn-ghost">
              <ArrowLeft size={17} aria-hidden />
              Back
            </button>
            {step < total && (
              <button type="button" onClick={() => go(step + 1)} className="btn btn-primary px-5">
                {step === total - 1
                  ? t({ en: "Finish lesson", hi: "Lesson finish karo" })
                  : t({ en: "Next", hi: "Next" })}
                <ArrowRight size={17} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepButton({
  index,
  label,
  title,
  active,
  done,
  onClick,
}: {
  index: number;
  label: string;
  title: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "step" : undefined}
        className={`flex w-full min-w-[10rem] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
          active ? "border-ket/60 bg-ket/10" : "border-transparent hover:bg-white/[0.05]"
        }`}
      >
        <span
          className={`ket flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${
            active
              ? "border-ket bg-ket text-void"
              : done
                ? "border-ok/50 bg-ok/10 text-ok"
                : "border-line text-mute"
          }`}
        >
          {done && !active ? <Check size={14} aria-label="Done" /> : index + 1}
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-dim">{label}</span>
          <span className={`block truncate text-sm font-medium ${active ? "text-ink" : "text-mute"}`}>{title}</span>
        </span>
      </button>
    </li>
  );
}

function useCircuit(spec: CircuitSpec | undefined) {
  return useMemo(() => (spec ? buildCircuit(spec.qubits, spec.gates) : null), [spec]);
}

function SectionCard({ section, topic }: { section: LessonSection; topic: TopicId }) {
  const { t } = useApp();
  const circuit = useCircuit(section.circuit);

  return (
    <article className="panel animate-rise p-5 sm:p-7">
      <p className="text-sm font-semibold text-ket">{SECTION_LABEL[section.kind]}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t(section.title)}</h2>
      <div className="mt-3 flex max-w-[68ch] flex-col gap-3 text-[1.0625rem] leading-relaxed text-ink/90">
        {section.body.map((paragraph, index) => (
          <p key={index}>{t(paragraph)}</p>
        ))}
      </div>

      {section.points && (
        <ul className="mt-4 flex max-w-[68ch] flex-col gap-2">
          {section.points.map((point, index) => (
            <li key={index} className="well flex gap-3 px-4 py-3 leading-relaxed">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ket" />
              <span className="ket text-[0.9375rem]">{t(point)}</span>
            </li>
          ))}
        </ul>
      )}

      {section.code && <CodeExample source={section.code.source} output={section.code.output} />}

      {section.widget && (
        <div className="mt-5">
          <LessonWidget id={section.widget} />
        </div>
      )}

      {section.kind === "example" && circuit && (
        <div className="mt-5">
          <RunExample circuit={circuit} topic={topic} />
        </div>
      )}

      {section.kind === "predict" && circuit && (
        <div className="mt-5">
          <ExperimentFlow
            circuit={circuit}
            source="lesson"
            topic={topic}
            question={section.question ? t(section.question) : undefined}
          />
        </div>
      )}

      {section.note && <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-dim">{t(section.note)}</p>}
    </article>
  );
}

function CodeExample({ source, output }: { source: string; output: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="mt-4 max-w-[68ch]">
      <pre className="well overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="ket">{source}</code>
      </pre>
      {shown ? (
        <div className="mt-2 rounded-xl border border-ok/30 bg-ok/[0.06] p-4">
          <p className="text-xs font-semibold text-ok">Output</p>
          <pre className="ket mt-1 overflow-x-auto text-sm leading-relaxed">{output}</pre>
        </div>
      ) : (
        <button type="button" onClick={() => setShown(true)} className="btn btn-secondary mt-2 text-sm">
          Predict the output, then reveal it
        </button>
      )}
    </div>
  );
}

function WrapUp({ lesson, topic, hasPractice }: { lesson: Lesson; topic: TopicId; hasPractice: boolean }) {
  const { t } = useApp();
  return (
    <article className="panel animate-rise p-5 sm:p-7">
      <p className="flex items-center gap-2 text-sm font-semibold text-ok">
        <Check size={16} aria-hidden />
        {t({ en: "Lesson complete", hi: "Lesson complete" })}
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">
        {t({ en: "What you now know", hi: "Ab aap kya jaante ho" })}
      </h2>
      <ul className="mt-4 flex max-w-[68ch] flex-col gap-2">
        {lesson.takeaways.map((item, index) => (
          <li key={index} className="flex gap-3 leading-relaxed">
            <Check size={18} className="mt-1 shrink-0 text-ok" aria-hidden />
            <span>{t(item)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {hasPractice && (
          <div className="well p-4">
            <p className="text-sm font-semibold text-ket">Next: Practice</p>
            <p className="mt-1 text-sm leading-relaxed text-mute">
              {t({
                en: "Predict, run and compare on short challenges. Required practice is part of unlocking the next topic.",
                hi: "Chhote challenges par predict karo, run karo aur compare karo. Next topic unlock karne ke liye required practice zaroori hai.",
              })}
            </p>
            <Link href={`/practice?topic=${topic}`} className="btn btn-primary mt-3 text-sm">
              {t({ en: "Start practice", hi: "Practice start karo" })}
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        )}
        <div className="well p-4">
          <p className="text-sm font-semibold text-phase">{hasPractice ? "Then: Mastery check" : "Next: Mastery check"}</p>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            {t({
              en: "Five questions. Reach the mastery threshold to unlock what's next.",
              hi: "Paanch questions. Aage ka unlock karne ke liye mastery threshold reach karo.",
            })}
          </p>
          <Link href={`/assessment?topic=${topic}`} className={`btn mt-3 text-sm ${hasPractice ? "btn-secondary" : "btn-primary"}`}>
            {t({ en: "Take the mastery check", hi: "Mastery check lo" })}
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
