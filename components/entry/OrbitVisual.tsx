"use client";

import { useEffect, useRef } from "react";

const CX = 220;
const CY = 190;
const R = 118;

/** Orbit rings around the sphere: radii, tilt in degrees, speed and colour. */
const ORBITS = [
  { rx: 176, ry: 54, tilt: -22, speed: 0.42, phase: 0.4, color: "#5ad7f0" },
  { rx: 168, ry: 46, tilt: 28, speed: -0.31, phase: 2.1, color: "#a892ff" },
  { rx: 150, ry: 62, tilt: 82, speed: 0.24, phase: 4.0, color: "#6394ff" },
];

/** The little circuit under the sphere: two wires, H, CX and two measurements. */
const WIRE_Y = [372, 410];
const WIRE_X0 = 64;
const WIRE_X1 = 376;

/**
 * The entry visual: a qubit on the Bloch sphere, its state arrow slowly
 * precessing, three orbiting points, and a two-qubit circuit with a pulse
 * running through it. Decorative — the real, interactive sphere is in the lab.
 */
export function OrbitVisual({ className = "" }: { className?: string }) {
  const arrow = useRef<SVGLineElement>(null);
  const tip = useRef<SVGCircleElement>(null);
  const dots = useRef<Array<SVGCircleElement | null>>([]);
  const pulses = useRef<Array<SVGCircleElement | null>>([]);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const render = (seconds: number) => {
      // The state arrow sweeps a small circle near the top of the sphere, seen in perspective.
      const a = seconds * 0.55;
      const x = CX + 74 * Math.cos(a);
      const y = CY - 84 + 21 * Math.sin(a);
      arrow.current?.setAttribute("x2", x.toFixed(1));
      arrow.current?.setAttribute("y2", y.toFixed(1));
      tip.current?.setAttribute("cx", x.toFixed(1));
      tip.current?.setAttribute("cy", y.toFixed(1));

      ORBITS.forEach((orbit, index) => {
        const t = orbit.phase + seconds * orbit.speed;
        const tilt = (orbit.tilt * Math.PI) / 180;
        const ox = orbit.rx * Math.cos(t);
        const oy = orbit.ry * Math.sin(t);
        const dot = dots.current[index];
        dot?.setAttribute("cx", (CX + ox * Math.cos(tilt) - oy * Math.sin(tilt)).toFixed(1));
        dot?.setAttribute("cy", (CY + ox * Math.sin(tilt) + oy * Math.cos(tilt)).toFixed(1));
        // Points on the far side of their ring are dimmer.
        dot?.setAttribute("opacity", (0.55 + 0.45 * Math.sin(t)).toFixed(2));
      });

      // One pulse per wire travels left to right, the lower one slightly behind.
      const span = WIRE_X1 - WIRE_X0;
      pulses.current.forEach((pulse, index) => {
        const progress = (seconds * 0.22 + index * 0.08) % 1;
        pulse?.setAttribute("cx", (WIRE_X0 + span * progress).toFixed(1));
        pulse?.setAttribute("opacity", Math.sin(progress * Math.PI).toFixed(2));
      });
    };

    if (still) {
      render(1.2);
      return;
    }
    const loop = (now: number) => {
      render(now / 1000);
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const line = "rgb(150 170 255 / 0.3)";
  const faint = "rgb(150 170 255 / 0.16)";

  return (
    <svg
      viewBox="0 0 440 440"
      role="img"
      aria-label="A qubit on the Bloch sphere with its state arrow turning, above a two-qubit circuit with an H gate, a CX gate and two measurements"
      className={className}
    >
      <defs>
        <radialGradient id="orbit-glow" cx="50%" cy="42%" r="50%">
          <stop offset="0%" stopColor="rgb(99 148 255 / 0.2)" />
          <stop offset="100%" stopColor="rgb(99 148 255 / 0)" />
        </radialGradient>
        <radialGradient id="orbit-sphere" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="rgb(90 215 240 / 0.14)" />
          <stop offset="100%" stopColor="rgb(11 17 36 / 0.1)" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r="186" fill="url(#orbit-glow)" />

      {/* Orbit rings */}
      {ORBITS.map((orbit, index) => (
        <ellipse
          key={index}
          cx={CX}
          cy={CY}
          rx={orbit.rx}
          ry={orbit.ry}
          transform={`rotate(${orbit.tilt} ${CX} ${CY})`}
          fill="none"
          stroke={faint}
          strokeWidth="1"
        />
      ))}

      {/* The Bloch sphere */}
      <circle cx={CX} cy={CY} r={R} fill="url(#orbit-sphere)" stroke={line} strokeWidth="1.2" />
      <ellipse cx={CX} cy={CY} rx={R} ry="33" fill="none" stroke={line} strokeWidth="1" />
      <ellipse cx={CX} cy={CY} rx="38" ry={R} fill="none" stroke={faint} strokeWidth="1" strokeDasharray="3 5" />
      <line x1={CX} y1={CY - R - 14} x2={CX} y2={CY + R + 14} stroke={faint} strokeWidth="1" strokeDasharray="3 5" />
      <ellipse cx={CX} cy={CY - 84} rx="74" ry="21" fill="none" stroke="rgb(90 215 240 / 0.3)" strokeWidth="1" strokeDasharray="2 5" />
      <text x={CX} y={CY - R - 22} textAnchor="middle" className="ket" fontSize="14" fill="#9ca8c6">
        |0⟩
      </text>
      <text x={CX} y={CY + R + 34} textAnchor="middle" className="ket" fontSize="14" fill="#9ca8c6">
        |1⟩
      </text>

      {/* State arrow */}
      <line ref={arrow} x1={CX} y1={CY} x2={CX + 60} y2={CY - 90} stroke="#5ad7f0" strokeWidth="2.2" strokeLinecap="round" />
      <circle ref={tip} cx={CX + 60} cy={CY - 90} r="5" fill="#5ad7f0" />
      <circle cx={CX} cy={CY} r="3" fill="#e9edfb" />

      {/* Orbiting points */}
      {ORBITS.map((orbit, index) => (
        <circle
          key={index}
          ref={(node) => {
            dots.current[index] = node;
          }}
          cx={CX + orbit.rx}
          cy={CY}
          r="3.6"
          fill={orbit.color}
        />
      ))}

      {/* The circuit */}
      {WIRE_Y.map((y, index) => (
        <g key={y}>
          <text x={WIRE_X0 - 14} y={y + 4} textAnchor="end" className="ket" fontSize="12" fill="#7480a0">
            q{index}
          </text>
          <line x1={WIRE_X0} y1={y} x2={WIRE_X1} y2={y} stroke={line} strokeWidth="1.2" />
          <circle
            ref={(node) => {
              pulses.current[index] = node;
            }}
            cx={WIRE_X0}
            cy={y}
            r="3"
            fill="#5ad7f0"
            opacity="0"
          />
        </g>
      ))}
      {/* H on q0 */}
      <rect x="118" y={WIRE_Y[0] - 13} width="26" height="26" rx="6" fill="#0b1124" stroke="#5ad7f0" strokeWidth="1.2" />
      <text x="131" y={WIRE_Y[0] + 4.5} textAnchor="middle" className="ket" fontSize="13" fill="#5ad7f0">
        H
      </text>
      {/* CX: control on q0, target on q1 */}
      <line x1="204" y1={WIRE_Y[0]} x2="204" y2={WIRE_Y[1]} stroke="#a892ff" strokeWidth="1.2" />
      <circle cx="204" cy={WIRE_Y[0]} r="4.2" fill="#a892ff" />
      <circle cx="204" cy={WIRE_Y[1]} r="9" fill="#0b1124" stroke="#a892ff" strokeWidth="1.2" />
      <path d={`M204 ${WIRE_Y[1] - 6}v12M198 ${WIRE_Y[1]}h12`} stroke="#a892ff" strokeWidth="1.2" />
      {/* Measurements */}
      {WIRE_Y.map((y) => (
        <g key={`m${y}`}>
          <rect x="292" y={y - 13} width="26" height="26" rx="6" fill="#0b1124" stroke="rgb(233 237 251 / 0.55)" strokeWidth="1.2" />
          <path d={`M298 ${y + 5}a7 7 0 0 1 14 0`} fill="none" stroke="#e9edfb" strokeWidth="1.1" />
          <path d={`M305 ${y + 5}l5 -9`} stroke="#e9edfb" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
