import { INTERACTIVE_TOPICS } from "@/data/topics";
import { topicStatus } from "@/lib/mastery";
import type { AppState } from "@/lib/storage";
import type { L } from "@/lib/types";

export interface Achievement {
  id: string;
  title: string;
  /** How to earn it. */
  criteria: L;
  icon: "target" | "cpu" | "crosshair" | "atom" | "waves" | "unlock";
  /** Awarded only when this returns true for the learner's real records. */
  check: (state: AppState) => boolean;
  /** Progress toward the goal, for the "x of y" hint. */
  progress?: (state: AppState) => { value: number; goal: number };
}

const GATES_TO_EXPLORE = ["H", "X", "Y", "Z", "M"];

function gatesUsed(state: AppState): Set<string> {
  const used = new Set<string>();
  state.events
    .filter((e) => e.type === "circuitExecuted" && typeof e.meta?.gates === "string")
    .forEach((e) => String(e.meta?.gates).split(",").forEach((g) => used.add(g)));
  return used;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-prediction",
    title: "First Prediction",
    criteria: { en: "Complete your first prediction.", hi: "Apni pehli prediction complete karo." },
    icon: "target",
    check: (s) => s.predictions.length >= 1,
  },
  {
    id: "first-circuit",
    title: "First Circuit",
    criteria: { en: "Run your first quantum circuit.", hi: "Apna pehla quantum circuit run karo." },
    icon: "cpu",
    check: (s) => s.events.some((e) => e.type === "circuitExecuted"),
  },
  {
    id: "superposition-starter",
    title: "Superposition Starter",
    criteria: {
      en: "Run a circuit that uses the H gate.",
      hi: "Ek aisa circuit run karo jisme H gate ho.",
    },
    icon: "waves",
    check: (s) => gatesUsed(s).has("H"),
  },
  {
    id: "quantum-explorer",
    title: "Quantum Explorer",
    criteria: {
      en: "Run circuits that use every gate: H, X, Y, Z and M.",
      hi: "Aise circuits run karo jinme har gate use ho: H, X, Y, Z aur M.",
    },
    icon: "atom",
    check: (s) => GATES_TO_EXPLORE.every((g) => gatesUsed(s).has(g)),
    progress: (s) => ({
      value: GATES_TO_EXPLORE.filter((g) => gatesUsed(s).has(g)).length,
      goal: GATES_TO_EXPLORE.length,
    }),
  },
  {
    id: "prediction-master",
    title: "Prediction Master",
    criteria: { en: "Get 5 predictions right.", hi: "5 predictions sahi karo." },
    icon: "crosshair",
    check: (s) => s.predictions.filter((p) => p.correct).length >= 5,
    progress: (s) => ({ value: Math.min(5, s.predictions.filter((p) => p.correct).length), goal: 5 }),
  },
  {
    id: "mastery-unlocked",
    title: "Mastery Unlocked",
    criteria: {
      en: "Reach the mastery threshold in any topic.",
      hi: "Kisi bhi topic mein mastery threshold reach karo.",
    },
    icon: "unlock",
    check: (s) => INTERACTIVE_TOPICS.some((t) => topicStatus(s, t) === "MASTERED"),
  },
];

/** Shown on the dashboard preview, in this order. */
export const PREVIEW_ACHIEVEMENTS = [
  "first-prediction",
  "quantum-explorer",
  "prediction-master",
  "mastery-unlocked",
];
