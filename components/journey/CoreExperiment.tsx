"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Info, Lock, Play } from "lucide-react";
import { coreExperiment } from "@/data/concepts";
import { BACKEND_LABEL, executeCircuit } from "@/lib/execution";
import { experimentInput, observationChecks, type ObservationCheck } from "@/lib/experiment";
import { buildPredictionOptions } from "@/lib/prediction";
import {
  buildCircuit,
  describeCircuit,
  simulateCircuit,
  type Circuit,
  type SimulationError,
  type SimulationSuccess,
} from "@/lib/quantumSimulator";
import { progressOf } from "@/lib/stages";
import type { StageRun } from "@/lib/storage";
import type { Confidence, L, TopicId } from "@/lib/types";
import { useApp } from "../AppProvider";
import { BlochSphere3D } from "../BlochSphere3D";
import { CircuitCode } from "../CircuitCode";
import { CONFIDENCE_NAMES } from "../ExperimentFlow";
import { PredictionPanel } from "../PredictionPanel";
import { ProbabilityBars } from "../ProbabilityBars";
import { QuantumCircuit } from "../QuantumCircuit";
import { MeasurementTable, ResultComparison, StateVectorTable, type Outcome } from "../SimulationResult";

/** The concept's core circuit and its prediction options. */
function useCore(topic: TopicId) {
  return useMemo(() => {
    const core = coreExperiment(topic);
    if (!core) return null;
    const circuit = buildCircuit(core.circuit.qubits, core.circuit.gates);
    const prediction = buildPredictionOptions(circuit);
    return prediction ? { core, circuit, prediction } : null;
  }, [topic]);
}

/** Rebuild a full result from what was saved: exact state from the simulator, counts from the real run. */
export function resultFromRun(circuit: Circuit, run: StageRun): SimulationSuccess | null {
  const exact = simulateCircuit(circuit, { shots: 1 });
  if (!exact.ok) return null;
  return { ...exact, counts: run.counts, shots: run.shots };
}

/** The saved run of a concept's core experiment, as a full result (or null before it has been run). */
export function useRunResult(circuit: Circuit | null, run: StageRun | null): SimulationSuccess | null {
  return useMemo(() => (circuit && run ? resultFromRun(circuit, run) : null), [circuit, run]);
}

/** The current time, for records created by a click. */
const timestamp = (): number => Date.now();

// ---------------------------------------------------------------------------
// 06 · Predict
// ---------------------------------------------------------------------------

export function PredictStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const data = useCore(topic);
  const saved = progressOf(state, topic).prediction;
  const [selected, setSelected] = useState<string | null>(saved?.optionId ?? null);
  const [confidence, setConfidence] = useState<Confidence | null>(saved?.confidence ?? null);

  if (!data) return null;
  const { core, circuit, prediction } = data;

  const submit = () => {
    const option = prediction.options.find((o) => o.id === selected);
    if (!option || !confidence) return;
    actions.submitStagePrediction(
      topic,
      { optionId: option.id, label: option.label.en, distribution: option.distribution, confidence, at: timestamp() },
      describeCircuit(circuit)
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-[68ch] flex-col gap-2 text-[1.0625rem] leading-relaxed text-ink/90">
        {core.intro.map((paragraph, index) => (
          <p key={index}>{t(paragraph)}</p>
        ))}
      </div>
      <div className="well px-4 py-2">
        <QuantumCircuit circuit={circuit} trim />
      </div>
      <PredictionPanel
        question={
          core.question
            ? t(core.question)
            : t({ en: "What do you think will happen?", hi: "Aapko kya lagta hai, kya hoga?" })
        }
        options={prediction.options.map((o) => ({ id: o.id, label: t(o.label) }))}
        selected={selected}
        onSelect={setSelected}
        submitted={!!saved}
        onSubmit={submit}
        submitLabel={t({ en: "Submit prediction", hi: "Prediction submit karo" })}
        lockedLabel={t({
          en: "Prediction recorded. The circuit can now be run.",
          hi: "Prediction record ho gayi. Ab circuit run ho sakta hai.",
        })}
        confidence={{
          value: confidence,
          onChange: setConfidence,
          label: t({ en: "How sure are you?", hi: "Aap kitne sure ho?" }),
          names: {
            low: t(CONFIDENCE_NAMES.low),
            medium: t(CONFIDENCE_NAMES.medium),
            high: t(CONFIDENCE_NAMES.high),
          },
        }}
      />
      {!saved && (
        <p className="flex items-center gap-2 text-sm text-mute">
          <Lock size={15} aria-hidden />
          {t({
            en: "The circuit stays locked until you commit to a prediction. A wrong prediction is fine — it is how the result becomes memorable.",
            hi: "Jab tak aap prediction commit nahi karte, circuit locked rehta hai. Galat prediction theek hai — isi se result yaad rehta hai.",
          })}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 07 · Run
// ---------------------------------------------------------------------------

export function RunStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const data = useCore(topic);
  const progress = progressOf(state, topic);
  const [phase, setPhase] = useState<"idle" | "preparing" | "running" | "analyzing">("idle");
  const [failure, setFailure] = useState<SimulationError | null>(null);
  const [notice, setNotice] = useState<L | null>(null);
  const [details, setDetails] = useState<{ durationMs: number; diagram?: string } | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  if (!data) return null;
  const { circuit, prediction } = data;
  const saved = progress.prediction;
  const run = progress.run;
  const shots = state.settings.shots;
  const running = phase !== "idle";
  const result = run ? resultFromRun(circuit, run) : null;

  const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const execute = async () => {
    if (!saved || running) return;
    setFailure(null);
    setPhase("preparing");
    await pause(250);
    if (!alive.current) return;
    setPhase("running");
    const [execution] = await Promise.all([
      executeCircuit(circuit, { shots, backend: state.settings.backend }),
      pause(500),
    ]);
    if (!alive.current) return;
    if (!execution.result.ok) {
      setPhase("idle");
      setFailure(execution.result);
      actions.track("executionError", { topic, detail: describeCircuit(circuit), meta: { code: execution.result.code } });
      return;
    }
    setPhase("analyzing");
    await pause(200);
    if (!alive.current) return;

    const outcome = execution.result;
    const correct = saved.optionId === prediction.correctId;
    setNotice(execution.notice ?? null);
    setDetails({ durationMs: execution.durationMs, diagram: execution.diagram });
    actions.recordStageRun(
      topic,
      {
        at: timestamp(),
        circuit: describeCircuit(circuit),
        shots: outcome.shots,
        counts: outcome.counts,
        probabilities: outcome.probabilities,
        measured: outcome.measuredQubits,
        backend: execution.backend,
        predictionCorrect: correct,
      },
      experimentInput({
        circuit,
        result: outcome,
        source: "lesson",
        topic,
        predictionLabel: saved.label,
        predicted: saved.distribution,
        correct,
        confidence: saved.confidence,
        backend: execution.backend,
      })
    );
    setPhase("idle");
  };

  const phaseLabel: Record<typeof phase, L> = {
    idle: { en: "Run simulation", hi: "Simulation run karo" },
    preparing: { en: "Preparing quantum circuit…", hi: "Quantum circuit prepare ho raha hai…" },
    running: { en: `Running ${shots.toLocaleString()} shots…`, hi: `${shots.toLocaleString()} shots run ho rahe hain…` },
    analyzing: { en: "Analyzing result…", hi: "Result analyze ho raha hai…" },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="well px-4 py-2">
        <QuantumCircuit circuit={circuit} running={running} trim />
      </div>

      {saved && (
        <p className="rounded-xl border border-phase/35 bg-phase/[0.06] px-4 py-3 text-sm">
          <span className="text-mute">{t({ en: "Your prediction: ", hi: "Aapki prediction: " })}</span>
          <span className="ket font-semibold">{saved.label}</span>
          <span className="text-mute"> · {t(CONFIDENCE_NAMES[saved.confidence])}</span>
        </p>
      )}

      {!run && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={execute} disabled={!saved || running} className="btn btn-primary px-5 py-3 text-base">
            <Play size={18} aria-hidden />
            <span aria-live="polite">{t(phaseLabel[phase])}</span>
          </button>
          <p className="text-sm text-mute">
            {t({
              en: `${shots.toLocaleString()} shots on the ${BACKEND_LABEL[state.settings.backend].toLowerCase()}. Change this in Settings.`,
              hi: `${BACKEND_LABEL[state.settings.backend]} par ${shots.toLocaleString()} shots. Ise Settings mein change karo.`,
            })}
          </p>
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

      {notice && (
        <p role="status" className="flex items-start gap-2.5 rounded-xl border border-line bg-void/50 px-4 py-3 text-sm text-mute">
          <Info size={17} className="mt-0.5 shrink-0 text-ket" aria-hidden />
          {t(notice)}
        </p>
      )}

      {run && result && (
        <div className="flex min-w-0 animate-rise flex-col gap-4" aria-live="polite">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 font-medium text-ok">
            <Check size={19} aria-hidden />
            {t({ en: "Execution finished.", hi: "Execution finish ho gaya." })}
            <span className="text-sm font-normal text-ink/80">
              {run.shots.toLocaleString()} shots · {BACKEND_LABEL[run.backend]}
              {details ? ` · ${details.durationMs} ms` : ""}
            </span>
          </p>
          <div className="panel p-4 sm:p-5">
            <h3 className="mb-3 text-base font-semibold">{t({ en: "Counts returned by the simulator", hi: "Simulator ke returned counts" })}</h3>
            <MeasurementTable result={result} backend={run.backend} t={t} />
          </div>
          <div className="panel min-w-0 p-4 sm:p-5">
            <h3 className="mb-3 text-base font-semibold">{t({ en: "The circuit that ran", hi: "Jo circuit run hua" })}</h3>
            <CircuitCode circuit={circuit} shots={run.shots} qiskitDiagram={details?.diagram} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 08 · Observe
// ---------------------------------------------------------------------------

function CheckCard({
  check,
  done,
  onAnswer,
}: {
  check: ObservationCheck;
  done: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const { t } = useApp();
  const [choice, setChoice] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (choice === null || done) return;
        const correct = choice === check.answer;
        setWrong(!correct);
        onAnswer(correct);
      }}
      className={`rounded-2xl border p-4 ${done ? "border-ok/40 bg-ok/[0.06]" : "border-line bg-void/40"}`}
    >
      <fieldset disabled={done} className="min-w-0">
        <legend className="mb-3 font-semibold leading-snug">{t(check.prompt)}</legend>
        <div className="flex flex-col gap-2">
          {check.options.map((option, index) => {
            const checked = done ? index === check.answer : choice === index;
            return (
              <label
                key={index}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ket ${
                  checked ? "border-ket bg-ket/10" : "border-line hover:border-ink/30"
                } ${done && !checked ? "opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name={check.id}
                  checked={checked}
                  onChange={() => {
                    setChoice(index);
                    setWrong(false);
                  }}
                  className="h-4 w-4 shrink-0 accent-[#5ad7f0]"
                />
                <span className="leading-snug">{t(option)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-3" aria-live="polite">
        {done ? (
          <p className="flex items-start gap-2 text-sm text-ok">
            <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span className="text-ink/90">{t(check.insight)}</span>
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={choice === null} className="btn btn-secondary text-sm">
              {t({ en: "Check", hi: "Check karo" })}
            </button>
            {wrong && (
              <p className="text-sm text-warn">
                {t({
                  en: "Not quite — look at the counts and the bars again, then choose once more.",
                  hi: "Not quite — counts aur bars dobara dekho, phir ek baar aur choose karo.",
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

export function ObserveStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const data = useCore(topic);
  const progress = progressOf(state, topic);
  const run = progress.run;
  const result = useRunResult(data?.circuit ?? null, run);
  const checks = useMemo(() => (result ? observationChecks(result) : []), [result]);

  if (!data || !run || !result) {
    return (
      <p className="text-mute">
        {t({ en: "Run the circuit first — then its result appears here.", hi: "Pehle circuit run karo — phir uska result yahan dikhega." })}
      </p>
    );
  }

  const observed: Record<string, number> = {};
  Object.keys(run.counts).forEach((bits) => (observed[bits] = run.counts[bits] / run.shots));
  const allDone = checks.every((check) => progress.observed.includes(check.id));
  const saved = progress.prediction;
  const outcome: Outcome = saved?.optionId === "unsure" ? "unsure" : run.predictionCorrect ? "correct" : "incorrect";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="panel p-4 sm:p-5">
          <h3 className="mb-3 text-base font-semibold">
            {t({ en: "Measurement distribution", hi: "Measurement distribution" })}
          </h3>
          <ProbabilityBars
            values={observed}
            counts={run.counts}
            expected={run.probabilities}
            approx
            label="Measured results of your run"
          />
          <p className="mt-3 text-xs text-dim">
            {t({
              en: "Bars show the measured share; the white tick marks the exact probability.",
              hi: "Bars measured share dikhate hain; white tick exact probability dikhata hai.",
            })}
          </p>
          <div className="mt-4 border-t border-line pt-4">
            <MeasurementTable result={result} backend={run.backend} t={t} />
          </div>
          <details className="mt-3" open={state.settings.advancedMode}>
            <summary className="cursor-pointer rounded text-sm font-medium text-mute hover:text-ink">
              {t({ en: "Advanced: state vector and amplitudes", hi: "Advanced: state vector aur amplitudes" })}
            </summary>
            <div className="mt-3">
              <StateVectorTable result={result} t={t} />
            </div>
          </details>
        </div>
        <div className="panel flex flex-col items-center justify-center gap-2 p-4">
          <p className="text-sm font-semibold">{t({ en: "State just before measurement", hi: "Measurement se just pehle ka state" })}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {result.bloch.map((vector, q) => (
              <BlochSphere3D
                key={q}
                vector={vector}
                title={result.bloch.length > 1 ? `q${q}` : "q0"}
                size={result.bloch.length > 1 ? 170 : 210}
                showAngles={state.settings.advancedMode}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="well px-4 py-2">
        <QuantumCircuit circuit={data.circuit} trim />
      </div>

      <section aria-labelledby="observe-checks">
        <h3 id="observe-checks" className="mb-1 text-base font-semibold">
          {t({ en: "Read the result", hi: "Result padho" })}
        </h3>
        <p className="mb-3 text-sm text-mute">
          {t({
            en: "Two quick checks, answered from the data above. No explanation yet — first observe.",
            hi: "Do quick checks, upar ke data se answer karo. Abhi explanation nahi — pehle observe karo.",
          })}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {checks.map((check) => (
            <CheckCard
              key={check.id}
              check={check}
              done={progress.observed.includes(check.id)}
              onAnswer={(correct) => actions.recordObservation(topic, check.id, correct, checks.length)}
            />
          ))}
        </div>
      </section>

      {allDone && saved && (
        <section aria-labelledby="compare-title" className="flex animate-rise flex-col gap-3">
          <h3 id="compare-title" className="text-base font-semibold">
            {t({ en: "Your prediction vs the actual result", hi: "Aapki prediction vs actual result" })}
          </h3>
          <ResultComparison
            result={result}
            predictionLabel={saved.label}
            predictionDistribution={saved.distribution}
            outcome={outcome}
            t={t}
          />
          <p className="text-sm text-mute">
            {outcome === "correct"
              ? t({
                  en: "Your prediction aligned with the observed behaviour. Next: explain why it happened.",
                  hi: "Aapki prediction observed behaviour se align hui. Next: explain karo yeh kyun hua.",
                })
              : t({
                  en: "Your prediction differed from the simulation. That gap is the interesting part — next, work out why.",
                  hi: "Aapki prediction simulation se alag thi. Yahi gap interesting part hai — next, samjho kyun.",
                })}
          </p>
        </section>
      )}
    </div>
  );
}
