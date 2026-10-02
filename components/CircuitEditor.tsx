"use client";

import { useState } from "react";
import {
  angleLabel,
  gateWires,
  makeGate,
  ROTATION_GATES,
  type Circuit,
  type CircuitGate,
  type GateType,
} from "@/lib/quantumSimulator";
import { useApp } from "./AppProvider";
import { GateButton } from "./GateButton";
import { QuantumCircuit } from "./QuantumCircuit";

const ANGLES = [Math.PI / 4, Math.PI / 2, Math.PI];

interface Props {
  circuit: Circuit;
  onChange: (circuit: Circuit) => void;
  /** The gates the learner may place. */
  palette: GateType[];
  /** Smaller gate buttons, for use inside a mastery-check item. */
  compact?: boolean;
}

/** Every wire between the top and bottom wire of a gate, inclusive. */
function span(gate: CircuitGate): number[] {
  const wires = gateWires(gate);
  const top = Math.min(...wires);
  const bottom = Math.max(...wires);
  return Array.from({ length: bottom - top + 1 }, (_, i) => top + i);
}

/**
 * The circuit builder: pick a gate, click a spot on a wire to place it, click
 * a placed gate to remove it. Used by the Quantum Lab and by "build a circuit"
 * items in a mastery check.
 */
export function CircuitEditor({ circuit, onChange, palette, compact = false }: Props) {
  const { t } = useApp();
  const [selected, setSelected] = useState<GateType>(palette[0]);
  const [theta, setTheta] = useState(Math.PI / 2);
  const [notice, setNotice] = useState("");

  const active = palette.includes(selected) ? selected : palette[0];
  const occupied = (step: number, wire: number) =>
    circuit.gates.some((g) => g.step === step && span(g).includes(wire));

  const place = (gate: CircuitGate) => {
    const blocked = span(gate).find((wire) => occupied(gate.step, wire));
    if (blocked !== undefined) {
      setNotice(
        t({
          en: `${gate.type} needs every wire it touches to be free in that column. Step ${gate.step + 1} is already used on q${blocked}.`,
          hi: `${gate.type} ko us column mein har touched wire free chahiye. Step ${gate.step + 1} par q${blocked} already used hai.`,
        })
      );
      return;
    }
    setNotice("");
    onChange({ ...circuit, gates: [...circuit.gates, gate] });
  };

  const handleCell = (qubit: number, step: number, existing: CircuitGate | null) => {
    if (existing) {
      setNotice("");
      onChange({ ...circuit, gates: circuit.gates.filter((g) => g.id !== existing.id) });
      return;
    }

    if (active === "CX" || active === "CZ" || active === "SWAP") {
      if (circuit.qubits < 2) {
        setNotice(t({ en: `${active} needs two qubits. Add a qubit first.`, hi: `${active} ko do qubits chahiye. Pehle ek qubit add karo.` }));
        return;
      }
      // The clicked wire is the control; the neighbouring wire is the target.
      const target = qubit + 1 < circuit.qubits ? qubit + 1 : qubit - 1;
      place(makeGate(active, qubit, step, target));
      return;
    }

    if (active === "CCX") {
      if (circuit.qubits < 3) {
        setNotice(t({ en: "Toffoli (CCX) needs three qubits. Add a qubit first.", hi: "Toffoli (CCX) ko teen qubits chahiye. Pehle ek qubit add karo." }));
        return;
      }
      // The clicked wire is the target; the two nearest other wires are the controls.
      const others = Array.from({ length: circuit.qubits }, (_, q) => q)
        .filter((q) => q !== qubit)
        .sort((a, b) => Math.abs(a - qubit) - Math.abs(b - qubit) || a - b)
        .slice(0, 2)
        .sort((a, b) => a - b);
      place(makeGate("CCX", others[0], step, qubit, others[1]));
      return;
    }

    place(makeGate(active, qubit, step, undefined, ROTATION_GATES.includes(active) ? theta : undefined));
  };

  const help: Partial<Record<GateType, { en: string; hi: string }>> = {
    CX: {
      en: "CX: the wire you click becomes the control (●). The next wire becomes the target (+).",
      hi: "CX: jis wire par click karoge woh control (●) banega. Agla wire target (+) banega.",
    },
    CZ: {
      en: "CZ: click a wire. It links that wire and the next one; both get a dot because CZ is symmetric.",
      hi: "CZ: ek wire par click karo. Yeh us wire aur agle wire ko link karta hai; CZ symmetric hai isliye dono par dot aata hai.",
    },
    SWAP: {
      en: "SWAP: click a wire to exchange it with the next wire.",
      hi: "SWAP: ek wire par click karo, woh agle wire se exchange ho jaayega.",
    },
    CCX: {
      en: "Toffoli: the wire you click becomes the target (+). The other two wires become the controls (●).",
      hi: "Toffoli: jis wire par click karoge woh target (+) banega. Baaki do wires controls (●) banenge.",
    },
  };

  return (
    <div>
      <div role="group" aria-label="Gates" className={`mb-3 flex flex-wrap gap-2 ${compact ? "" : "sm:gap-2"}`}>
        {palette.map((gate) => (
          <GateButton key={gate} gate={gate} selected={active === gate} onSelect={(g) => { setSelected(g); setNotice(""); }} />
        ))}
      </div>

      {ROTATION_GATES.includes(active) && (
        <div role="group" aria-label="Rotation angle" className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-mute">{t({ en: "Angle θ:", hi: "Angle θ:" })}</span>
          {ANGLES.map((angle) => (
            <button
              key={angle}
              type="button"
              onClick={() => setTheta(angle)}
              aria-pressed={Math.abs(theta - angle) < 1e-9}
              className={`ket rounded-lg border px-3 py-1.5 font-semibold ${
                Math.abs(theta - angle) < 1e-9 ? "border-ok bg-ok/15 text-ok" : "border-line text-mute hover:text-ink"
              }`}
            >
              {angleLabel(angle)}
            </button>
          ))}
        </div>
      )}

      <div className="well px-3 py-2">
        <QuantumCircuit circuit={circuit} onCellClick={handleCell} placing={active} />
      </div>

      {help[active] && <p className="mt-2 text-sm text-mute">{t(help[active]!)}</p>}

      {notice && (
        <p role="status" className="mt-2 text-sm text-warn">
          {notice}
        </p>
      )}
    </div>
  );
}
