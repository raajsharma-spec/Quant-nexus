"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleDashed, ClipboardCheck, RotateCcw, X } from "lucide-react";
import type { BuildTask } from "@/data/curriculum";
import type { Difficulty, QuizQuestion } from "@/data/quizzes";
import type { AssessItemResult } from "@/lib/actions";
import {
  assessmentSlots,
  BUILD_SLOT,
  buildItem,
  checkBuild,
  DEMONSTRATED,
  nextDifficulty,
  planAssessment,
  slotLabel,
  WRITE_SLOT,
  type AssessItem,
  type AssessmentPlan,
  type BuildCheck,
} from "@/lib/adaptiveAssessment";
import type { ExplanationResult } from "@/lib/explanationEvaluator";
import { buildCircuit, type Circuit } from "@/lib/quantumSimulator";
import { passes, progressOf, stageScore } from "@/lib/stages";
import type { L, TopicId } from "@/lib/types";
import { useApp } from "../AppProvider";
import { CircuitEditor } from "../CircuitEditor";
import { QuantumCircuit } from "../QuantumCircuit";
import { ExplanationFeedback, ExplanationForm } from "./ExplainPanel";

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  1: "Beginner",
  2: "Developing",
  3: "Proficient",
  4: "Advanced",
};

interface Answered {
  credit: number;
  itemId: string;
  chosen?: number;
}

interface Session {
  plan: AssessmentPlan;
  /** Position in plan.slots. */
  index: number;
  difficulty: Difficulty;
  item: AssessItem;
  results: AssessItemResult[];
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

function QuestionItem({ question, onAnswer }: { question: QuizQuestion; onAnswer: (answer: Answered) => void }) {
  const { t } = useApp();
  const [choice, setChoice] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const name = useId();
  const circuit = useMemo(
    () => (question.circuit ? buildCircuit(question.circuit.qubits, question.circuit.gates) : null),
    [question]
  );
  const correct = locked && choice === question.answer;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (choice === null || locked) return;
        setLocked(true);
        onAnswer({ credit: choice === question.answer ? 1 : 0, itemId: question.id, chosen: choice });
      }}
    >
      <fieldset disabled={locked} className="min-w-0">
        <legend className="mb-3 text-lg font-semibold leading-snug">{t(question.prompt)}</legend>
        {circuit && (
          <div className="well mb-3 px-4 py-2">
            <QuantumCircuit circuit={circuit} trim />
          </div>
        )}
        {question.code && (
          <pre className="well mb-3 overflow-x-auto p-4 text-sm leading-relaxed">
            <code className="ket">{question.code}</code>
          </pre>
        )}
        <div className="flex flex-col gap-2">
          {question.options.map((option, index) => {
            const checked = choice === index;
            const isAnswer = locked && index === question.answer;
            const isWrongPick = locked && checked && index !== question.answer;
            return (
              <label
                key={index}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ket ${
                  isAnswer
                    ? "border-ok/60 bg-ok/10"
                    : isWrongPick
                      ? "border-warn/60 bg-warn/10"
                      : checked
                        ? "border-ket bg-ket/10"
                        : "border-line hover:border-ink/30"
                } ${locked && !isAnswer && !isWrongPick ? "opacity-55" : ""}`}
              >
                <input
                  type="radio"
                  name={name}
                  checked={checked}
                  onChange={() => setChoice(index)}
                  className="h-4 w-4 shrink-0 accent-[#5ad7f0]"
                />
                <span className="flex-1 leading-snug">{t(option)}</span>
                {isAnswer && <Check size={17} className="shrink-0 text-ok" aria-label="Correct answer" />}
                {isWrongPick && <X size={17} className="shrink-0 text-warn" aria-label="Your answer" />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {!locked ? (
        <button type="submit" disabled={choice === null} className="btn btn-primary mt-4">
          {t({ en: "Submit answer", hi: "Answer submit karo" })}
        </button>
      ) : (
        <div
          aria-live="polite"
          className={`mt-4 animate-rise rounded-xl border p-4 ${correct ? "border-ok/40 bg-ok/[0.06]" : "border-warn/40 bg-warn/[0.06]"}`}
        >
          <p className={`font-semibold ${correct ? "text-ok" : "text-warn"}`}>
            {correct ? t({ en: "Correct.", hi: "Sahi." }) : t({ en: "Not this time.", hi: "Is baar nahi." })}
          </p>
          <p className="mt-1 leading-relaxed text-ink/90">{t(question.explanation)}</p>
        </div>
      )}
    </form>
  );
}

function BuildItem({ task, onAnswer }: { task: BuildTask; onAnswer: (answer: Answered) => void }) {
  const { t } = useApp();
  const [circuit, setCircuit] = useState<Circuit>(() => buildCircuit(task.qubits, [], 5));
  const [check, setCheck] = useState<BuildCheck | null>(null);

  const submit = () => {
    if (check) return;
    const outcome = checkBuild(task, circuit);
    setCheck(outcome);
    onAnswer({ credit: outcome.correct ? 1 : 0, itemId: task.id });
  };

  return (
    <div>
      <p className="mb-1 text-lg font-semibold leading-snug">{t(task.prompt)}</p>
      <p className="mb-3 text-sm text-mute">
        {t({
          en: "Pick a gate, then click a spot on the wire. Click a placed gate to remove it. Your circuit is checked by simulating it.",
          hi: "Gate choose karo, phir wire par jagah click karo. Placed gate par click karke remove karo. Aapka circuit simulate karke check hota hai.",
        })}
      </p>
      <div className={check ? "pointer-events-none opacity-80" : ""} aria-disabled={!!check}>
        <CircuitEditor circuit={circuit} onChange={setCircuit} palette={task.palette} compact />
      </div>
      {!check ? (
        <button type="button" onClick={submit} disabled={circuit.gates.length === 0} className="btn btn-primary mt-4">
          {t({ en: "Submit my circuit", hi: "Mera circuit submit karo" })}
        </button>
      ) : (
        <div
          aria-live="polite"
          className={`mt-4 animate-rise rounded-xl border p-4 ${check.correct ? "border-ok/40 bg-ok/[0.06]" : "border-warn/40 bg-warn/[0.06]"}`}
        >
          <p className={`font-semibold ${check.correct ? "text-ok" : "text-warn"}`}>{t(check.message)}</p>
          <p className="mt-1 leading-relaxed text-ink/90">{t(task.explanation)}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10 · Assess
// ---------------------------------------------------------------------------

export function AssessStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const threshold = state.settings.masteryThreshold;
  const progress = progressOf(state, topic);
  const score = stageScore(progress, "assess");
  const passed = passes(score, threshold);
  const slots = assessmentSlots(topic);

  const [session, setSession] = useState<Session | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [written, setWritten] = useState<ExplanationResult | null>(null);
  const [updating, setUpdating] = useState(false);
  const [finished, setFinished] = useState<"full" | "targeted" | null>(null);
  const alive = useRef(true);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Find the next slot (from `from` onward) that has an item, and build it. */
  const itemFrom = (plan: AssessmentPlan, from: number, difficulty: Difficulty) => {
    for (let index = from; index < plan.slots.length; index++) {
      const item = buildItem(state, topic, plan.slots[index], difficulty, plan.prefer);
      if (item) return { index, item };
    }
    return null;
  };

  const start = () => {
    const plan = planAssessment(state, topic);
    const first = itemFrom(plan, 0, plan.startDifficulty);
    if (!first) return;
    setFinished(null);
    setAnswered(null);
    setWritten(null);
    setSession({ plan, index: first.index, difficulty: plan.startDifficulty, item: first.item, results: [] });
    actions.track("quizStarted", { topic, meta: { kind: plan.kind, items: plan.slots.length } });
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const next = () => {
    if (!session || !answered) return;
    const result: AssessItemResult = {
      slot: session.item.slot,
      itemId: answered.itemId,
      credit: answered.credit,
      difficulty: session.item.kind === "question" ? session.item.question.difficulty : session.difficulty,
      chosen: answered.chosen,
    };
    const results = [...session.results, result];
    // The check adapts: harder after a correct answer, easier after a miss.
    const difficulty =
      session.item.kind === "question" ? nextDifficulty(session.difficulty, answered.credit >= 1) : session.difficulty;
    const following = itemFrom(session.plan, session.index + 1, difficulty);
    setAnswered(null);
    setWritten(null);

    if (following) {
      setSession({ ...session, index: following.index, difficulty, item: following.item, results });
      top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }

    setSession(null);
    setUpdating(true);
    window.setTimeout(() => {
      if (!alive.current) return;
      actions.recordStageAssessment(topic, results, session.plan.kind);
      setUpdating(false);
      setFinished(session.plan.kind);
    }, 800);
  };

  const itemRows = (
    <ul className="flex flex-col gap-2">
      {slots.map((slot) => {
        const record = progress.assess[slot];
        const shown = record ? record.credit >= DEMONSTRATED : false;
        return (
          <li key={slot} className="well flex items-center gap-3 px-4 py-2.5">
            {shown ? (
              <Check size={17} className="shrink-0 text-ok" aria-hidden />
            ) : (
              <CircleDashed size={17} className="shrink-0 text-dim" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-medium leading-snug">{slotLabel(topic, slot)}</span>
              <span className="block text-xs text-mute">
                {slot === BUILD_SLOT
                  ? t({ en: "Checked by simulating your circuit", hi: "Aapka circuit simulate karke check hota hai" })
                  : slot === WRITE_SLOT
                    ? t({ en: "Scored against the key ideas", hi: "Key ideas ke against score hota hai" })
                    : t({ en: "One question, chosen for your level", hi: "Ek question, aapke level ke hisaab se" })}
              </span>
            </span>
            <span className={`text-sm font-semibold ${shown ? "text-ok" : record ? "text-warn" : "text-dim"}`}>
              {shown
                ? t({ en: "Demonstrated", hi: "Demonstrated" })
                : record
                  ? t({ en: "Not yet", hi: "Not yet" })
                  : t({ en: "Not attempted", hi: "Not attempted" })}
            </span>
          </li>
        );
      })}
    </ul>
  );

  // --- Updating --------------------------------------------------------------
  if (updating) {
    return (
      <div ref={top} role="status" className="well flex items-center gap-3 p-6 text-lg">
        <span className="h-3 w-3 animate-pulse-wire rounded-full bg-ket" aria-hidden />
        {t({ en: "Updating mastery…", hi: "Mastery update ho rahi hai…" })}
      </div>
    );
  }

  // --- An item ---------------------------------------------------------------
  if (session) {
    const { item, plan, index } = session;
    const position = index + 1;
    const label: L =
      item.kind === "build"
        ? { en: "Build a circuit", hi: "Circuit banao" }
        : item.kind === "write"
          ? { en: "Explain in your own words", hi: "Apne words mein explain karo" }
          : { en: item.slot, hi: item.slot };
    return (
      <div ref={top} className="scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-ket">
            {t({ en: `Item ${position} of ${plan.slots.length}`, hi: `Item ${position} / ${plan.slots.length}` })} · {t(label)}
          </p>
          <p className="text-mute">
            {plan.kind === "targeted" ? t({ en: "Targeted retry", hi: "Targeted retry" }) : t({ en: "Full check", hi: "Full check" })}
            {item.kind === "question" && ` · ${DIFFICULTY_LABEL[item.question.difficulty]}`}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Mastery check progress"
          aria-valuemin={0}
          aria-valuemax={plan.slots.length}
          aria-valuenow={index}
          className="mb-5 h-1.5 w-full rounded-full bg-white/[0.07]"
        >
          <div className="h-full rounded-full bg-ket transition-all" style={{ width: `${(index / plan.slots.length) * 100}%` }} />
        </div>

        {item.kind === "question" && <QuestionItem key={item.question.id} question={item.question} onAnswer={setAnswered} />}
        {item.kind === "build" && <BuildItem key={item.task.id} task={item.task} onAnswer={setAnswered} />}
        {item.kind === "write" && (
          <div className="flex flex-col gap-3">
            <ExplanationForm
              key={item.rubric.id}
              rubric={item.rubric}
              disabled={!!answered}
              submitLabel={t({ en: "Submit explanation", hi: "Explanation submit karo" })}
              onResult={(result, mode, text) => {
                setWritten(result);
                setAnswered({ credit: result.score / 100, itemId: item.rubric.id });
                actions.recordExplanation({ topic, rubricId: item.rubric.id, mode, text, result, purpose: "assess" });
              }}
            />
            {written && <ExplanationFeedback result={written} threshold={threshold} showHints={false} />}
          </div>
        )}

        {answered && (
          <button type="button" onClick={next} className="btn btn-primary mt-5 px-5">
            {position === plan.slots.length
              ? t({ en: "Finish and update mastery", hi: "Finish karo aur mastery update karo" })
              : t({ en: "Next item", hi: "Next item" })}
            <ArrowRight size={17} aria-hidden />
          </button>
        )}
      </div>
    );
  }

  // --- Intro and result --------------------------------------------------------
  const open = slots.filter((slot) => (progress.assess[slot]?.credit ?? 0) < DEMONSTRATED);
  const attempted = progress.assessAttempts > 0;

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-4">
      {finished ? (
        <div
          aria-live="polite"
          className={`animate-rise rounded-2xl border p-5 ${passed ? "border-ok/40 bg-ok/[0.07]" : "border-warn/40 bg-warn/[0.06]"}`}
        >
          <p className={`text-xl font-semibold ${passed ? "text-ok" : "text-warn"}`}>
            {passed
              ? t({ en: "Mastery check passed.", hi: "Mastery check pass ho gaya." })
              : t({ en: "Not at the threshold yet.", hi: "Abhi threshold tak nahi pahunche." })}
          </p>
          <p className="mt-1 leading-relaxed text-ink/90">
            {t({
              en: `Your mastery-check score is ${score}%. The threshold is ${threshold}%.`,
              hi: `Aapka mastery-check score ${score}% hai. Threshold ${threshold}% hai.`,
            })}{" "}
            {!passed &&
              t({
                en: `${open.length} item${open.length === 1 ? "" : "s"} still to demonstrate. A retry brings back only those, each with a different question.`,
                hi: `${open.length} item abhi demonstrate karna baaki. Retry mein sirf wahi wapas aate hain, har ek naye question ke saath.`,
              })}
          </p>
        </div>
      ) : (
        <p className="max-w-[68ch] text-[1.0625rem] leading-relaxed text-ink/90">
          {attempted
            ? t({
                en: `Your mastery-check score is ${score}% (threshold ${threshold}%). ${open.length > 0 ? "A retry is targeted: only the items you have not demonstrated come back." : "Every item is demonstrated."}`,
                hi: `Aapka mastery-check score ${score}% hai (threshold ${threshold}%). ${open.length > 0 ? "Retry targeted hai: sirf wahi items wapas aate hain jo demonstrate nahi hue." : "Har item demonstrate ho gaya."}`,
              })
            : t({
                en: `${slots.length} items: questions chosen for your level, one circuit to build and one explanation to write. No hints here — this is where you show what you know. You need ${threshold}% to pass, and you can retry as often as you like.`,
                hi: `${slots.length} items: aapke level ke questions, ek circuit banana aur ek explanation likhna. Yahan hints nahi — yahan aap dikhate ho ki kya aata hai. Pass ke liye ${threshold}% chahiye, aur jitni baar chaho retry kar sakte ho.`,
              })}
        </p>
      )}

      {itemRows}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={start} className={`btn ${passed ? "btn-secondary" : "btn-primary px-5 py-3 text-base"}`}>
          {attempted ? <RotateCcw size={17} aria-hidden /> : <ClipboardCheck size={18} aria-hidden />}
          {!attempted
            ? t({ en: "Start the mastery check", hi: "Mastery check start karo" })
            : open.length > 0 && open.length < slots.length
              ? t({ en: `Targeted retry (${open.length} item${open.length === 1 ? "" : "s"})`, hi: `Targeted retry (${open.length} item)` })
              : passed
                ? t({ en: "Take it again for practice", hi: "Practice ke liye dobara lo" })
                : t({ en: "Retry the mastery check", hi: "Mastery check retry karo" })}
        </button>
        {attempted && !passed && (
          <Link href="/ai-tutor?ask=mistake" className="btn btn-ghost">
            {t({ en: "Ask the tutor to review my mistake", hi: "Tutor se meri mistake review karwao" })}
          </Link>
        )}
      </div>
    </div>
  );
}
