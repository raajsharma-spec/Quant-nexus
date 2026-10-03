"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  tint: 0 | 1;
}

const TINTS = ["90, 215, 240", "168, 146, 255"];
const LINK_DISTANCE = 140;

/**
 * A quiet field of drifting points with faint links between neighbours —
 * the page's "measurement grid" coming alive. Purely decorative: it sits
 * behind the content, ignores the pointer and stands still when the visitor
 * prefers reduced motion.
 */
export function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;

    const seed = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // About one point per 30,000 px², within sensible bounds.
      const count = Math.max(18, Math.min(64, Math.round((width * height) / 30000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: 0.7 + Math.random() * 1.1,
        tint: index % 3 === 0 ? 1 : 0,
      }));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > LINK_DISTANCE) continue;
          context.strokeStyle = `rgba(150, 170, 255, ${0.085 * (1 - distance / LINK_DISTANCE)})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
        context.fillStyle = `rgba(${TINTS[a.tint]}, 0.5)`;
        context.beginPath();
        context.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        context.fill();
      }
    };

    const step = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }
      draw();
      frame = window.requestAnimationFrame(step);
    };

    const start = () => {
      window.cancelAnimationFrame(frame);
      if (still || document.visibilityState !== "visible") draw();
      else frame = window.requestAnimationFrame(step);
    };
    const onResize = () => {
      seed();
      start();
    };

    seed();
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", start);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", start);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
