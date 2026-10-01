"use client";

import { Suspense, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Lock, RotateCcw, Unlock, X } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { MasteryCard } from "@/components/MasteryCard";
import { QuantumCircuit } from "@/components/QuantumCircuit";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Meter, PageHeader, StatusBadge } from "@/components/ui";
import { quizFor, type QuizQuestion } from "@/data/quizzes";
import { INTERACTIVE_TOPICS, topicMeta, topicTitle } from "@/data/topics";
import { hasUnresolvedError, nextTopic, topicMastery, topicStatus } from "@/lib/mastery";
import { buildCircuit } from "@/lib/quantumSimulator";
import type { TopicId } from "@/lib/types";

const TOPICS: TopicId[] = ["python", ...INTERACTIVE_TOPICS];
const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  mcq: "Multiple choice",
  prediction: "Prediction",
  conceptual: "Concept",
};

type Phase = "pick" | "intro" | "quiz" | "result";

function Assessment() {
  const { state, t, actions } = useApp();
  const params = useSearchParams();
  const requested = params.get("topic") as TopicId | null;
  const validRequest =
    requested && TOPICS.includes(requested) && topicStatus(state, requested) !== "LOCKED" ? requested : null;

  const [topic, setTopic] = useState<TopicId | null>(validRequest);
  const [phase, setPhase] = useState<Phase>(validRequest ? "intro" : "pick");
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const threshold = state.settings.masteryThreshold;
  const questions = useMemo(() => (topic ? quizFor(topic) : []), [topic]);

  const open = (next: TopicId) => {
    setTopic(next);
    setPhase("intro");
  };

  const start = () => {
    if (!topic) return;
    setIndex(0);
    setChosen([]);
    setSelected(null);
    setPhase("quiz");
    actions.track("quizStarted", { topic });
  };

  const answer = () => {
    if (!topic || selected === null) return;
    const question = questions[index];
    const all = [...chosen, selected];
    actions.track("quizAttempt", {
      topic,
      detail: question.id,
      meta: { correct: selected === question.answer, concept: question.concept },
    });
    if (index + 1 < questions.length) {
      setChosen(all);
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    setChosen(all);
    actions.recordAssessment(
      topic,
      questions.map((q, i) => ({ questionId: q.id, concept: q.concept, correct: all[i] === q.answer }))
    );
    setPhase("result");
  };

  // ----- Topic picker -------------------------------------------------------
  if (phase === "pick" || !topic) {
    return (
      <>
        <PageHeader
          title="Mastery Check"
          lead={t({
            en: `Five questions per topic. Score ${threshold}% or more, with the required practice done, to unlock the next concept. You can retry any time.`,
            hi: `Har topic ke paanch questions. Next concept unlock karne ke liye ${threshold}% ya zyada score karo, required practice ke saath. Kabhi bhi retry kar sakte ho.`,
          })}
        />
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TOPICS.map((id) => {
            const meta = topicMeta(id);
            const status = topicStatus(state, id);
            const m = topicMastery(state, id);
            const locked = status === "LOCKED";
            return (
              <li key={id} className="panel flex flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="ket text-sm text-mute">{id === "python" ? "Prerequisite" : `Module ${meta.number}`}</span>
                  <StatusBadge status={status} />
                </div>
                <h2 className={`mt-2 text-lg font-semibold ${locked ? "text-mute" : ""}`}>{meta.title}</h2>
                <p className="mt-1 text-sm text-mute">
                  {m.bestScore === null
                    ? locked
                      ? "Unlocks when you master the topic before it."
                      : "Not taken yet."
                    : `Best score ${m.bestScore}% across ${m.attempts} attempt${m.attempts === 1 ? "" : "s"}.`}
                </p>
                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    onClick={() => open(id)}
                    disabled={locked}
                    className={`btn text-sm ${m.bestScore === null ? "btn-primary" : "btn-secondary"}`}
                  >
                    {locked ? <Lock size={15} aria-hidden /> : null}
                    {locked ? "Locked" : m.bestScore === null ? "Start mastery check" : "Retry mastery check"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  const title = topicTitle(topic);
  const back = (
    <button
      type="button"
      onClick={() => setPhase("pick")}
      className="mb-3 inline-flex items-center gap-1.5 rounded text-sm text-mute hover:text-ink"
    >
      <ArrowLeft size={15} aria-hidden />
      All mastery checks
    </button>
  );

  // ----- Intro ----------------------------------------------------------------
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-3xl">
        {back}
        <section className="panel-lead p-6 sm:p-8">
          <p className="text-sm font-semibold text-ket">Mastery Check</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-mute">
            {t({
              en: `${questions.length} questions: a mix of multiple choice, prediction and concept questions. Score ${threshold}% or more to pass. There is no time limit.`,
              hi: `${questions.length} questions: multiple choice, prediction aur concept questions ka mix. Pass karne ke liye ${threshold}% ya zyada score karo. Koi time limit nahi hai.`,
            })}
          </p>
          <div className="mt-5">
            <MasteryCard topic={topic} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={start} className="btn btn-primary px-5 py-3 text-base">
              {t({ en: "Start mastery check", hi: "Mastery check start karo" })}
              <ArrowRight size={18} aria-hidden />
            </button>
            <Link href={`/learn/${topic}`} className="btn btn-secondary px-5 py-3 text-base">
              {t({ en: "Review the lesson first", hi: "Pehle lesson review karo" })}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ----- Quiz -------------------------------------------------------------------
  if (phase === "quiz") {
    const question = questions[index];
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold">{title} mastery check</span>
          <span className="tabular-nums text-mute" aria-live="polite">
            Question {index + 1} of {questions.length}
          </span>
        </div>
        <Meter value={(index / questions.length) * 100} label="Questions answered" tone="ket" />

        <QuestionCard
          key={question.id}
          question={question}
          selected={selected}
          onSelect={setSelected}
          onSubmit={answer}
          last={index + 1 === questions.length}
        />
      </div>
    );
  }

  // ----- Result -------------------------------------------------------------------
  const score = questions.filter((q, i) => chosen[i] === q.answer).length;
  const percent = Math.round((score / questions.length) * 100);
  const passed = percent >= threshold;
  const m = topicMastery(state, topic);
  const errorOpen = hasUnresolvedError(state);
  const mastered = passed && m.practiceDone && !errorOpen;
  const upcoming = topic === "python" ? "qubit" : nextTopic(topic);
  const upcomingInteractive = upcoming && INTERACTIVE_TOPICS.includes(upcoming);
  const missed = Array.from(
    new Set(questions.filter((q, i) => chosen[i] !== q.answer).map((q) => q.concept))
  );

  return (
    <div className="mx-auto max-w-4xl">
      {back}
      <section
        aria-labelledby="result-title"
        className={`panel-lead p-6 sm:p-8 ${mastered ? "border-ok/50" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <p className="text-sm text-mute">Score</p>
            <p className="text-6xl font-semibold tabular-nums tracking-tight">
              {score} <span className="text-3xl text-mute">/ {questions.length}</span>
            </p>
          </div>
          <div className="min-w-[15rem] flex-1">
            <h1 id="result-title" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {mastered ? (
                <>
                  <Check size={24} className="text-ok" aria-hidden />
                  {t({ en: "Mastery achieved", hi: "Mastery achieved" })}
                </>
              ) : passed ? (
                t({ en: "Score reached. One step left.", hi: "Score reach ho gaya. Ek step baaki." })
              ) : (
                t({ en: "Almost there.", hi: "Almost there." })
              )}
            </h1>
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-mute">Mastery progress</span>
                <span className="font-semibold tabular-nums">{percent}%</span>
              </div>
              <Meter value={percent} label="Mastery check score" tone={passed ? "ok" : "warn"} marker={threshold} />
              <p className="mt-1.5 text-xs text-dim">The line marks the {threshold}% mastery threshold.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          {mastered ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2.5 text-lg font-medium">
                <Unlock size={20} className="text-ok" aria-hidden />
                {topic === "python"
                  ? t({ en: "Python Foundations done. You're ready for qubits.", hi: "Python Foundations done. Aap qubits ke liye ready ho." })
                  : upcoming
                    ? t({ en: `Next topic unlocked: ${topicTitle(upcoming)}`, hi: `Next topic unlock ho gaya: ${topicTitle(upcoming)}` })
                    : t({ en: "Concept mastered.", hi: "Concept mastered." })}
              </p>
              {upcomingInteractive ? (
                <Link href={`/learn/${upcoming}`} className="btn btn-primary">
                  {t({ en: `Start ${topicTitle(upcoming)}`, hi: `${topicTitle(upcoming)} start karo` })}
                  <ArrowRight size={17} aria-hidden />
                </Link>
              ) : (
                <Link href="/lab" className="btn btn-primary">
                  {t({ en: "Experiment in the Quantum Lab", hi: "Quantum Lab mein experiment karo" })}
                  <ArrowRight size={17} aria-hidden />
                </Link>
              )}
            </div>
          ) : passed ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-[56ch] text-mute">
                {!m.practiceDone
                  ? t({
                      en: `You reached the threshold. Solve the required practice (${m.practiceSolved} of ${m.practiceTotal} done) to unlock the next topic.`,
                      hi: `Aapne threshold reach kar liya. Next topic unlock karne ke liye required practice solve karo (${m.practiceTotal} mein se ${m.practiceSolved} done).`,
                    })
                  : t({
                      en: "You reached the threshold. Your last lab run stopped with a circuit error — run one working circuit to unlock the next topic.",
                      hi: "Aapne threshold reach kar liya. Aapka last lab run circuit error par ruk gaya — next topic unlock karne ke liye ek working circuit run karo.",
                    })}
              </p>
              <Link href={!m.practiceDone ? `/practice?topic=${topic}` : "/lab"} className="btn btn-primary">
                {!m.practiceDone
                  ? t({ en: "Go to practice", hi: "Practice par jao" })
                  : t({ en: "Open Quantum Lab", hi: "Quantum Lab kholo" })}
                <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/learn/${topic}`} className="btn btn-primary">
                {t({ en: "Review weak concept", hi: "Weak concept review karo" })}
              </Link>
              {topic !== "python" && (
                <Link href={`/practice?topic=${topic}`} className="btn btn-secondary">
                  {t({ en: "Practice again", hi: "Practice again" })}
                </Link>
              )}
              <button type="button" onClick={start} className="btn btn-secondary">
                <RotateCcw size={16} aria-hidden />
                {t({ en: "Retry assessment", hi: "Assessment retry karo" })}
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_20rem]">
        {/* Answers */}
        <section aria-labelledby="answers-title" className="panel p-5 sm:p-6">
          <h2 id="answers-title" className="text-lg font-semibold">
            Correct answers
          </h2>
          <ol className="mt-4 flex flex-col gap-4">
            {questions.map((q, i) => {
              const right = chosen[i] === q.answer;
              return (
                <li key={q.id} className="well p-4">
                  <p className="flex items-start gap-2.5 font-medium">
                    {right ? (
                      <Check size={18} className="mt-0.5 shrink-0 text-ok" aria-label="Correct" />
                    ) : (
                      <X size={18} className="mt-0.5 shrink-0 text-warn" aria-label="Missed" />
                    )}
                    <span>
                      {i + 1}. {t(q.prompt)}
                    </span>
                  </p>
                  <dl className="mt-2 flex flex-col gap-1 pl-7 text-sm">
                    {!right && (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-mute">Your answer:</dt>
                        <dd className="ket">{t(q.options[chosen[i]])}</dd>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-mute">Correct answer:</dt>
                      <dd className="ket text-ok">{t(q.options[q.answer])}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 pl-7 text-sm leading-relaxed text-mute">{t(q.explanation)}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex flex-col gap-5">
          <section aria-labelledby="weak-title" className="panel p-5">
            <h2 id="weak-title" className="flex items-center gap-2 text-lg font-semibold">
              <CircleHelp size={18} className="text-warn" aria-hidden />
              Weak concepts
            </h2>
            {missed.length === 0 ? (
              <p className="mt-2 text-sm text-mute">
                {t({ en: "None this time. Every concept was answered correctly.", hi: "Is baar koi nahi. Har concept sahi answer hua." })}
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {missed.map((concept) => (
                  <li key={concept} className="tag border-warn/40 bg-warn/10 text-warn">
                    {concept}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <RecommendationCard heading="Recommendation" />
          <MasteryCard topic={topic} />
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  onSelect,
  onSubmit,
  last,
}: {
  question: QuizQuestion;
  selected: number | null;
  onSelect: (index: number) => void;
  onSubmit: () => void;
  last: boolean;
}) {
  const { t } = useApp();
  const name = useId();
  const circuit = useMemo(
    () => (question.circuit ? buildCircuit(question.circuit.qubits, question.circuit.gates) : null),
    [question]
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selected !== null) onSubmit();
      }}
      className="panel mt-5 animate-rise p-5 sm:p-7"
    >
      <fieldset className="min-w-0">
        <legend className="w-full">
          <span className="tag text-mute">{TYPE_LABEL[question.type]}</span>
          <span className="mt-3 block text-xl font-semibold leading-snug sm:text-2xl">{t(question.prompt)}</span>
        </legend>

        {circuit && (
          <div className="well mt-4 px-4 py-2">
            <QuantumCircuit circuit={circuit} trim />
          </div>
        )}
        {question.code && (
          <pre className="well mt-4 overflow-x-auto p-4 text-sm leading-relaxed">
            <code className="ket">{question.code}</code>
          </pre>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {question.options.map((option, i) => {
            const checked = selected === i;
            return (
              <label
                key={i}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ket ${
                  checked ? "border-ket bg-ket/10" : "border-line bg-void/40 hover:border-ink/30"
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  checked={checked}
                  onChange={() => onSelect(i)}
                  className="h-4 w-4 shrink-0 accent-[#5ad7f0]"
                />
                <span className="ket leading-snug">{t(option)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={selected === null} className="btn btn-primary px-5">
          {last ? t({ en: "Finish and see my score", hi: "Finish karo aur score dekho" }) : t({ en: "Next question", hi: "Next question" })}
          <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    </form>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={null}>
      <Assessment />
    </Suspense>
  );
}
