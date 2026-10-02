"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Circle, RotateCcw, Undo2 } from "lucide-react";
import type { Sandbox, SandboxGoal } from "@/data/curriculum";
import { ket } from "@/lib/prediction";
import {
  basisLabels,
  gateMatrix,
  makeGate,
  stateAfter,
  type CircuitGate,
  type Complex,
} from "@/lib/quantumSimulator";
import { useApp } from "./AppProvider";
import { BlochSphere3D } from "./BlochSphere3D";
import { GATE_INFO } from "./GateButton";
import { ProbabilityBars } from "./ProbabilityBars";

interface Props {
  sandbox: Sandbox;
  /** Goal ids already reached (from the saved learning state). */
  reached: string[];
  onGoal: (goalId: string) => void;
  /** Called on every gate press, so the journey can count it as an interaction. */
  onUse?: () => void;
  /** Show amplitudes and the last gate's matrix without expanding. */
  advanced?: boolean;
}

const formatAmplitude = (a: Complex) => {
  const fix = (v: number) => (Math.abs(v) < 5e-4 ? "0" : v.toFixed(3));
  if (Math.abs(a.im) < 5e-4) return fix(a.re);
  if (Math.abs(a.re) < 5e-4) return `${fix(a.im)}i`;
  return `${fix(a.re)} ${a.im < 0 ? "−" : "+"} ${fix(Math.abs(a.im))}i`;
};

/** Does the current state satisfy a goal? Checked against the real simulated state. */
export function goalReached(
  goal: SandboxGoal,
  probabilities: Record<string, number>,
  applied: CircuitGate[],
  start: 0 | 1
): boolean {
  if (goal.start !== undefined && goal.start !== start) return false;
  const used = applied.map((g) => g.type);
  if (goal.minGates !== undefined && used.length < goal.minGates) return false;
  if (goal.mustUse && !goal.mustUse.every((g) => used.includes(g))) return false;
  if (goal.mustUseAny && !goal.mustUseAny.some((g) => used.includes(g))) return false;
  if (goal.mustNotUse && goal.mustNotUse.some((g) => used.includes(g))) return false;
  return Object.entries(goal.probabilities).every(
    ([label, target]) => Math.abs((probabilities[label] ?? 0) - target) < 0.02
  );
}

/**
 * The experiment sandbox: apply gates one at a time and look directly at the
 * state — the Bloch sphere, the exact probabilities and (for advanced
 * learners) the amplitudes. Nothing is measured here, so nothing is random.
 */
export function StateSandbox({ sandbox, reached, onGoal, onUse, advanced = false }: Props) {
  const { t } = useApp();
  const [start, setStart] = useState<0 | 1>(0);
  const [applied, setApplied] = useState<CircuitGate[]>([]);

  // Starting from |1⟩ is an X gate applied before the learner's own gates.
  const snapshot = useMemo(() => {
    const prep = start === 1 ? [makeGate("X", 0, -1)] : [];
    const gates = [...prep, ...applied.map((g, index) => ({ ...g, step: index }))];
    return stateAfter(sandbox.qubits, gates);
  }, [sandbox.qubits, applied, start]);

  // Report goals as they are reached.
  useEffect(() => {
    for (const goal of sandbox.goals) {
      if (reached.includes(goal.id)) continue;
      if (goalReached(goal, snapshot.probabilities, applied, start)) onGoal(goal.id);
    }
  }, [snapshot, applied, start, sandbox.goals, reached, onGoal]);

  const press = (opId: string) => {
    const op = sandbox.ops.find((o) => o.id === opId);
    if (!op || applied.length >= 12) return;
    setApplied((list) => [...list, makeGate(op.gate, op.qubit, list.length, op.target)]);
    onUse?.();
  };

  const labels = basisLabels(sandbox.qubits);
  const last = applied[applied.length - 1];
  const matrix = last ? gateMatrix(last) : null;
  const sequence =
    applied.length === 0
      ? t({ en: "no gates yet", hi: "abhi koi gate nahi" })
      : applied
          .map((g) => (g.type === "CX" ? `CX(q${g.qubit}→q${g.target})` : sandbox.qubits > 1 ? `${g.type}(q${g.qubit})` : g.type))
          .join(" → ");

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_19rem]">
      <div className="well p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {sandbox.chooseStart && (
            <div role="group" aria-label="Starting state" className="flex items-center gap-2">
              <span className="text-sm text-mute">{t({ en: "Start in", hi: "Start state" })}</span>
              {([0, 1] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStart(value);
                    setApplied([]);
                    onUse?.();
                  }}
                  aria-pressed={start === value}
                  className={`ket rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                    start === value ? "border-ket bg-ket/15 text-ket" : "border-line text-mute hover:text-ink"
                  }`}
                >
                  |{value}⟩
                </button>
              ))}
            </div>
          )}
          <div role="group" aria-label="Apply a gate" className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-mute">{t({ en: "Apply", hi: "Apply karo" })}</span>
            {sandbox.ops.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => press(op.id)}
                disabled={applied.length >= 12}
                title={`${GATE_INFO[op.gate].name}: ${GATE_INFO[op.gate].does}`}
                className={`ket rounded-lg border px-3 py-2 text-sm font-semibold transition-colors hover:brightness-125 ${GATE_INFO[op.gate].className}`}
              >
                {op.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => setApplied((list) => list.slice(0, -1))}
              disabled={applied.length === 0}
              className="btn btn-ghost px-2.5 py-1.5 text-sm"
            >
              <Undo2 size={15} aria-hidden />
              {t({ en: "Undo", hi: "Undo" })}
            </button>
            <button
              type="button"
              onClick={() => setApplied([])}
              disabled={applied.length === 0}
              className="btn btn-ghost px-2.5 py-1.5 text-sm"
            >
              <RotateCcw size={15} aria-hidden />
              {t({ en: "Reset", hi: "Reset" })}
            </button>
          </div>
        </div>

        <p className="ket mt-3 text-sm text-mute" aria-live="polite">
          {ket(sandbox.qubits > 1 ? "0".repeat(sandbox.qubits) : String(start))} → {sequence}
        </p>

        <div className="mt-4 grid items-center gap-5 md:grid-cols-[auto_1fr]" aria-live="polite">
          <div className="flex flex-wrap justify-center gap-3">
            {snapshot.bloch.map((vector, q) => (
              <BlochSphere3D
                key={q}
                vector={vector}
                title={sandbox.qubits > 1 ? `q${q}` : "state"}
                size={sandbox.qubits > 1 ? 180 : 220}
                showAngles={advanced}
              />
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">
              {t({ en: "If you measured now (exact probabilities)", hi: "Agar abhi measure karo (exact probabilities)" })}
            </p>
            <ProbabilityBars values={snapshot.probabilities} tone="phase" label="Exact probabilities of the current state" />

            <details className="mt-4" open={advanced}>
              <summary className="cursor-pointer rounded text-sm font-medium text-mute hover:text-ink">
                {t({ en: "Advanced: amplitudes and gate matrix", hi: "Advanced: amplitudes aur gate matrix" })}
              </summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <table className="text-left text-sm">
                  <caption className="mb-1 text-left text-xs text-dim">
                    {t({ en: "State vector (probability = |amplitude|²)", hi: "State vector (probability = |amplitude|²)" })}
                  </caption>
                  <tbody>
                    {labels.map((bits, index) => (
                      <tr key={bits} className="border-t border-line">
                        <th scope="row" className="ket py-1 pr-3 font-medium">{ket(bits)}</th>
                        <td className="ket py-1 text-right tabular-nums">{formatAmplitude(snapshot.stateVector[index])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {matrix && last && (
                  <div className="text-sm">
                    <p className="mb-1 text-xs text-dim">
                      {t({ en: `Matrix of the last gate (${last.type})`, hi: `Last gate (${last.type}) ka matrix` })}
                    </p>
                    <div className="ket inline-grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border-x-2 border-ink/40 px-3 py-1.5 tabular-nums">
                      {matrix.flat().map((cell, index) => (
                        <span key={index} className="text-right">
                          {formatAmplitude(cell)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="well p-4">
        <p className="text-sm font-semibold">
          {t({ en: "Goals", hi: "Goals" })}{" "}
          <span className="font-normal text-mute">
            · {reached.length} / {sandbox.goals.length}
          </span>
        </p>
        <ol className="mt-3 flex flex-col gap-3">
          {sandbox.goals.map((goal) => {
            const done = reached.includes(goal.id);
            return (
              <li key={goal.id} className="flex gap-2.5 text-sm leading-snug">
                {done ? (
                  <Check size={17} className="mt-0.5 shrink-0 text-ok" aria-label="Reached" />
                ) : (
                  <Circle size={17} className="mt-0.5 shrink-0 text-dim" aria-label="Not reached yet" />
                )}
                <span>
                  <span className={done ? "text-ink" : "text-ink/90"}>{t(goal.text)}</span>
                  {done && <span className="mt-1 block text-mute">{t(goal.insight)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
