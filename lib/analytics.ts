/**
 * Local learning telemetry.
 *
 * Every meaningful action is recorded as an event in localStorage.
 * Nothing leaves the device. The dashboard, progress page, tutor and
 * recommendation engine all read from these records.
 */

import { CHALLENGES } from "@/data/challenges";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { assessmentSlots, DEMONSTRATED, slotLabel } from "./adaptiveAssessment";
import { appendEvent, createEvent } from "./events";
import { inferLevel, type LevelEstimate } from "./learnerLevel";
import { overallMastery, overallProgress, topicMastery, topicStatus } from "./mastery";
import { activeMisconceptions } from "./misconceptions";
import { completedStageCount, conceptTime, progressOf } from "./stages";
import { dayKey, type AppState, type EventType } from "./storage";
import { STAGE_IDS, type Lang, type TopicId } from "./types";

export { appendEvent, createEvent };

// ---------------------------------------------------------------------------
// XP, level, streak — all derived from real records, never stored separately
// ---------------------------------------------------------------------------

export const XP_RULES = {
  stageCompleted: 5,
  lessonCompleted: 20, // Python Foundations
  prediction: 2,
  correctPrediction: 8,
  challengeSolved: 10,
  masteryCheck: 25, // scaled by score
  topicMastered: 50,
  achievement: 10,
} as const;

export const XP_PER_LEVEL = 250;

export function computeXp(state: AppState): number {
  const lessons = state.lessons.python?.completed ? 1 : 0;
  const threshold = state.settings.masteryThreshold;
  const stages = INTERACTIVE_TOPICS.reduce(
    (sum, topic) => sum + completedStageCount(progressOf(state, topic), threshold),
    0
  );
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
    stages * XP_RULES.stageCompleted +
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

/** Results in the mastery check of one concept, item by item. */
export interface AssessmentSummary {
  /** Items demonstrated right now. */
  demonstrated: number;
  /** Items right on the very first attempt. */
  firstTry: number;
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
  /** Share of all stages, across every concept, that are complete. */
  overallProgress: number;
  stagesCompleted: number;
  stagesTotal: number;
  conceptsMastered: number;
  /** Average score of the learner's explanations, or null when there are none. */
  explanationMastery: number | null;
  explanations: number;
  /** Share of mastery-check items answered right on the first attempt. */
  assessmentFirstTry: number | null;
  assessmentAttempts: number;
  misconceptionsOpen: number;
  misconceptionsResolved: number;
  tutorQuestions: number;
  /** Time spent inside concept stages, in minutes (measured while a stage is open). */
  minutesSpent: number;
  /** The learner's level, inferred from behaviour — never asked. */
  learner: LevelEstimate;
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

  // Weak concepts: mastery-check items that are not demonstrated yet.
  const weakConcepts: WeakConcept[] = [];
  let slotsFirstTry = 0;
  let slotsSeen = 0;
  for (const topic of INTERACTIVE_TOPICS) {
    const progress = state.concepts[topic];
    if (!progress) continue;
    for (const slot of assessmentSlots(topic)) {
      const record = progress.assess[slot];
      if (!record) continue;
      slotsSeen += 1;
      if (record.firstCredit >= DEMONSTRATED) slotsFirstTry += 1;
      if (record.credit < DEMONSTRATED) {
        weakConcepts.push({
          concept: slotLabel(topic, slot),
          topic,
          reason: "mastery-check",
          correct: Math.round(record.credit * 100) / 100,
          total: 1,
        });
      }
    }
  }
  // Python Foundations keeps its simple check: weak = missed in the latest attempt.
  const python = state.assessments.filter((a) => a.topic === "python").slice(-1)[0];
  python?.answers
    .filter((answer) => !answer.correct)
    .forEach((answer) =>
      weakConcepts.push({ concept: answer.concept, topic: "python", reason: "mastery-check", correct: 0, total: 1 })
    );
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
  const threshold = state.settings.masteryThreshold;
  const stagesCompleted = INTERACTIVE_TOPICS.reduce(
    (sum, topic) => sum + completedStageCount(progressOf(state, topic), threshold),
    0
  );
  const milliseconds = INTERACTIVE_TOPICS.reduce((sum, topic) => sum + conceptTime(progressOf(state, topic)), 0);
  const explanationScores = state.explanations.map((e) => e.score);
  const open = activeMisconceptions(state);
  const everDetected = new Set(state.misconceptions.map((m) => m.misconception));

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
    lessonsCompleted: INTERACTIVE_TOPICS.filter((t) => topicMastery(state, t).lessonCompleted).length,
    circuitsRun: count(state, "circuitExecuted"),
    executionErrors: count(state, "executionError"),
    recentErrors,
    weakConcepts,
    xp,
    level: levelFromXp(xp),
    streak: computeStreak(state),
    overallProgress: overallProgress(state),
    stagesCompleted,
    stagesTotal: INTERACTIVE_TOPICS.length * STAGE_IDS.length,
    conceptsMastered: INTERACTIVE_TOPICS.filter((t) => topicStatus(state, t) === "MASTERED").length,
    explanationMastery:
      explanationScores.length === 0
        ? null
        : Math.round(explanationScores.reduce((sum, v) => sum + v, 0) / explanationScores.length),
    explanations: explanationScores.length,
    assessmentFirstTry: slotsSeen === 0 ? null : Math.round((slotsFirstTry / slotsSeen) * 100),
    assessmentAttempts: state.assessments.length,
    misconceptionsOpen: open.length,
    misconceptionsResolved: everDetected.size - open.length,
    tutorQuestions: state.tutorLog.length,
    minutesSpent: Math.round(milliseconds / 60000),
    learner: inferLevel(state),
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
        // For quantum concepts the "stage completed" line already covers this.
        if (e.topic !== "python") break;
        text = lang === "hi" ? `${title} lesson complete kiya` : `Completed the ${title} lesson`;
        break;
      case "stageCompleted":
        text =
          lang === "hi"
            ? `${title}: ${e.detail} stage complete (${e.meta?.score ?? 100}%)`
            : `${title}: completed the ${e.detail} stage (${e.meta?.score ?? 100}%)`;
        break;
      case "conceptMastered":
        text = lang === "hi" ? `${title} master kiya` : `Mastered ${title}`;
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
      case "explanationSubmitted":
        text =
          lang === "hi"
            ? `${title}: apne words mein explain kiya (${e.detail})`
            : `${title}: explained it in your own words (${e.detail})`;
        break;
      case "quizCompleted":
        text =
          lang === "hi"
            ? `${title} mastery check mein ${e.detail} score kiya`
            : `Scored ${e.detail} in the ${title} mastery check`;
        break;
      case "misconceptionDetected":
        text =
          lang === "hi"
            ? `Possible misconception dikhi: ${e.detail}`
            : `Possible misconception spotted: ${e.detail}`;
        positive = false;
        break;
      case "misconceptionResolved":
        text = lang === "hi" ? `Misconception clear hui: ${e.detail}` : `Cleared a misconception: ${e.detail}`;
        break;
      case "challengeCompleted":
        text = lang === "hi" ? `Challenge solve kiya: ${e.detail}` : `Solved the challenge “${e.detail}”`;
        break;
      case "quickReview":
        text =
          lang === "hi"
            ? `${title} ka quick review ${e.meta?.correct ? "sahi" : "miss"} hua`
            : `Quick review of ${title}: ${e.meta?.correct ? "correct" : "missed"}`;
        positive = !!e.meta?.correct;
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
