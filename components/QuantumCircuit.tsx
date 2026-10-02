"use client";

import {
  angleLabel,
  gateLabelOnWire,
  gateWires,
  type Circuit,
  type CircuitGate,
  type GateType,
} from "@/lib/quantumSimulator";
import { GATE_INFO } from "./GateButton";

interface Props {
  circuit: Circuit;
  /** When set, empty and filled spots become buttons. */
  onCellClick?: (qubit: number, step: number, existing: CircuitGate | null) => void;
  /** The gate that a click on an empty spot will place (for labels). */
  placing?: GateType | "erase" | null;
  /** Pulses the wires while a simulation is running. */
  running?: boolean;
  /** Hide columns that are empty at the end of a read-only circuit. */
  trim?: boolean;
}

/** Find the gate drawn at a spot. A multi-qubit gate occupies every wire it touches. */
function gateAt(circuit: Circuit, qubit: number, step: number): CircuitGate | null {
  return circuit.gates.find((g) => g.step === step && gateWires(g).includes(qubit)) ?? null;
}

/** The multi-qubit gate (if any) whose vertical link passes through this spot. */
function linkAt(circuit: Circuit, qubit: number, step: number): { top: number; bottom: number } | null {
  for (const gate of circuit.gates) {
    if (gate.step !== step) continue;
    const wires = gateWires(gate);
    if (wires.length < 2) continue;
    const top = Math.min(...wires);
    const bottom = Math.max(...wires);
    if (qubit >= top && qubit <= bottom) return { top, bottom };
  }
  return null;
}

/** Draws a circuit as wires and gate boxes. Used read-only in lessons and editable in the lab. */
export function QuantumCircuit({ circuit, onCellClick, placing, running, trim }: Props) {
  const editable = !!onCellClick;
  const lastUsed = circuit.gates.reduce((max, g) => Math.max(max, g.step), -1);
  const steps = trim ? Math.max(lastUsed + 1, 1) : circuit.steps;
  const columns = Array.from({ length: steps }, (_, i) => i);
  const rows = Array.from({ length: circuit.qubits }, (_, i) => i);

  return (
    <div className="overflow-x-auto pb-1">
      <div
        role={editable ? "group" : "img"}
        aria-label={editable ? "Circuit editor" : `Circuit: ${describe(circuit)}`}
        className="inline-grid min-w-full items-center"
        style={{ gridTemplateColumns: `auto repeat(${steps}, minmax(3.25rem, 1fr)) 1.25rem` }}
      >
        {rows.map((q) => (
          <Row key={q}>
            <div className="ket flex h-16 items-center gap-2 pr-3 text-sm">
              <span className="text-mute">q{q}</span>
              <span className="rounded-md border border-line bg-white/[0.03] px-1.5 py-0.5 text-ink">|0⟩</span>
            </div>

            {columns.map((step) => {
              const gate = gateAt(circuit, q, step);
              // A multi-qubit gate in this column draws a vertical link through the rows it spans.
              const link = linkAt(circuit, q, step);
              const top = link ? link.top : -1;
              const bottom = link ? link.bottom : -1;
              const spans = !!link;

              const content = (
                <>
                  {/* the wire */}
                  <span
                    aria-hidden
                    className={`absolute left-0 right-0 top-1/2 h-px ${
                      running ? "animate-pulse-wire bg-ket" : "bg-ket/45"
                    }`}
                  />
                  {spans && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 w-px -translate-x-1/2 bg-signal"
                      style={{
                        top: q > top ? 0 : "50%",
                        bottom: q < bottom ? 0 : "50%",
                      }}
                    />
                  )}
                  {gate ? <GateMark gate={gate} qubit={q} /> : editable ? <EmptySpot /> : null}
                </>
              );

              if (!editable) {
                return (
                  <div key={step} className="relative flex h-16 items-center justify-center">
                    {content}
                  </div>
                );
              }

              const label = gate
                ? `q${q}, step ${step + 1}: ${gateLabelOnWire(gate, q)} gate. Click to remove.`
                : `q${q}, step ${step + 1}: empty.${placing && placing !== "erase" ? ` Click to place ${placing}.` : ""}`;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => onCellClick(q, step, gate)}
                  aria-label={label}
                  title={gate ? "Click to remove" : undefined}
                  className="group relative flex h-16 items-center justify-center rounded-lg hover:bg-white/[0.04]"
                >
                  {content}
                </button>
              );
            })}

            {/* wire tail */}
            <div className="relative h-16">
              <span aria-hidden className="absolute left-0 right-0 top-1/2 h-px bg-ket/45" />
            </div>
          </Row>
        ))}
      </div>
    </div>
  );
}

/** `display: contents` lets each row's cells sit directly in the grid. */
function Row({ children }: { children: React.ReactNode }) {
  return <div className="contents">{children}</div>;
}

function EmptySpot() {
  return (
    <span
      aria-hidden
      className="relative h-9 w-9 rounded-lg border border-dashed border-line bg-void/60 opacity-60 transition-opacity group-hover:border-ket/60 group-hover:opacity-100"
    />
  );
}

function GateMark({ gate, qubit }: { gate: CircuitGate; qubit: number }) {
  const controlDot = (
    <span aria-hidden className="relative h-3.5 w-3.5 rounded-full bg-signal ring-4 ring-deck" />
  );
  const targetPlus = (
    <span
      aria-hidden
      className="ket relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-signal bg-deck text-lg leading-none text-signal"
    >
      +
    </span>
  );

  if (gate.type === "CX") return gate.qubit === qubit ? controlDot : targetPlus;
  if (gate.type === "CCX") return gate.target === qubit ? targetPlus : controlDot;
  // CZ is symmetric: a dot on both wires.
  if (gate.type === "CZ") return controlDot;
  if (gate.type === "SWAP") {
    return (
      <span
        aria-hidden
        className="ket relative flex h-8 w-8 items-center justify-center rounded-lg bg-deck text-xl leading-none text-signal"
      >
        ×
      </span>
    );
  }

  const rotation = gate.type === "RX" || gate.type === "RY" || gate.type === "RZ";
  return (
    <span
      aria-hidden
      className={`ket relative flex h-10 flex-col items-center justify-center rounded-lg border bg-deck font-semibold ${
        rotation ? "min-w-11 px-1 text-[0.7rem] leading-tight" : "w-10 text-sm"
      } ${GATE_INFO[gate.type].className}`}
    >
      {gate.type}
      {rotation && <span className="text-[0.6rem] font-normal opacity-80">{angleLabel(gate.theta ?? Math.PI / 2)}</span>}
    </span>
  );
}

function describe(circuit: Circuit): string {
  const parts: string[] = [];
  for (let q = 0; q < circuit.qubits; q++) {
    const gates = [...circuit.gates]
      .filter((g) => gateWires(g).includes(q))
      .sort((a, b) => a.step - b.step)
      .map((g) => gateLabelOnWire(g, q).replace("(", " ").replace(")", ""));
    parts.push(`q${q}: ${gates.length ? gates.join(", then ") : "no gates"}`);
  }
  return parts.join(". ");
}
