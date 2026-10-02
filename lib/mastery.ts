/**
 * Mastery and unlocking, at the level of whole concepts.
 *
 * A concept is MASTERED — and the next concept unlocks — only when every one
 * of its learning stages has reached the mastery threshold (90% by default).
 * The stage-by-stage rules live in lib/stages.ts; this file answers the
 * concept-level questions: which concept is open, which one is current, how
 * far along is the learner.
 *
 * Nothing is ever permanently blocked: every stage can be retried, and a
 * concept that has been mastered is never taken away again.
 */

import { challengesFor } from "@/data/challenges";
import { INTERACTIVE_TOPICS, ROADMAP } from "@/data/topics";
import {
  allStagesPassed,
  completedStageCount,
  conceptCompletion,
  conceptMasteryScore,
  currentStage,
  isStageUnlocked,
  passes,
  progressOf,
  stageScore,
} from "./stages";
import type { AppState } from "./storage";
import { STAGE_IDS, type StageId, type TopicId } from "./types";

export type TopicStatus = "MASTERED" | "IN PROGRESS" | "AVAILABLE" | "LOCKED";

export interface TopicMastery {
  topic: TopicId;
  /** The stage the learner is on, or null once every stage has passed. */
  stage: StageId | null;
  /** Score in that stage, 0–100. */
  stageScore: number;
  completedStages: number;
  totalStages: number;
  /** Share of stages complete, in %. */
  completion: number;
  /** 0–100: the weighted average of the stage scores. */
  mastery: number;
  /** The Learn stage has passed (or, for Python, the lesson is finished). */
  lessonCompleted: boolean;
  /** Mastery-check score in %, or null if not taken. */
  bestScore: number | null;
  lastScore: number | null;
  attempts: number;
  assessmentPassed: boolean;
  challengesSolved: number;
  challengesTotal: number;
  /** Every stage has reached the threshold. */
  mastered: boolean;
}

/** True when the most recent lab run ended in an error that has not been fixed yet. */
export function hasUnresolvedError(state: AppState): boolean {
  for (let i = state.events.length - 1; i >= 0; i--) {
    const type = state.events[i].type;
    if (type === "circuitExecuted") return false;
    if (type === "executionError") return true;
  }
  return false;
}

/** Python Foundations is an optional warm-up: one lesson and one short check. */
function pythonMastery(state: AppState): TopicMastery {
  const threshold = state.settings.masteryThreshold;
  const lessonCompleted = state.lessons.python?.completed ?? false;
  const attempts = state.assessments.filter((a) => a.topic === "python");
  const scores = attempts.map((a) => Math.round((a.score / a.total) * 100));
  const bestScore = scores.length ? Math.max(...scores) : null;
  const lastScore = scores.length ? scores[scores.length - 1] : null;
  const assessmentPassed = bestScore !== null && passes(bestScore, threshold);
  return {
    topic: "python",
    stage: null,
    stageScore: 0,
    completedStages: (lessonCompleted ? 1 : 0) + (assessmentPassed ? 1 : 0),
    totalStages: 2,
    completion: ((lessonCompleted ? 1 : 0) + (assessmentPassed ? 1 : 0)) * 50,
    mastery: Math.round((bestScore ?? 0) * 0.6 + (lessonCompleted ? 40 : 0)),
    lessonCompleted,
    bestScore,
    lastScore,
    attempts: attempts.length,
    assessmentPassed,
    challengesSolved: 0,
    challengesTotal: 0,
    mastered: assessmentPassed,
  };
}

export function topicMastery(state: AppState, topic: TopicId): TopicMastery {
  if (topic === "python") return pythonMastery(state);

  const threshold = state.settings.masteryThreshold;
  const progress = progressOf(state, topic);
  const stage = currentStage(progress, threshold);
  const challenges = challengesFor(topic);
  const attempts = state.assessments.filter((a) => a.topic === topic);
  const taken = progress.assessAttempts > 0 || Object.keys(progress.assess).length > 0;
  const assessNow = stageScore(progress, "assess");
  const lastAttempt = attempts[attempts.length - 1];

  return {
    topic,
    stage,
    stageScore: stage ? stageScore(progress, stage) : 100,
    completedStages: completedStageCount(progress, threshold),
    totalStages: STAGE_IDS.length,
    completion: conceptCompletion(progress, threshold),
    mastery: conceptMasteryScore(progress),
    lessonCompleted: passes(stageScore(progress, "learn"), threshold),
    bestScore: taken ? assessNow : null,
    lastScore: lastAttempt ? Math.round((lastAttempt.score / lastAttempt.total) * 100) : taken ? assessNow : null,
    attempts: Math.max(progress.assessAttempts, attempts.length),
    assessmentPassed: passes(assessNow, threshold),
    challengesSolved: challenges.filter((c) => state.practice[c.id]?.solved).length,
    challengesTotal: challenges.length,
    mastered: !!progress.masteredAt || allStagesPassed(progress, threshold),
  };
}

/** A mastered concept stays mastered, even if the threshold is raised later. */
function isSettled(state: AppState, topic: TopicId): boolean {
  if (topic === "python") return pythonMastery(state).mastered;
  const progress = state.concepts[topic];
  if (!progress) return false;
  return !!progress.masteredAt || allStagesPassed(progress, state.settings.masteryThreshold);
}

/** Is this concept open to the learner? The first one always is. */
export function isConceptUnlocked(state: AppState, topic: TopicId): boolean {
  if (topic === "python") return true;
  const index = INTERACTIVE_TOPICS.indexOf(topic);
  if (index === -1) return false; // planned modules beyond this MVP
  return index === 0 || isSettled(state, INTERACTIVE_TOPICS[index - 1]);
}

export function topicStatus(state: AppState, topic: TopicId): TopicStatus {
  if (topic === "python") {
    if (isSettled(state, topic)) return "MASTERED";
    const active = !!state.lessons.python || state.assessments.some((a) => a.topic === "python");
    return active ? "IN PROGRESS" : "AVAILABLE";
  }
  if (!INTERACTIVE_TOPICS.includes(topic)) return "LOCKED";
  if (isSettled(state, topic)) return "MASTERED";
  if (!isConceptUnlocked(state, topic)) return "LOCKED";
  const progress = state.concepts[topic];
  const started = !!progress && STAGE_IDS.some((stage) => (progress.scores[stage] ?? 0) > 0);
  return started ? "IN PROGRESS" : "AVAILABLE";
}

/**
 * Can the learner open this stage of this concept right now?
 * Used by every page that offers a stage, so a locked stage cannot be reached
 * by typing an address or following an old link.
 */
export function canOpenStage(state: AppState, topic: TopicId, stage: StageId): boolean {
  if (!isConceptUnlocked(state, topic)) return false;
  return isStageUnlocked(progressOf(state, topic), stage, state.settings.masteryThreshold);
}

/** The concept the learner should be working on right now. */
export function currentTopic(state: AppState): TopicId {
  for (const topic of INTERACTIVE_TOPICS) {
    if (topicStatus(state, topic) !== "MASTERED") return topic;
  }
  return INTERACTIVE_TOPICS[INTERACTIVE_TOPICS.length - 1];
}

/** The stage the learner is on in a concept (null when the concept is complete). */
export function currentStageOf(state: AppState, topic: TopicId): StageId | null {
  if (topic === "python") return null;
  return currentStage(progressOf(state, topic), state.settings.masteryThreshold);
}

/** True once every interactive module in the MVP is mastered. */
export function allMastered(state: AppState): boolean {
  return INTERACTIVE_TOPICS.every((t) => topicStatus(state, t) === "MASTERED");
}

/** The topic that unlocks after this one, if it exists on the roadmap. */
export function nextTopic(topic: TopicId): TopicId | null {
  const index = ROADMAP.findIndex((t) => t.id === topic);
  const next = ROADMAP[index + 1];
  return next ? next.id : null;
}

/** Average mastery across the interactive roadmap topics. */
export function overallMastery(state: AppState): number {
  const values = INTERACTIVE_TOPICS.map((t) => topicMastery(state, t).mastery);
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/** Share of the interactive roadmap that is mastered, in %. */
export function roadmapProgress(state: AppState): number {
  const done = INTERACTIVE_TOPICS.filter((t) => topicStatus(state, t) === "MASTERED").length;
  return Math.round((done / INTERACTIVE_TOPICS.length) * 100);
}

/** Overall progress through every stage of every interactive concept, in %. */
export function overallProgress(state: AppState): number {
  const threshold = state.settings.masteryThreshold;
  const done = INTERACTIVE_TOPICS.reduce(
    (sum, topic) => sum + completedStageCount(progressOf(state, topic), threshold),
    0
  );
  return Math.round((done / (INTERACTIVE_TOPICS.length * STAGE_IDS.length)) * 100);
}
