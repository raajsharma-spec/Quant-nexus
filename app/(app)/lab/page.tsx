"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Eraser, Link2, Lock, MessageCircleQuestion, Pencil, RotateCcw, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { BlochSphere3D } from "@/components/BlochSphere3D";
import { CircuitCode } from "@/components/CircuitCode";
import { CircuitEditor } from "@/components/CircuitEditor";
import { ExperimentFlow, type FlowStage } from "@/components/ExperimentFlow";
import { ProbabilityBars } from "@/components/ProbabilityBars";
import { QuantumCircuit } from "@/components/QuantumCircuit";
import { PageHeader } from "@/components/ui";
import { decodeCircuit, encodeCircuit } from "@/lib/circuitLink";
import { BACKEND_LABEL, checkQiskitService, qiskitApiUrl, type BackendId, type ServiceStatus } from "@/lib/execution";
import { topicOfCircuit } from "@/lib/prediction";
import {
  buildCircuit,
  circuitSignature,
  describeCircuit,
  gateWires,
  stateAfter,
  validateCircuit,
  type Circuit,
  type GateSpec,
  type GateType,
  type SimulationError,
} from "@/lib/quantumSimulator";
import { SHOT_OPTIONS } from "@/lib/storage";

const STEPS = 6;
const QUBIT_OPTIONS = [1, 2, 3] as const;
const BASIC: GateType[] = ["H", "X", "Y", "Z", "S", "T", "CX", "CZ", "SWAP", "M"];
const ADVANCED: GateType[] = ["RX", "RY", "RZ", "CCX"];

const PRESETS: Array<{ id: string; label: string; qubits: number; spec: GateSpec[] }> = [
  { id: "h", label: "H, then measure", qubits: 1, spec: [["H", 0, 0], ["M", 0, 1]] },
  { id: "hh", label: "H twice (interference)", qubits: 1, spec: [["H", 0, 0], ["H", 0, 1], ["M", 0, 2]] },
  { id: "hzh", label: "H, Z, H (phase)", qubits: 1, spec: [["H", 0, 0], ["Z", 0, 1], ["H", 0, 2], ["M", 0, 3]] },
  { id: "bell", label: "Bell pair (H + CX)", qubits: 2, spec: [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]] },
  {
    id: "ghz",
    label: "GHZ state (3 qubits)",
    qubits: 3,
    spec: [["H", 0, 0], ["CX", 0, 1, 1], ["CX", 1, 2, 2], ["M", 0, 3], ["M", 1, 3], ["M", 2, 3]],
  },
];

type Stage = "build" | FlowStage;
const STEPPER: Array<{ label: string; stages: Stage[] }> = [
  { label: "Build", stages: ["build"] },
  { label: "Predict", stages: ["predict"] },
  { label: "Run", stages: ["run"] },
  { label: "Observe", stages: ["observe"] },
  { label: "Explain", stages: ["observe"] },
];
const STAGE_ORDER: Stage[] = ["build", "predict", "run", "observe"];

const emptyCircuit = (qubits: number): Circuit => ({ qubits, steps: STEPS, gates: [] });

function Lab() {
  const { state, t, actions } = useApp();
  // A shared link (/lab?c=…) opens the lab with that circuit already on the wires.
  const shared = useSearchParams().get("c");
  const [circuit, setCircuit] = useState<Circuit>(() => decodeCircuit(shared, STEPS) ?? emptyCircuit(2));
  const [opened] = useState(() => (shared ? (decodeCircuit(shared, STEPS) ? "ok" : "bad") : null));
  const [copied, setCopied] = useState(false);
  const [stage, setStage] = useState<Stage>("build");
  const [error, setError] = useState<SimulationError | null>(null);
  /** Changes on every new experiment so the prediction panel starts fresh. */
  const [experiment, setExperiment] = useState(0);
  const [moreGates, setMoreGates] = useState(false);
  const [qiskitDiagram, setQiskitDiagram] = useState<string | undefined>(undefined);
  const [service, setService] = useState<ServiceStatus | null>(null);

  const building = stage === "build";
  const advanced = state.settings.advancedMode || moreGates;
  const palette = useMemo(() => {
    const base = advanced ? [...BASIC.slice(0, -1), ...ADVANCED, "M" as GateType] : BASIC;
    // Hide gates that cannot fit on the current number of wires.
    return base.filter((gate) => {
      if (gate === "CCX") return circuit.qubits >= 3;
      if (gate === "CX" || gate === "CZ" || gate === "SWAP") return circuit.qubits >= 2;
      return true;
    });
  }, [advanced, circuit.qubits]);

  const signature = useMemo(() => circuitSignature(circuit), [circuit]);
  const topic = useMemo(() => topicOfCircuit(circuit), [circuit]);
  // The state just before any measurement — computed live from the circuit on screen.
  const snapshot = useMemo(() => stateAfter(circuit.qubits, circuit.gates), [circuit]);

  // A real check of the optional Qiskit service (only when one is configured).
  const qiskitConfigured = qiskitApiUrl() !== null;
  useEffect(() => {
    if (!qiskitConfigured) return;
    let alive = true;
    checkQiskitService().then((status) => {
      if (alive) setService(status);
    });
    return () => {
      alive = false;
    };
  }, [qiskitConfigured]);

  const change = (next: Circuit) => {
    setCircuit(next);
    setError(null);
    setQiskitDiagram(undefined);
    actions.track("circuitEdited", { detail: `${next.gates.length} gates` });
  };

  const setQubits = (qubits: number) => {
    // Keep the gates that still fit on the remaining wires.
    const gates = circuit.gates.filter((gate) => gateWires(gate).every((wire) => wire < qubits));
    change({ qubits, steps: STEPS, gates });
  };

  const loadPreset = (preset: (typeof PRESETS)[number]) => {
    setCircuit(buildCircuit(preset.qubits, preset.spec, STEPS));
    setStage("build");
    setError(null);
    setQiskitDiagram(undefined);
    setExperiment((n) => n + 1);
    actions.track("circuitEdited", { detail: `preset:${preset.id}` });
  };

  const resetLab = () => {
    setCircuit(emptyCircuit(circuit.qubits));
    setStage("build");
    setError(null);
    setQiskitDiagram(undefined);
    setExperiment((n) => n + 1);
  };

  const editCircuit = () => {
    setStage("build");
    setExperiment((n) => n + 1);
  };

  /** Check the circuit before the learner predicts. Problems are explained, never just rejected. */
  const lockIn = () => {
    const problem = validateCircuit(circuit, state.settings.shots);
    if (problem) {
      setError(problem);
      actions.track("executionError", { topic, detail: describeCircuit(circuit), meta: { code: problem.code } });
      return;
    }
    setError(null);
    setStage("predict");
  };

  /** Copy a link that opens this exact circuit in someone else's lab. */
  const share = async () => {
    const link = `${window.location.origin}/lab?c=${encodeURIComponent(encodeCircuit(circuit))}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t({ en: "Copy this link:", hi: "Yeh link copy karo:" }), link);
    }
  };

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const backend = state.settings.backend;

  return (
    <>
      <PageHeader
        title="Quantum Lab"
        lead={t({
          en: "Build a circuit, predict what it will do, then run it and see what actually happened.",
          hi: "Circuit banao, predict karo ki kya hoga, phir run karke dekho actually kya hua.",
        })}
      />

      {/* Build → Predict → Run → Observe → Explain */}
      <ol aria-label="Lab steps" className="mb-5 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {STEPPER.map((item, index) => {
          const itemIndex = STAGE_ORDER.indexOf(item.stages[0]);
          const active = item.stages.includes(stage);
          const done = itemIndex < stageIndex;
          return (
            <li key={item.label} className="flex items-center gap-1" aria-current={active ? "step" : undefined}>
              <span
                className={`rounded-full border px-3 py-1 font-semibold ${
                  active ? "border-ket bg-ket/15 text-ket" : done ? "border-ok/40 text-ok" : "border-line text-dim"
                }`}
              >
                {item.label}
              </span>
              {index < STEPPER.length - 1 && <span aria-hidden className="h-px w-4 bg-line sm:w-6" />}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-5">
        {/* Circuit builder */}
        <section aria-labelledby="builder-title" className="panel min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="builder-title" className="text-lg font-semibold">
              {building ? t({ en: "Build your circuit", hi: "Apna circuit banao" }) : t({ en: "Your circuit", hi: "Aapka circuit" })}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {building ? (
                <button
                  type="button"
                  onClick={() => change({ ...circuit, gates: [] })}
                  disabled={circuit.gates.length === 0}
                  className="btn btn-ghost px-3 py-2 text-sm"
                >
                  <Eraser size={16} aria-hidden />
                  Clear circuit
                </button>
              ) : (
                <button type="button" onClick={editCircuit} className="btn btn-secondary px-3 py-2 text-sm">
                  <Pencil size={15} aria-hidden />
                  Edit circuit
                </button>
              )}
              <button
                type="button"
                onClick={share}
                disabled={circuit.gates.length === 0}
                className="btn btn-ghost px-3 py-2 text-sm"
              >
                {copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
                <span aria-live="polite">{copied ? "Link copied" : "Share circuit"}</span>
              </button>
              <button type="button" onClick={resetLab} className="btn btn-ghost px-3 py-2 text-sm">
                <RotateCcw size={16} aria-hidden />
                Reset lab
              </button>
            </div>
          </div>

          {opened && (
            <p role="status" className={`mb-3 rounded-xl border px-4 py-2.5 text-sm ${opened === "ok" ? "border-ket/35 bg-ket/[0.06]" : "border-warn/40 bg-warn/10 text-warn"}`}>
              {opened === "ok"
                ? t({
                    en: "This circuit was opened from a shared link. Change it freely: your copy is your own.",
                    hi: "Yeh circuit shared link se khula hai. Ise freely change karo: yeh aapki apni copy hai.",
                  })
                : t({
                    en: "That shared link does not contain a valid circuit, so the lab started empty.",
                    hi: "Us shared link mein valid circuit nahi hai, isliye lab empty start hua.",
                  })}
            </p>
          )}

          {building && (
            <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-3 text-sm">
              <div role="group" aria-label="Number of qubits">
                <p className="mb-1.5 text-mute">{t({ en: "Qubits", hi: "Qubits" })}</p>
                <div className="flex gap-1.5">
                  {QUBIT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQubits(count)}
                      aria-pressed={circuit.qubits === count}
                      className={`ket rounded-lg border px-3 py-1.5 font-semibold ${
                        circuit.qubits === count ? "border-ket bg-ket/15 text-ket" : "border-line text-mute hover:text-ink"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              <div role="group" aria-label="Shots per run">
                <p className="mb-1.5 text-mute">{t({ en: "Shots per run", hi: "Shots per run" })}</p>
                <div className="flex gap-1.5">
                  {SHOT_OPTIONS.map((shots) => (
                    <button
                      key={shots}
                      type="button"
                      onClick={() => actions.updateSettings({ shots })}
                      aria-pressed={state.settings.shots === shots}
                      className={`ket rounded-lg border px-3 py-1.5 font-semibold tabular-nums ${
                        state.settings.shots === shots ? "border-ket bg-ket/15 text-ket" : "border-line text-mute hover:text-ink"
                      }`}
                    >
                      {shots.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              {qiskitConfigured && (
                <div>
                  <label htmlFor="lab-backend" className="mb-1.5 block text-mute">
                    {t({ en: "Runs on", hi: "Runs on" })}
                  </label>
                  <select
                    id="lab-backend"
                    value={backend}
                    onChange={(event) => actions.updateSettings({ backend: event.target.value as BackendId })}
                    className="rounded-lg border border-line bg-void/70 px-3 py-2"
                  >
                    <option value="browser">{BACKEND_LABEL.browser}</option>
                    <option value="qiskit">{BACKEND_LABEL.qiskit}</option>
                  </select>
                </div>
              )}
              {!state.settings.advancedMode && (
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-mute">
                  <input
                    type="checkbox"
                    checked={moreGates}
                    onChange={(event) => setMoreGates(event.target.checked)}
                    className="h-4 w-4 accent-[#5ad7f0]"
                  />
                  {t({ en: "Advanced gates (RX, RY, RZ, Toffoli)", hi: "Advanced gates (RX, RY, RZ, Toffoli)" })}
                </label>
              )}
            </div>
          )}

          {building && backend === "qiskit" && (
            <p className="mb-3 text-sm text-mute" role="status">
              {service === null
                ? t({ en: "Checking the Qiskit service…", hi: "Qiskit service check ho rahi hai…" })
                : service.available
                  ? `Qiskit Aer service: reachable${service.engine ? ` (${service.engine})` : ""}.`
                  : t({
                      en: "Qiskit Aer service is not reachable right now. Runs will use the browser simulator and say so.",
                      hi: "Qiskit Aer service abhi reachable nahi hai. Runs browser simulator use karenge aur yeh batayenge.",
                    })}
            </p>
          )}

          {building ? (
            <>
              <p className="mb-2 text-sm text-mute">
                {t({
                  en: "1. Pick a gate.  2. Click a spot on a wire to place it.  Click a placed gate to remove it.",
                  hi: "1. Ek gate choose karo.  2. Wire par kisi spot par click karke place karo.  Placed gate par click karke use hatao.",
                })}
              </p>
              <CircuitEditor circuit={circuit} onChange={change} palette={palette} />
            </>
          ) : (
            <div className="well px-3 py-2">
              <QuantumCircuit circuit={circuit} />
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warn" aria-hidden />
              <div>
                <p className="font-semibold text-warn">{t(error.message)}</p>
                <p className="mt-1 text-sm text-ink/90">{t(error.fix)}</p>
              </div>
            </div>
          )}

          {building && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-mute">
                  <Sparkles size={15} aria-hidden />
                  {t({ en: "Load an example:", hi: "Example load karo:" })}
                </span>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className="rounded-lg border border-line bg-white/[0.03] px-2.5 py-1.5 text-sm hover:border-ket/50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={lockIn} className="btn btn-primary">
                <Lock size={16} aria-hidden />
                {t({ en: "Lock in circuit and predict", hi: "Circuit lock karo aur predict karo" })}
              </button>
            </div>
          )}
        </section>

        {/* What the circuit is, in other forms — all generated from the circuit above. */}
        <div className="grid gap-5 xl:grid-cols-2">
          <section aria-labelledby="state-title" className="panel min-w-0 p-4 sm:p-5">
            <h2 id="state-title" className="text-lg font-semibold">
              {t({ en: "State before measurement", hi: "Measurement se pehle ka state" })}
            </h2>
            <p className="mt-1 text-sm text-mute">
              {building
                ? t({
                    en: "The Bloch sphere updates as you place gates. Drag a sphere to turn it. Exact probabilities appear with the result — after you have predicted.",
                    hi: "Gates place karte hi Bloch sphere update hota hai. Sphere ko drag karke ghumao. Exact probabilities result ke saath aati hain — predict karne ke baad.",
                  })
                : stage === "observe"
                  ? t({
                      en: "Where each qubit pointed just before it was measured, with the exact probabilities.",
                      hi: "Measure hone se just pehle har qubit kahan point kar raha tha, exact probabilities ke saath.",
                    })
                  : t({
                      en: "Hidden while you predict. It comes back with the result.",
                      hi: "Predict karte waqt hidden. Result ke saath wapas aata hai.",
                    })}
            </p>
            {building || stage === "observe" ? (
              <div className={`mt-4 grid items-center gap-4 ${building ? "" : "sm:grid-cols-[auto_1fr]"}`}>
                <div className="flex flex-wrap justify-center gap-2">
                  {snapshot.bloch.map((vector, q) => (
                    <BlochSphere3D
                      key={q}
                      vector={vector}
                      title={`q${q}`}
                      size={circuit.qubits > 2 ? 132 : circuit.qubits > 1 ? 156 : 200}
                      showAngles={state.settings.advancedMode}
                    />
                  ))}
                </div>
                {!building && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">
                      {t({ en: "Exact probabilities if every qubit were measured", hi: "Agar har qubit measure ho to exact probabilities" })}
                    </p>
                    <ProbabilityBars values={snapshot.probabilities} tone="phase" label="Exact probabilities of the final state" />
                  </div>
                )}
              </div>
            ) : (
              <p className="well mt-4 flex items-center gap-2.5 px-4 py-6 text-mute">
                <Lock size={17} aria-hidden />
                {t({ en: "Predict first, then run.", hi: "Pehle predict karo, phir run karo." })}
              </p>
            )}
          </section>

          <section aria-labelledby="code-title" className="panel min-w-0 p-4 sm:p-5">
            <h2 id="code-title" className="mb-3 text-lg font-semibold">
              {t({ en: "Your circuit in four SDK formats", hi: "Aapka circuit chaar SDK formats mein" })}
            </h2>
            <CircuitCode circuit={circuit} shots={state.settings.shots} qiskitDiagram={qiskitDiagram} />
          </section>
        </div>

        {/* Predict → Run → Observe → Explain */}
        {!building && (
          <ExperimentFlow
            key={`${experiment}-${signature}`}
            circuit={circuit}
            source="lab"
            topic={topic}
            showCircuit={false}
            onStageChange={setStage}
            onExecuted={(info) => setQiskitDiagram(info.backend === "qiskit" ? info.diagram : undefined)}
            after={() => (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={editCircuit} className="btn btn-primary">
                  <Pencil size={16} aria-hidden />
                  {t({ en: "Change the circuit and try again", hi: "Circuit change karke dobara try karo" })}
                </button>
                <button type="button" onClick={resetLab} className="btn btn-secondary">
                  {t({ en: "Start a new experiment", hi: "Naya experiment start karo" })}
                </button>
                <Link
                  href="/ai-tutor?ask=why"
                  onClick={() => actions.track("aiExplanationRequested", { topic })}
                  className="btn btn-ghost"
                >
                  <MessageCircleQuestion size={17} aria-hidden />
                  {t({ en: "Ask the tutor about this", hi: "Tutor se iske baare mein poochho" })}
                </Link>
              </div>
            )}
          />
        )}

        <p className="text-sm text-dim">
          Educational quantum simulator: up to {QUBIT_OPTIONS[QUBIT_OPTIONS.length - 1]} qubits, {STEPS} steps,{" "}
          {state.settings.shots.toLocaleString()} shots per run on the {BACKEND_LABEL[backend].toLowerCase()}. This is a
          simulation — no real quantum hardware is used.
        </p>
      </div>
    </>
  );
}

export default function LabPage() {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}
