"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { VisualLesson as VisualLessonData } from "@/data/curriculum";
import { buildCircuit, measureCircuit, stateAfter } from "@/lib/quantumSimulator";
import { useApp } from "./AppProvider";
import { BlochSphere } from "./BlochSphere";
import { ProbabilityBars } from "./ProbabilityBars";
import { QuantumCircuit } from "./QuantumCircuit";

interface Props {
  lesson: VisualLessonData;
  /** Indexes of scenes already seen (from the saved learning state). */
  seen: number[];
  onSceneSeen: (index: number) => void;
}

const format = (seconds: number) => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

/** A scene counts as watched once it has been on screen this long (or played to its end). */
const SEEN_AFTER_SECONDS = 2.5;

/**
 * The Watch stage: a short visual lesson with play, pause and seek.
 *
 * If a real video file is attached to the concept it is played here with the
 * browser's own controls. Otherwise — as in this build — the learner gets an
 * equivalent animated lesson whose pictures are computed live by the
 * simulator from each scene's circuit, so they can never drift out of step
 * with the physics.
 */
export function VisualLesson({ lesson, seen, onSceneSeen }: Props) {
  const { t } = useApp();
  const starts = useMemo(() => {
    const list: number[] = [];
    let total = 0;
    lesson.scenes.forEach((scene) => {
      list.push(total);
      total += scene.seconds;
    });
    return { list, total };
  }, [lesson]);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const lastTick = useRef<number | null>(null);
  const dwell = useRef(0);

  const index = Math.max(
    0,
    starts.list.reduce((found, start, i) => (time >= start ? i : found), 0)
  );
  const scene = lesson.scenes[index];
  const sceneTime = time - starts.list[index];

  // The clock: advances while playing, stops at the end.
  useEffect(() => {
    if (!playing) {
      lastTick.current = null;
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      const previous = lastTick.current ?? now;
      lastTick.current = now;
      const delta = Math.min(0.25, (now - previous) / 1000);
      setTime((value) => {
        const next = value + delta;
        if (next >= starts.total) {
          setPlaying(false);
          return starts.total - 0.001;
        }
        return next;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, starts.total]);

  // Mark a scene as seen once it has really been on screen for a moment.
  useEffect(() => {
    dwell.current = 0;
    if (seen.includes(index)) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      dwell.current = (performance.now() - started) / 1000;
      if (dwell.current >= SEEN_AFTER_SECONDS) {
        window.clearInterval(timer);
        onSceneSeen(index);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [index, seen, onSceneSeen]);

  // The picture for this scene, computed by the simulator.
  const snapshot = useMemo(() => stateAfter(lesson.qubits, buildCircuit(lesson.qubits, scene.gates).gates), [lesson.qubits, scene]);
  const circuit = useMemo(() => buildCircuit(lesson.qubits, scene.gates, Math.max(3, scene.gates.length + 1)), [lesson.qubits, scene]);

  // Scenes with `shots` sample real runs; the counts build up as the scene plays.
  const sampled = useMemo(() => {
    if (!scene.shots) return null;
    const measured = Array.from({ length: lesson.qubits }, (_, q) => q).filter((q) =>
      scene.gates.some((g) => g[0] === "M" && g[1] === q)
    );
    const all = Object.entries(snapshot.probabilities);
    const probabilities: Record<string, number> = {};
    for (const [label, p] of all) {
      const key = measured.map((q) => label[q]).join("") || label;
      probabilities[key] = (probabilities[key] ?? 0) + p;
    }
    // One fixed sequence of single shots, revealed progressively.
    const labels = Object.keys(probabilities);
    const order: string[] = [];
    for (let i = 0; i < scene.shots; i++) {
      const one = measureCircuit(probabilities, 1);
      order.push(labels.find((label) => one[label] === 1) ?? labels[0]);
    }
    return { probabilities, order, labels };
  }, [scene, snapshot, lesson.qubits]);

  const shown = sampled ? Math.min(sampled.order.length, Math.round((sceneTime / scene.seconds) * sampled.order.length * 1.15)) : 0;
  const counts: Record<string, number> = {};
  if (sampled) {
    sampled.labels.forEach((label) => (counts[label] = 0));
    sampled.order.slice(0, shown).forEach((label) => (counts[label] += 1));
  }
  const shares: Record<string, number> = {};
  if (sampled) sampled.labels.forEach((label) => (shares[label] = shown === 0 ? 0 : counts[label] / shown));

  const jump = (target: number) => {
    setTime(Math.max(0, Math.min(starts.total - 0.001, starts.list[Math.max(0, Math.min(lesson.scenes.length - 1, target))])));
  };

  const watched = Math.round((seen.length / lesson.scenes.length) * 100);

  if (lesson.videoUrl) {
    return (
      <div>
        <video
          src={lesson.videoUrl}
          controls
          className="w-full rounded-2xl border border-line bg-void"
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (!video.duration) return;
            const reached = Math.floor((video.currentTime / video.duration) * lesson.scenes.length);
            for (let i = 0; i <= Math.min(reached, lesson.scenes.length - 1); i++) {
              if (!seen.includes(i)) onSceneSeen(i);
            }
          }}
        >
          {t({ en: "Your browser cannot play this video.", hi: "Aapka browser yeh video play nahi kar sakta." })}
        </video>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-void/60">
      {/* Picture */}
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.1fr_1fr]" aria-live="polite">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="ket text-xs text-dim">
            {t({ en: "Scene", hi: "Scene" })} {index + 1} / {lesson.scenes.length}
          </p>
          <h3 className="text-xl font-semibold tracking-tight">{t(scene.title)}</h3>
          <div className="well px-3 py-1">
            <QuantumCircuit circuit={circuit} running={playing} trim />
          </div>
          <p className="text-[1.0625rem] leading-relaxed text-ink/90">{t(scene.caption)}</p>
        </div>

        <div className="flex min-w-0 flex-col items-center justify-center gap-4">
          <div className="flex flex-wrap justify-center gap-3">
            {snapshot.bloch.map((vector, q) => (
              <BlochSphere key={q} vector={vector} title={lesson.qubits > 1 ? `q${q}` : "state"} size={150} />
            ))}
          </div>
          <div className="w-full">
            {sampled ? (
              <>
                <p className="mb-2 text-sm font-semibold text-ket">
                  {t({ en: `Measured so far: ${shown} runs`, hi: `Abhi tak measure: ${shown} runs` })}
                </p>
                <ProbabilityBars values={shares} counts={counts} expected={sampled.probabilities} approx label="Sampled results in this scene" />
              </>
            ) : (
              <>
                <p className="mb-2 text-sm font-semibold text-phase">
                  {t({ en: "Probabilities if you measured now", hi: "Abhi measure karo to probabilities" })}
                </p>
                <ProbabilityBars values={snapshot.probabilities} tone="phase" label="Exact probabilities in this scene" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controls: play, pause, seek, progress */}
      <div className="border-t border-line bg-deck/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => jump(index - 1)} disabled={index === 0} className="btn btn-ghost px-2 py-2" aria-label="Previous scene">
            <SkipBack size={17} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!playing && time >= starts.total - 0.05) setTime(0);
              setPlaying((value) => !value);
            }}
            className="btn btn-primary px-3 py-2"
            aria-label={playing ? "Pause the visual lesson" : "Play the visual lesson"}
          >
            {playing ? <Pause size={17} aria-hidden /> : <Play size={17} aria-hidden />}
            <span className="max-sm:sr-only">{playing ? t({ en: "Pause", hi: "Pause" }) : t({ en: "Play", hi: "Play" })}</span>
          </button>
          <button
            type="button"
            onClick={() => jump(index + 1)}
            disabled={index === lesson.scenes.length - 1}
            className="btn btn-ghost px-2 py-2"
            aria-label="Next scene"
          >
            <SkipForward size={17} aria-hidden />
          </button>
          <label htmlFor="lesson-seek" className="sr-only">
            Seek within the visual lesson
          </label>
          <input
            id="lesson-seek"
            type="range"
            min={0}
            max={starts.total}
            step={0.1}
            value={time}
            onChange={(event) => setTime(Math.min(starts.total - 0.001, Number(event.target.value)))}
            className="mx-1 min-w-0 flex-1 accent-[#5ad7f0]"
          />
          <span className="ket shrink-0 text-xs tabular-nums text-mute">
            {format(time)} / {format(starts.total)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <ol className="flex gap-1.5" aria-label="Scenes">
            {lesson.scenes.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={i === index ? "step" : undefined}
                  aria-label={`Scene ${i + 1}: ${item.title.en}${seen.includes(i) ? " (watched)" : ""}`}
                  className={`h-2.5 w-8 rounded-full transition-colors ${
                    i === index ? "bg-ket" : seen.includes(i) ? "bg-ok/70" : "bg-white/15 hover:bg-white/30"
                  }`}
                />
              </li>
            ))}
          </ol>
          <p className="text-xs text-mute">
            {t({ en: `Watched ${watched}%`, hi: `${watched}% dekha` })} · {seen.length} / {lesson.scenes.length}{" "}
            {t({ en: "scenes", hi: "scenes" })}
          </p>
        </div>
      </div>
    </div>
  );
}
