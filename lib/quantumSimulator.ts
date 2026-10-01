/**
 * QUANTUM NEXUS — Local Educational Quantum Simulator
 * ----------------------------------------------------
 * A small state-vector simulator that runs entirely in the browser.
 * It is built for learning, not for research: it supports a handful of
 * qubits and the gates H, X, Y, Z, CX and measurement (M).
 *
 * It does NOT talk to real quantum hardware or to any server.
 *
 * How it works, in plain words:
 *  - A register of n qubits is described by 2^n complex numbers called
 *    "amplitudes" — one for every possible result (|00⟩, |01⟩, |10⟩, |11⟩ ...).
 *  - A gate changes those amplitudes.
 *  - The probability of seeing a result when you measure is the squared
 *    size of its amplitude.
 */

import type { L } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GateType = "H" | "X" | "Y" | "Z" | "CX" | "M";

export interface CircuitGate {
  id: string;
  type: GateType;
  /** The wire this gate sits on. For CX this is the control qubit. */
  qubit: number;
  /** Only for CX: the qubit that gets flipped. */
  target?: number;
  /** Column in the circuit (left to right, starting at 0). */
  step: number;
}

export interface Circuit {
  qubits: number;
  steps: number;
  gates: CircuitGate[];
}

/** A complex number: re + im·i */
export interface Complex {
  re: number;
  im: number;
}

/** Where a single qubit "points" on the Bloch sphere. Length < 1 means it is entangled. */
export interface BlochVector {
  x: number;
  y: number;
  z: number;
}

/** A snapshot taken around each gate. The explanation engine reads these. */
export interface TraceStep {
  gate: CircuitGate;
  before: BlochVector[];
  after: BlochVector[];
}

export interface SimulationSuccess {
  ok: true;
  /** Which qubits have a measurement gate, in wire order. */
  measuredQubits: number[];
  /** Exact probability of each result, e.g. { "0": 0.5, "1": 0.5 }. */
  probabilities: Record<string, number>;
  /** How many times each result showed up across `shots` simulated runs. */
  counts: Record<string, number>;
  shots: number;
  /** Amplitudes just before measurement. */
  stateVector: Complex[];
  /** One Bloch vector per qubit, just before measurement. */
  bloch: BlochVector[];
  trace: TraceStep[];
}

export type SimulationErrorCode =
  | "EMPTY"
  | "NO_MEASUREMENT"
  | "GATE_AFTER_MEASUREMENT"
  | "INVALID_CX";

export interface SimulationError {
  ok: false;
  code: SimulationErrorCode;
  message: L;
  fix: L;
}

export type SimulationResult = SimulationSuccess | SimulationError;

// ---------------------------------------------------------------------------
// Complex-number helpers
// ---------------------------------------------------------------------------

const c = (re: number, im = 0): Complex => ({ re, im });
const add = (a: Complex, b: Complex): Complex => c(a.re + b.re, a.im + b.im);
const mul = (a: Complex, b: Complex): Complex =>
  c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const conj = (a: Complex): Complex => c(a.re, -a.im);
const abs2 = (a: Complex): number => a.re * a.re + a.im * a.im;

// ---------------------------------------------------------------------------
// Gate matrices (2×2). Each row lists [to-|0⟩, to-|1⟩] contributions.
// ---------------------------------------------------------------------------

const S = Math.SQRT1_2; // 1/√2 ≈ 0.7071

type Matrix2 = [[Complex, Complex], [Complex, Complex]];

const MATRICES: Record<"H" | "X" | "Y" | "Z", Matrix2> = {
  // Hadamard: turns |0⟩ into an equal mix of |0⟩ and |1⟩.
  H: [
    [c(S), c(S)],
    [c(S), c(-S)],
  ],
  // Pauli-X: the quantum NOT. Swaps |0⟩ and |1⟩.
  X: [
    [c(0), c(1)],
    [c(1), c(0)],
  ],
  // Pauli-Y: flips like X and also adds a phase (the "i").
  Y: [
    [c(0), c(0, -1)],
    [c(0, 1), c(0)],
  ],
  // Pauli-Z: leaves |0⟩ alone and puts a minus sign on |1⟩ (a phase flip).
  Z: [
    [c(1), c(0)],
    [c(0), c(-1)],
  ],
};

// ---------------------------------------------------------------------------
// Bit bookkeeping
// ---------------------------------------------------------------------------

/**
 * We write results with q0 on the left: |q0 q1⟩.
 * So in a 2-qubit register, index 2 (binary "10") means q0 = 1, q1 = 0.
 * This returns the bit mask that picks out one qubit inside an index.
 */
function maskFor(qubit: number, totalQubits: number): number {
  return 1 << (totalQubits - 1 - qubit);
}

/** The starting state: every qubit in |0⟩, so all the amplitude sits on |00…0⟩. */
export function initialState(totalQubits: number): Complex[] {
  const state = Array.from({ length: 1 << totalQubits }, () => c(0));
  state[0] = c(1);
  return state;
}

// ---------------------------------------------------------------------------
// applyGate
// ---------------------------------------------------------------------------

/**
 * Apply one gate to the state vector and return the new state.
 * Measurement (M) is handled at the end of the circuit, so it changes nothing here.
 */
export function applyGate(
  state: Complex[],
  gate: CircuitGate,
  totalQubits: number
): Complex[] {
  const next = state.map((a) => c(a.re, a.im));

  if (gate.type === "M") return next;

  if (gate.type === "CX") {
    // Controlled-X: flip the target only in the parts of the state
    // where the control qubit is 1. In practice that means swapping
    // pairs of amplitudes.
    const controlMask = maskFor(gate.qubit, totalQubits);
    const targetMask = maskFor(gate.target ?? 0, totalQubits);
    for (let i = 0; i < state.length; i++) {
      const controlIsOne = (i & controlMask) !== 0;
      const targetIsZero = (i & targetMask) === 0;
      if (controlIsOne && targetIsZero) {
        const j = i | targetMask;
        next[i] = state[j];
        next[j] = state[i];
      }
    }
    return next;
  }

  // Single-qubit gate. Amplitudes come in pairs that differ only in this
  // qubit's bit: (…0…) and (…1…). The 2×2 matrix mixes each pair.
  const m = MATRICES[gate.type];
  const mask = maskFor(gate.qubit, totalQubits);
  for (let i = 0; i < state.length; i++) {
    if ((i & mask) !== 0) continue; // visit each pair once, from its "0" member
    const j = i | mask;
    const a0 = state[i];
    const a1 = state[j];
    next[i] = add(mul(m[0][0], a0), mul(m[0][1], a1));
    next[j] = add(mul(m[1][0], a0), mul(m[1][1], a1));
  }
  return next;
}

// ---------------------------------------------------------------------------
// calculateProbabilities
// ---------------------------------------------------------------------------

/**
 * Exact probability of every result on the measured qubits.
 * Qubits that are not measured are "summed over" — we add up all the ways
 * they could turn out.
 */
export function calculateProbabilities(
  state: Complex[],
  measuredQubits: number[],
  totalQubits: number
): Record<string, number> {
  const probabilities: Record<string, number> = {};
  const outcomes = 1 << measuredQubits.length;
  for (let k = 0; k < outcomes; k++) {
    probabilities[k.toString(2).padStart(measuredQubits.length, "0")] = 0;
  }
  state.forEach((amplitude, index) => {
    const label = measuredQubits
      .map((q) => ((index & maskFor(q, totalQubits)) !== 0 ? "1" : "0"))
      .join("");
    probabilities[label] += abs2(amplitude);
  });
  // Tidy tiny floating-point leftovers (0.4999999 → 0.5).
  for (const key of Object.keys(probabilities)) {
    probabilities[key] = Math.round(probabilities[key] * 1e9) / 1e9;
  }
  return probabilities;
}

// ---------------------------------------------------------------------------
// measureCircuit
// ---------------------------------------------------------------------------

/**
 * Simulate running the circuit `shots` times. Each shot picks one result
 * at random according to the probabilities — like rolling a weighted die.
 * This is why a 50/50 circuit shows roughly, not exactly, half and half.
 */
export function measureCircuit(
  probabilities: Record<string, number>,
  shots = 1024,
  random: () => number = Math.random
): Record<string, number> {
  const labels = Object.keys(probabilities);
  const counts: Record<string, number> = {};
  labels.forEach((label) => (counts[label] = 0));
  for (let shot = 0; shot < shots; shot++) {
    let r = random();
    let chosen = labels[labels.length - 1];
    for (const label of labels) {
      r -= probabilities[label];
      if (r < 0) {
        chosen = label;
        break;
      }
    }
    counts[chosen] += 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Bloch vector
// ---------------------------------------------------------------------------

/**
 * Where one qubit points on the Bloch sphere.
 *   z = +1 → |0⟩ (north pole),  z = −1 → |1⟩ (south pole)
 *   x = ±1 → an equal superposition (on the equator)
 * If the qubit is entangled with another one, the arrow shrinks toward the centre.
 */
export function blochVector(
  state: Complex[],
  qubit: number,
  totalQubits: number
): BlochVector {
  const mask = maskFor(qubit, totalQubits);
  let p0 = 0;
  let p1 = 0;
  let off = c(0); // the "coherence" between the |0⟩ part and the |1⟩ part
  for (let i = 0; i < state.length; i++) {
    if ((i & mask) !== 0) continue;
    const j = i | mask;
    p0 += abs2(state[i]);
    p1 += abs2(state[j]);
    off = add(off, mul(state[i], conj(state[j])));
  }
  const clean = (v: number) => (Math.abs(v) < 1e-9 ? 0 : Math.round(v * 1e6) / 1e6);
  return { x: clean(2 * off.re), y: clean(-2 * off.im), z: clean(p0 - p1) };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Gates in the order they run: left to right, then top wire first. */
export function orderedGates(circuit: Circuit): CircuitGate[] {
  return [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit);
}

/** Check that the circuit is something this simulator can run. */
export function validateCircuit(circuit: Circuit): SimulationError | null {
  if (circuit.gates.length === 0) {
    return {
      ok: false,
      code: "EMPTY",
      message: {
        en: "This circuit has no gates yet.",
        hi: "Is circuit mein abhi koi gate nahi hai.",
      },
      fix: {
        en: "Pick a gate, then click a spot on a wire to place it.",
        hi: "Ek gate choose karo, phir wire par kisi spot par click karke place karo.",
      },
    };
  }

  for (const gate of circuit.gates) {
    if (gate.type !== "CX") continue;
    const target = gate.target;
    if (
      target === undefined ||
      target === gate.qubit ||
      target < 0 ||
      target >= circuit.qubits
    ) {
      return {
        ok: false,
        code: "INVALID_CX",
        message: {
          en: "A CX gate needs two different qubits: a control and a target.",
          hi: "CX gate ko do alag qubits chahiye: ek control aur ek target.",
        },
        fix: {
          en: "Remove the CX and place it again on a free column.",
          hi: "CX hatao aur use kisi free column mein dobara place karo.",
        },
      };
    }
  }

  // In this lab, measurement must be the last thing on a wire.
  const measuredAt = new Map<number, number>();
  for (const gate of circuit.gates) {
    if (gate.type === "M") {
      const earlier = measuredAt.get(gate.qubit);
      measuredAt.set(gate.qubit, earlier === undefined ? gate.step : Math.min(earlier, gate.step));
    }
  }
  for (const gate of circuit.gates) {
    const wires = gate.type === "CX" ? [gate.qubit, gate.target as number] : [gate.qubit];
    for (const wire of wires) {
      const m = measuredAt.get(wire);
      if (m !== undefined && gate.step > m) {
        return {
          ok: false,
          code: "GATE_AFTER_MEASUREMENT",
          message: {
            en: `q${wire} has a gate after its measurement. Measuring ends the quantum part of that wire.`,
            hi: `q${wire} par measurement ke baad bhi ek gate laga hai. Measurement ke baad us wire ka quantum part khatam ho jaata hai.`,
          },
          fix: {
            en: `Move M to the end of q${wire}, or remove the gate that comes after it.`,
            hi: `M ko q${wire} ke end mein le jao, ya uske baad wala gate hata do.`,
          },
        };
      }
    }
  }

  if (measuredAt.size === 0) {
    return {
      ok: false,
      code: "NO_MEASUREMENT",
      message: {
        en: "Nothing is being measured, so there is no result to observe.",
        hi: "Kuch bhi measure nahi ho raha, isliye observe karne ke liye koi result nahi hai.",
      },
      fix: {
        en: "Add an M gate at the end of the wire you want to read.",
        hi: "Jis wire ko read karna hai uske end mein M gate lagao.",
      },
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// simulateCircuit
// ---------------------------------------------------------------------------

/**
 * Run a whole circuit:
 *   1. start every qubit in |0⟩
 *   2. apply the gates left to right
 *   3. work out the exact probabilities for the measured qubits
 *   4. sample `shots` runs so the learner sees realistic, slightly noisy counts
 */
export function simulateCircuit(
  circuit: Circuit,
  options: { shots?: number; random?: () => number } = {}
): SimulationResult {
  const problem = validateCircuit(circuit);
  if (problem) return problem;

  const n = circuit.qubits;
  const shots = options.shots ?? 1024;
  const allQubits = Array.from({ length: n }, (_, q) => q);
  const snapshot = (s: Complex[]) => allQubits.map((q) => blochVector(s, q, n));

  let state = initialState(n);
  const trace: TraceStep[] = [];

  for (const gate of orderedGates(circuit)) {
    const before = snapshot(state);
    state = applyGate(state, gate, n);
    trace.push({ gate, before, after: snapshot(state) });
  }

  const measuredQubits = allQubits.filter((q) =>
    circuit.gates.some((g) => g.type === "M" && g.qubit === q)
  );
  const probabilities = calculateProbabilities(state, measuredQubits, n);
  const counts = measureCircuit(probabilities, shots, options.random);

  return {
    ok: true,
    measuredQubits,
    probabilities,
    counts,
    shots,
    stateVector: state,
    bloch: snapshot(state),
    trace,
  };
}

// ---------------------------------------------------------------------------
// Small helpers used by the UI
// ---------------------------------------------------------------------------

let gateCounter = 0;
/** Create a gate with a unique id. */
export function makeGate(
  type: GateType,
  qubit: number,
  step: number,
  target?: number
): CircuitGate {
  gateCounter += 1;
  return { id: `g${Date.now().toString(36)}${gateCounter}`, type, qubit, step, target };
}

/** Build a circuit from a short description — handy for lessons and challenges. */
export function buildCircuit(
  qubits: number,
  spec: Array<[GateType, number, number, number?]>,
  steps = 6
): Circuit {
  return {
    qubits,
    steps,
    gates: spec.map(([type, qubit, step, target]) => makeGate(type, qubit, step, target)),
  };
}

/** A one-line text version of a circuit, e.g. "q0: H → M | q1: M". Stored with predictions. */
export function describeCircuit(circuit: Circuit): string {
  const lines: string[] = [];
  for (let q = 0; q < circuit.qubits; q++) {
    const parts = orderedGates(circuit)
      .filter((g) => g.qubit === q || (g.type === "CX" && g.target === q))
      .map((g) => {
        if (g.type !== "CX") return g.type;
        return g.qubit === q ? "CX(control)" : "CX(target)";
      });
    if (parts.length > 0) lines.push(`q${q}: ${parts.join(" → ")}`);
  }
  return lines.join(" | ") || "empty circuit";
}

/** A signature that changes whenever the circuit changes. */
export function circuitSignature(circuit: Circuit): string {
  return orderedGates(circuit)
    .map((g) => `${g.type}${g.qubit}${g.target ?? ""}@${g.step}`)
    .join(",");
}
