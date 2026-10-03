/**
 * Turns the learner's circuit into other representations:
 *   - Qiskit, Cirq and PennyLane (Python) code they can paste into a notebook
 *   - OpenQASM 2.0
 *   - a plain-text circuit diagram
 *
 * Everything here is GENERATED from the actual circuit object — nothing is
 * hard-coded. The same circuit description is what the optional Qiskit
 * service receives (see lib/execution.ts and backend/main.py).
 *
 * The SDKs offered to the learner are listed once, in SDK_EXPORTS at the
 * bottom of this file. Supporting another SDK means writing one generator and
 * adding one entry there.
 */

import {
  angleLabel,
  gateWires,
  orderedGates,
  ROTATION_GATES,
  type Circuit,
  type CircuitGate,
  type GateType,
} from "./quantumSimulator";

/** Qubits that carry a measurement, in wire order. Classical bit k reads the k-th of these. */
export function measuredQubits(circuit: Circuit): number[] {
  const measured: number[] = [];
  for (let q = 0; q < circuit.qubits; q++) {
    if (circuit.gates.some((g) => g.type === "M" && g.qubit === q)) measured.push(q);
  }
  return measured;
}

const theta = (gate: CircuitGate) => gate.theta ?? Math.PI / 2;

/** Angle written as Python/QASM source, e.g. "pi/2" or "2*pi". */
function angleSource(value: number): string {
  const label = angleLabel(value);
  if (/π/.test(label)) return label.replace("2π", "2*pi").replace("π", "pi").replace("−", "-");
  return value.toFixed(6);
}

/** True when the generated Python needs `pi` for a rotation angle. */
const hasRotation = (circuit: Circuit) => circuit.gates.some((g) => ROTATION_GATES.includes(g.type));

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

// ---------------------------------------------------------------------------
// Qiskit
// ---------------------------------------------------------------------------

/** One line of Qiskit code for a gate (measurement is handled by the caller). */
function qiskitLine(gate: CircuitGate): string {
  const q = gate.qubit;
  switch (gate.type) {
    case "H":
    case "X":
    case "Y":
    case "Z":
    case "S":
    case "T":
      return `qc.${gate.type.toLowerCase()}(${q})`;
    case "RX":
    case "RY":
    case "RZ":
      return `qc.${gate.type.toLowerCase()}(${angleSource(theta(gate))}, ${q})`;
    case "CX":
      return `qc.cx(${q}, ${gate.target})`;
    case "CZ":
      return `qc.cz(${q}, ${gate.target})`;
    case "SWAP":
      return `qc.swap(${q}, ${gate.target})`;
    case "CCX":
      return `qc.ccx(${q}, ${gate.control2}, ${gate.target})`;
    default:
      return "";
  }
}

/** A complete, runnable Qiskit program for the circuit. */
export function toQiskit(circuit: Circuit, shots = 1024): string {
  const measured = measuredQubits(circuit);
  const usesPi = circuit.gates.some((g) => g.theta !== undefined || ["RX", "RY", "RZ"].includes(g.type));
  const lines: string[] = [];
  if (usesPi) lines.push("from math import pi");
  lines.push("from qiskit import QuantumCircuit, transpile");
  lines.push("from qiskit_aer import AerSimulator");
  lines.push("");
  lines.push(
    `qc = QuantumCircuit(${circuit.qubits}, ${measured.length})  # ${circuit.qubits} qubit${
      circuit.qubits === 1 ? "" : "s"
    }, ${measured.length} classical bit${measured.length === 1 ? "" : "s"}`
  );

  const gates = orderedGates(circuit);
  for (const gate of gates) {
    if (gate.type === "M") continue;
    lines.push(qiskitLine(gate));
  }
  measured.forEach((q, bit) => lines.push(`qc.measure(${q}, ${bit})`));

  lines.push("");
  lines.push("simulator = AerSimulator()");
  lines.push(`result = simulator.run(transpile(qc, simulator), shots=${shots}).result()`);
  lines.push("print(result.get_counts())");
  if (measured.length > 1) {
    lines.push("# Note: Qiskit prints the LAST classical bit on the left.");
    lines.push("# Quantum Nexus writes results as |q0 q1⟩ with q0 on the left.");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Cirq
// ---------------------------------------------------------------------------

/** One Cirq operation for a gate, e.g. "cirq.CNOT(q[0], q[1])". */
function cirqOp(gate: CircuitGate): string {
  const q = `q[${gate.qubit}]`;
  switch (gate.type) {
    case "H":
    case "X":
    case "Y":
    case "Z":
    case "S":
    case "T":
      return `cirq.${gate.type}(${q})`;
    case "RX":
    case "RY":
    case "RZ":
      return `cirq.${gate.type.toLowerCase()}(${angleSource(theta(gate))})(${q})`;
    case "CX":
      return `cirq.CNOT(${q}, q[${gate.target}])`;
    case "CZ":
      return `cirq.CZ(${q}, q[${gate.target}])`;
    case "SWAP":
      return `cirq.SWAP(${q}, q[${gate.target}])`;
    case "CCX":
      return `cirq.TOFFOLI(${q}, q[${gate.control2}], q[${gate.target}])`;
    default:
      return "";
  }
}

/**
 * A complete, runnable Cirq program for the circuit. It prints the counts as
 * bitstrings in Quantum Nexus order: lowest measured qubit on the left.
 */
export function toCirq(circuit: Circuit, shots = 1024): string {
  const measured = measuredQubits(circuit);
  const lines: string[] = [];
  if (hasRotation(circuit)) lines.push("from math import pi");
  lines.push("import cirq");
  lines.push("");
  lines.push(`q = cirq.LineQubit.range(${circuit.qubits})  # ${plural(circuit.qubits, "qubit")}`);
  lines.push("circuit = cirq.Circuit()");
  for (const gate of orderedGates(circuit)) {
    if (gate.type === "M") continue;
    lines.push(`circuit.append(${cirqOp(gate)})`);
  }

  if (measured.length === 0) {
    lines.push("");
    lines.push("# Nothing is measured yet, so this prints the final state vector instead of counts.");
    lines.push("print(cirq.Simulator().simulate(circuit, qubit_order=q).final_state_vector)");
    return lines.join("\n");
  }
  lines.push(`circuit.append(cirq.measure(${measured.map((m) => `q[${m}]`).join(", ")}, key="result"))`);
  lines.push("");
  lines.push(`result = cirq.Simulator().run(circuit, repetitions=${shots})`);
  lines.push("# One character per measured qubit, lowest qubit on the left (the Quantum Nexus order).");
  lines.push('counts = result.histogram(key="result", fold_func=lambda bits: "".join(str(int(b)) for b in bits))');
  lines.push("print(dict(sorted(counts.items())))");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// PennyLane
// ---------------------------------------------------------------------------

/** PennyLane class names for the gates that take no angle. */
const PENNYLANE_NAMES: Partial<Record<GateType, string>> = {
  H: "Hadamard",
  X: "PauliX",
  Y: "PauliY",
  Z: "PauliZ",
  S: "S",
  T: "T",
  CX: "CNOT",
  CZ: "CZ",
  SWAP: "SWAP",
  CCX: "Toffoli",
};

/** One PennyLane operation for a gate, e.g. "qml.CNOT(wires=[0, 1])". */
function pennyLaneOp(gate: CircuitGate): string {
  if (ROTATION_GATES.includes(gate.type)) {
    return `qml.${gate.type}(${angleSource(theta(gate))}, wires=${gate.qubit})`;
  }
  const name = PENNYLANE_NAMES[gate.type];
  if (!name) return "";
  const wires = gateWires(gate);
  return `qml.${name}(wires=${wires.length === 1 ? wires[0] : `[${wires.join(", ")}]`})`;
}

/**
 * A complete, runnable PennyLane program for the circuit on the default.qubit
 * device. It prints the counts as bitstrings in Quantum Nexus order: lowest
 * measured qubit on the left.
 *
 * Shots are set with `qml.set_shots(circuit, shots=...)`, which exists from
 * PennyLane 0.42 on. The older ways (shots on the device, or passed when the
 * circuit is called) are deprecated in current releases.
 */
export function toPennyLane(circuit: Circuit, shots = 1024): string {
  const measured = measuredQubits(circuit);
  const lines: string[] = [];
  if (hasRotation(circuit)) lines.push("from math import pi");
  lines.push("import pennylane as qml");
  lines.push("");
  lines.push(`dev = qml.device("default.qubit", wires=${circuit.qubits})  # ${plural(circuit.qubits, "qubit")}`);
  lines.push("");
  lines.push("@qml.qnode(dev)");
  lines.push("def circuit():");
  for (const gate of orderedGates(circuit)) {
    if (gate.type === "M") continue;
    lines.push(`    ${pennyLaneOp(gate)}`);
  }

  if (measured.length === 0) {
    lines.push("    return qml.state()");
    lines.push("");
    lines.push("# Nothing is measured yet, so this prints the final state vector instead of counts.");
    lines.push("print(circuit())");
    return lines.join("\n");
  }
  lines.push(`    return qml.counts(wires=[${measured.join(", ")}])`);
  lines.push("");
  lines.push(`counts = qml.set_shots(circuit, shots=${shots})()`);
  lines.push("# One character per measured wire, lowest wire on the left (the Quantum Nexus order).");
  lines.push("print({str(bits): int(n) for bits, n in sorted(counts.items())})");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// OpenQASM 2.0
// ---------------------------------------------------------------------------

function qasmLine(gate: CircuitGate): string {
  const q = `q[${gate.qubit}]`;
  switch (gate.type) {
    case "H":
    case "X":
    case "Y":
    case "Z":
    case "S":
    case "T":
      return `${gate.type.toLowerCase()} ${q};`;
    case "RX":
    case "RY":
    case "RZ":
      return `${gate.type.toLowerCase()}(${angleSource(theta(gate))}) ${q};`;
    case "CX":
      return `cx ${q},q[${gate.target}];`;
    case "CZ":
      return `cz ${q},q[${gate.target}];`;
    case "SWAP":
      return `swap ${q},q[${gate.target}];`;
    case "CCX":
      return `ccx ${q},q[${gate.control2}],q[${gate.target}];`;
    default:
      return "";
  }
}

/** The circuit as OpenQASM 2.0 (the format Qiskit, Cirq and others can import). */
export function toOpenQasm(circuit: Circuit): string {
  const measured = measuredQubits(circuit);
  const lines = ["OPENQASM 2.0;", 'include "qelib1.inc";', `qreg q[${circuit.qubits}];`];
  if (measured.length > 0) lines.push(`creg c[${measured.length}];`);
  for (const gate of orderedGates(circuit)) {
    if (gate.type === "M") continue;
    lines.push(qasmLine(gate));
  }
  measured.forEach((q, bit) => lines.push(`measure q[${q}] -> c[${bit}];`));
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Text diagram
// ---------------------------------------------------------------------------

/** The symbol a gate draws on one of its wires. */
function symbolOn(gate: CircuitGate, wire: number): string {
  switch (gate.type) {
    case "CX":
      return gate.qubit === wire ? "■" : "X";
    case "CZ":
      return "■";
    case "SWAP":
      return "x";
    case "CCX":
      return gate.target === wire ? "X" : "■";
    case "RX":
    case "RY":
    case "RZ":
      return `${gate.type}(${angleLabel(theta(gate))})`;
    default:
      return gate.type;
  }
}

/**
 * A text drawing in the style of Qiskit's `qc.draw()`:
 *
 *   q_0: ──H──■──M──
 *   q_1: ─────X──M──
 */
export function toTextDiagram(circuit: Circuit): string {
  const lastStep = circuit.gates.reduce((max, g) => Math.max(max, g.step), -1);
  if (lastStep < 0) {
    return Array.from({ length: circuit.qubits }, (_, q) => `q_${q}: ────`).join("\n");
  }

  const rows = Array.from({ length: circuit.qubits }, (_, q) => `q_${q}: ─`);
  for (let step = 0; step <= lastStep; step++) {
    const column = circuit.gates.filter((g) => g.step === step);
    const cells = rows.map((_, q) => {
      const own = column.find((g) => gateWires(g).includes(q));
      if (own) return symbolOn(own, q);
      // A wire that a multi-qubit gate passes over shows the vertical link.
      const crossing = column.find((g) => {
        const wires = gateWires(g);
        return wires.length > 1 && q > Math.min(...wires) && q < Math.max(...wires);
      });
      return crossing ? "│" : "";
    });
    const width = Math.max(1, ...cells.map((cell) => cell.length));
    cells.forEach((cell, q) => {
      const pad = width - cell.length;
      const left = Math.floor(pad / 2);
      const filler = cell === "│" ? " " : "─";
      const body = cell === "" ? "─".repeat(width) : filler.repeat(left) + cell + filler.repeat(pad - left);
      rows[q] += `─${body}─`;
    });
  }
  return rows.map((row) => `${row}─`).join("\n");
}

/** The payload sent to the optional Qiskit service. Plain JSON, no ids. */
export interface CircuitPayload {
  qubits: number;
  shots: number;
  gates: Array<{
    type: string;
    qubit: number;
    step: number;
    target?: number;
    control2?: number;
    theta?: number;
  }>;
}

export function toPayload(circuit: Circuit, shots: number): CircuitPayload {
  return {
    qubits: circuit.qubits,
    shots,
    gates: orderedGates(circuit).map((g) => {
      const gate: CircuitPayload["gates"][number] = { type: g.type, qubit: g.qubit, step: g.step };
      if (g.target !== undefined) gate.target = g.target;
      if (g.control2 !== undefined) gate.control2 = g.control2;
      if (g.theta !== undefined) gate.theta = g.theta;
      return gate;
    }),
  };
}

// ---------------------------------------------------------------------------
// SDK registry
// ---------------------------------------------------------------------------

export type SdkId = "qiskit" | "cirq" | "pennylane" | "openqasm";

/** One way of writing the circuit down as code. `note` is the caption shown under the code. */
export interface SdkExport {
  id: SdkId;
  label: string;
  language: "Python" | "OpenQASM 2.0";
  note: { en: string; hi: string };
  generate: (circuit: Circuit, shots: number) => string;
}

/** Every SDK the circuit can be exported to, in the order the tabs are shown. */
export const SDK_EXPORTS: SdkExport[] = [
  {
    id: "qiskit",
    label: "Qiskit",
    language: "Python",
    note: {
      en: "Runnable Python. Paste it into a notebook with qiskit and qiskit-aer installed.",
      hi: "Runnable Python. Ise aise notebook mein paste karo jisme qiskit aur qiskit-aer installed ho.",
    },
    generate: toQiskit,
  },
  {
    id: "cirq",
    label: "Cirq",
    language: "Python",
    note: {
      en: "Runnable Python. Paste it into a notebook with cirq installed.",
      hi: "Runnable Python. Ise aise notebook mein paste karo jisme cirq installed ho.",
    },
    generate: toCirq,
  },
  {
    id: "pennylane",
    label: "PennyLane",
    language: "Python",
    note: {
      en: "Runnable Python. Paste it into a notebook with pennylane 0.42 or newer installed.",
      hi: "Runnable Python. Ise aise notebook mein paste karo jisme pennylane 0.42 ya usse naya installed ho.",
    },
    generate: toPennyLane,
  },
  {
    id: "openqasm",
    label: "OpenQASM",
    language: "OpenQASM 2.0",
    note: {
      en: "OpenQASM 2.0 — the text format most quantum frameworks can import.",
      hi: "OpenQASM 2.0 — woh text format jo zyada-tar quantum frameworks import kar sakte hain.",
    },
    generate: (circuit) => toOpenQasm(circuit),
  },
];
