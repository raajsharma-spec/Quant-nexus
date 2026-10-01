/**
 * Everything Quantum Nexus remembers lives in the browser's localStorage.
 * Nothing is sent to a server.
 *
 * There are two separate "slots":
 *   - live : the learner's real interactions
 *   - demo : an illustrative learner created by "Start Demo" (always labelled DEMO DATA)
 * Keeping them apart means demo numbers never mix with real ones.
 */

import type { L, Lang, TopicId } from "./types";

export type Mode = "live" | "demo";
export type Role = "learner" | "educator";
export type PythonLevel = "beginner" | "basics" | "comfortable";

export interface Profile {
  name: string;
  role: Role;
  pythonLevel: PythonLevel | null;
  language: Lang;
  onboarded: boolean;
  createdAt: number;
}

export type EventType =
  | "lessonOpened"
  | "lessonCompleted"
  | "quizStarted"
  | "quizCompleted"
  | "quizAttempt"
  | "predictionSubmitted"
  | "predictionCorrect"
  | "predictionWrong"
  | "circuitEdited"
  | "circuitExecuted"
  | "executionError"
  | "hintRequested"
  | "topicRevisited"
  | "aiExplanationRequested"
  | "topicUnlocked"
  | "achievementEarned";

export interface TelemetryEvent {
  id: string;
  type: EventType;
  at: number;
  topic?: TopicId;
  /** Short language-neutral detail, e.g. a circuit, a score or a title. */
  detail?: string;
  meta?: Record<string, string | number | boolean>;
  /** True for events created by "Start Demo" rather than by real interaction. */
  seeded?: boolean;
}

export interface PredictionRecord {
  id: string;
  at: number;
  source: "lab" | "practice" | "lesson";
  topic: TopicId;
  circuit: string;
  prediction: string;
  actual: string;
  correct: boolean;
  challengeId?: string;
  seeded?: boolean;
}

export interface PracticeRecord {
  attempts: number;
  correctAttempts: number;
  solved: boolean;
  firstTry: boolean;
  lastAt: number;
}

export interface AssessmentAnswer {
  questionId: string;
  concept: string;
  correct: boolean;
}

export interface AssessmentAttempt {
  id: string;
  at: number;
  topic: TopicId;
  score: number;
  total: number;
  answers: AssessmentAnswer[];
  seeded?: boolean;
}

export interface LessonProgress {
  opens: number;
  step: number;
  completed: boolean;
}

/** The most recent experiment — the tutor uses it to answer "why?" questions. */
export interface LastExperiment {
  at: number;
  source: "lab" | "practice" | "lesson";
  topic: TopicId;
  circuit: string;
  prediction: string;
  actual: string;
  correct: boolean;
  steps: L[];
  summary: L;
}

export interface Settings {
  /** Score (in %) needed in a mastery check to unlock the next topic. */
  masteryThreshold: number;
}

export interface AppState {
  version: 1;
  mode: Mode;
  profile: Profile | null;
  events: TelemetryEvent[];
  predictions: PredictionRecord[];
  practice: Record<string, PracticeRecord>;
  assessments: AssessmentAttempt[];
  lessons: Partial<Record<TopicId, LessonProgress>>;
  achievements: Record<string, number>;
  activeDays: string[];
  lastExperiment: LastExperiment | null;
  settings: Settings;
}

export const DEFAULT_MASTERY_THRESHOLD = 80;

const KEYS = {
  live: "quantum-nexus:live:v1",
  demo: "quantum-nexus:demo:v1",
  mode: "quantum-nexus:mode",
} as const;

export function createInitialState(mode: Mode = "live"): AppState {
  return {
    version: 1,
    mode,
    profile: null,
    events: [],
    predictions: [],
    practice: {},
    assessments: [],
    lessons: {},
    achievements: {},
    activeDays: [],
    lastExperiment: null,
    settings: { masteryThreshold: DEFAULT_MASTERY_THRESHOLD },
  };
}

function storageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function loadMode(): Mode {
  if (!storageAvailable()) return "live";
  try {
    return window.localStorage.getItem(KEYS.mode) === "demo" ? "demo" : "live";
  } catch {
    return "live";
  }
}

export function saveMode(mode: Mode): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(KEYS.mode, mode);
  } catch {
    /* storage full or blocked — the app keeps working in memory */
  }
}

export function loadState(mode: Mode): AppState {
  if (!storageAvailable()) return createInitialState(mode);
  try {
    const raw = window.localStorage.getItem(KEYS[mode]);
    if (!raw) return createInitialState(mode);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.version !== 1) return createInitialState(mode);
    // Merge over defaults so older saves never crash newer code.
    return { ...createInitialState(mode), ...parsed, mode };
  } catch {
    return createInitialState(mode);
  }
}

export function saveState(state: AppState): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(KEYS[state.mode], JSON.stringify(state));
  } catch {
    /* storage full or blocked — the app keeps working in memory */
  }
}

/** Reset Demo: wipe everything Quantum Nexus has stored on this device. */
export function clearAll(): void {
  if (!storageAvailable()) return;
  try {
    Object.values(KEYS).forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* nothing to clear */
  }
}

/** Local calendar day, e.g. "2026-10-01". Used for the streak. */
export function dayKey(time: number = Date.now()): string {
  const d = new Date(time);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}
