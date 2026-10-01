/**
 * Mastery and unlocking.
 *
 * A topic is mastered — and the next one unlocks — when ALL of these hold:
 *   1. best mastery-check score  >=  the mastery threshold (default 80%)
 *   2. the topic's required practice challenges are solved
 *   3. there is no unresolved circuit error (the last lab run did not fail)
 *
 * Nothing is ever permanently blocked: the learner can always review,
 * practise again and retry the mastery check.
 */

import { requiredChallenges } from "@/data/challenges";
import { INTERACTIVE_TOPICS, ROADMAP } from "@/data/topics";
import type { AppState } from "./storage";
import type { LoopStep, TopicId } from "./types";

export type TopicStatus = "MASTERED" | "IN PROGRESS" | "AVAILABLE" | "LOCKED";

export interface TopicMastery {
  topic: TopicId;
  lessonCompleted: boolean;
  practiceSolved: number;
  practiceTotal: number;
  practiceDone: boolean;
  /** Best mastery-check score in %, or null if never taken. */
  bestScore: number | null;
  lastScore: number | null;
  attempts: number;
  assessmentPassed: boolean;
  /** 0–100 blend shown as the topic's mastery bar. */
  mastery: number;
  /** All three unlock conditions are met. */
  mastered: boolean;
}

/** How the mastery percentage is weighted. Shown to the learner for transparency. */
export const MASTERY_WEIGHTS = { assessment: 60, practice: 25, lesson: 15 } as const;

/** True when the most recent lab run ended in an error that has not been fixed yet. */
export function hasUnresolvedError(state: AppState): boolean {
  for (let i = state.events.length - 1; i >= 0; i--) {
    const type = state.events[i].type;
    if (type === "circuitExecuted") return false;
    if (type === "executionError") return true;
  }
  return false;
}

export function topicMastery(state: AppState, topic: TopicId): TopicMastery {
  const threshold = state.settings.masteryThreshold;
  const lessonCompleted = state.lessons[topic]?.completed ?? false;

  const required = requiredChallenges(topic);
  const practiceSolved = required.filter((c) => state.practice[c.id]?.solved).length;
  const practiceTotal = required.length;
  const practiceDone = practiceSolved === practiceTotal;

  const attempts = state.assessments.filter((a) => a.topic === topic);
  const scores = attempts.map((a) => Math.round((a.score / a.total) * 100));
  const bestScore = scores.length ? Math.max(...scores) : null;
  const lastScore = scores.length ? scores[scores.length - 1] : null;
  const assessmentPassed = bestScore !== null && bestScore >= threshold;

  const practiceShare = practiceTotal === 0 ? 1 : practiceSolved / practiceTotal;
  const mastery = Math.round(
    ((bestScore ?? 0) / 100) * MASTERY_WEIGHTS.assessment +
      practiceShare * MASTERY_WEIGHTS.practice +
      (lessonCompleted ? MASTERY_WEIGHTS.lesson : 0)
  );

  const mastered = assessmentPassed && practiceDone && !hasUnresolvedError(state);

  return {
    topic,
    lessonCompleted,
    practiceSolved,
    practiceTotal,
    practiceDone,
    bestScore,
    lastScore,
    attempts: attempts.length,
    assessmentPassed,
    mastery,
    mastered,
  };
}

/** Has the learner done anything in this topic yet? */
function hasActivity(state: AppState, topic: TopicId): boolean {
  if (state.lessons[topic]) return true;
  if (state.assessments.some((a) => a.topic === topic)) return true;
  return requiredChallenges(topic).some((c) => state.practice[c.id]);
}

/**
 * A topic stays mastered once its mastery check and practice are done, even if
 * a later lab experiment fails — we never take a topic away from the learner.
 */
function isSettled(state: AppState, topic: TopicId): boolean {
  const m = topicMastery(state, topic);
  if (m.mastered) return true;
  return m.assessmentPassed && m.practiceDone && state.events.some(
    (e) => e.type === "topicUnlocked" && e.meta?.from === topic
  );
}

export function topicStatus(state: AppState, topic: TopicId): TopicStatus {
  if (topic === "python") {
    if (isSettled(state, topic)) return "MASTERED";
    return hasActivity(state, topic) ? "IN PROGRESS" : "AVAILABLE";
  }
  const index = INTERACTIVE_TOPICS.indexOf(topic);
  if (index === -1) return "LOCKED"; // planned modules beyond this MVP
  if (isSettled(state, topic)) return "MASTERED";
  const unlocked = index === 0 || isSettled(state, INTERACTIVE_TOPICS[index - 1]);
  if (!unlocked) return "LOCKED";
  return hasActivity(state, topic) ? "IN PROGRESS" : "AVAILABLE";
}

/** The topic the learner should be working on right now. */
export function currentTopic(state: AppState): TopicId {
  for (const topic of INTERACTIVE_TOPICS) {
    if (topicStatus(state, topic) !== "MASTERED") return topic;
  }
  return INTERACTIVE_TOPICS[INTERACTIVE_TOPICS.length - 1];
}

/** True once every interactive module in the MVP is mastered. */
export function allMastered(state: AppState): boolean {
  return INTERACTIVE_TOPICS.every((t) => topicStatus(state, t) === "MASTERED");
}

/** The topic that unlocks after this one, if it exists in the MVP. */
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

/**
 * Where the learner is inside the learning loop for their current topic.
 * Run, Observe and Explain happen inside the lab and practice screens;
 * on the dashboard they collapse into Practice.
 */
export function loopPosition(state: AppState): LoopStep {
  const topic = currentTopic(state);
  const m = topicMastery(state, topic);
  if (allMastered(state)) return "Unlock";
  if (!m.lessonCompleted) return "Learn";
  const predicted = state.predictions.some((p) => p.topic === topic);
  if (!predicted) return "Predict";
  if (!m.practiceDone) return "Practice";
  if (!m.assessmentPassed) return "Assess";
  return "Unlock";
}
