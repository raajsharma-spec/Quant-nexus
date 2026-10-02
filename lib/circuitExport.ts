/**
 * Turns the learner's circuit into other representations:
 *   - Qiskit (Python) code they can paste into a notebook
 *   - OpenQASM 2.0
 *   - a plain-text circuit diagram
 *
 * Everything here is GENERATED from the actual circuit object — nothing is
 * hard-coded. The same circuit description is what the optional Qiskit
 * service receives (see lib/execution.ts and backend/main.py).
 */

import {
  angleLabel,
  gateWires,
  orderedGates,
  type Circuit,
  type CircuitGate,
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

/** Angle written as Python/QASM source, e.g. "pi/2". */
function angleSource(value: number): string {
  const label = angleLabel(value);
  if (/π/.test(label)) return label.replace("π", "pi").replace("−", "-");
  return value.toFixed(6);
}

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
