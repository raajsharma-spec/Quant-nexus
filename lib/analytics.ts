/**
 * Local learning telemetry.
 *
 * Every meaningful action is recorded as an event in localStorage.
 * Nothing leaves the device. The dashboard, progress page, tutor and
 * recommendation engine all read from these records.
 */

import { CHALLENGES } from "@/data/challenges";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { overallMastery, topicMastery, topicStatus } from "./mastery";
import {
  dayKey,
  newId,
  type AppState,
  type EventType,
  type TelemetryEvent,
} from "./storage";
import type { Lang, TopicId } from "./types";

/** Keep the log bounded so localStorage never fills up. */
const MAX_EVENTS = 600;

export function createEvent(
  type: EventType,
  data: Partial<Pick<TelemetryEvent, "topic" | "detail" | "meta" | "seeded" | "at">> = {}
): TelemetryEvent {
  return { id: newId("ev"), type, at: data.at ?? Date.now(), ...data };
}

/** Add an event to the log and mark today as an active day. */
export function appendEvent(state: AppState, event: TelemetryEvent): AppState {
  const events = [...state.events, event].slice(-MAX_EVENTS);
  const today = dayKey(event.at);
  const activeDays = state.activeDays.includes(today)
    ? state.activeDays
    : [...state.activeDays, today].slice(-60);
  return { ...state, events, activeDays };
}

// ---------------------------------------------------------------------------
// XP, level, streak — all derived from real records, never stored separately
// ---------------------------------------------------------------------------

export const XP_RULES = {
  lessonCompleted: 20,
  prediction: 2,
  correctPrediction: 8,
  challengeSolved: 10,
  masteryCheck: 25, // scaled by best score
  topicMastered: 50,
  achievement: 10,
} as const;

export const XP_PER_LEVEL = 250;

export function computeXp(state: AppState): number {
  const lessons = Object.values(state.lessons).filter((l) => l?.completed).length;
  const predictions = state.predictions.length;
  const correct = state.predictions.filter((p) => p.correct).length;
  const solved = Object.values(state.practice).filter((p) => p.solved).length;
  const topics: TopicId[] = ["python", ...INTERACTIVE_TOPICS];
  let checks = 0;
  let mastered = 0;
  for (const topic of topics) {
    const m = topicMastery(state, topic);
    if (m.bestScore !== null) checks += (m.bestScore / 100) * XP_RULES.masteryCheck;
    if (topic !== "python" && topicStatus(state, topic) === "MASTERED") mastered += 1;
  }
  return Math.round(
    lessons * XP_RULES.lessonCompleted +
      predictions * XP_RULES.prediction +
      correct * XP_RULES.correctPrediction +
      solved * XP_RULES.challengeSolved +
      checks +
      mastered * XP_RULES.topicMastered +
      Object.keys(state.achievements).length * XP_RULES.achievement
  );
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/** Consecutive active days, counting back from today (or yesterday). */
export function computeStreak(state: AppState, now: number = Date.now()): number {
  const days = new Set(state.activeDays);
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.getTime()))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Learner insights
// ---------------------------------------------------------------------------

export interface Accuracy {
  total: number;
  correct: number;
  /** Percentage, or null when there is no data yet. */
  accuracy: number | null;
}

export interface WeakConcept {
  concept: string;
  topic: TopicId;
  reason: "mastery-check" | "predictions";
  correct: number;
  total: number;
}

export interface LearnerInsights {
  conceptMastery: number;
  prediction: Accuracy;
  predictionByTopic: Partial<Record<TopicId, Accuracy>>;
  practice: Accuracy;
  challengesSolved: number;
  challengesTotal: number;
  attempts: number;
  hintsRequested: number;
  topicsRevisited: number;
  lessonsCompleted: number;
  circuitsRun: number;
  executionErrors: number;
  /** Errors among the last five lab runs. */
  recentErrors: number;
  weakConcepts: WeakConcept[];
  xp: number;
  level: number;
  streak: number;
}

const toAccuracy = (correct: number, total: number): Accuracy => ({
  total,
  correct,
  accuracy: total === 0 ? null : Math.round((correct / total) * 100),
});

const count = (state: AppState, type: EventType) =>
  state.events.filter((e) => e.type === type).length;

export function computeInsights(state: AppState): LearnerInsights {
  // Prediction accuracy, overall and per topic.
  const predictionByTopic: Partial<Record<TopicId, Accuracy>> = {};
  const topics = new Set(state.predictions.map((p) => p.topic));
  topics.forEach((topic) => {
    const list = state.predictions.filter((p) => p.topic === topic);
    predictionByTopic[topic] = toAccuracy(list.filter((p) => p.correct).length, list.length);
  });
  const prediction = toAccuracy(
    state.predictions.filter((p) => p.correct).length,
    state.predictions.length
  );

  // Practice accuracy = correct attempts / all attempts across challenges.
  const records = Object.values(state.practice);
  const attempts = records.reduce((sum, r) => sum + r.attempts, 0);
  const correctAttempts = records.reduce((sum, r) => sum + r.correctAttempts, 0);

  // Weak concepts from the latest mastery check of each topic.
  const weakConcepts: WeakConcept[] = [];
  const latestByTopic = new Map<TopicId, (typeof state.assessments)[number]>();
  state.assessments.forEach((a) => latestByTopic.set(a.topic, a));
  latestByTopic.forEach((attempt, topic) => {
    const byConcept = new Map<string, { correct: number; total: number }>();
    attempt.answers.forEach((answer) => {
      const entry = byConcept.get(answer.concept) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (answer.correct) entry.correct += 1;
      byConcept.set(answer.concept, entry);
    });
    byConcept.forEach((entry, concept) => {
      if (entry.correct / entry.total < 0.7) {
        weakConcepts.push({ concept, topic, reason: "mastery-check", ...entry });
      }
    });
  });
  // …and from prediction accuracy below 60% (needs at least 3 predictions).
  (Object.entries(predictionByTopic) as Array<[TopicId, Accuracy]>).forEach(([topic, acc]) => {
    if (acc.total >= 3 && acc.accuracy !== null && acc.accuracy < 60) {
      weakConcepts.push({
        concept: `Predicting ${topicTitle(topic)}`,
        topic,
        reason: "predictions",
        correct: acc.correct,
        total: acc.total,
      });
    }
  });

  const runs = state.events.filter(
    (e) => e.type === "circuitExecuted" || e.type === "executionError"
  );
  const recentErrors = runs.slice(-5).filter((e) => e.type === "executionError").length;

  const xp = computeXp(state);

  return {
    conceptMastery: overallMastery(state),
    prediction,
    predictionByTopic,
    practice: toAccuracy(correctAttempts, attempts),
    challengesSolved: records.filter((r) => r.solved).length,
    challengesTotal: CHALLENGES.length,
    attempts,
    hintsRequested: count(state, "hintRequested"),
    topicsRevisited: count(state, "topicRevisited"),
    lessonsCompleted: Object.values(state.lessons).filter((l) => l?.completed).length,
    circuitsRun: count(state, "circuitExecuted"),
    executionErrors: count(state, "executionError"),
    recentErrors,
    weakConcepts,
    xp,
    level: levelFromXp(xp),
    streak: computeStreak(state),
  };
}

// ---------------------------------------------------------------------------
// Recent activity feed
// ---------------------------------------------------------------------------

export interface ActivityItem {
  id: string;
  at: number;
  text: string;
  positive: boolean;
  seeded: boolean;
}

/** Turn telemetry into short, readable lines. Low-level events are left out. */
export function recentActivity(state: AppState, lang: Lang, limit = 6): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (let i = state.events.length - 1; i >= 0 && items.length < limit; i--) {
    const e = state.events[i];
    const title = e.topic ? topicTitle(e.topic) : "";
    let text: string | null = null;
    let positive = true;
    switch (e.type) {
      case "lessonCompleted":
        text = lang === "hi" ? `${title} lesson complete kiya` : `Completed ${title}`;
        break;
      case "predictionCorrect":
        text =
          lang === "hi"
            ? `${e.detail} ka outcome sahi predict kiya`
            : `Predicted the outcome of ${e.detail}`;
        break;
      case "predictionWrong":
        text =
          lang === "hi"
            ? `${e.detail} ki prediction miss hui — aur reason samjha`
            : `Missed a prediction on ${e.detail} — and saw why`;
        positive = false;
        break;
      case "circuitExecuted":
        text = lang === "hi" ? `Circuit run kiya: ${e.detail}` : `Ran a circuit: ${e.detail}`;
        break;
      case "quizCompleted":
        text =
          lang === "hi"
            ? `${title} mastery check mein ${e.detail} score kiya`
            : `Scored ${e.detail} in the ${title} mastery check`;
        break;
      case "topicUnlocked":
        text = lang === "hi" ? `${e.detail} unlock kiya` : `Unlocked ${e.detail}`;
        break;
      case "achievementEarned":
        text = lang === "hi" ? `Achievement mila: ${e.detail}` : `Earned the achievement ${e.detail}`;
        break;
      default:
        text = null;
    }
    if (text) items.push({ id: e.id, at: e.at, text, positive, seeded: !!e.seeded });
  }
  return items;
}

/** "5 min ago", "yesterday" … */
export function timeAgo(at: number, now: number = Date.now()): string {
  const minutes = Math.round((now - at) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
