/**
 * State transitions. Each function takes the current state and returns a new
 * one — no side effects — so they are easy to test and reason about.
 * The React provider calls these and then saves the result to localStorage.
 */

import { ACHIEVEMENTS } from "@/data/achievements";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { appendEvent, createEvent } from "./analytics";
import { nextTopic, topicMastery } from "./mastery";
import {
  newId,
  type AppState,
  type AssessmentAnswer,
  type EventType,
  type PythonLevel,
  type TelemetryEvent,
} from "./storage";
import type { L, Lang, TopicId } from "./types";

type EventData = Partial<Pick<TelemetryEvent, "topic" | "detail" | "meta" | "seeded" | "at">>;

export function track(state: AppState, type: EventType, data: EventData = {}): AppState {
  return appendEvent(state, createEvent(type, data));
}

/**
 * Run after every change: award achievements and record topic unlocks
 * that the learner has just earned.
 */
export function finalize(state: AppState, seeded = false): AppState {
  let next = state;
  const at = Date.now();

  for (const topic of INTERACTIVE_TOPICS) {
    const alreadyRecorded = next.events.some(
      (e) => e.type === "topicUnlocked" && e.meta?.from === topic
    );
    if (!alreadyRecorded && topicMastery(next, topic).mastered) {
      const upcoming = nextTopic(topic);
      next = track(next, "topicUnlocked", {
        topic,
        detail: upcoming ? topicTitle(upcoming) : "all MVP modules",
        meta: { from: topic },
        seeded,
        at,
      });
    }
  }

  for (const achievement of ACHIEVEMENTS) {
    if (next.achievements[achievement.id]) continue;
    if (!achievement.check(next)) continue;
    next = { ...next, achievements: { ...next.achievements, [achievement.id]: at } };
    next = track(next, "achievementEarned", { detail: achievement.title, seeded, at });
  }

  return next;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function enterAsLearner(state: AppState, name: string): AppState {
  const clean = name.trim().slice(0, 40) || "Learner";
  if (state.profile) {
    // A profile created by "Continue as Educator" has never done learner onboarding.
    const onboarded = state.profile.onboarded && state.profile.pythonLevel !== null;
    return { ...state, profile: { ...state.profile, name: clean, role: "learner", onboarded } };
  }
  return {
    ...state,
    profile: {
      name: clean,
      role: "learner",
      pythonLevel: null,
      language: "en",
      onboarded: false,
      createdAt: Date.now(),
    },
  };
}

export function enterAsEducator(state: AppState): AppState {
  if (state.profile) return { ...state, profile: { ...state.profile, role: "educator" } };
  return {
    ...state,
    profile: {
      name: "Educator",
      role: "educator",
      pythonLevel: null,
      language: "en",
      onboarded: true,
      createdAt: Date.now(),
    },
  };
}

export function completeOnboarding(
  state: AppState,
  pythonLevel: PythonLevel,
  language: Lang
): AppState {
  if (!state.profile) return state;
  return { ...state, profile: { ...state.profile, pythonLevel, language, onboarded: true } };
}

export function setLanguage(state: AppState, language: Lang): AppState {
  if (!state.profile) return state;
  return { ...state, profile: { ...state.profile, language } };
}

export function setThreshold(state: AppState, masteryThreshold: number): AppState {
  const clamped = Math.max(50, Math.min(100, Math.round(masteryThreshold)));
  return { ...state, settings: { ...state.settings, masteryThreshold: clamped } };
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export function openLesson(state: AppState, topic: TopicId): AppState {
  const current = state.lessons[topic] ?? { opens: 0, step: 0, completed: false };
  let next: AppState = {
    ...state,
    lessons: { ...state.lessons, [topic]: { ...current, opens: current.opens + 1 } },
  };
  next = track(next, "lessonOpened", { topic });
  // Coming back to a lesson you already finished counts as a revisit.
  if (current.completed) next = track(next, "topicRevisited", { topic });
  return next;
}

export function setLessonStep(state: AppState, topic: TopicId, step: number): AppState {
  const current = state.lessons[topic] ?? { opens: 1, step: 0, completed: false };
  return { ...state, lessons: { ...state.lessons, [topic]: { ...current, step } } };
}

export function completeLesson(state: AppState, topic: TopicId): AppState {
  const current = state.lessons[topic] ?? { opens: 1, step: 0, completed: false };
  if (current.completed) return state;
  const next: AppState = {
    ...state,
    lessons: { ...state.lessons, [topic]: { ...current, completed: true } },
  };
  return track(next, "lessonCompleted", { topic });
}

// ---------------------------------------------------------------------------
// Experiments (predict → run)
// ---------------------------------------------------------------------------

export interface ExperimentInput {
  source: "lab" | "practice" | "lesson";
  topic: TopicId;
  circuit: string;
  /** Comma-separated gate types used, e.g. "H,M". */
  gates: string;
  prediction: string;
  actual: string;
  correct: boolean;
  steps: L[];
  summary: L;
  challengeId?: string;
}

/** Called when a circuit has been run after a prediction. */
export function recordExperiment(state: AppState, input: ExperimentInput): AppState {
  const at = Date.now();
  let next: AppState = {
    ...state,
    predictions: [
      ...state.predictions,
      {
        id: newId("pr"),
        at,
        source: input.source,
        topic: input.topic,
        circuit: input.circuit,
        prediction: input.prediction,
        actual: input.actual,
        correct: input.correct,
        challengeId: input.challengeId,
      },
    ].slice(-300),
    lastExperiment: {
      at,
      source: input.source,
      topic: input.topic,
      circuit: input.circuit,
      prediction: input.prediction,
      actual: input.actual,
      correct: input.correct,
      steps: input.steps,
      summary: input.summary,
    },
  };

  if (input.challengeId) {
    const previous = next.practice[input.challengeId];
    const attempts = (previous?.attempts ?? 0) + 1;
    next = {
      ...next,
      practice: {
        ...next.practice,
        [input.challengeId]: {
          attempts,
          correctAttempts: (previous?.correctAttempts ?? 0) + (input.correct ? 1 : 0),
          solved: (previous?.solved ?? false) || input.correct,
          firstTry: previous ? previous.firstTry : input.correct,
          lastAt: at,
        },
      },
    };
  }

  next = track(next, "circuitExecuted", {
    topic: input.topic,
    detail: input.circuit,
    meta: { gates: input.gates, source: input.source },
  });
  next = track(next, input.correct ? "predictionCorrect" : "predictionWrong", {
    topic: input.topic,
    detail: input.circuit,
  });
  return next;
}

// ---------------------------------------------------------------------------
// Mastery checks
// ---------------------------------------------------------------------------

export function recordAssessment(
  state: AppState,
  topic: TopicId,
  answers: AssessmentAnswer[]
): AppState {
  const score = answers.filter((a) => a.correct).length;
  const next: AppState = {
    ...state,
    assessments: [
      ...state.assessments,
      { id: newId("as"), at: Date.now(), topic, score, total: answers.length, answers },
    ].slice(-100),
  };
  return track(next, "quizCompleted", {
    topic,
    detail: `${score}/${answers.length}`,
    meta: { score, total: answers.length },
  });
}
