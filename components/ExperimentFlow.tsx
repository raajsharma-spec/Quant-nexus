"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Info, Lock, Play } from "lucide-react";
import type { ChallengeOption } from "@/data/challenges";
import type { ExperimentInput } from "@/lib/actions";
import { executeCircuit, type BackendId } from "@/lib/execution";
import { experimentInput } from "@/lib/experiment";
import { explainCircuit, type Explanation } from "@/lib/explain";
import { buildPredictionOptions, type Distribution } from "@/lib/prediction";
import { describeCircuit, type Circuit, type SimulationError, type SimulationSuccess } from "@/lib/quantumSimulator";
import type { Confidence, L, TopicId } from "@/lib/types";
import { useApp } from "./AppProvider";
import { PredictionPanel } from "./PredictionPanel";
import { QuantumCircuit } from "./QuantumCircuit";
import { SimulationResult, type Outcome } from "./SimulationResult";

export type FlowStage = "predict" | "run" | "observe";

interface Props {
  circuit: Circuit;
  /** "guest" runs without saving anything (used on the landing page). */
  source: "lab" | "practice" | "lesson" | "challenge" | "guest";
  topic: TopicId;
  question?: string;
  /** Hand-written options. Leave out to build probability options from the circuit. */
  options?: ChallengeOption[];
  correctId?: string;
  challengeId?: string;
  showCircuit?: boolean;
  onStageChange?: (stage: FlowStage) => void;
  onComplete?: (correct: boolean) => void;
  /** Called with Qiskit's own circuit drawing when the Qiskit service ran the circuit. */
  onExecuted?: (info: { backend: BackendId; diagram?: string }) => void;
  /** Replaces the default way a finished experiment is stored (used by the Next Challenge stage). */
  record?: (input: ExperimentInput) => void;
  /** Extra actions shown under the result. */
  after?: (outcome: Outcome) => React.ReactNode;
}

interface Finished {
  result: SimulationSuccess;
  outcome: Outcome;
  explanation: Explanation;
  backend: BackendId;
  notice?: L;
}

export const CONFIDENCE_NAMES: Record<Confidence, L> = {
  low: { en: "Just guessing", hi: "Bas guess" },
  medium: { en: "Fairly sure", hi: "Kaafi sure" },
  high: { en: "Certain", hi: "Certain" },
};

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
  onExecuted,
  record,
  after,
}: Props) {
  const { state, t, actions } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "preparing" | "running" | "analyzing">("idle");
  const [finished, setFinished] = useState<Finished | null>(null);
  const [failure, setFailure] = useState<SimulationError | null>(null);
  const alive = useRef(true);
  const hintId = useId();

  const guest = source === "guest";
  const shots = guest ? 1024 : state.settings.shots;
  const backend: BackendId = guest ? "browser" : state.settings.backend;
  const running = phase !== "idle";

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
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
    if (!guest) {
      actions.track("predictionSubmitted", {
        topic,
        detail: circuitText,
        meta: { confidence: confidence ?? "medium" },
      });
    }
  };

  const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const run = async () => {
    if (!submitted || !chosen || running) return;
    setFailure(null);
    setPhase("preparing");
    await pause(250);
    if (!alive.current) return;
    setPhase("running");
    // A short pause so the learner sees the circuit "run", even when the simulator is instant.
    const [execution] = await Promise.all([executeCircuit(circuit, { shots, backend }), pause(450)]);
    if (!alive.current) return;
    if (!execution.result.ok) {
      setPhase("idle");
      setFailure(execution.result);
      if (!guest) actions.track("executionError", { topic, detail: circuitText, meta: { code: execution.result.code } });
      return;
    }
    setPhase("analyzing");
    await pause(200);
    if (!alive.current) return;

    const result = execution.result;
    const outcome: Outcome =
      chosen.id === "unsure" ? "unsure" : chosen.id === prediction.correctId ? "correct" : "incorrect";
    const explanation = explainCircuit(result);
    setFinished({ result, outcome, explanation, backend: execution.backend, notice: execution.notice });
    setPhase("idle");
    onStageChange?.("observe");
    onExecuted?.({ backend: execution.backend, diagram: execution.diagram });

    if (!guest) {
      const input = experimentInput({
        circuit,
        result,
        source,
        topic,
        predictionLabel: chosen.label.en,
        predicted: chosen.distribution,
        correct: outcome === "correct",
        confidence: confidence ?? undefined,
        challengeId,
        backend: execution.backend,
        explanation,
      });
      if (record) record(input);
      else actions.recordExperiment(input);
    }
    onComplete?.(outcome === "correct");
  };

  const phaseLabel: Record<typeof phase, L> = {
    idle: { en: "Run simulation", hi: "Simulation run karo" },
    preparing: { en: "Preparing quantum circuit…", hi: "Quantum circuit prepare ho raha hai…" },
    running: { en: `Running ${shots.toLocaleString()} shots…`, hi: `${shots.toLocaleString()} shots run ho rahe hain…` },
    analyzing: { en: "Analyzing result…", hi: "Result analyze ho raha hai…" },
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
        confidence={
          guest
            ? undefined
            : {
                value: confidence,
                onChange: setConfidence,
                label: t({ en: "How sure are you?", hi: "Aap kitne sure ho?" }),
                names: {
                  low: t(CONFIDENCE_NAMES.low),
                  medium: t(CONFIDENCE_NAMES.medium),
                  high: t(CONFIDENCE_NAMES.high),
                },
              }
        }
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
            <span aria-live="polite">{t(phaseLabel[phase])}</span>
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
            <p className="text-sm text-mute">{t({ en: "Now run the experiment.", hi: "Ab experiment run karo." })}</p>
          )}
        </div>
      )}

      {failure && (
        <div role="alert" className="flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warn" aria-hidden />
          <div>
            <p className="font-semibold text-warn">{t(failure.message)}</p>
            <p className="mt-1 text-sm text-ink/90">{t(failure.fix)}</p>
          </div>
        </div>
      )}

      {finished?.notice && (
        <p role="status" className="flex items-start gap-2.5 rounded-xl border border-line bg-void/50 px-4 py-3 text-sm text-mute">
          <Info size={17} className="mt-0.5 shrink-0 text-ket" aria-hidden />
          {t(finished.notice)}
        </p>
      )}

      {finished && chosen && (
        <SimulationResult
          result={finished.result}
          predictionLabel={t(chosen.label)}
          predictionDistribution={chosen.distribution}
          outcome={finished.outcome}
          explanation={finished.explanation}
          backend={finished.backend}
          advanced={!guest && state.settings.advancedMode}
          t={t}
        >
          {after?.(finished.outcome)}
        </SimulationResult>
      )}
    </div>
  );
}
