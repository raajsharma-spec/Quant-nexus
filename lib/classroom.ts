/**
 * The classroom: how an instructor sees more than one learner.
 *
 * There is no server in this build, so learners and instructors exchange a
 * PROGRESS REPORT — a compact summary of a learner's saved learning state:
 *
 *   learner   : Progress → "Share with your instructor" → copy a code or download a file
 *   instructor: Instructor dashboard → "Add a learner report" → paste the code or open the file
 *
 * The report carries scores and counts, never the learner's written answers.
 * Imported reports are kept in the instructor's browser. A production build
 * would sync the same report shape through an API instead of by hand.
 */

import { MISCONCEPTIONS } from "@/data/misconceptions";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { computeInsights } from "./analytics";
import { activeMisconceptions, resolvedMisconceptions } from "./misconceptions";
import { passes, progressOf, stageScore } from "./stages";
import { LEVEL_ORDER, STAGE_IDS, stageMeta, type LearnerLevel, type StageId, type TopicId } from "./types";
import type { AppState } from "./storage";

export const REPORT_PREFIX = "QN1.";
const CLASS_KEY = "quantum-nexus:class:v1";
const MAX_REPORTS = 60;

export interface ConceptReport {
  /** Best score in each of the 13 stages, in stage order. */
  scores: number[];
  /** Attempts made in each stage, in stage order. */
  attempts: number[];
  mastered: boolean;
}

export interface LearnerReport {
  v: 1;
  id: string;
  name: string;
  /** When the report was made. */
  at: number;
  level: LearnerLevel;
  concepts: Partial<Record<TopicId, ConceptReport>>;
  prediction: { total: number; correct: number };
  practice: { total: number; correct: number };
  /** Average explanation score, or null when none were written. */
  explanationMastery: number | null;
  /** Share of mastery-check items right on the first attempt, or null. */
  firstTry: number | null;
  tutorQuestions: number;
  circuitsRun: number;
  minutes: number;
  weak: Array<{ topic: TopicId; concept: string }>;
  misconceptionsOpen: string[];
  misconceptionsResolved: string[];
  lastActiveAt: number;
  /** True for the hand-written sample cohort. Never set on a real report. */
  sample?: boolean;
}

// ---------------------------------------------------------------------------
// Building and exchanging a report
// ---------------------------------------------------------------------------

/** Summarise a learner's saved state. Written answers and tutor questions are NOT included. */
export function buildReport(state: AppState, now: number = Date.now()): LearnerReport {
  const insights = computeInsights(state);
  const concepts: LearnerReport["concepts"] = {};
  for (const topic of INTERACTIVE_TOPICS) {
    const progress = state.concepts[topic];
    if (!progress) continue;
    concepts[topic] = {
      scores: STAGE_IDS.map((stage) => stageScore(progress, stage)),
      attempts: STAGE_IDS.map((stage) => progress.attempts[stage] ?? 0),
      mastered: !!progress.masteredAt,
    };
  }
  const lastEvent = state.events[state.events.length - 1];
  return {
    v: 1,
    id: state.profile?.id ?? "unknown",
    name: state.profile?.name ?? "Learner",
    at: now,
    level: insights.learner.level,
    concepts,
    prediction: { total: insights.prediction.total, correct: insights.prediction.correct },
    practice: { total: insights.practice.total, correct: insights.practice.correct },
    explanationMastery: insights.explanationMastery,
    firstTry: insights.assessmentFirstTry,
    tutorQuestions: insights.tutorQuestions,
    circuitsRun: insights.circuitsRun,
    minutes: insights.minutesSpent,
    weak: insights.weakConcepts.slice(0, 6).map((weak) => ({ topic: weak.topic, concept: weak.concept })),
    misconceptionsOpen: activeMisconceptions(state).map((m) => m.info.id),
    misconceptionsResolved: resolvedMisconceptions(state).map((m) => m.info.id),
    lastActiveAt: lastEvent?.at ?? now,
  };
}

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (code: string): string => {
  const padded = code.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((code.length + 3) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

/** The report as a single line of text that can be pasted into a message. */
export function encodeReport(report: LearnerReport): string {
  return REPORT_PREFIX + toBase64Url(JSON.stringify(report));
}

const clamp = (value: unknown, min: number, max: number): number => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, Math.round(number)));
};
const text = (value: unknown, limit: number): string => (typeof value === "string" ? value.slice(0, limit) : "");
const percentOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? clamp(value, 0, 100) : null);
const counts = (value: unknown): { total: number; correct: number } => {
  const record = (value ?? {}) as Record<string, unknown>;
  const total = clamp(record.total, 0, 100000);
  return { total, correct: Math.min(total, clamp(record.correct, 0, 100000)) };
};

/**
 * Check something that claims to be a report and return a clean copy.
 * Everything is treated as untrusted: unknown fields are dropped, numbers are
 * clamped and text is cut to a safe length. Returns null if it is not a report.
 */
export function sanitizeReport(raw: unknown): LearnerReport | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.v !== 1) return null;
  const id = text(data.id, 80);
  const name = text(data.name, 40).trim();
  if (!id || !name) return null;

  const concepts: LearnerReport["concepts"] = {};
  const given = (data.concepts ?? {}) as Record<string, unknown>;
  for (const topic of INTERACTIVE_TOPICS) {
    const concept = given[topic] as Record<string, unknown> | undefined;
    if (!concept || !Array.isArray(concept.scores)) continue;
    const scores = STAGE_IDS.map((_, index) => clamp((concept.scores as unknown[])[index], 0, 100));
    const attempts = STAGE_IDS.map((_, index) =>
      clamp(Array.isArray(concept.attempts) ? (concept.attempts as unknown[])[index] : 0, 0, 999)
    );
    concepts[topic] = { scores, attempts, mastered: concept.mastered === true };
  }

  const known = new Set(MISCONCEPTIONS.map((m) => m.id as string));
  const ids = (value: unknown) =>
    Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === "string" && known.has(item)))) : [];
  const weak = Array.isArray(data.weak)
    ? data.weak
        .map((item) => item as Record<string, unknown>)
        .filter((item) => item && INTERACTIVE_TOPICS.includes(item.topic as TopicId) && typeof item.concept === "string")
        .slice(0, 8)
        .map((item) => ({ topic: item.topic as TopicId, concept: text(item.concept, 60) }))
    : [];
  const now = Date.now();
  const time = (value: unknown) => clamp(value, 0, now + 24 * 60 * 60 * 1000);

  return {
    v: 1,
    id,
    name,
    at: time(data.at),
    level: LEVEL_ORDER.includes(data.level as LearnerLevel) ? (data.level as LearnerLevel) : "BEGINNER",
    concepts,
    prediction: counts(data.prediction),
    practice: counts(data.practice),
    explanationMastery: percentOrNull(data.explanationMastery),
    firstTry: percentOrNull(data.firstTry),
    tutorQuestions: clamp(data.tutorQuestions, 0, 100000),
    circuitsRun: clamp(data.circuitsRun, 0, 100000),
    minutes: clamp(data.minutes, 0, 100000),
    weak,
    misconceptionsOpen: ids(data.misconceptionsOpen),
    misconceptionsResolved: ids(data.misconceptionsResolved),
    lastActiveAt: time(data.lastActiveAt),
  };
}

/** Read a pasted code (or the JSON text of a downloaded report). Returns null when it is not valid. */
export function decodeReport(input: string): LearnerReport | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 20000) return null;
  try {
    const json = trimmed.startsWith(REPORT_PREFIX) ? fromBase64Url(trimmed.slice(REPORT_PREFIX.length)) : trimmed;
    return sanitizeReport(JSON.parse(json));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The instructor's class list (kept in the instructor's browser)
// ---------------------------------------------------------------------------

export function loadClass(): LearnerReport[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CLASS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeReport).filter((report): report is LearnerReport => report !== null);
  } catch {
    return [];
  }
}

export function saveClass(reports: LearnerReport[]): boolean {
  try {
    window.localStorage.setItem(CLASS_KEY, JSON.stringify(reports.slice(0, MAX_REPORTS)));
    return true;
  } catch {
    return false;
  }
}

/** Add a report, replacing an older one from the same learner. */
export function upsertReport(reports: LearnerReport[], report: LearnerReport): LearnerReport[] {
  return [report, ...reports.filter((existing) => existing.id !== report.id)].slice(0, MAX_REPORTS);
}

// ---------------------------------------------------------------------------
// Reading a report
// ---------------------------------------------------------------------------

export interface ReportSummary {
  /** Concept the learner is working on, or null when every concept is mastered. */
  topic: TopicId | null;
  stage: StageId | null;
  stagesDone: number;
  stagesTotal: number;
  /** Share of all stages complete, in %. */
  progress: number;
  conceptsMastered: number;
  predictionAccuracy: number | null;
  practiceAccuracy: number | null;
  /** Why this learner may need the instructor, most important first. Empty = on track. */
  flags: string[];
  /** The stage that has taken the most attempts so far, if any took more than one. */
  hardestStage: { topic: TopicId; stage: StageId; attempts: number } | null;
}

const percent = (correct: number, total: number): number | null => (total === 0 ? null : Math.round((correct / total) * 100));

export function summarizeReport(report: LearnerReport, threshold: number): ReportSummary {
  let stagesDone = 0;
  let topic: TopicId | null = null;
  let stage: StageId | null = null;
  let hardestStage: ReportSummary["hardestStage"] = null;

  for (const id of INTERACTIVE_TOPICS) {
    const concept = report.concepts[id];
    const done = concept ? concept.scores.filter((score) => passes(score, threshold)).length : 0;
    stagesDone += concept?.mastered ? STAGE_IDS.length : done;
    if (topic === null && !concept?.mastered) {
      topic = id;
      const index = concept ? concept.scores.findIndex((score) => !passes(score, threshold)) : 0;
      stage = STAGE_IDS[Math.max(0, index)];
    }
    concept?.attempts.forEach((attempts, index) => {
      if (attempts > 1 && attempts > (hardestStage?.attempts ?? 1)) hardestStage = { topic: id, stage: STAGE_IDS[index], attempts };
    });
  }

  const stagesTotal = INTERACTIVE_TOPICS.length * STAGE_IDS.length;
  const predictionAccuracy = percent(report.prediction.correct, report.prediction.total);
  const flags: string[] = [];
  if (report.misconceptionsOpen.length > 0) {
    flags.push(`${report.misconceptionsOpen.length} misconception${report.misconceptionsOpen.length === 1 ? "" : "s"} open`);
  }
  if (predictionAccuracy !== null && report.prediction.total >= 3 && predictionAccuracy < 60) {
    flags.push(`predictions ${predictionAccuracy}%`);
  }
  if (report.explanationMastery !== null && report.explanationMastery < threshold) {
    flags.push(`explanations ${report.explanationMastery}%`);
  }
  const stuck = hardestStage as ReportSummary["hardestStage"];
  if (stuck && stuck.attempts >= 3) flags.push(`${stuck.attempts} attempts at ${stageMeta(stuck.stage).label}`);

  return {
    topic,
    stage,
    stagesDone,
    stagesTotal,
    progress: Math.round((stagesDone / stagesTotal) * 100),
    conceptsMastered: INTERACTIVE_TOPICS.filter((id) => report.concepts[id]?.mastered).length,
    predictionAccuracy,
    practiceAccuracy: percent(report.practice.correct, report.practice.total),
    flags,
    hardestStage: stuck,
  };
}

export interface ClassInsights {
  learners: number;
  averageProgress: number;
  averagePrediction: number | null;
  averageExplanation: number | null;
  needAttention: number;
  /** Weak areas across the class, most common first. */
  weakAreas: Array<{ concept: string; topic: TopicId; learners: number }>;
  /** Possible misconceptions across the class, most common first. */
  misconceptions: Array<{ id: string; open: number; resolved: number }>;
  /** Average attempts needed per stage, highest first (stages nobody has tried are left out). */
  stageFriction: Array<{ stage: StageId; averageAttempts: number }>;
  /** What the instructor could do next, each with the rule that produced it. */
  interventions: Array<{ action: string; rule: string }>;
}

const mean = (values: number[]): number | null =>
  values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

/** Class-level view over a set of reports. Every number is computed from the reports given. */
export function classInsights(reports: LearnerReport[], threshold: number): ClassInsights {
  const summaries = reports.map((report) => summarizeReport(report, threshold));

  const weak = new Map<string, { concept: string; topic: TopicId; learners: number }>();
  const misconceptions = new Map<string, { id: string; open: number; resolved: number }>();
  const attempts = new Map<StageId, number[]>();

  for (const report of reports) {
    for (const item of report.weak) {
      const key = `${item.topic}:${item.concept}`;
      const entry = weak.get(key) ?? { ...item, learners: 0 };
      entry.learners += 1;
      weak.set(key, entry);
    }
    for (const id of report.misconceptionsOpen) {
      const entry = misconceptions.get(id) ?? { id, open: 0, resolved: 0 };
      entry.open += 1;
      misconceptions.set(id, entry);
    }
    for (const id of report.misconceptionsResolved) {
      const entry = misconceptions.get(id) ?? { id, open: 0, resolved: 0 };
      entry.resolved += 1;
      misconceptions.set(id, entry);
    }
    for (const concept of Object.values(report.concepts)) {
      concept?.attempts.forEach((count, index) => {
        if (count > 0) attempts.set(STAGE_IDS[index], [...(attempts.get(STAGE_IDS[index]) ?? []), count]);
      });
    }
  }

  const weakAreas = Array.from(weak.values()).sort((a, b) => b.learners - a.learners).slice(0, 6);
  const misconceptionList = Array.from(misconceptions.values()).sort((a, b) => b.open - a.open || b.resolved - a.resolved);
  const stageFriction = Array.from(attempts.entries())
    .map(([stage, list]) => ({ stage, averageAttempts: Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 }))
    .filter((item) => item.averageAttempts > 1)
    .sort((a, b) => b.averageAttempts - a.averageAttempts)
    .slice(0, 5);

  const averagePrediction = mean(summaries.map((s) => s.predictionAccuracy).filter((v): v is number => v !== null));
  const averageExplanation = mean(reports.map((r) => r.explanationMastery).filter((v): v is number => v !== null));

  // Transparent IF → THEN rules, the same kind the learner-side engine uses.
  const interventions: ClassInsights["interventions"] = [];
  const topMisconception = misconceptionList.find((item) => item.open > 0);
  if (topMisconception && reports.length > 0 && topMisconception.open / reports.length >= 0.3) {
    const info = MISCONCEPTIONS.find((m) => m.id === topMisconception.id);
    interventions.push({
      action: `Address “${info?.title.en ?? topMisconception.id}” with the whole class`,
      rule: `IF a possible misconception is open for 30% or more of the class (${topMisconception.open} of ${reports.length}) → demonstrate the circuit that disproves it.`,
    });
  }
  if (averagePrediction !== null && averagePrediction < 60) {
    interventions.push({
      action: "Run a predict-before-run session",
      rule: `IF class prediction accuracy (${averagePrediction}%) is below 60% → practise predicting on short circuits before running them.`,
    });
  }
  if (weakAreas[0] && weakAreas[0].learners >= 2) {
    interventions.push({
      action: `Recap ${weakAreas[0].concept} (${topicTitle(weakAreas[0].topic)})`,
      rule: `IF the same mastery-check item is weak for 2 or more learners (${weakAreas[0].learners}) → recap it with a worked example.`,
    });
  }
  if (stageFriction[0] && stageFriction[0].averageAttempts >= 2) {
    interventions.push({
      action: `Model a strong answer for the ${stageMeta(stageFriction[0].stage).label} stage`,
      rule: `IF a stage takes 2 or more attempts on average (${stageFriction[0].averageAttempts}) → show the class what a passing answer looks like.`,
    });
  }
  if (interventions.length === 0 && reports.length > 0) {
    interventions.push({ action: "No class-wide action needed", rule: "No rule fired: no shared weak area, misconception or low accuracy." });
  }

  return {
    learners: reports.length,
    averageProgress: mean(summaries.map((s) => s.progress)) ?? 0,
    averagePrediction,
    averageExplanation,
    needAttention: summaries.filter((s) => s.flags.length > 0).length,
    weakAreas,
    misconceptions: misconceptionList,
    stageFriction,
    interventions,
  };
}

/** Does this state hold a learner worth showing on the instructor dashboard? */
export function hasLearnerActivity(state: AppState): boolean {
  return state.profile?.role === "learner" && INTERACTIVE_TOPICS.some((topic) => stageScore(progressOf(state, topic), "discover") > 0);
}
