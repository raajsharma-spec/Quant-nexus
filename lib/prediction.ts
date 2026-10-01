/**
 * Predict-before-run helpers.
 * Builds the multiple-choice prediction for any circuit the learner creates,
 * and turns distributions into readable labels like "50% |0⟩ + 50% |1⟩".
 */

import { simulateCircuit, type Circuit } from "./quantumSimulator";
import type { L, TopicId } from "./types";

export type Distribution = Record<string, number>;

export interface PredictionOption {
  id: string;
  label: L;
  /** null for "Not sure yet" — the learner chose not to guess. */
  distribution: Distribution | null;
}

export interface PredictionSet {
  options: PredictionOption[];
  correctId: string;
  measuredQubits: number[];
}

/** "|01⟩" */
export const ket = (bits: string) => `|${bits}⟩`;

/** Turn a distribution into "50% |0⟩ + 50% |1⟩". Results with 0% are left out. */
export function distributionLabel(distribution: Distribution): string {
  const parts = Object.entries(distribution)
    .filter(([, p]) => p > 0.0005)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bits, p]) => `${Math.round(p * 100)}% ${ket(bits)}`);
  return parts.join(" + ");
}

/** Same thing for sampled counts, with the ≈ sign because samples are never exact. */
export function countsLabel(counts: Record<string, number>, shots: number): string {
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    // A result seen in every single run is exact, so it gets no ≈ sign.
    .map(([bits, n]) => `${n === shots ? "" : "≈"}${Math.round((n / shots) * 100)}% ${ket(bits)}`);
  return parts.join(" + ");
}

/** A short key so two distributions can be compared: "0:50|1:50". */
function keyOf(distribution: Distribution): string {
  return Object.entries(distribution)
    .filter(([, p]) => p > 0.0005)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bits, p]) => `${bits}:${Math.round(p * 100)}`)
    .join("|");
}

function uniform(labels: string[], all: string[]): Distribution {
  const d: Distribution = {};
  all.forEach((l) => (d[l] = 0));
  labels.forEach((l) => (d[l] = 1 / labels.length));
  return d;
}

/** Distractors that match common beginner guesses, in priority order. */
function candidatePool(width: number): Distribution[] {
  const all = Array.from({ length: 1 << width }, (_, k) => k.toString(2).padStart(width, "0"));
  if (width === 1) {
    return [uniform(["0"], all), uniform(["1"], all), uniform(["0", "1"], all)];
  }
  if (width === 2) {
    return [
      uniform(["00"], all), // "nothing changes"
      uniform(all, all), // "everything is random"
      uniform(["00", "11"], all), // linked results
      uniform(["00", "10"], all), // only q0 is random
      uniform(["11"], all),
      uniform(["10"], all),
      uniform(["00", "01"], all), // only q1 is random
      uniform(["01"], all),
      uniform(["01", "10"], all),
    ];
  }
  // Wider registers: fall back to a few generic guesses.
  return [uniform([all[0]], all), uniform(all, all), uniform([all[all.length - 1]], all)];
}

/**
 * Build the prediction question for a circuit.
 * Returns null if the circuit cannot run yet (the lab shows the reason instead).
 */
export function buildPredictionOptions(circuit: Circuit): PredictionSet | null {
  const result = simulateCircuit(circuit, { shots: 1 });
  if (!result.ok) return null;

  const width = result.measuredQubits.length;
  const correct = result.probabilities;
  const correctKey = keyOf(correct);

  const pool = candidatePool(width);
  const chosen: Distribution[] = [];
  const limit = width === 1 ? 3 : 4;

  // Keep the pool's natural order so the right answer is not always first.
  const poolHasCorrect = pool.some((d) => keyOf(d) === correctKey);
  if (!poolHasCorrect) chosen.push(correct);
  for (const d of pool) {
    if (chosen.length >= limit) break;
    const isCorrect = keyOf(d) === correctKey;
    const slotsLeft = limit - chosen.length;
    const correctStillMissing = !chosen.some((x) => keyOf(x) === correctKey);
    // Always leave room for the correct answer.
    if (!isCorrect && correctStillMissing && slotsLeft === 1) continue;
    chosen.push(d);
  }

  const options: PredictionOption[] = chosen.map((d) => {
    const text = distributionLabel(d);
    return { id: keyOf(d), label: { en: text, hi: text }, distribution: d };
  });
  options.push({
    id: "unsure",
    label: { en: "Not sure yet — show me", hi: "Abhi sure nahi — dikhao" },
    distribution: null,
  });

  return { options, correctId: correctKey, measuredQubits: result.measuredQubits };
}

/** Which topic a circuit mostly exercises — used to file predictions under a concept. */
export function topicOfCircuit(circuit: Circuit): TopicId {
  const types = new Set(circuit.gates.map((g) => g.type));
  if (types.has("CX")) return "entanglement";
  if (types.has("H")) return "superposition";
  if (types.has("X") || types.has("Y") || types.has("Z")) return "gates";
  return "qubit";
}
