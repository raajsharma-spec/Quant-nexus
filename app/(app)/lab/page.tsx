"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Eraser, Lock, MessageCircleQuestion, Pencil, RotateCcw, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ExperimentFlow, type FlowStage } from "@/components/ExperimentFlow";
import { GateButton } from "@/components/GateButton";
import { QuantumCircuit } from "@/components/QuantumCircuit";
import { PageHeader } from "@/components/ui";
import { topicOfCircuit } from "@/lib/prediction";
import {
  buildCircuit,
  circuitSignature,
  describeCircuit,
  makeGate,
  validateCircuit,
  type Circuit,
  type CircuitGate,
  type GateType,
  type SimulationError,
} from "@/lib/quantumSimulator";

const QUBITS = 2;
const STEPS = 6;
const PALETTE: GateType[] = ["H", "X", "Y", "Z", "CX", "M"];

type Spec = Array<[GateType, number, number, number?]>;
const PRESETS: Array<{ id: string; label: string; spec: Spec }> = [
  {
    id: "h",
    label: "H, then measure",
    spec: [
      ["H", 0, 0],
      ["M", 0, 1],
      ["M", 1, 1],
    ],
  },
  {
    id: "x",
    label: "X, then measure",
    spec: [
      ["X", 0, 0],
      ["M", 0, 1],
    ],
  },
  {
    id: "bell",
    label: "Bell pair (H + CX)",
    spec: [
      ["H", 0, 0],
      ["CX", 0, 1, 1],
      ["M", 0, 2],
      ["M", 1, 2],
    ],
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

const emptyCircuit = (): Circuit => ({ qubits: QUBITS, steps: STEPS, gates: [] });

export default function LabPage() {
  const { t, actions } = useApp();
  const [circuit, setCircuit] = useState<Circuit>(emptyCircuit);
  const [selected, setSelected] = useState<GateType>("H");
  const [stage, setStage] = useState<Stage>("build");
  const [error, setError] = useState<SimulationError | null>(null);
  const [notice, setNotice] = useState("");
  /** Changes on every new experiment so the prediction panel starts fresh. */
  const [experiment, setExperiment] = useState(0);

  const building = stage === "build";
  const signature = useMemo(() => circuitSignature(circuit), [circuit]);
  const topic = useMemo(() => topicOfCircuit(circuit), [circuit]);

  const change = (gates: CircuitGate[]) => {
    setCircuit((c) => ({ ...c, gates }));
    setError(null);
    actions.track("circuitEdited", { detail: `${gates.length} gates` });
  };

  const handleCell = (qubit: number, step: number, existing: CircuitGate | null) => {
    if (!building) return;
    setNotice("");
    if (existing) {
      change(circuit.gates.filter((g) => g.id !== existing.id));
      return;
    }
    if (selected === "CX") {
      const target = qubit === 0 ? 1 : 0;
      const taken = circuit.gates.some(
        (g) => g.step === step && (g.qubit === target || g.target === target)
      );
      if (taken) {
        setNotice(
          t({
            en: `CX needs both wires free in that column. Step ${step + 1} is already used on q${target}.`,
            hi: `CX ko us column mein dono wires free chahiye. Step ${step + 1} par q${target} already used hai.`,
          })
        );
        return;
      }
      change([...circuit.gates, makeGate("CX", qubit, step, target)]);
      return;
    }
    change([...circuit.gates, makeGate(selected, qubit, step)]);
  };

  const loadPreset = (spec: Spec) => {
    setCircuit(buildCircuit(QUBITS, spec, STEPS));
    setStage("build");
    setError(null);
    setNotice("");
    setExperiment((n) => n + 1);
    actions.track("circuitEdited", { detail: "preset" });
  };

  const clearCircuit = () => {
    setNotice("");
    change([]);
  };

  const resetLab = () => {
    setCircuit(emptyCircuit());
    setStage("build");
    setError(null);
    setNotice("");
    setSelected("H");
    setExperiment((n) => n + 1);
  };

  const editCircuit = () => {
    setStage("build");
    setExperiment((n) => n + 1);
  };

  /** Check the circuit before the learner predicts. Problems are explained, never just rejected. */
  const lockIn = () => {
    const problem = validateCircuit(circuit);
    if (problem) {
      setError(problem);
      actions.track("executionError", {
        topic,
        detail: describeCircuit(circuit),
        meta: { code: problem.code },
      });
      return;
    }
    setError(null);
    setNotice("");
    setStage("predict");
  };

  const stageIndex = STAGE_ORDER.indexOf(stage);

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
                  active
                    ? "border-ket bg-ket/15 text-ket"
                    : done
                      ? "border-ok/40 text-ok"
                      : "border-line text-dim"
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
        <section aria-labelledby="builder-title" className="panel p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="builder-title" className="text-lg font-semibold">
              {building
                ? t({ en: "Build your circuit", hi: "Apna circuit banao" })
                : t({ en: "Your circuit", hi: "Aapka circuit" })}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {building ? (
                <button
                  type="button"
                  onClick={clearCircuit}
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
              <button type="button" onClick={resetLab} className="btn btn-ghost px-3 py-2 text-sm">
                <RotateCcw size={16} aria-hidden />
                Reset lab
              </button>
            </div>
          </div>

          {building && (
            <>
              <p className="mb-2 text-sm text-mute">
                {t({
                  en: "1. Pick a gate.  2. Click a spot on a wire to place it.  Click a placed gate to remove it.",
                  hi: "1. Ek gate choose karo.  2. Wire par kisi spot par click karke place karo.  Placed gate par click karke use hatao.",
                })}
              </p>
              <div role="group" aria-label="Gates" className="mb-4 flex flex-wrap gap-2">
                {PALETTE.map((gate) => (
                  <GateButton key={gate} gate={gate} selected={selected === gate} onSelect={setSelected} />
                ))}
              </div>
            </>
          )}

          <div className={`well px-3 py-2 ${building ? "" : "opacity-95"}`}>
            <QuantumCircuit
              circuit={circuit}
              onCellClick={building ? handleCell : undefined}
              placing={selected}
            />
          </div>

          {building && selected === "CX" && (
            <p className="mt-2 text-sm text-mute">
              {t({
                en: "CX: the wire you click becomes the control (●). The other wire becomes the target (+).",
                hi: "CX: jis wire par click karoge woh control (●) banega. Doosra wire target (+) banega.",
              })}
            </p>
          )}

          {notice && (
            <p role="status" className="mt-3 text-sm text-warn">
              {notice}
            </p>
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
                    onClick={() => loadPreset(preset.spec)}
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

        {/* Predict → Run → Observe → Explain */}
        {!building && (
          <ExperimentFlow
            key={`${experiment}-${signature}`}
            circuit={circuit}
            source="lab"
            topic={topic}
            showCircuit={false}
            onStageChange={setStage}
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
          Local Educational Quantum Simulator. Two qubits, six steps, 1,024 runs per experiment.
          Nothing leaves your browser, and no real quantum hardware is used.
        </p>
      </div>
    </>
  );
}
