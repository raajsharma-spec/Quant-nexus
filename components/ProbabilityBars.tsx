import { ket } from "@/lib/prediction";

interface Props {
  /** Share of each result, 0–1, keyed by bits ("0", "1", "00" …). */
  values: Record<string, number>;
  /** Raw counts, when the values come from sampled runs. */
  counts?: Record<string, number>;
  /** "ket" (cyan) for what actually happened, "phase" (violet) for a prediction. */
  tone?: "ket" | "phase";
  /** Prefix percentages with ≈ because they come from random samples. */
  approx?: boolean;
  /** Exact probabilities, drawn as a small tick for comparison. */
  expected?: Record<string, number>;
  label: string;
}

/** Horizontal probability bars — the main way results are shown in Quantum Nexus. */
export function ProbabilityBars({ values, counts, tone = "ket", approx, expected, label }: Props) {
  const rows = Object.keys(values).sort();
  const bar = tone === "ket" ? "bg-ket" : "bg-phase";
  return (
    <ul aria-label={label} className="flex flex-col gap-2.5">
      {rows.map((bits) => {
        const share = values[bits];
        const percent = Math.round(share * 100);
        return (
          <li key={bits} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <span className="ket w-12 text-sm">{ket(bits)}</span>
            <span className="relative h-6 overflow-hidden rounded-md bg-white/[0.06]">
              <span
                className={`absolute inset-y-0 left-0 origin-left animate-grow rounded-md ${bar}`}
                style={{ width: `${share * 100}%`, opacity: share === 0 ? 0 : 0.9 }}
              />
              {expected && expected[bits] > 0 && (
                <span
                  aria-hidden
                  title={`Exact probability: ${Math.round(expected[bits] * 100)}%`}
                  className="absolute inset-y-0 w-0.5 bg-ink/80"
                  style={{ left: `calc(${expected[bits] * 100}% - 1px)` }}
                />
              )}
            </span>
            <span className="w-24 text-right text-sm tabular-nums">
              <span className="font-semibold">
                {approx && share > 0 && share < 1 ? "≈" : ""}
                {percent}%
              </span>
              {counts && <span className="ml-1.5 text-xs text-dim">{counts[bits]}×</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
