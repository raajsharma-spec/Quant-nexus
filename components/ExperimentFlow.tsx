"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Lock, Play } from "lucide-react";
import type { ChallengeOption } from "@/data/challenges";
import { explainCircuit, type Explanation } from "@/lib/explain";
import {
  buildPredictionOptions,
  countsLabel,
  type Distribution,
} from "@/lib/prediction";
import {
  describeCircuit,
  simulateCircuit,
  type Circuit,
  type SimulationSuccess,
} from "@/lib/quantumSimulator";
import type { TopicId } from "@/lib/types";
import { useApp } from "./AppProvider";
import { PredictionPanel } from "./PredictionPanel";
import { QuantumCircuit } from "./QuantumCircuit";
import { SimulationResult, type Outcome } from "./SimulationResult";

export type FlowStage = "predict" | "run" | "observe";

interface Props {
  circuit: Circuit;
  /** "guest" runs without saving anything (used on the landing page). */
  source: "lab" | "practice" | "lesson" | "guest";
  topic: TopicId;
  question?: string;
  /** Hand-written options. Leave out to build probability options from the circuit. */
  options?: ChallengeOption[];
  correctId?: string;
  challengeId?: string;
  showCircuit?: boolean;
  onStageChange?: (stage: FlowStage) => void;
  onComplete?: (correct: boolean) => void;
  /** Extra actions shown under the result. */
  after?: (outcome: Outcome) => React.ReactNode;
}

interface Finished {
  result: SimulationSuccess;
  outcome: Outcome;
  explanation: Explanation;
}

/**
 * The heart of Quantum Nexus:  Predict → Run → Observe → Explain.
 * Run stays locked until the learner has submitted a prediction.
 */
export function ExperimentFlow({
  circuit,
  source,
  topic,
  question,
  options,
  correctId,
  challengeId,
  showCircuit = true,
  onStageChange,
  onComplete,
  after,
}: Props) {
  const { t, actions } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState<Finished | null>(null);
  const timer = useRef<number | null>(null);
  const hintId = useId();

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  // Build the question's options once per circuit.
  const prediction = useMemo(() => {
    const auto = buildPredictionOptions(circuit);
    if (options && correctId) {
      return {
        options: options.map((o) => ({ id: o.id, label: o.label, distribution: null as Distribution | null })),
        correctId,
      };
    }
    return auto ? { options: auto.options, correctId: auto.correctId } : null;
  }, [circuit, options, correctId]);

  if (!prediction) return null;

  const circuitText = describeCircuit(circuit);
  const chosen = prediction.options.find((o) => o.id === selected) ?? null;

  const submit = () => {
    setSubmitted(true);
    onStageChange?.("run");
    if (source !== "guest") {
      actions.track("predictionSubmitted", { topic, detail: circuitText });
    }
  };

  const run = () => {
    if (!submitted || !chosen || running) return;
    setRunning(true);
    // A short pause so the learner sees the circuit "run".
    timer.current = window.setTimeout(() => {
      const result = simulateCircuit(circuit, { shots: 1024 });
      setRunning(false);
      if (!result.ok) return;

      const outcome: Outcome =
        chosen.id === "unsure" ? "unsure" : chosen.id === prediction.correctId ? "correct" : "incorrect";
      const explanation = explainCircuit(result);
      setFinished({ result, outcome, explanation });
      onStageChange?.("observe");

      if (source !== "guest") {
        actions.recordExperiment({
          source,
          topic,
          circuit: circuitText,
          gates: Array.from(new Set(circuit.gates.map((g) => g.type))).join(","),
          prediction: chosen.label.en,
          actual: countsLabel(result.counts, result.shots),
          correct: outcome === "correct",
          steps: explanation.steps,
          summary: explanation.summary,
          challengeId,
        });
      }
      onComplete?.(outcome === "correct");
    }, 650);
  };

  return (
    <div className="flex flex-col gap-4">
      {showCircuit && (
        <div className="well px-4 py-2">
          <QuantumCircuit circuit={circuit} running={running} trim />
        </div>
      )}

      <PredictionPanel
        question={
          question ??
          t({
            en: "Before you run… what do you predict will happen?",
            hi: "Run karne se pehle… aapko kya lagta hai, kya hoga?",
          })
        }
        options={prediction.options.map((o) => ({ id: o.id, label: t(o.label) }))}
        selected={selected}
        onSelect={setSelected}
        submitted={submitted}
        onSubmit={submit}
        submitLabel={t({ en: "Submit prediction", hi: "Prediction submit karo" })}
        lockedLabel={t({ en: "Prediction locked in.", hi: "Prediction lock ho gayi." })}
      />

      {!finished && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={!submitted || running}
            aria-describedby={!submitted ? hintId : undefined}
            className="btn btn-primary"
          >
            {submitted ? <Play size={17} aria-hidden /> : <Lock size={17} aria-hidden />}
            {running
              ? t({ en: "Running…", hi: "Run ho raha hai…" })
              : t({ en: "Run simulation", hi: "Simulation run karo" })}
          </button>
          {!submitted && (
            <p id={hintId} className="text-sm text-mute">
              {t({
                en: "Think before you run. Submit a prediction to unlock Run.",
                hi: "Run karne se pehle socho. Run unlock karne ke liye prediction submit karo.",
              })}
            </p>
          )}
          {submitted && !running && (
            <p className="text-sm text-mute">
              {t({ en: "Now run the experiment.", hi: "Ab experiment run karo." })}
            </p>
          )}
        </div>
      )}

      {finished && chosen && (
        <SimulationResult
          result={finished.result}
          predictionLabel={t(chosen.label)}
          predictionDistribution={chosen.distribution}
          outcome={finished.outcome}
          explanation={finished.explanation}
          t={t}
        >
          {after?.(finished.outcome)}
        </SimulationResult>
      )}
    </div>
  );
}
