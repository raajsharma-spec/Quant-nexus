"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { explainCircuit } from "@/lib/explain";
import { describeCircuit, simulateCircuit, type Circuit, type SimulationSuccess } from "@/lib/quantumSimulator";
import type { TopicId } from "@/lib/types";
import { useApp } from "./AppProvider";
import { ProbabilityBars } from "./ProbabilityBars";
import { QuantumCircuit } from "./QuantumCircuit";

/** A worked example the learner can run without predicting first. */
export function RunExample({ circuit, topic }: { circuit: Circuit; topic: TopicId }) {
  const { state, t, actions } = useApp();
  const [result, setResult] = useState<SimulationSuccess | null>(null);
  const shots = state.settings.shots;

  const run = () => {
    const r = simulateCircuit(circuit, { shots });
    if (!r.ok) return;
    setResult(r);
    actions.track("circuitExecuted", {
      topic,
      detail: describeCircuit(circuit),
      meta: {
        gates: Array.from(new Set(circuit.gates.map((g) => g.type))).join(","),
        source: "lesson-example",
        shots,
      },
    });
  };

  const observed: Record<string, number> = {};
  if (result) Object.keys(result.counts).forEach((k) => (observed[k] = result.counts[k] / result.shots));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="well flex flex-col justify-between gap-3 px-4 py-3">
        <QuantumCircuit circuit={circuit} trim />
        <button type="button" onClick={run} className="btn btn-secondary self-start text-sm">
          <Play size={15} aria-hidden />
          {result ? t({ en: "Run it again", hi: "Dobara run karo" }) : t({ en: "Run it", hi: "Run karo" })}
        </button>
      </div>
      <div className="well p-4" aria-live="polite">
        {result ? (
          <>
            <p className="mb-2 text-sm font-semibold text-ket">
              {t({ en: "What actually happened", hi: "Actually kya hua" })}
            </p>
            <ProbabilityBars
              key={JSON.stringify(result.counts)}
              values={observed}
              counts={result.counts}
              expected={result.probabilities}
              approx
              label="Measured results"
            />
            <p className="mt-3 text-sm leading-relaxed text-mute">{t(explainCircuit(result).summary)}</p>
          </>
        ) : (
          <p className="text-sm text-dim">
            {t({
              en: `Run the circuit to see ${shots.toLocaleString()} simulated measurements.`,
              hi: `${shots.toLocaleString()} simulated measurements dekhne ke liye circuit run karo.`,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
