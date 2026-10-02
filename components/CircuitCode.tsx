"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toOpenQasm, toQiskit, toTextDiagram } from "@/lib/circuitExport";
import type { Circuit } from "@/lib/quantumSimulator";
import { useApp } from "./AppProvider";

type Tab = "diagram" | "qiskit" | "qasm";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "diagram", label: "Circuit" },
  { id: "qiskit", label: "Qiskit" },
  { id: "qasm", label: "OpenQASM" },
];

interface Props {
  circuit: Circuit;
  shots: number;
  /** Qiskit's own drawing of the circuit, when the Qiskit service ran it. */
  qiskitDiagram?: string;
}

/**
 * The learner's circuit in three other forms: a text diagram, runnable Qiskit
 * code and OpenQASM 2.0. All three are generated from the actual circuit, so
 * they change the moment a gate is added or removed.
 */
export function CircuitCode({ circuit, shots, qiskitDiagram }: Props) {
  const { t } = useApp();
  const [tab, setTab] = useState<Tab>("diagram");
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    if (tab === "qiskit") return toQiskit(circuit, shots);
    if (tab === "qasm") return toOpenQasm(circuit);
    return qiskitDiagram ?? toTextDiagram(circuit);
  }, [tab, circuit, shots, qiskitDiagram]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const note: Record<Tab, string> = {
    diagram: qiskitDiagram
      ? t({ en: "Drawn by Qiskit on the connected service.", hi: "Connected service par Qiskit ne draw kiya." })
      : t({ en: "Generated from your circuit, in the style of Qiskit's text drawing.", hi: "Aapke circuit se generated, Qiskit ke text drawing style mein." }),
    qiskit: t({
      en: "Runnable Python. Paste it into a notebook with qiskit and qiskit-aer installed.",
      hi: "Runnable Python. Ise aise notebook mein paste karo jisme qiskit aur qiskit-aer installed ho.",
    }),
    qasm: t({
      en: "OpenQASM 2.0 — the text format most quantum frameworks can import.",
      hi: "OpenQASM 2.0 — woh text format jo zyada-tar quantum frameworks import kar sakte hain.",
    }),
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Circuit representations" className="flex gap-1 rounded-xl border border-line bg-white/[0.03] p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === item.id ? "bg-ket/20 text-ink" : "text-mute hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} className="btn btn-ghost px-3 py-1.5 text-sm">
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre role="tabpanel" className="well mt-2 max-h-72 overflow-auto p-4 text-sm leading-relaxed">
        <code className="ket whitespace-pre">{text}</code>
      </pre>
      <p className="mt-1.5 text-xs text-dim">{note[tab]}</p>
    </div>
  );
}
