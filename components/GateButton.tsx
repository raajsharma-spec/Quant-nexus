"use client";

import type { GateType } from "@/lib/quantumSimulator";

/** Colour and plain-language name for each gate. */
export const GATE_INFO: Record<GateType, { name: string; does: string; className: string }> = {
  H: {
    name: "Hadamard",
    does: "Creates an equal superposition",
    className: "border-ket/60 bg-ket/15 text-ket",
  },
  X: {
    name: "Pauli-X",
    does: "Flips |0⟩ and |1⟩",
    className: "border-phase/60 bg-phase/15 text-phase",
  },
  Y: {
    name: "Pauli-Y",
    does: "Flips and changes the phase",
    className: "border-phase/60 bg-phase/15 text-phase",
  },
  Z: {
    name: "Pauli-Z",
    does: "Changes the phase of |1⟩",
    className: "border-phase/60 bg-phase/15 text-phase",
  },
  CX: {
    name: "Controlled-X",
    does: "Flips the target if the control is |1⟩",
    className: "border-signal/60 bg-signal/15 text-signal",
  },
  M: {
    name: "Measure",
    does: "Reads the qubit as 0 or 1",
    className: "border-ink/40 bg-ink/10 text-ink",
  },
};

/** One gate in the lab's palette. */
export function GateButton({
  gate,
  selected,
  onSelect,
}: {
  gate: GateType;
  selected: boolean;
  onSelect: (gate: GateType) => void;
}) {
  const info = GATE_INFO[gate];
  return (
    <button
      type="button"
      onClick={() => onSelect(gate)}
      aria-pressed={selected}
      title={`${info.name}: ${info.does}`}
      className={`flex min-w-[8.5rem] flex-1 items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
        selected
          ? "border-ket bg-ket/10"
          : "border-line bg-white/[0.02] hover:border-ink/30 hover:bg-white/[0.05]"
      }`}
    >
      <span
        className={`ket flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold ${info.className}`}
      >
        {gate}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{info.name}</span>
        <span className="block text-xs leading-tight text-mute">{info.does}</span>
      </span>
    </button>
  );
}
