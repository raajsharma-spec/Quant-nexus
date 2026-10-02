"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, CircleDashed, ListChecks, PenLine, Send } from "lucide-react";
import { coreExperiment } from "@/data/concepts";
import { conceptContent } from "@/data/curriculum";
import { rubricById, type ExplainRubric } from "@/data/explanations";
import { misconceptionById } from "@/data/misconceptions";
import { explainCircuit } from "@/lib/explain";
import { evaluateExplanation, evaluateStructured, type ExplanationResult } from "@/lib/explanationEvaluator";
import { countsLabel } from "@/lib/prediction";
import { buildCircuit } from "@/lib/quantumSimulator";
import { passes, progressOf, stageScore } from "@/lib/stages";
import type { TopicId } from "@/lib/types";
import { useApp } from "../AppProvider";
import { WhyPanel } from "../SimulationResult";
import { useRunResult } from "./CoreExperiment";

type Mode = "written" | "structured";

interface FormProps {
  rubric: ExplainRubric;
  /** Receives the evaluated explanation. */
  onResult: (result: ExplanationResult, mode: Mode, text: string) => void;
  submitLabel: string;
  /** Lock the form (for example once a mastery-check item has been answered). */
  disabled?: boolean;
}

/**
 * Where the learner explains a result in their own words. They may write
 * freely, or — if typing is a barrier — assemble the explanation from sentence
 * choices. Either way the same ideas are checked.
 */
export function ExplanationForm({ rubric, onResult, submitLabel, disabled = false }: FormProps) {
  const { t } = useApp();
  const [mode, setMode] = useState<Mode>("written");
  const [text, setText] = useState("");
  const [choices, setChoices] = useState<Array<number | null>>(() => rubric.structured.map(() => null));
  const [analyzing, setAnalyzing] = useState(false);
  const alive = useRef(true);
  const fieldId = useId();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const ready = mode === "written" ? words >= 4 : choices.every((choice) => choice !== null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || analyzing || disabled) return;
    setAnalyzing(true);
    // A short pause: the learner sees that their answer is being read, not rubber-stamped.
    window.setTimeout(() => {
      if (!alive.current) return;
      const result = mode === "written" ? evaluateExplanation(text, rubric) : evaluateStructured(choices, rubric);
      const said =
        mode === "written"
          ? text
          : rubric.structured
              .map((item, index) => {
                const choice = choices[index];
                return choice === null ? "" : `${item.stem.en} ${item.options[choice].en}`;
              })
              .join(" ");
      setAnalyzing(false);
      onResult(result, mode, said);
    }, 650);
  };

  const tab = (value: Mode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      disabled={disabled || analyzing}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
        mode === value ? "bg-phase/20 text-ink" : "text-mute hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="rounded-2xl border border-phase/35 bg-phase/[0.05] p-4 sm:p-5">
      <p className="text-base font-semibold leading-snug">{t(rubric.prompt)}</p>

      <div role="tablist" aria-label="How to answer" className="mt-3 inline-flex gap-1 rounded-xl border border-line bg-void/50 p-1">
        {tab("written", <PenLine size={15} aria-hidden />, t({ en: "Write it", hi: "Likho" }))}
        {tab("structured", <ListChecks size={15} aria-hidden />, t({ en: "Build it from sentences", hi: "Sentences se banao" }))}
      </div>

      {mode === "written" ? (
        <div className="mt-3">
          <label htmlFor={fieldId} className="sr-only">
            Your explanation
          </label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={disabled || analyzing}
            rows={5}
            maxLength={600}
            placeholder={t({
              en: "In your own words: what state was the qubit in, what did each gate do, and why did the measurement come out this way?",
              hi: "Apne words mein: qubit kis state mein tha, har gate ne kya kiya, aur measurement aisa kyun aaya?",
            })}
            className="w-full rounded-xl border border-line bg-void/70 px-4 py-3 leading-relaxed placeholder:text-dim"
          />
          <p className="mt-1 text-xs text-dim">
            {t({
              en: `${words} words · English or Hinglish. Ideas are checked, not spelling or length.`,
              hi: `${words} words · English ya Hinglish. Ideas check hote hain, spelling ya length nahi.`,
            })}
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {rubric.structured.map((item, index) => (
            <fieldset key={item.idea} disabled={disabled || analyzing} className="min-w-0">
              <legend className="mb-2 text-[0.9375rem] font-medium leading-snug">
                <span className="ket mr-2 text-xs text-dim">{index + 1}</span>
                {t(item.stem)} …
              </legend>
              <div className="flex flex-col gap-1.5">
                {item.options.map((option, optionIndex) => {
                  const checked = choices[index] === optionIndex;
                  return (
                    <label
                      key={optionIndex}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ket ${
                        checked ? "border-phase bg-phase/15" : "border-line hover:border-ink/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${fieldId}-${index}`}
                        checked={checked}
                        onChange={() => setChoices((list) => list.map((value, i) => (i === index ? optionIndex : value)))}
                        className="h-4 w-4 shrink-0 accent-[#a892ff]"
                      />
                      <span className="leading-snug">… {t(option)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!ready || analyzing || disabled} className="btn btn-primary">
          <Send size={16} aria-hidden />
          <span aria-live="polite">
            {analyzing ? t({ en: "Analyzing your explanation…", hi: "Aapka explanation analyze ho raha hai…" }) : submitLabel}
          </span>
        </button>
        {!ready && !analyzing && (
          <p className="text-sm text-mute">
            {mode === "written"
              ? t({ en: "Write at least a sentence.", hi: "Kam se kam ek sentence likho." })
              : t({ en: "Choose an ending for every sentence.", hi: "Har sentence ka ending choose karo." })}
          </p>
        )}
      </div>
    </form>
  );
}

/** What the evaluator found: ideas present, ideas missing, and any misconception. */
export function ExplanationFeedback({
  result,
  threshold,
  showHints,
}: {
  result: ExplanationResult;
  threshold: number;
  /** Hints point at a missing idea without writing it. Off inside a mastery check. */
  showHints: boolean;
}) {
  const { t } = useApp();
  const passed = passes(result.score, threshold);
  return (
    <div
      aria-live="polite"
      className={`animate-rise rounded-2xl border p-4 sm:p-5 ${passed ? "border-ok/40 bg-ok/[0.06]" : "border-warn/40 bg-warn/[0.06]"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`text-base font-semibold ${passed ? "text-ok" : "text-warn"}`}>{t(result.verdict)}</p>
        <p className="ket text-sm text-mute">
          {t({ en: "Explanation score", hi: "Explanation score" })}:{" "}
          <span className="text-lg font-semibold text-ink">{result.score}%</span>
        </p>
      </div>

      {(result.covered.length > 0 || result.missing.length > 0) && (
        <ul className="mt-3 flex flex-col gap-2 text-[0.9375rem]">
          {result.covered.map((idea) => (
            <li key={idea.id} className="flex gap-2.5 leading-snug">
              <Check size={17} className="mt-0.5 shrink-0 text-ok" aria-label="Present" />
              <span>{t(idea.label)}</span>
            </li>
          ))}
          {result.missing.map((idea) => (
            <li key={idea.id} className="flex gap-2.5 leading-snug">
              <CircleDashed size={17} className="mt-0.5 shrink-0 text-warn" aria-label="Missing" />
              <span>
                <span className="text-ink/90">
                  {showHints ? t(idea.hint) : t({ en: "One key idea is still missing.", hi: "Ek key idea abhi missing hai." })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {result.bonus.length > 0 && (
        <p className="mt-3 text-sm text-mute">
          {t({ en: "Beyond what was asked, you also mentioned: ", hi: "Jo maanga gaya usse aage, aapne yeh bhi mention kiya: " })}
          {result.bonus.map((idea) => t(idea.label)).join("; ")}.
        </p>
      )}

      {result.misconceptions.map((detection) => {
        const info = misconceptionById(detection.misconception);
        if (!info) return null;
        return (
          <div key={detection.misconception} className="mt-3 flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3.5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
            <div className="text-[0.9375rem] leading-relaxed">
              <p className="font-semibold text-warn">
                {t({ en: "Possible misconception: ", hi: "Possible misconception: " })}
                {t(info.title)}
              </p>
              <p className="mt-1 text-ink/90">{t(info.correction)}</p>
              <p className="mt-1 text-sm text-mute">{t(info.evidence)}</p>
            </div>
          </div>
        );
      })}

      {result.reasoning === "listed" && result.missing.length === 0 && (
        <p className="mt-3 text-sm text-mute">
          {t({
            en: "Every idea is there. To reach 100%, connect them: say what causes what (“because…”, “so…”).",
            hi: "Har idea maujood hai. 100% ke liye unhe connect karo: batao kya kis wajah se hota hai (“kyunki…”, “isliye…”).",
          })}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 09 · Explain
// ---------------------------------------------------------------------------

export function ExplainStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const content = conceptContent(topic);
  const rubric = content ? rubricById(content.explainRubric) : undefined;
  const progress = progressOf(state, topic);
  const threshold = state.settings.masteryThreshold;
  const [latest, setLatest] = useState<ExplanationResult | null>(null);
  /** Bumped after each attempt so the form keeps the text but feedback re-announces. */
  const [attempt, setAttempt] = useState(0);

  const circuit = useMemo(() => {
    const core = coreExperiment(topic);
    return core ? buildCircuit(core.circuit.qubits, core.circuit.gates) : null;
  }, [topic]);
  const run = progress.run;
  const result = useRunResult(circuit, run);

  if (!content || !rubric) return null;
  const score = stageScore(progress, "explain");
  const passed = passes(score, threshold);
  const attempts = progress.attempts.explain ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {run && (
        <p className="well px-4 py-3 text-[0.9375rem] leading-relaxed">
          <span className="text-mute">{t({ en: "Your run: ", hi: "Aapka run: " })}</span>
          <span className="ket font-semibold">{run.circuit}</span>
          <span className="text-mute"> → </span>
          <span className="ket">{countsLabel(run.counts, run.shots)}</span>
          <span className="text-mute">
            {" "}
            ({run.shots.toLocaleString()} shots)
          </span>
        </p>
      )}

      <ExplanationForm
        rubric={rubric}
        submitLabel={
          attempts > 0
            ? t({ en: "Submit improved explanation", hi: "Improved explanation submit karo" })
            : t({ en: "Submit explanation", hi: "Explanation submit karo" })
        }
        onResult={(evaluated, mode, text) => {
          setLatest(evaluated);
          setAttempt((n) => n + 1);
          actions.recordExplanation({ topic, rubricId: rubric.id, mode, text, result: evaluated, purpose: "explain" });
        }}
      />

      {latest && <ExplanationFeedback key={attempt} result={latest} threshold={threshold} showHints />}

      {!passed && attempts > 0 && (
        <p className="text-sm text-mute">
          {t({
            en: `Best so far: ${score}%. Add the missing ideas to what you wrote and submit again — there is no limit on attempts.`,
            hi: `Ab tak best: ${score}%. Jo ideas missing hain unhe apne answer mein add karke dobara submit karo — attempts ki koi limit nahi.`,
          })}
        </p>
      )}

      {passed && (
        <div className="flex animate-rise flex-col gap-4">
          <div className="well p-4 sm:p-5">
            <p className="text-sm font-semibold text-ok">{t({ en: "A model explanation, for comparison", hi: "Ek model explanation, compare karne ke liye" })}</p>
            <p className="mt-2 max-w-[70ch] text-[1.0625rem] leading-relaxed">{t(rubric.model)}</p>
          </div>
          {result && <WhyPanel result={result} explanation={explainCircuit(result)} t={t} />}
        </div>
      )}
    </div>
  );
}
