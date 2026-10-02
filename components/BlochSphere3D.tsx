"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BlochVector } from "@/lib/quantumSimulator";
import { describeBloch } from "./BlochSphere";

interface Props {
  /** The real Bloch vector of the qubit, straight from the simulator. */
  vector: BlochVector;
  title: string;
  size?: number;
  /** Show the polar and phase angles under the sphere. */
  showAngles?: boolean;
}

type Point3 = [number, number, number];

const DEFAULT_YAW = -0.6;
const DEFAULT_PITCH = 0.32;

/** Rotate around the vertical axis, then tilt toward the viewer. Returns screen x, screen y and depth. */
function project([x, y, z]: Point3, yaw: number, pitch: number): { sx: number; sy: number; depth: number } {
  const xr = x * Math.cos(yaw) - y * Math.sin(yaw);
  const yr = x * Math.sin(yaw) + y * Math.cos(yaw);
  return {
    sx: yr,
    sy: z * Math.cos(pitch) - xr * Math.sin(pitch),
    depth: xr * Math.cos(pitch) + z * Math.sin(pitch),
  };
}

/** Split a closed curve into its front (toward the viewer) and back parts. */
function curvePaths(points: Point3[], yaw: number, pitch: number, c: number, r: number) {
  const front: string[] = [];
  const back: string[] = [];
  let previous: { sx: number; sy: number; depth: number } | null = null;
  for (const point of points) {
    const p = project(point, yaw, pitch);
    if (previous) {
      const segment = `M${(c + previous.sx * r).toFixed(2)},${(c - previous.sy * r).toFixed(2)} L${(c + p.sx * r).toFixed(2)},${(c - p.sy * r).toFixed(2)}`;
      ((previous.depth + p.depth) / 2 >= 0 ? front : back).push(segment);
    }
    previous = p;
  }
  return { front: front.join(" "), back: back.join(" ") };
}

const circle = (make: (t: number) => Point3): Point3[] =>
  Array.from({ length: 49 }, (_, i) => make((i / 48) * Math.PI * 2));

const EQUATOR = circle((t) => [Math.cos(t), Math.sin(t), 0]);
const MERIDIAN_XZ = circle((t) => [Math.cos(t), 0, Math.sin(t)]);
const MERIDIAN_YZ = circle((t) => [0, Math.cos(t), Math.sin(t)]);

const AXES: Array<{ to: Point3; label: string }> = [
  { to: [0, 0, 1], label: "|0⟩" },
  { to: [0, 0, -1], label: "|1⟩" },
  { to: [1, 0, 0], label: "|+⟩" },
  { to: [-1, 0, 0], label: "|−⟩" },
  { to: [0, 1, 0], label: "|i⟩" },
  { to: [0, -1, 0], label: "|−i⟩" },
];

/**
 * A Bloch sphere drawn in 3D (as SVG, no extra library), showing the actual
 * state of one qubit. Drag it — or use the arrow keys — to look from another
 * side. When the state changes, the arrow glides to its new position.
 *
 * Up is |0⟩, down is |1⟩, the equator holds the equal superpositions, and the
 * angle around the vertical axis is the phase. An entangled qubit has no arrow
 * of its own: the arrow shrinks toward the centre.
 */
export function BlochSphere3D({ vector, title, size = 220, showAngles = false }: Props) {
  const [yaw, setYaw] = useState(DEFAULT_YAW);
  const [pitch, setPitch] = useState(DEFAULT_PITCH);
  const [shown, setShown] = useState<BlochVector>(vector);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const shownRef = useRef<BlochVector>(vector);
  const hintId = useId();

  // Glide the arrow to the new state instead of jumping.
  useEffect(() => {
    const from = shownRef.current;
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const same = from.x === vector.x && from.y === vector.y && from.z === vector.z;
    if (reduce || same) {
      shownRef.current = vector;
      const frame = window.requestAnimationFrame(() => setShown(vector));
      return () => window.cancelAnimationFrame(frame);
    }
    const started = performance.now();
    const duration = 450;
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - started) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      const next = {
        x: from.x + (vector.x - from.x) * ease,
        y: from.y + (vector.y - from.y) * ease,
        z: from.z + (vector.z - from.z) * ease,
      };
      shownRef.current = next;
      setShown(next);
      if (k < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [vector]);

  const c = size / 2;
  const r = size / 2 - 30;
  const length = Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
  const entangled = length < 0.2;
  const state = describeBloch(vector);

  const curves = useMemo(
    () => [EQUATOR, MERIDIAN_XZ, MERIDIAN_YZ].map((points) => curvePaths(points, yaw, pitch, c, r)),
    [yaw, pitch, c, r]
  );

  const tip = project([shown.x, shown.y, shown.z], yaw, pitch);
  const shadow = project([shown.x, shown.y, 0], yaw, pitch);
  const tipX = c + tip.sx * r;
  const tipY = c - tip.sy * r;

  // Polar angle θ (from |0⟩) and phase φ (around the vertical axis), for the advanced view.
  const theta = Math.round((Math.acos(Math.max(-1, Math.min(1, length < 1e-6 ? 1 : vector.z / length))) * 180) / Math.PI);
  const phi = Math.round((Math.atan2(vector.y, vector.x) * 180) / Math.PI);
  const p0 = Math.round(((1 + vector.z) / 2) * 100);

  const clampPitch = (value: number) => Math.max(-1.2, Math.min(1.2, value));

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        tabIndex={0}
        aria-label={`Bloch sphere for ${title}. The state is ${state}; the chance of measuring 0 is ${p0}%.`}
        aria-describedby={hintId}
        className="max-w-full cursor-grab touch-none rounded-2xl active:cursor-grabbing"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, yaw, pitch };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          setYaw(drag.current.yaw + (event.clientX - drag.current.x) * 0.012);
          setPitch(clampPitch(drag.current.pitch + (event.clientY - drag.current.y) * 0.012));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setYaw((v) => v - 0.15);
          else if (event.key === "ArrowRight") setYaw((v) => v + 0.15);
          else if (event.key === "ArrowUp") setPitch((v) => clampPitch(v + 0.15));
          else if (event.key === "ArrowDown") setPitch((v) => clampPitch(v - 0.15));
          else return;
          event.preventDefault();
        }}
      >
        <defs>
          <radialGradient id={`${hintId}-glow`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="rgb(90 215 240 / 0.16)" />
            <stop offset="100%" stopColor="rgb(99 148 255 / 0.03)" />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill={`url(#${hintId}-glow)`} stroke="rgb(150 170 255 / 0.4)" />

        {/* back halves of the guide circles */}
        {curves.map((curve, index) => (
          <path key={`b${index}`} d={curve.back} fill="none" stroke="rgb(150 170 255 / 0.16)" strokeDasharray="2 4" />
        ))}

        {/* axes */}
        {AXES.map((axis) => {
          const end = project(axis.to, yaw, pitch);
          const label = project(axis.to.map((v) => v * 1.2) as Point3, yaw, pitch);
          const front = end.depth >= 0;
          return (
            <g key={axis.label}>
              <line
                x1={c}
                y1={c}
                x2={c + end.sx * r}
                y2={c - end.sy * r}
                stroke={front ? "rgb(150 170 255 / 0.4)" : "rgb(150 170 255 / 0.18)"}
                strokeDasharray={front ? undefined : "2 4"}
              />
              <text
                x={c + label.sx * r}
                y={c - label.sy * r + 4}
                textAnchor="middle"
                fontSize="11"
                fill={front ? "#c3ccea" : "#7480a0"}
                fontFamily="var(--font-mono)"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        {/* front halves */}
        {curves.map((curve, index) => (
          <path key={`f${index}`} d={curve.front} fill="none" stroke="rgb(150 170 255 / 0.38)" />
        ))}

        {/* the state */}
        {entangled ? (
          <>
            <circle cx={c} cy={c} r={6} fill="#6394ff" />
            <circle cx={c} cy={c} r={11} fill="none" stroke="#6394ff" strokeOpacity={0.4} />
          </>
        ) : (
          <>
            <line
              x1={c + shadow.sx * r}
              y1={c - shadow.sy * r}
              x2={tipX}
              y2={tipY}
              stroke="rgb(90 215 240 / 0.3)"
              strokeDasharray="2 3"
            />
            <line x1={c} y1={c} x2={tipX} y2={tipY} stroke="#5ad7f0" strokeWidth={3} strokeLinecap="round" />
            <circle cx={tipX} cy={tipY} r={6} fill="#5ad7f0" stroke="#050814" strokeWidth={1.5} />
            <circle cx={c} cy={c} r={2.5} fill="#e9edfb" />
          </>
        )}
      </svg>

      <figcaption className="text-center text-sm text-mute">
        <span className="ket text-ink">{title}</span> · {state}
        {showAngles && !entangled && (
          <span className="ket mt-0.5 block text-xs text-dim">
            θ = {theta}° · φ = {phi}° · P(0) = {p0}%
          </span>
        )}
      </figcaption>
      <div className="flex items-center gap-3 text-xs text-dim">
        <span id={hintId}>Drag or use the arrow keys to rotate the view.</span>
        <button
          type="button"
          onClick={() => {
            setYaw(DEFAULT_YAW);
            setPitch(DEFAULT_PITCH);
          }}
          className="rounded px-1.5 py-0.5 text-mute hover:text-ink"
        >
          Reset view
        </button>
      </div>
    </figure>
  );
}
