/**
 * The mastery gate and the stage engine.
 *
 * Every concept is learned through the same ordered stages (see STAGES in
 * lib/types.ts). Each stage has a score from 0 to 100.
 *
 *   score below the threshold (90% by default)  →  the NEXT stage stays LOCKED
 *   score at or above the threshold             →  the next stage is UNLOCKED
 *   score of 100                                →  the stage is COMPLETED in full
 *
 * Nothing unlocks automatically, and a locked stage cannot be scored: the
 * state-changing functions in lib/actions.ts refuse to write to a locked stage,
 * so the gate cannot be bypassed from the UI.
 */

import { emptyConceptProgress, type AppState, type ConceptProgress } from "./storage";
import { STAGE_IDS, stageMeta, type L, type StageId, type TopicId } from "./types";

export type GateStatus = "LOCKED" | "UNLOCKED" | "COMPLETED";

/**
 * The gate itself. Given a stage's score, is what comes after it open?
 *   89 → LOCKED · 90 → UNLOCKED · 95 → UNLOCKED · 100 → COMPLETED   (threshold 90)
 */
export function gateStatus(score: number, threshold: number): GateStatus {
  if (score >= 100) return "COMPLETED";
  return score >= threshold ? "UNLOCKED" : "LOCKED";
}

/** True when a score is high enough to open the next stage. */
export function passes(score: number, threshold: number): boolean {
  return gateStatus(score, threshold) !== "LOCKED";
}

/** How a stage is shown in the journey. Each state also has its own icon and word in the UI. */
export type StageState = "locked" | "active" | "in-progress" | "completed";

/** The learner's progress in a concept, or a blank record if they have not started it. */
export function progressOf(state: AppState, topic: TopicId): ConceptProgress {
  return state.concepts[topic] ?? emptyConceptProgress(0);
}

export function stageScore(progress: ConceptProgress, stage: StageId): number {
  return Math.max(0, Math.min(100, Math.round(progress.scores[stage] ?? 0)));
}

/** A stage is open when it is the first one, or the stage before it has passed the gate. */
export function isStageUnlocked(progress: ConceptProgress, stage: StageId, threshold: number): boolean {
  const index = STAGE_IDS.indexOf(stage);
  if (index <= 0) return true;
  // Every earlier stage must have passed, not just the one directly before.
  for (let i = 0; i < index; i++) {
    if (!passes(stageScore(progress, STAGE_IDS[i]), threshold)) return false;
  }
  return true;
}

export function stageState(progress: ConceptProgress, stage: StageId, threshold: number): StageState {
  if (!isStageUnlocked(progress, stage, threshold)) return "locked";
  const score = stageScore(progress, stage);
  if (passes(score, threshold)) return "completed";
  return score > 0 || (progress.attempts[stage] ?? 0) > 0 ? "in-progress" : "active";
}

/** The first stage that has not passed the gate yet. Null when every stage has. */
export function currentStage(progress: ConceptProgress, threshold: number): StageId | null {
  for (const stage of STAGE_IDS) {
    if (!passes(stageScore(progress, stage), threshold)) return stage;
  }
  return null;
}

export function completedStageCount(progress: ConceptProgress, threshold: number): number {
  let count = 0;
  for (const stage of STAGE_IDS) {
    if (!passes(stageScore(progress, stage), threshold)) break;
    count += 1;
  }
  return count;
}

/** Share of the journey that is complete, in %. */
export function conceptCompletion(progress: ConceptProgress, threshold: number): number {
  return Math.round((completedStageCount(progress, threshold) / STAGE_IDS.length) * 100);
}

export function allStagesPassed(progress: ConceptProgress, threshold: number): boolean {
  return currentStage(progress, threshold) === null;
}

/**
 * How much each stage counts toward a concept's mastery percentage.
 * Stages where the learner has to PERFORM (explain, assess, challenge) count most.
 * The weights add up to 100 and are shown to the learner for transparency.
 */
export const STAGE_WEIGHTS: Record<StageId, number> = {
  discover: 2,
  learn: 8,
  watch: 6,
  interact: 6,
  experiment: 8,
  ask: 4,
  predict: 6,
  run: 6,
  observe: 8,
  explain: 14,
  assess: 20,
  review: 4,
  challenge: 8,
};

/** Concept mastery, 0–100: the weighted average of the stage scores. */
export function conceptMasteryScore(progress: ConceptProgress): number {
  let total = 0;
  for (const stage of STAGE_IDS) {
    total += (stageScore(progress, stage) / 100) * STAGE_WEIGHTS[stage];
  }
  return Math.round(total);
}

/** Why a stage is locked — always shown as text, never as colour alone. */
export function lockMessage(stage: StageId, threshold: number): L {
  const index = STAGE_IDS.indexOf(stage);
  const previous = stageMeta(STAGE_IDS[Math.max(0, index - 1)]).label.toUpperCase();
  return {
    en: `Complete ${previous} with at least ${threshold}% mastery to unlock this stage.`,
    hi: `Yeh stage unlock karne ke liye ${previous} ko kam se kam ${threshold}% mastery ke saath complete karo.`,
  };
}

/** Total time spent in a concept, in milliseconds. */
export function conceptTime(progress: ConceptProgress): number {
  return Object.values(progress.timeMs).reduce((sum, ms) => sum + (ms ?? 0), 0);
}

/**
 * Write a stage score. Returns the progress unchanged when the stage is locked —
 * this is what makes the gate impossible to bypass.
 * Scores only ever go up: a later weak attempt never erases earlier work.
 */
export function withStageScore(
  progress: ConceptProgress,
  stage: StageId,
  score: number,
  threshold: number,
  now: number = Date.now()
): ConceptProgress {
  if (!isStageUnlocked(progress, stage, threshold)) return progress;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const best = Math.max(stageScore(progress, stage), clamped);
  return {
    ...progress,
    startedAt: progress.startedAt || now,
    updatedAt: now,
    scores: { ...progress.scores, [stage]: best },
  };
}
