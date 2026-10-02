"use client";

import { Suspense, useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, CircleDashed, Lock, RotateCcw, X } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Meter, PageHeader, StatusBadge } from "@/components/ui";
import { quizFor } from "@/data/quizzes";
import { INTERACTIVE_TOPICS, topicMeta } from "@/data/topics";
import { assessmentSlots, DEMONSTRATED, slotLabel } from "@/lib/adaptiveAssessment";
import { canOpenStage, topicMastery, topicStatus } from "@/lib/mastery";
import { lockMessage, passes, progressOf, stageScore } from "@/lib/stages";
import type { TopicId } from "@/lib/types";

/** The optional Python warm-up keeps its short five-question check. */
function PythonCheck() {
  const { state, t, actions } = useApp();
  const questions = quizFor("python");
  const threshold = state.settings.masteryThreshold;
  const m = topicMastery(state, "python");
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const name = useId();

  const start = () => {
    setRunning(true);
    setIndex(0);
    setChosen([]);
    setSelected(null);
    setResult(null);
    actions.track("quizStarted", { topic: "python" });
  };

  const answer = () => {
    if (selected === null) return;
    const all = [...chosen, selected];
    if (index + 1 < questions.length) {
      setChosen(all);
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    const answers = questions.map((q, i) => ({ questionId: q.id, concept: q.concept, correct: all[i] === q.answer }));
    actions.recordAssessment("python", answers);
    setResult(Math.round((answers.filter((a) => a.correct).length / answers.length) * 100));
    setChosen(all);
    setRunning(false);
  };

  const question = questions[index];

  return (
    <section aria-labelledby="python-check" className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="python-check" className="text-lg font-semibold">
          Python Foundations <span className="text-sm font-normal text-mute">· optional warm-up</span>
        </h2>
        <StatusBadge status={topicStatus(state, "python")} />
      </div>

      {!running ? (
        <>
          <p className="mt-1.5 max-w-[66ch] text-sm leading-relaxed text-mute">
            {t({
              en: `Five short questions. It never blocks the quantum concepts — it is here if you want to check your Python before reading circuit code.`,
              hi: `Paanch short questions. Yeh quantum concepts ko kabhi block nahi karta — circuit code padhne se pehle Python check karna ho to yahan hai.`,
            })}{" "}
            {m.bestScore !== null && `Best score ${m.bestScore}% across ${m.attempts} attempt${m.attempts === 1 ? "" : "s"}.`}
          </p>
          {result !== null && (
            <p
              aria-live="polite"
              className={`mt-3 rounded-xl border px-4 py-3 font-medium ${
                passes(result, threshold) ? "border-ok/40 bg-ok/10 text-ok" : "border-warn/40 bg-warn/10 text-warn"
              }`}
            >
              {t({ en: `You scored ${result}%.`, hi: `Aapka score ${result}%.` })}{" "}
              <span className="font-normal text-ink/90">
                {passes(result, threshold)
                  ? t({ en: "That is at or above the threshold.", hi: "Yeh threshold par ya usse upar hai." })
                  : t({ en: `The threshold is ${threshold}%. Revisit the lesson and try again.`, hi: `Threshold ${threshold}% hai. Lesson revisit karke dobara try karo.` })}
              </span>
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={start} className="btn btn-secondary text-sm">
              {m.bestScore === null ? null : <RotateCcw size={15} aria-hidden />}
              {m.bestScore === null ? t({ en: "Start the Python check", hi: "Python check start karo" }) : t({ en: "Retry", hi: "Retry" })}
            </button>
            <Link href="/learn/python" className="btn btn-ghost text-sm">
              {t({ en: "Open the lesson", hi: "Lesson kholo" })}
            </Link>
          </div>
        </>
      ) : (
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            answer();
          }}
        >
          <p className="mb-2 text-sm text-mute">
            {t({ en: `Question ${index + 1} of ${questions.length}`, hi: `Question ${index + 1} / ${questions.length}` })}
          </p>
          <fieldset className="min-w-0">
            <legend className="mb-3 text-lg font-semibold leading-snug">{t(question.prompt)}</legend>
            {question.code && (
              <pre className="well mb-3 overflow-x-auto p-4 text-sm leading-relaxed">
                <code className="ket">{question.code}</code>
              </pre>
            )}
            <div className="flex flex-col gap-2">
              {question.options.map((option, optionIndex) => (
                <label
                  key={optionIndex}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ket ${
                    selected === optionIndex ? "border-ket bg-ket/10" : "border-line hover:border-ink/30"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${name}-${index}`}
                    checked={selected === optionIndex}
                    onChange={() => setSelected(optionIndex)}
                    className="h-4 w-4 shrink-0 accent-[#5ad7f0]"
                  />
                  <span className="ket leading-snug">{t(option)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" disabled={selected === null} className="btn btn-primary mt-4">
            {index + 1 === questions.length ? t({ en: "Finish", hi: "Finish" }) : t({ en: "Next question", hi: "Next question" })}
            <ArrowRight size={16} aria-hidden />
          </button>
        </form>
      )}
    </section>
  );
}

function Assessment() {
  const { state, t } = useApp();
  const params = useSearchParams();
  const focus = params.get("topic") as TopicId | null;
  const threshold = state.settings.masteryThreshold;

  return (
    <>
      <PageHeader
        title="Assessment"
        lead={t({
          en: `Each concept ends in an adaptive mastery check: questions matched to your level, a circuit to build and an explanation to write. ${threshold}% is needed to pass, and a retry brings back only what was missed.`,
          hi: `Har concept ek adaptive mastery check par end hota hai: aapke level ke questions, ek circuit banana aur ek explanation likhna. Pass ke liye ${threshold}% chahiye, aur retry mein sirf wahi wapas aata hai jo miss hua.`,
        })}
      />

      <ul className="grid gap-4 lg:grid-cols-2">
        {INTERACTIVE_TOPICS.map((topic) => {
          const meta = topicMeta(topic);
          const status = topicStatus(state, topic);
          const progress = progressOf(state, topic);
          const score = stageScore(progress, "assess");
          const passed = passes(score, threshold);
          const canOpen = canOpenStage(state, topic, "assess");
          const slots = assessmentSlots(topic);
          const attempted = progress.assessAttempts > 0;
          const open = slots.filter((slot) => (progress.assess[slot]?.credit ?? 0) < DEMONSTRATED);

          return (
            <li
              key={topic}
              className={`panel flex flex-col p-5 sm:p-6 ${focus === topic ? "border-ket/60" : ""}`}
              aria-current={focus === topic ? "true" : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="ket text-sm text-mute">Module {meta.number}</span>
                <StatusBadge status={status} />
              </div>
              <h2 className={`mt-2 text-xl font-semibold ${status === "LOCKED" ? "text-mute" : ""}`}>{meta.title}</h2>

              {attempted ? (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="text-mute">
                      {t({ en: "Mastery-check score", hi: "Mastery-check score" })} ·{" "}
                      {t({
                        en: `${progress.assessAttempts} attempt${progress.assessAttempts === 1 ? "" : "s"}`,
                        hi: `${progress.assessAttempts} attempt`,
                      })}
                    </span>
                    <span className={`font-semibold tabular-nums ${passed ? "text-ok" : "text-warn"}`}>{score}%</span>
                  </div>
                  <Meter value={score} label={`${meta.title} mastery-check score`} tone={passed ? "ok" : "ket"} marker={threshold} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-mute">
                  {canOpen
                    ? t({ en: "Ready to take. Not attempted yet.", hi: "Lene ke liye ready. Abhi attempt nahi hua." })
                    : t({ en: "Not open yet.", hi: "Abhi open nahi." })}
                </p>
              )}

              <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                {slots.map((slot) => {
                  const record = progress.assess[slot];
                  const shown = (record?.credit ?? 0) >= DEMONSTRATED;
                  return (
                    <li key={slot} className="flex items-center gap-2.5">
                      {shown ? (
                        <Check size={15} className="shrink-0 text-ok" aria-label="Demonstrated" />
                      ) : record ? (
                        <X size={15} className="shrink-0 text-warn" aria-label="Not demonstrated yet" />
                      ) : (
                        <CircleDashed size={15} className="shrink-0 text-dim" aria-label="Not attempted" />
                      )}
                      <span className={shown ? "" : "text-mute"}>{slotLabel(topic, slot)}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto pt-5">
                {canOpen ? (
                  <Link href={`/learn/${topic}?stage=assess`} className={`btn text-sm ${passed ? "btn-secondary" : "btn-primary"}`}>
                    {!attempted
                      ? t({ en: "Start the mastery check", hi: "Mastery check start karo" })
                      : passed
                        ? t({ en: "Open the mastery check", hi: "Mastery check kholo" })
                        : t({ en: `Targeted retry (${open.length} item${open.length === 1 ? "" : "s"})`, hi: `Targeted retry (${open.length} item)` })}
                    <ArrowRight size={15} aria-hidden />
                  </Link>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-xl border border-line bg-void/50 px-3.5 py-3 text-sm">
                    <Lock size={15} className="mt-0.5 shrink-0 text-mute" aria-hidden />
                    <span className="text-mute">
                      {status === "LOCKED"
                        ? t({
                            en: "Locked. Master the concept before this one to open it.",
                            hi: "Locked. Ise open karne ke liye isse pehle wala concept master karo.",
                          })
                        : t(lockMessage("assess", threshold))}
                      {status !== "LOCKED" && (
                        <>
                          {" "}
                          <Link href={`/learn/${topic}`} className="font-medium text-ket hover:underline">
                            {t({ en: "Continue the concept", hi: "Concept continue karo" })}
                          </Link>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <PythonCheck />
        <RecommendationCard />
      </div>
    </>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={null}>
      <Assessment />
    </Suspense>
  );
}
