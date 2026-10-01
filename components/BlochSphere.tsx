import type { BlochVector } from "@/lib/quantumSimulator";

/** A word for where the arrow points. */
export function describeBloch(v: BlochVector): string {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length < 0.2) return "entangled";
  if (v.z > 0.95) return "|0⟩";
  if (v.z < -0.95) return "|1⟩";
  if (Math.abs(v.z) < 0.05) return "equal superposition";
  return "superposition";
}

/**
 * A Bloch-sphere-inspired picture of one qubit.
 * Up = |0⟩, down = |1⟩, sideways = an equal superposition.
 * It is a teaching aid: it shows the direction of the state, not every mathematical detail.
 */
export function BlochSphere({
  vector,
  title,
  size = 132,
}: {
  vector: BlochVector;
  title: string;
  size?: number;
}) {
  const c = size / 2;
  const r = size / 2 - 22;
  const length = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
  const entangled = length < 0.2;

  // Simple projection: x → sideways, z → up, y → a hint of depth.
  const tipX = c + vector.x * r + vector.y * r * 0.35;
  const tipY = c - vector.z * r + vector.y * r * 0.22;
  const state = describeBloch(vector);

  return (
    <figure className="flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${title} points to ${state}`}
      >
        <circle cx={c} cy={c} r={r} fill="rgb(90 215 240 / 0.04)" stroke="rgb(150 170 255 / 0.35)" />
        <ellipse cx={c} cy={c} rx={r} ry={r * 0.3} fill="none" stroke="rgb(150 170 255 / 0.22)" strokeDasharray="3 4" />
        <line x1={c} y1={c - r} x2={c} y2={c + r} stroke="rgb(150 170 255 / 0.22)" strokeDasharray="3 4" />
        <text x={c} y={c - r - 7} textAnchor="middle" fontSize="11" fill="#9ca8c6" fontFamily="var(--font-mono)">
          |0⟩
        </text>
        <text x={c} y={c + r + 15} textAnchor="middle" fontSize="11" fill="#9ca8c6" fontFamily="var(--font-mono)">
          |1⟩
        </text>
        {entangled ? (
          <circle cx={c} cy={c} r={5} fill="#6394ff" />
        ) : (
          <>
            <line x1={c} y1={c} x2={tipX} y2={tipY} stroke="#5ad7f0" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={tipX} cy={tipY} r={5} fill="#5ad7f0" />
            <circle cx={c} cy={c} r={2.5} fill="#e9edfb" />
          </>
        )}
      </svg>
      <figcaption className="text-center text-xs text-mute">
        <span className="ket text-ink">{title}</span> · {state}
      </figcaption>
    </figure>
  );
}
