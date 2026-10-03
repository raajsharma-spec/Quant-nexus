/**
 * The persistent student learning state.
 *
 * Everything Quantum Nexus remembers lives in the browser's localStorage, so
 * progress survives a refresh, closing the browser and coming back later.
 * Nothing is sent to a server. (A production build would sync this same shape
 * to PostgreSQL — see backend/database/schema.sql for the planned tables.)
 *
 * There are two separate "slots":
 *   - live : the learner's real interactions
 *   - demo : an illustrative learner created by "Start Demo" (always labelled DEMO DATA)
 * Keeping them apart means demo numbers never mix with real ones.
 */

import type { BackendId } from "./execution";
import { STAGE_IDS, type Confidence, type L, type Lang, type StageId, type TopicId } from "./types";

export type Mode = "live" | "demo";
export type Role = "learner" | "educator";
/** The prerequisite check in onboarding: how comfortable the learner is with Python. */
export type PythonLevel = "beginner" | "basics" | "comfortable";

export interface Profile {
  /** Stable student identity, created once on this device. */
  id: string;
  name: string;
  role: Role;
  pythonLevel: PythonLevel | null;
  language: Lang;
  onboarded: boolean;
  createdAt: number;
}

export type EventType =
  // lessons and stages
  | "lessonOpened"
  | "lessonCompleted"
  | "conceptStarted"
  | "stageStarted"
  | "stageCompleted"
  | "conceptMastered"
  | "topicUnlocked"
  | "topicRevisited"
  // watch / interact
  | "videoStarted"
  | "videoCompleted"
  | "interactionUsed"
  // predict → run → observe → explain
  | "predictionSubmitted"
  | "predictionCorrect"
  | "predictionWrong"
  | "circuitEdited"
  | "circuitExecuted"
  | "executionError"
  | "resultObserved"
  | "explanationSubmitted"
  // assessment
  | "quizStarted"
  | "quizCompleted"
  | "quizAttempt"
  // tutor, hints, misconceptions
  | "hintRequested"
  | "aiQuestion"
  | "aiExplanationRequested"
  | "misconceptionDetected"
  | "misconceptionResolved"
  // review and challenges
  | "reviewStarted"
  | "reviewCompleted"
  | "quickReview"
  | "challengeCompleted"
  | "achievementEarned";

/**
 * How the event names in the product brief map onto ours:
 *   simulation_run → circuitExecuted · assessment_started/completed → quizStarted/quizCompleted
 *   hint_used → hintRequested · AI_question → aiQuestion · concept_completed → conceptMastered
 */
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
  source: "lab" | "practice" | "lesson" | "challenge";
  topic: TopicId;
  circuit: string;
  prediction: string;
  actual: string;
  correct: boolean;
  confidence?: Confidence;
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
  /** 0–1. Written answers can earn partial credit. Missing means 1 or 0 from `correct`. */
  credit?: number;
  difficulty?: number;
}

export interface AssessmentAttempt {
  id: string;
  at: number;
  topic: TopicId;
  /** Sum of credit (so it can be fractional when a written answer is partly right). */
  score: number;
  total: number;
  answers: AssessmentAnswer[];
  /** "full" = every item; "targeted" = only the items missed before. */
  kind?: "full" | "targeted";
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
  source: "lab" | "practice" | "lesson" | "challenge";
  topic: TopicId;
  circuit: string;
  prediction: string;
  actual: string;
  correct: boolean;
  steps: L[];
  summary: L;
  /** The real measurement data, so the tutor can quote actual numbers. */
  counts?: Record<string, number>;
  shots?: number;
  probabilities?: Record<string, number>;
  backend?: BackendId;
  confidence?: Confidence;
}

// ---------------------------------------------------------------------------
// Stage-by-stage progress for one concept
// ---------------------------------------------------------------------------

export interface StagePrediction {
  optionId: string;
  label: string;
  distribution: Record<string, number> | null;
  confidence: Confidence;
  at: number;
}

export interface StageRun {
  at: number;
  circuit: string;
  shots: number;
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  measured: number[];
  backend: BackendId;
  /** Whether the prediction made in the Predict stage matched. */
  predictionCorrect: boolean;
}

export interface AssessSlot {
  questionId: string;
  /** Latest evidence for this item, 0–1. */
  credit: number;
  /** What the learner earned the first time — used by the personalised review. */
  firstCredit: number;
  /** The most recent question for this item that was answered wrong, if any. */
  missedQuestionId?: string;
  tries: number;
  at: number;
}

export interface ConceptProgress {
  startedAt: number;
  updatedAt: number;
  /** Best score reached in each stage, 0–100. */
  scores: Partial<Record<StageId, number>>;
  attempts: Partial<Record<StageId, number>>;
  /** Time spent with each stage open, in milliseconds. */
  timeMs: Partial<Record<StageId, number>>;
  /** The stage the learner last had open — where "Continue" resumes. */
  lastStage?: StageId;

  /** Learn: ids of the theory blocks that have been read. */
  learnRead: string[];
  /** Watch: indexes of the visual-lesson scenes that have been seen. */
  watchSeen: number[];
  /** Interact: how many times the learner used the interactive piece. */
  interactions: number;
  /** Experiment: ids of the goals reached in the sandbox. */
  goals: string[];
  /** Ask AI: how many tutor questions were asked inside this concept. */
  questions: number;
  /** Predict: the committed prediction for this concept's core experiment. */
  prediction: StagePrediction | null;
  /** Run: the real result of that experiment. */
  run: StageRun | null;
  /** Observe: ids of the observation checks answered correctly. */
  observed: string[];
  /** Assess: latest evidence for each assessment item. */
  assess: Record<string, AssessSlot>;
  assessAttempts: number;
  /** Next Challenge: the challenge chosen for this learner, and whether it is solved. */
  challengeId: string | null;
  challengeSolved: boolean;
  /** Set once every stage has reached the threshold. A mastered concept is never taken away. */
  masteredAt?: number;
}

export interface ExplanationRecord {
  id: string;
  at: number;
  topic: TopicId;
  rubricId: string;
  mode: "written" | "structured";
  /** The learner's own words (trimmed). Stored only on this device. */
  text: string;
  score: number;
  covered: string[];
  missing: string[];
  misconceptions: string[];
  seeded?: boolean;
}

export interface MisconceptionRecord {
  id: string;
  at: number;
  /** Id from data/misconceptions.ts, e.g. "classical_randomness". */
  misconception: string;
  concept: TopicId;
  /** 0–1: how strongly the evidence points at this misconception. */
  confidence: number;
  source: "explanation" | "tutor" | "assessment" | "prediction";
  /** A short quote or description of what triggered it. */
  evidence: string;
  resolvedAt?: number;
  seeded?: boolean;
}

export interface TutorInteraction {
  id: string;
  at: number;
  topic: TopicId;
  stage?: StageId;
  mode: string;
  question: string;
  /** Ids of the knowledge-base entries the answer was built from. */
  sources: string[];
  seeded?: boolean;
}

export interface SimulationRun {
  id: string;
  at: number;
  source: "lab" | "practice" | "lesson" | "challenge";
  topic: TopicId;
  circuit: string;
  shots: number;
  counts: Record<string, number>;
  backend: BackendId;
  seeded?: boolean;
}

/** Spaced review of a mastered concept. */
export interface ReviewSchedule {
  /** When the last quick review was answered, or null if none yet. */
  lastAt: number | null;
  /** Quick reviews answered correctly in a row — spaces the next one further out. */
  streak: number;
  /** True after a missed quick review, until the learner gets one right. */
  needsReview: boolean;
  lastQuestionId?: string;
}

export interface Settings {
  /** Stage score (in %) needed to unlock the next stage. Never below 90. */
  masteryThreshold: number;
  /** Show state vectors, amplitudes and matrices without having to expand them. */
  advancedMode: boolean;
  /** How many times a circuit is run per experiment. */
  shots: number;
  /** Preferred execution backend. Falls back to the browser when unavailable. */
  backend: BackendId;
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
  /** Stage-by-stage progress for each quantum concept. */
  concepts: Partial<Record<TopicId, ConceptProgress>>;
  explanations: ExplanationRecord[];
  misconceptions: MisconceptionRecord[];
  tutorLog: TutorInteraction[];
  runs: SimulationRun[];
  reviews: Partial<Record<TopicId, ReviewSchedule>>;
  achievements: Record<string, number>;
  activeDays: string[];
  lastExperiment: LastExperiment | null;
  settings: Settings;
}

/** The mastery gate. 90% is the minimum; the educator may raise it up to 100%. */
export const MIN_MASTERY_THRESHOLD = 90;
export const MAX_MASTERY_THRESHOLD = 100;
export const DEFAULT_MASTERY_THRESHOLD = 90;

export const SHOT_OPTIONS = [100, 1024, 4096] as const;

export function clampThreshold(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MASTERY_THRESHOLD;
  return Math.max(MIN_MASTERY_THRESHOLD, Math.min(MAX_MASTERY_THRESHOLD, Math.round(value)));
}

const KEYS = {
  live: "quantum-nexus:live:v1",
  demo: "quantum-nexus:demo:v1",
  mode: "quantum-nexus:mode",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  masteryThreshold: DEFAULT_MASTERY_THRESHOLD,
  advancedMode: false,
  shots: 1024,
  backend: "browser",
};

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
    concepts: {},
    explanations: [],
    misconceptions: [],
    tutorLog: [],
    runs: [],
    reviews: {},
    achievements: {},
    activeDays: [],
    lastExperiment: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function emptyConceptProgress(now: number = Date.now()): ConceptProgress {
  return {
    startedAt: now,
    updatedAt: now,
    scores: {},
    attempts: {},
    timeMs: {},
    learnRead: [],
    watchSeen: [],
    interactions: 0,
    goals: [],
    questions: 0,
    prediction: null,
    run: null,
    observed: [],
    assess: {},
    assessAttempts: 0,
    challengeId: null,
    challengeSolved: false,
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

const QUANTUM_TOPICS: TopicId[] = ["qubit", "gates", "superposition", "entanglement"];

/**
 * Bring a save made by an earlier version of Quantum Nexus up to date.
 * Older saves had no stage-by-stage progress, so we rebuild it from what the
 * learner had already done — nobody loses a concept they had mastered.
 */
export function normalizeState(parsed: Partial<AppState>, mode: Mode): AppState {
  const base = createInitialState(mode);
  const state: AppState = { ...base, ...parsed, mode, version: 1 };

  state.settings = {
    ...DEFAULT_SETTINGS,
    ...(parsed.settings ?? {}),
  };
  state.settings.masteryThreshold = clampThreshold(state.settings.masteryThreshold);
  if (!SHOT_OPTIONS.includes(state.settings.shots as (typeof SHOT_OPTIONS)[number])) state.settings.shots = 1024;
  if (state.settings.backend !== "qiskit") state.settings.backend = "browser";

  // Arrays and maps that older saves may not have.
  state.events = Array.isArray(state.events) ? state.events : [];
  state.predictions = Array.isArray(state.predictions) ? state.predictions : [];
  state.assessments = Array.isArray(state.assessments) ? state.assessments : [];
  state.explanations = Array.isArray(state.explanations) ? state.explanations : [];
  state.misconceptions = Array.isArray(state.misconceptions) ? state.misconceptions : [];
  state.tutorLog = Array.isArray(state.tutorLog) ? state.tutorLog : [];
  state.runs = Array.isArray(state.runs) ? state.runs : [];
  state.activeDays = Array.isArray(state.activeDays) ? state.activeDays : [];
  state.practice = state.practice ?? {};
  state.lessons = state.lessons ?? {};
  state.reviews = state.reviews ?? {};
  state.achievements = state.achievements ?? {};

  if (state.profile && !state.profile.id) {
    state.profile = { ...state.profile, id: newId("student") };
  }

  if (!parsed.concepts) {
    // Legacy save: rebuild stage progress from lessons and unlock events.
    const concepts: Partial<Record<TopicId, ConceptProgress>> = {};
    for (const topic of QUANTUM_TOPICS) {
      const lesson = state.lessons[topic];
      const mastered = state.events.some((e) => e.type === "topicUnlocked" && e.meta?.from === topic);
      if (!lesson && !mastered) continue;
      const progress = emptyConceptProgress();
      progress.scores.discover = 100;
      if (mastered) {
        STAGE_IDS.forEach((stage) => (progress.scores[stage] = 100));
        progress.masteredAt = Date.now();
        progress.challengeSolved = true;
      } else if (lesson?.completed) {
        (["learn", "watch", "interact", "experiment"] as StageId[]).forEach(
          (stage) => (progress.scores[stage] = 100)
        );
      }
      concepts[topic] = progress;
    }
    state.concepts = concepts;
  } else {
    // Fill in any fields added after this save was written.
    const concepts: Partial<Record<TopicId, ConceptProgress>> = {};
    for (const [topic, value] of Object.entries(parsed.concepts)) {
      if (!value) continue;
      concepts[topic as TopicId] = { ...emptyConceptProgress(value.startedAt), ...value };
    }
    state.concepts = concepts;
  }

  return state;
}

export function loadState(mode: Mode): AppState {
  if (!storageAvailable()) return createInitialState(mode);
  try {
    const raw = window.localStorage.getItem(KEYS[mode]);
    if (!raw) return createInitialState(mode);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1) return createInitialState(mode);
    return normalizeState(parsed, mode);
  } catch {
    return createInitialState(mode);
  }
}

/** Returns false when the browser refused to store the state (private mode, full storage …). */
export function saveState(state: AppState): boolean {
  if (!storageAvailable()) return false;
  try {
    window.localStorage.setItem(KEYS[state.mode], JSON.stringify(state));
    return true;
  } catch {
    /* storage full or blocked — the app keeps working in memory */
    return false;
  }
}

/** A real write-and-read-back test, used by the system health panel. */
export function storageCheck(): { ok: boolean; detail: string } {
  if (!storageAvailable()) return { ok: false, detail: "This browser is blocking local storage." };
  try {
    const key = "quantum-nexus:health";
    const value = String(Date.now());
    window.localStorage.setItem(key, value);
    const back = window.localStorage.getItem(key);
    window.localStorage.removeItem(key);
    return back === value
      ? { ok: true, detail: "Progress is saved in this browser." }
      : { ok: false, detail: "Local storage did not return what was written." };
  } catch {
    return { ok: false, detail: "Local storage is full or blocked." };
  }
}

/** Reset Demo: wipe everything Quantum Nexus has stored on this device. */
export function clearAll(): void {
  if (!storageAvailable()) return;
  try {
    Object.values(KEYS).forEach((key) => window.localStorage.removeItem(key));
    // The instructor's class list (lib/classroom.ts) is part of "everything on this device".
    window.localStorage.removeItem("quantum-nexus:class:v1");
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
