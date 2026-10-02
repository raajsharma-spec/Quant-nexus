/**
 * The learner's level is INFERRED, never asked.
 *
 * There is no "what is your level?" questionnaire anywhere in Quantum Nexus.
 * Instead this file reads the learning state and estimates a level from:
 *   concepts mastered · prediction accuracy · first-attempt assessment results
 *   · explanation quality · misconceptions still open · hints and retries
 *
 * The level adapts as the learner works. It is used to choose the difficulty
 * of assessment questions and challenges, and how deep the tutor goes.
 * The rules are simple and visible — this is not a trained model.
 */

import { INTERACTIVE_TOPICS } from "@/data/topics";
import { activeMisconceptions } from "./misconceptions";
import type { AppState } from "./storage";
import { LEVEL_ORDER, type LearnerLevel } from "./types";

export interface LevelEstimate {
  level: LearnerLevel;
  /** 0–100 evidence score behind the level. */
  score: number;
  /** Plain-language reasons, shown to the learner. */
  evidence: string[];
  /** True until there is enough activity to say anything. */
  provisional: boolean;
}

export const LEVEL_LABEL: Record<LearnerLevel, string> = {
  BEGINNER: "Beginner",
  DEVELOPING: "Developing",
  PROFICIENT: "Proficient",
  ADVANCED: "Advanced",
};

const average = (values: number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

export function inferLevel(state: AppState): LevelEstimate {
  const evidence: string[] = [];
  let score = 0;

  // 1. Concepts mastered — the strongest signal (up to 48 points).
  const mastered = INTERACTIVE_TOPICS.filter((topic) => state.concepts[topic]?.masteredAt).length;
  score += mastered * 12;
  if (mastered > 0) evidence.push(`${mastered} concept${mastered === 1 ? "" : "s"} mastered`);

  // 2. Prediction accuracy, once there are a few predictions (up to 16).
  const predictions = state.predictions;
  if (predictions.length >= 3) {
    const accuracy = predictions.filter((p) => p.correct).length / predictions.length;
    score += accuracy * 16;
    evidence.push(`${Math.round(accuracy * 100)}% prediction accuracy over ${predictions.length} predictions`);
  }

  // 3. How mastery checks went on the FIRST attempt (up to 16).
  const firstCredits: number[] = [];
  for (const topic of INTERACTIVE_TOPICS) {
    const slots = Object.values(state.concepts[topic]?.assess ?? {});
    slots.forEach((slot) => firstCredits.push(slot.firstCredit));
  }
  const firstAttempt = average(firstCredits);
  if (firstAttempt !== null) {
    score += firstAttempt * 16;
    evidence.push(`${Math.round(firstAttempt * 100)}% on first attempts in mastery checks`);
  }

  // 4. Explanation quality (up to 12).
  const explanationAverage = average(state.explanations.map((e) => e.score));
  if (explanationAverage !== null) {
    score += (explanationAverage / 100) * 12;
    evidence.push(`${Math.round(explanationAverage)}% average explanation score`);
  }

  // 5. Challenges solved on the first try (up to 8).
  const records = Object.values(state.practice);
  if (records.length > 0) {
    const firstTry = records.filter((r) => r.firstTry).length / records.length;
    score += firstTry * 8;
  }

  // 6. Open misconceptions and heavy hint use pull the estimate down a little.
  const open = activeMisconceptions(state).length;
  if (open > 0) {
    score -= Math.min(12, open * 4);
    evidence.push(`${open} possible misconception${open === 1 ? "" : "s"} still open`);
  }
  const hints = state.events.filter((e) => e.type === "hintRequested").length;
  if (hints >= 4) {
    score -= Math.min(6, hints - 3);
    evidence.push(`${hints} hints used`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: LearnerLevel =
    score >= 70 ? "ADVANCED" : score >= 45 ? "PROFICIENT" : score >= 20 ? "DEVELOPING" : "BEGINNER";

  const provisional = predictions.length < 3 && mastered === 0 && firstCredits.length === 0;
  if (provisional) evidence.push("not much activity yet — starting gently");

  return { level, score, evidence, provisional };
}

/** 1–4: the question difficulty that suits a level. */
export function difficultyFor(level: LearnerLevel): 1 | 2 | 3 | 4 {
  return (LEVEL_ORDER.indexOf(level) + 1) as 1 | 2 | 3 | 4;
}
