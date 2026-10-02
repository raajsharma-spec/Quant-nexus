/**
 * QUANTUM NEXUS — Local Educational Quantum Simulator
 * ----------------------------------------------------
 * A small state-vector simulator that runs entirely in the browser.
 * It is built for learning, not for research: it supports a handful of
 * qubits and these gates:
 *   single qubit : H, X, Y, Z, S, T and the rotations RX, RY, RZ
 *   two qubits   : CX (CNOT), CZ, SWAP
 *   three qubits : CCX (Toffoli)
 *   measurement  : M
 *
 * It does NOT talk to real quantum hardware. Running a circuit somewhere
 * else (for example the optional Qiskit service) is handled one level up,
 * in lib/execution.ts — this file is always the local fallback.
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

export type GateType =
  | "H"
  | "X"
  | "Y"
  | "Z"
  | "S"
  | "T"
  | "RX"
  | "RY"
  | "RZ"
  | "CX"
  | "CZ"
  | "SWAP"
  | "CCX"
  | "M";

/** Every gate name the simulator understands — used to validate requests. */
export const GATE_TYPES: GateType[] = [
  "H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ", "CX", "CZ", "SWAP", "CCX", "M",
];

export const SINGLE_QUBIT_GATES: GateType[] = ["H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ"];
export const ROTATION_GATES: GateType[] = ["RX", "RY", "RZ"];
export const MULTI_QUBIT_GATES: GateType[] = ["CX", "CZ", "SWAP", "CCX"];

/** Limits that keep the educational simulator fast in a browser. */
export const MAX_QUBITS = 5;
export const MAX_SHOTS = 8192;
export const DEFAULT_SHOTS = 1024;

export interface CircuitGate {
  id: string;
  type: GateType;
  /** The wire this gate sits on. For CX, CZ and CCX this is the (first) control qubit. */
  qubit: number;
  /** CX / CCX: the qubit that gets flipped. CZ / SWAP: the second qubit. */
  target?: number;
  /** Only for CCX (Toffoli): the second control qubit. */
  control2?: number;
  /** Only for RX / RY / RZ: the rotation angle in radians. */
  theta?: number;
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
  | "INVALID_CX"
  | "INVALID_REQUEST";

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

export type Matrix2 = [[Complex, Complex], [Complex, Complex]];

const MATRICES: Record<"H" | "X" | "Y" | "Z" | "S" | "T", Matrix2> = {
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
  // S: a quarter-turn of phase. |1⟩ picks up a factor of i. Two S gates make a Z.
  S: [
    [c(1), c(0)],
    [c(0), c(0, 1)],
  ],
  // T: an eighth-turn of phase. |1⟩ picks up e^(iπ/4). Two T gates make an S.
  T: [
    [c(1), c(0)],
    [c(0), c(S, S)],
  ],
};

/**
 * Rotation gates turn the Bloch arrow by an angle θ around one axis.
 *   RX(θ) = [[cos θ/2, −i·sin θ/2], [−i·sin θ/2, cos θ/2]]
 *   RY(θ) = [[cos θ/2, −sin θ/2],   [sin θ/2,    cos θ/2]]
 *   RZ(θ) = [[e^(−iθ/2), 0],        [0,          e^(iθ/2)]]
 */
function rotationMatrix(type: "RX" | "RY" | "RZ", theta: number): Matrix2 {
  const cos = Math.cos(theta / 2);
  const sin = Math.sin(theta / 2);
  if (type === "RX") {
    return [
      [c(cos), c(0, -sin)],
      [c(0, -sin), c(cos)],
    ];
  }
  if (type === "RY") {
    return [
      [c(cos), c(-sin)],
      [c(sin), c(cos)],
    ];
  }
  return [
    [c(cos, -sin), c(0)],
    [c(0), c(cos, sin)],
  ];
}

/** The 2×2 matrix of a single-qubit gate (also shown in the lab's advanced view). */
export function gateMatrix(gate: Pick<CircuitGate, "type" | "theta">): Matrix2 | null {
  switch (gate.type) {
    case "H":
    case "X":
    case "Y":
    case "Z":
    case "S":
    case "T":
      return MATRICES[gate.type];
    case "RX":
    case "RY":
    case "RZ":
      return rotationMatrix(gate.type, gate.theta ?? Math.PI / 2);
    default:
      return null;
  }
}

/** Every wire a gate touches, e.g. [control, target] for CX. */
export function gateWires(gate: CircuitGate): number[] {
  switch (gate.type) {
    case "CX":
    case "CZ":
    case "SWAP":
      return [gate.qubit, gate.target ?? -1];
    case "CCX":
      return [gate.qubit, gate.control2 ?? -1, gate.target ?? -1];
    default:
      return [gate.qubit];
  }
}

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

  if (gate.type === "CX" || gate.type === "CCX") {
    // Controlled-X: flip the target only in the parts of the state where
    // every control qubit is 1. In practice that means swapping pairs of
    // amplitudes. CCX (Toffoli) is the same idea with two controls.
    let controlMask = maskFor(gate.qubit, totalQubits);
    if (gate.type === "CCX") controlMask |= maskFor(gate.control2 ?? 0, totalQubits);
    const targetMask = maskFor(gate.target ?? 0, totalQubits);
    for (let i = 0; i < state.length; i++) {
      const controlsAreOne = (i & controlMask) === controlMask;
      const targetIsZero = (i & targetMask) === 0;
      if (controlsAreOne && targetIsZero) {
        const j = i | targetMask;
        next[i] = state[j];
        next[j] = state[i];
      }
    }
    return next;
  }

  if (gate.type === "CZ") {
    // Controlled-Z: put a minus sign on the part of the state where BOTH
    // qubits are 1. Nothing is swapped, only a phase changes.
    const both = maskFor(gate.qubit, totalQubits) | maskFor(gate.target ?? 0, totalQubits);
    for (let i = 0; i < state.length; i++) {
      if ((i & both) === both) next[i] = c(-state[i].re, -state[i].im);
    }
    return next;
  }

  if (gate.type === "SWAP") {
    // SWAP: exchange the two qubits. Only the parts where they differ move.
    const a = maskFor(gate.qubit, totalQubits);
    const b = maskFor(gate.target ?? 0, totalQubits);
    for (let i = 0; i < state.length; i++) {
      const aIsOne = (i & a) !== 0;
      const bIsOne = (i & b) !== 0;
      if (aIsOne && !bIsOne) {
        const j = (i & ~a) | b;
        next[i] = state[j];
        next[j] = state[i];
      }
    }
    return next;
  }

  // Single-qubit gate. Amplitudes come in pairs that differ only in this
  // qubit's bit: (…0…) and (…1…). The 2×2 matrix mixes each pair.
  const m = gateMatrix(gate);
  if (!m) return next;
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

const invalid = (en: string, hi: string, fixEn: string, fixHi: string): SimulationError => ({
  ok: false,
  code: "INVALID_REQUEST",
  message: { en, hi },
  fix: { en: fixEn, hi: fixHi },
});

/**
 * Input validation. A malformed circuit (unknown gate, wire that does not
 * exist, too many qubits …) is turned into a clear message instead of a crash.
 */
export function validateStructure(circuit: Circuit, shots?: number): SimulationError | null {
  if (!Number.isInteger(circuit.qubits) || circuit.qubits < 1 || circuit.qubits > MAX_QUBITS) {
    return invalid(
      `This simulator runs 1 to ${MAX_QUBITS} qubits.`,
      `Yeh simulator 1 se ${MAX_QUBITS} qubits tak run karta hai.`,
      "Reduce the number of qubits and try again.",
      "Qubits kam karke dobara try karo."
    );
  }
  if (shots !== undefined && (!Number.isInteger(shots) || shots < 1 || shots > MAX_SHOTS)) {
    return invalid(
      `Shots must be a whole number from 1 to ${MAX_SHOTS.toLocaleString()}.`,
      `Shots 1 se ${MAX_SHOTS.toLocaleString()} ke beech ka whole number hona chahiye.`,
      "Choose a shot count in that range.",
      "Us range mein shot count choose karo."
    );
  }
  if (!Array.isArray(circuit.gates) || circuit.gates.length > 200) {
    return invalid(
      "This circuit is too large for the educational simulator.",
      "Yeh circuit educational simulator ke liye bahut bada hai.",
      "Remove some gates and try again.",
      "Kuch gates hatao aur dobara try karo."
    );
  }
  for (const gate of circuit.gates) {
    if (!GATE_TYPES.includes(gate.type)) {
      return invalid(
        `"${String(gate.type)}" is not a gate this simulator knows.`,
        `"${String(gate.type)}" is simulator ka known gate nahi hai.`,
        `Use one of: ${GATE_TYPES.join(", ")}.`,
        `Inme se ek use karo: ${GATE_TYPES.join(", ")}.`
      );
    }
    const wires = gateWires(gate);
    const outOfRange = wires.some((w) => !Number.isInteger(w) || w < 0 || w >= circuit.qubits);
    if (outOfRange || !Number.isInteger(gate.step) || gate.step < 0) {
      if (MULTI_QUBIT_GATES.includes(gate.type)) continue; // reported below with a friendlier message
      return invalid(
        `A ${gate.type} gate points at a qubit that does not exist.`,
        `Ek ${gate.type} gate aise qubit par laga hai jo exist nahi karta.`,
        `Use qubits q0 to q${circuit.qubits - 1}.`,
        `q0 se q${circuit.qubits - 1} tak ke qubits use karo.`
      );
    }
    if (ROTATION_GATES.includes(gate.type) && gate.theta !== undefined && !Number.isFinite(gate.theta)) {
      return invalid(
        `The angle of a ${gate.type} gate is not a number.`,
        `${gate.type} gate ka angle number nahi hai.`,
        "Pick the angle again.",
        "Angle dobara choose karo."
      );
    }
  }
  return null;
}

/** Check that the circuit is something this simulator can run. */
export function validateCircuit(circuit: Circuit, shots?: number): SimulationError | null {
  const structural = validateStructure(circuit, shots);
  if (structural) return structural;

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

  // Multi-qubit gates need distinct wires that all exist.
  for (const gate of circuit.gates) {
    if (!MULTI_QUBIT_GATES.includes(gate.type)) continue;
    const wires = gateWires(gate);
    const distinct = new Set(wires).size === wires.length;
    const inRange = wires.every((w) => Number.isInteger(w) && w >= 0 && w < circuit.qubits);
    if (!distinct || !inRange) {
      const needs = gate.type === "CCX" ? "three" : "two";
      const needsHi = gate.type === "CCX" ? "teen" : "do";
      return {
        ok: false,
        code: "INVALID_CX",
        message: {
          en: `A ${gate.type} gate needs ${needs} different qubits.`,
          hi: `${gate.type} gate ko ${needsHi} alag qubits chahiye.`,
        },
        fix: {
          en: `Remove the ${gate.type} and place it again on a free column.`,
          hi: `${gate.type} hatao aur use kisi free column mein dobara place karo.`,
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
    for (const wire of gateWires(gate)) {
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
  const shots = options.shots ?? DEFAULT_SHOTS;
  const problem = validateCircuit(circuit, shots);
  if (problem) return problem;

  const n = circuit.qubits;
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

/**
 * The state of a register after some gates, WITHOUT measuring.
 * Used by the experiment sandbox, the visual lessons and the Bloch sphere,
 * where the learner looks at a state before any measurement happens.
 */
export interface StateSnapshot {
  stateVector: Complex[];
  /** One Bloch vector per qubit. */
  bloch: BlochVector[];
  /** Exact probability of every result if all qubits were measured now. */
  probabilities: Record<string, number>;
}

export function stateAfter(qubits: number, gates: CircuitGate[]): StateSnapshot {
  const n = Math.max(1, Math.min(MAX_QUBITS, qubits));
  const allQubits = Array.from({ length: n }, (_, q) => q);
  let state = initialState(n);
  const usable = gates.filter(
    (g) => g.type !== "M" && gateWires(g).every((w) => Number.isInteger(w) && w >= 0 && w < n)
  );
  for (const gate of [...usable].sort((a, b) => a.step - b.step || a.qubit - b.qubit)) {
    state = applyGate(state, gate, n);
  }
  return {
    stateVector: state,
    bloch: allQubits.map((q) => blochVector(state, q, n)),
    probabilities: calculateProbabilities(state, allQubits, n),
  };
}

/** Basis labels in the order of the state vector: "0","1" or "00","01","10","11" … */
export function basisLabels(qubits: number): string[] {
  return Array.from({ length: 1 << qubits }, (_, k) => k.toString(2).padStart(qubits, "0"));
}

// ---------------------------------------------------------------------------
// Small helpers used by the UI
// ---------------------------------------------------------------------------

let gateCounter = 0;
/** Create a gate with a unique id. `extra` is the second control (CCX) or the angle (RX/RY/RZ). */
export function makeGate(
  type: GateType,
  qubit: number,
  step: number,
  target?: number,
  extra?: number
): CircuitGate {
  gateCounter += 1;
  const gate: CircuitGate = { id: `g${Date.now().toString(36)}${gateCounter}`, type, qubit, step };
  if (target !== undefined) gate.target = target;
  if (type === "CCX" && extra !== undefined) gate.control2 = extra;
  if (ROTATION_GATES.includes(type)) gate.theta = extra ?? Math.PI / 2;
  return gate;
}

/** A circuit written as [gate, qubit, step, target?, extra?] rows. */
export type GateSpec = [GateType, number, number, number?, number?];

/** Build a circuit from a short description — handy for lessons and challenges. */
export function buildCircuit(qubits: number, spec: GateSpec[], steps = 6): Circuit {
  return {
    qubits,
    steps,
    gates: spec.map(([type, qubit, step, target, extra]) => makeGate(type, qubit, step, target, extra)),
  };
}

/** "π/2", "π/4", "π" or a decimal — for showing rotation angles. */
export function angleLabel(theta: number): string {
  const ratio = theta / Math.PI;
  const known: Array<[number, string]> = [
    [1, "π"],
    [0.5, "π/2"],
    [0.25, "π/4"],
    [1 / 3, "π/3"],
    [2, "2π"],
  ];
  for (const [value, label] of known) {
    if (Math.abs(ratio - value) < 1e-9) return label;
    if (Math.abs(ratio + value) < 1e-9) return `−${label}`;
  }
  return theta.toFixed(2);
}

/** How a gate is written on one of its wires, e.g. "CX(control)" or "RX(π/2)". */
export function gateLabelOnWire(gate: CircuitGate, wire: number): string {
  switch (gate.type) {
    case "CX":
      return gate.qubit === wire ? "CX(control)" : "CX(target)";
    case "CZ":
      return "CZ";
    case "SWAP":
      return "SWAP";
    case "CCX":
      return gate.target === wire ? "CCX(target)" : "CCX(control)";
    case "RX":
    case "RY":
    case "RZ":
      return `${gate.type}(${angleLabel(gate.theta ?? Math.PI / 2)})`;
    default:
      return gate.type;
  }
}

/** A one-line text version of a circuit, e.g. "q0: H → M | q1: M". Stored with predictions. */
export function describeCircuit(circuit: Circuit): string {
  const lines: string[] = [];
  for (let q = 0; q < circuit.qubits; q++) {
    const parts = orderedGates(circuit)
      .filter((g) => gateWires(g).includes(q))
      .map((g) => gateLabelOnWire(g, q));
    if (parts.length > 0) lines.push(`q${q}: ${parts.join(" → ")}`);
  }
  return lines.join(" | ") || "empty circuit";
}

/** A signature that changes whenever the circuit changes. */
export function circuitSignature(circuit: Circuit): string {
  return (
    `${circuit.qubits}q:` +
    orderedGates(circuit)
      .map((g) => `${g.type}${g.qubit}${g.target ?? ""}${g.control2 ?? ""}${g.theta ?? ""}@${g.step}`)
      .join(",")
  );
}
