"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import type { WidgetId } from "@/data/concepts";
import {
  buildCircuit,
  measureCircuit,
  simulateCircuit,
  type GateType,
} from "@/lib/quantumSimulator";
import { useApp } from "./AppProvider";
import { BlochSphere } from "./BlochSphere";
import { GATE_INFO } from "./GateButton";
import { ProbabilityBars } from "./ProbabilityBars";
import { QuantumCircuit } from "./QuantumCircuit";

/** Picks the interactive piece for a lesson section. */
export function LessonWidget({ id }: { id: WidgetId }) {
  switch (id) {
    case "bit-vs-qubit":
      return <BitVsQubit />;
    case "probability-dial":
      return <ProbabilityDial />;
    case "gate-table":
      return <GateTable />;
    case "gate-explorer":
      return <GateExplorer />;
    case "h-flow":
      return <HFlow />;
    case "shots-experiment":
      return <ShotsExperiment />;
    case "cx-table":
      return <CxTable />;
    case "bell-demo":
      return <BellDemo />;
  }
}

const share = (counts: Record<string, number>, total: number) => {
  const out: Record<string, number> = {};
  Object.keys(counts).forEach((k) => (out[k] = total === 0 ? 0 : counts[k] / total));
  return out;
};

// ---------------------------------------------------------------------------
// Qubit Fundamentals
// ---------------------------------------------------------------------------

function BitVsQubit() {
  const { t } = useApp();
  const [bit, setBit] = useState(0);
  const flow = ["Quantum State", "Probability", "Measurement"];
  return (
    <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
      <div className="well flex flex-col items-center gap-3 p-5 text-center">
        <p className="text-sm font-semibold tracking-wide text-mute">CLASSICAL BIT</p>
        <button
          type="button"
          onClick={() => setBit((b) => 1 - b)}
          aria-label={`Classical bit, currently ${bit}. Click to flip.`}
          className="ket flex h-20 w-20 items-center justify-center rounded-2xl border border-signal/50 bg-signal/10 text-4xl font-semibold text-signal hover:bg-signal/20"
        >
          {bit}
        </button>
        <p className="text-lg font-semibold">0 OR 1</p>
        <p className="text-sm text-mute">
          {t({
            en: "Click the bit. It is always exactly one value.",
            hi: "Bit par click karo. Yeh hamesha exactly ek value hota hai.",
          })}
        </p>
      </div>

      <div aria-hidden className="flex items-center justify-center text-sm font-semibold text-dim">
        VS
      </div>

      <div className="well flex flex-col items-center gap-2 p-5 text-center">
        <p className="text-sm font-semibold tracking-wide text-mute">QUBIT</p>
        {flow.map((label, index) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <span
              className={`rounded-xl border px-4 py-2 font-semibold ${
                index === 0
                  ? "border-ket/50 bg-ket/10 text-ket"
                  : index === 1
                    ? "border-phase/50 bg-phase/10 text-phase"
                    : "border-ink/30 bg-white/[0.05]"
              }`}
            >
              {label}
            </span>
            {index < flow.length - 1 && <ArrowDown size={16} className="text-dim" aria-hidden />}
          </div>
        ))}
        <p className="mt-1 text-sm text-mute">
          {t({
            en: "The state sets the odds. Measurement gives one answer.",
            hi: "State odds set karta hai. Measurement ek answer deta hai.",
          })}
        </p>
      </div>
    </div>
  );
}

function ProbabilityDial() {
  const { t } = useApp();
  const [p1, setP1] = useState(50);
  const [single, setSingle] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  const probabilities = { "0": 1 - p1 / 100, "1": p1 / 100 };
  const reset = (value: number) => {
    setP1(value);
    setSingle(null);
    setCounts(null);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="well p-4">
        <label htmlFor="dial" className="flex items-center justify-between text-sm font-semibold">
          <span>{t({ en: "Qubit state: chance of measuring 1", hi: "Qubit state: 1 measure hone ka chance" })}</span>
          <span className="ket tabular-nums text-ket">{p1}%</span>
        </label>
        <input
          id="dial"
          type="range"
          min={0}
          max={100}
          step={5}
          value={p1}
          onChange={(event) => reset(Number(event.target.value))}
          className="mt-3 w-full accent-[#5ad7f0]"
        />
        <div className="mt-1 flex justify-between text-xs text-dim">
          <span className="ket">|0⟩</span>
          <span>{t({ en: "equal blend", hi: "equal blend" })}</span>
          <span className="ket">|1⟩</span>
        </div>
        <div className="mt-4">
          <ProbabilityBars values={probabilities} tone="phase" label="Probabilities set by the state" />
        </div>
      </div>

      <div className="well flex flex-col p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSingle(pickOne(probabilities));
              setCounts(null);
            }}
            className="btn btn-secondary text-sm"
          >
            {t({ en: "Measure once", hi: "Ek baar measure karo" })}
          </button>
          <button
            type="button"
            onClick={() => {
              setCounts(measureCircuit(probabilities, 100));
              setSingle(null);
            }}
            className="btn btn-secondary text-sm"
          >
            {t({ en: "Measure 100 times", hi: "100 baar measure karo" })}
          </button>
        </div>
        <div className="mt-4 flex flex-1 flex-col justify-center" aria-live="polite">
          {single !== null && (
            <p className="text-center">
              <span className="block text-sm text-mute">{t({ en: "You measured", hi: "Aapne measure kiya" })}</span>
              <span className="ket text-6xl font-semibold text-ket">{single}</span>
              <span className="mt-1 block text-sm text-mute">
                {t({
                  en: "One answer. Measure again and it may differ.",
                  hi: "Ek answer. Dobara measure karo to alag aa sakta hai.",
                })}
              </span>
            </p>
          )}
          {counts && (
            <>
              <ProbabilityBars values={share(counts, 100)} counts={counts} approx label="Results of 100 measurements" />
              <p className="mt-3 text-sm text-mute">
                {t({
                  en: "Many measurements land close to the probability you set.",
                  hi: "Kai measurements aapki set ki hui probability ke paas aate hain.",
                })}
              </p>
            </>
          )}
          {single === null && !counts && (
            <p className="text-center text-sm text-dim">
              {t({ en: "Press a button to measure.", hi: "Measure karne ke liye button dabao." })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** One random result according to the probabilities. */
function pickOne(probabilities: Record<string, number>): string {
  const counts = measureCircuit(probabilities, 1);
  return Object.keys(counts).find((k) => counts[k] === 1) ?? "0";
}

// ---------------------------------------------------------------------------
// Quantum Gates
// ---------------------------------------------------------------------------

function GateTable() {
  const { t } = useApp();
  const cards: Array<{ gate: GateType; rows: string[]; note: { en: string; hi: string } }> = [
    {
      gate: "X",
      rows: ["|0⟩ → |1⟩", "|1⟩ → |0⟩"],
      note: { en: "The quantum NOT.", hi: "Quantum NOT." },
    },
    {
      gate: "H",
      rows: ["|0⟩ → superposition", "superposition → |0⟩"],
      note: { en: "Creates, and undoes, an equal blend.", hi: "Equal blend banata bhi hai, undo bhi karta hai." },
    },
    {
      gate: "Z",
      rows: ["|0⟩ → |0⟩", "|1⟩ → −|1⟩"],
      note: {
        en: "Changes only the phase. Invisible until another gate reveals it.",
        hi: "Sirf phase change karta hai. Jab tak doosra gate reveal na kare, dikhta nahi.",
      },
    },
    {
      gate: "Y",
      rows: ["|0⟩ → i|1⟩", "|1⟩ → −i|0⟩"],
      note: { en: "Flips like X and adds a phase.", hi: "X ki tarah flip karta hai aur phase add karta hai." },
    },
    {
      gate: "M",
      rows: ["state → 0 or 1"],
      note: {
        en: "Reads the qubit. Ends the quantum part of the wire.",
        hi: "Qubit ko read karta hai. Wire ka quantum part yahin khatam.",
      },
    },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <li key={card.gate} className="well p-4">
          <div className="flex items-center gap-3">
            <span
              className={`ket flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold ${GATE_INFO[card.gate].className}`}
            >
              {card.gate}
            </span>
            <span className="font-semibold">{GATE_INFO[card.gate].name}</span>
          </div>
          <div className="ket mt-3 flex flex-col gap-1 text-sm">
            {card.rows.map((row) => (
              <span key={row}>{row}</span>
            ))}
          </div>
          <p className="mt-2 text-sm leading-snug text-mute">{t(card.note)}</p>
        </li>
      ))}
    </ul>
  );
}

function GateExplorer() {
  const { t } = useApp();
  const [start, setStart] = useState<0 | 1>(0);
  const [gate, setGate] = useState<"H" | "X" | "Y" | "Z">("X");

  const { before, after } = useMemo(() => {
    const prep: Array<[GateType, number, number]> = start === 1 ? [["X", 0, 0]] : [];
    const a = simulateCircuit(buildCircuit(1, [...prep, ["M", 0, 2]]));
    const b = simulateCircuit(buildCircuit(1, [...prep, [gate, 0, 1], ["M", 0, 2]]));
    return { before: a.ok ? a : null, after: b.ok ? b : null };
  }, [start, gate]);

  if (!before || !after) return null;

  return (
    <div className="well p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="group" aria-label="Starting state" className="flex items-center gap-2">
          <span className="text-sm text-mute">{t({ en: "Start in", hi: "Start state" })}</span>
          {[0, 1].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStart(value as 0 | 1)}
              aria-pressed={start === value}
              className={`ket rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                start === value ? "border-ket bg-ket/15 text-ket" : "border-line text-mute hover:text-ink"
              }`}
            >
              |{value}⟩
            </button>
          ))}
        </div>
        <div role="group" aria-label="Gate to apply" className="flex items-center gap-2">
          <span className="text-sm text-mute">{t({ en: "Apply", hi: "Apply karo" })}</span>
          {(["H", "X", "Y", "Z"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGate(g)}
              aria-pressed={gate === g}
              className={`ket h-9 w-9 rounded-lg border text-sm font-semibold ${
                gate === g ? GATE_INFO[g].className : "border-line text-mute hover:text-ink"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid items-center gap-5 md:grid-cols-[auto_auto_auto_1fr]" aria-live="polite">
        <BlochSphere vector={before.bloch[0]} title="before" />
        <span className="flex flex-col items-center gap-1 text-mute">
          <span className={`ket flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold ${GATE_INFO[gate].className}`}>
            {gate}
          </span>
          <ArrowRight size={18} aria-hidden className="max-md:rotate-90" />
        </span>
        <BlochSphere vector={after.bloch[0]} title="after" />
        <div>
          <p className="mb-2 text-sm font-semibold">
            {t({ en: "If you measured now", hi: "Agar abhi measure karo" })}
          </p>
          <ProbabilityBars values={after.probabilities} label="Probabilities after the gate" />
          <p className="mt-3 text-sm leading-relaxed text-mute">{GATE_INFO[gate].does}.</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Superposition & Measurement
// ---------------------------------------------------------------------------

function HFlow() {
  const { t } = useApp();
  const circuit = useMemo(() => buildCircuit(1, [["H", 0, 0], ["M", 0, 1]]), []);
  const stages = [
    { label: "|0⟩", note: { en: "A definite start", hi: "Definite start" }, className: "border-signal/50 bg-signal/10 text-signal" },
    { label: "H", note: { en: "The Hadamard gate", hi: "Hadamard gate" }, className: "border-ket/50 bg-ket/10 text-ket" },
    { label: "Superposition", note: { en: "A blend of |0⟩ and |1⟩", hi: "|0⟩ aur |1⟩ ka blend" }, className: "border-phase/50 bg-phase/10 text-phase" },
    { label: "Measurement", note: { en: "One answer is forced", hi: "Ek answer force hota hai" }, className: "border-ink/30 bg-white/[0.05]" },
    { label: "|0⟩ OR |1⟩", note: { en: "A plain 0 or 1", hi: "Plain 0 ya 1" }, className: "border-ok/50 bg-ok/10 text-ok" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col items-stretch gap-2 md:flex-row md:items-start">
        {stages.map((stage, index) => (
          <li key={stage.label} className="flex flex-1 flex-col items-center gap-2 md:flex-row">
            <div className="flex w-full flex-col items-center text-center">
              <span className={`ket w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${stage.className}`}>
                {stage.label}
              </span>
              <span className="mt-1.5 text-xs leading-tight text-mute">{t(stage.note)}</span>
            </div>
            {index < stages.length - 1 && (
              <ArrowRight size={18} aria-hidden className="shrink-0 text-dim max-md:rotate-90 md:mt-3" />
            )}
          </li>
        ))}
      </ol>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="well px-4 py-2">
          <QuantumCircuit circuit={circuit} trim />
        </div>
        <div className="well p-4">
          <p className="mb-2 text-sm font-semibold">
            {t({ en: "Probability at measurement", hi: "Measurement par probability" })}
          </p>
          <ProbabilityBars values={{ "0": 0.5, "1": 0.5 }} tone="phase" label="Exact probabilities after H" />
        </div>
      </div>
    </div>
  );
}

function ShotsExperiment() {
  const { t } = useApp();
  const [run, setRun] = useState<{ shots: number; counts: Record<string, number> } | null>(null);
  const options = [1, 10, 100, 1000];
  const exact = { "0": 0.5, "1": 0.5 };

  return (
    <div className="well p-4">
      <div role="group" aria-label="Number of runs" className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-mute">{t({ en: "Run H → M", hi: "H → M run karo" })}</span>
        {options.map((shots) => (
          <button
            key={shots}
            type="button"
            onClick={() => setRun({ shots, counts: measureCircuit(exact, shots) })}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold tabular-nums ${
              run?.shots === shots ? "border-ket bg-ket/15 text-ket" : "border-line hover:border-ket/50"
            }`}
          >
            {shots.toLocaleString()} {shots === 1 ? "time" : "times"}
          </button>
        ))}
      </div>
      <div className="mt-4" aria-live="polite">
        {run ? (
          <>
            <ProbabilityBars
              key={`${run.shots}-${run.counts["0"]}`}
              values={share(run.counts, run.shots)}
              counts={run.counts}
              expected={exact}
              approx
              label={`Results of ${run.shots} runs`}
            />
            <p className="mt-3 text-sm leading-relaxed text-mute">
              {run.shots === 1
                ? t({
                    en: "One run gives a single 0 or 1. You cannot see a probability in one result. Press the same button again.",
                    hi: "Ek run sirf ek 0 ya 1 deta hai. Ek result mein probability nahi dikhti. Same button dobara dabao.",
                  })
                : run.shots < 100
                  ? t({
                      en: "A few runs wobble a lot. The white tick marks the true 50%.",
                      hi: "Thode runs mein result kaafi upar-neeche hota hai. White tick true 50% dikhata hai.",
                    })
                  : t({
                      en: "With many runs the bars settle close to the white tick at 50%.",
                      hi: "Zyada runs ke saath bars 50% wale white tick ke paas settle ho jaate hain.",
                    })}
            </p>
          </>
        ) : (
          <p className="text-sm text-dim">
            {t({ en: "Choose how many times to run the circuit.", hi: "Choose karo circuit kitni baar run karna hai." })}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entanglement
// ---------------------------------------------------------------------------

function CxTable() {
  const rows = [
    { input: "|00⟩", output: "|00⟩", flips: false },
    { input: "|01⟩", output: "|01⟩", flips: false },
    { input: "|10⟩", output: "|11⟩", flips: true },
    { input: "|11⟩", output: "|10⟩", flips: true },
  ];
  const { t } = useApp();
  return (
    <div className="well overflow-x-auto p-1">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">What CX does to each two-qubit input</caption>
        <thead className="text-mute">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Before</th>
            <th scope="col" className="px-4 py-2.5 font-medium">After CX</th>
            <th scope="col" className="px-4 py-2.5 font-medium">{t({ en: "What happened", hi: "Kya hua" })}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.input} className="border-t border-line">
              <td className="ket px-4 py-2.5">{row.input}</td>
              <td className={`ket px-4 py-2.5 font-semibold ${row.flips ? "text-ket" : ""}`}>{row.output}</td>
              <td className="px-4 py-2.5 text-mute">
                {row.flips
                  ? t({ en: "Control is 1, so the target flips", hi: "Control 1 hai, isliye target flip hota hai" })
                  : t({ en: "Control is 0, so nothing changes", hi: "Control 0 hai, isliye kuch change nahi hota" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BellDemo() {
  const { t } = useApp();
  const circuit = useMemo(
    () => buildCircuit(2, [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]]),
    []
  );
  const exact = useMemo(() => {
    const result = simulateCircuit(circuit, { shots: 1 });
    return result.ok ? result.probabilities : { "00": 0.5, "01": 0, "10": 0, "11": 0.5 };
  }, [circuit]);
  const [singles, setSingles] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="well px-4 py-2">
        <QuantumCircuit circuit={circuit} trim />
      </div>
      <div className="well p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSingles((list) => [...list, pickOne(exact)].slice(-8));
              setCounts(null);
            }}
            className="btn btn-secondary text-sm"
          >
            {t({ en: "Run once", hi: "Ek baar run karo" })}
          </button>
          <button
            type="button"
            onClick={() => {
              setCounts(measureCircuit(exact, 100));
              setSingles([]);
            }}
            className="btn btn-secondary text-sm"
          >
            {t({ en: "Run 100 times", hi: "100 baar run karo" })}
          </button>
        </div>
        <div className="mt-4" aria-live="polite">
          {singles.length > 0 && (
            <>
              <table className="ket w-full text-center text-sm">
                <caption className="sr-only">Results of single runs</caption>
                <thead className="text-mute">
                  <tr>
                    <th scope="col" className="py-1 font-medium">run</th>
                    <th scope="col" className="py-1 font-medium">q0</th>
                    <th scope="col" className="py-1 font-medium">q1</th>
                  </tr>
                </thead>
                <tbody>
                  {singles.map((bits, index) => (
                    <tr key={index} className="border-t border-line">
                      <td className="py-1 text-dim">{index + 1}</td>
                      <td className="py-1 text-ket">{bits[0]}</td>
                      <td className="py-1 text-ket">{bits[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-mute">
                {t({
                  en: "Each row is random, but q0 and q1 always match.",
                  hi: "Har row random hai, lekin q0 aur q1 hamesha match karte hain.",
                })}
              </p>
            </>
          )}
          {counts && (
            <>
              <ProbabilityBars values={share(counts, 100)} counts={counts} approx label="Results of 100 runs" />
              <p className="mt-3 text-sm text-mute">
                {t({
                  en: "Only |00⟩ and |11⟩ appear. |01⟩ and |10⟩ never do.",
                  hi: "Sirf |00⟩ aur |11⟩ aate hain. |01⟩ aur |10⟩ kabhi nahi.",
                })}
              </p>
            </>
          )}
          {singles.length === 0 && !counts && (
            <p className="text-sm text-dim">
              {t({ en: "Run the circuit to see results.", hi: "Results dekhne ke liye circuit run karo." })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
