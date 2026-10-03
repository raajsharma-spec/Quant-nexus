/**
 * Circuits as shareable links.
 *
 * A circuit built in the Quantum Lab can be turned into a short piece of text
 * and put in an address:  /lab?c=2~H.0.0~CX.0.1.1~M.0.2~M.1.2
 * Anyone who opens the link gets the same circuit in their own lab, so a
 * learner can send a circuit to a classmate or an instructor can hand one out.
 *
 * Format:  <qubits>~<gate>~<gate>…   with each gate written as
 *          TYPE.qubit.step[.target[.control2]][@theta]
 *
 * A link is untrusted input: decoding checks every field and returns null for
 * anything that is not a valid circuit.
 */

import {
  GATE_TYPES,
  gateWires,
  MAX_QUBITS,
  makeGate,
  orderedGates,
  ROTATION_GATES,
  validateStructure,
  type Circuit,
  type GateType,
} from "./quantumSimulator";

const MAX_LINK_GATES = 60;
const MAX_STEPS = 12;

export function encodeCircuit(circuit: Circuit): string {
  const gates = orderedGates(circuit).map((gate) => {
    const parts: Array<string | number> = [gate.type, gate.qubit, gate.step];
    if (gate.target !== undefined) parts.push(gate.target);
    if (gate.control2 !== undefined) parts.push(gate.control2);
    const angle = gate.theta !== undefined ? `@${Number(gate.theta.toFixed(12))}` : "";
    return parts.join(".") + angle;
  });
  return [circuit.qubits, ...gates].join("~");
}

const wholeNumber = (text: string | undefined): number | null => (text !== undefined && /^\d{1,3}$/.test(text) ? Number(text) : null);

export function decodeCircuit(text: string | null | undefined, steps = 6): Circuit | null {
  if (!text || text.length > 1200) return null;
  const [head, ...rest] = text.split("~");
  const qubits = wholeNumber(head);
  if (qubits === null || qubits < 1 || qubits > MAX_QUBITS || rest.length > MAX_LINK_GATES) return null;

  const gates = [];
  let lastStep = 0;
  for (const item of rest) {
    const [body, angle] = item.split("@");
    const [type, ...numbers] = body.split(".");
    if (!GATE_TYPES.includes(type as GateType)) return null;
    const values = numbers.map(wholeNumber);
    if (values.length < 2 || values.length > 4 || values.some((value) => value === null)) return null;
    const [qubit, step, target, control2] = values as number[];
    if (step >= MAX_STEPS) return null;
    let theta: number | undefined;
    if (angle !== undefined) {
      theta = Number(angle);
      if (!ROTATION_GATES.includes(type as GateType) || !Number.isFinite(theta) || Math.abs(theta) > 4 * Math.PI) return null;
    }
    const gate = makeGate(type as GateType, qubit, step, target, type === "CCX" ? control2 : theta);
    const wires = gateWires(gate);
    if (wires.some((wire) => !Number.isInteger(wire) || wire < 0 || wire >= qubits) || new Set(wires).size !== wires.length) return null;
    gates.push(gate);
    lastStep = Math.max(lastStep, step);
  }

  const circuit: Circuit = { qubits, steps: Math.max(steps, lastStep + 1), gates };
  return validateStructure(circuit) === null ? circuit : null;
}
