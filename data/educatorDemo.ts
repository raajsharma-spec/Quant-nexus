/**
 * The SAMPLE COHORT for the instructor dashboard.
 *
 * Six illustrative learners, written by hand in the same shape as a real
 * progress report (lib/classroom.ts), so the dashboard treats them exactly
 * like real learners. They are always labelled "Sample" on screen and can be
 * switched off. Nothing here was measured from real students.
 */

import type { ConceptReport, LearnerReport } from "@/lib/classroom";
import { STAGE_IDS, type LearnerLevel, type TopicId } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

/** A mastered concept: every stage at or above 90. `attempts` lists the stages that took more than one try. */
function mastered(attempts: Partial<Record<(typeof STAGE_IDS)[number], number>> = {}, low: number[] = []): ConceptReport {
  return {
    scores: STAGE_IDS.map((_, index) => (low.includes(index) ? 92 : 100)),
    attempts: STAGE_IDS.map((stage, index) => attempts[stage] ?? (index >= 6 ? 1 : 0)),
    mastered: true,
  };
}

/** A concept in progress: stages before `reached` are done, `reached` holds `score`. */
function upTo(reached: number, score: number, attempts: Partial<Record<(typeof STAGE_IDS)[number], number>> = {}): ConceptReport {
  return {
    scores: STAGE_IDS.map((_, index) => (index < reached ? 100 : index === reached ? score : 0)),
    attempts: STAGE_IDS.map((stage, index) => attempts[stage] ?? (index >= 6 && index <= reached ? 1 : 0)),
    mastered: false,
  };
}

interface Sample {
  name: string;
  level: LearnerLevel;
  concepts: Partial<Record<TopicId, ConceptReport>>;
  prediction: [number, number];
  practice: [number, number];
  explanation: number | null;
  firstTry: number | null;
  weak: Array<[TopicId, string]>;
  open: string[];
  resolved: string[];
  minutes: number;
  daysAgo: number;
}

const SAMPLES: Sample[] = [
  {
    name: "Sample learner A",
    level: "DEVELOPING",
    concepts: { qubit: mastered({ explain: 2 }), gates: mastered({ assess: 2 }), superposition: upTo(9, 67, { explain: 3 }) },
    prediction: [7, 12],
    practice: [5, 7],
    explanation: 84,
    firstTry: 75,
    weak: [["superposition", "Measurement"], ["gates", "Z gate"]],
    open: ["classical_randomness"],
    resolved: ["always_fifty_fifty"],
    minutes: 96,
    daysAgo: 0,
  },
  {
    name: "Sample learner B",
    level: "BEGINNER",
    concepts: { qubit: mastered({ explain: 3, assess: 2 }), gates: upTo(10, 67, { explain: 2, assess: 2 }) },
    prediction: [4, 9],
    practice: [2, 4],
    explanation: 78,
    firstTry: 58,
    weak: [["gates", "Z gate"], ["gates", "H gate"]],
    open: ["phase_confusion"],
    resolved: [],
    minutes: 71,
    daysAgo: 1,
  },
  {
    name: "Sample learner C",
    level: "DEVELOPING",
    concepts: { qubit: mastered(), gates: mastered({ explain: 2 }), superposition: upTo(10, 83, { explain: 2, assess: 1 }) },
    prediction: [8, 14],
    practice: [6, 8],
    explanation: 88,
    firstTry: 79,
    weak: [["superposition", "Measurement"], ["superposition", "Interference"]],
    open: ["classical_randomness"],
    resolved: ["phase_confusion"],
    minutes: 118,
    daysAgo: 0,
  },
  {
    name: "Sample learner D",
    level: "PROFICIENT",
    concepts: { qubit: mastered(), gates: mastered(), superposition: mastered({ explain: 2 }), entanglement: upTo(8, 50) },
    prediction: [15, 20],
    practice: [11, 12],
    explanation: 95,
    firstTry: 89,
    weak: [["superposition", "Interference"]],
    open: [],
    resolved: ["classical_randomness", "always_fifty_fifty"],
    minutes: 164,
    daysAgo: 0,
  },
  {
    name: "Sample learner E",
    level: "BEGINNER",
    concepts: { qubit: upTo(9, 33, { explain: 2 }) },
    prediction: [2, 3],
    practice: [0, 0],
    explanation: 50,
    firstTry: null,
    weak: [],
    open: [],
    resolved: [],
    minutes: 24,
    daysAgo: 3,
  },
  {
    name: "Sample learner F",
    level: "PROFICIENT",
    concepts: { qubit: mastered(), gates: mastered(), superposition: mastered({ assess: 2 }), entanglement: upTo(10, 67, { explain: 2, assess: 1 }) },
    prediction: [9, 17],
    practice: [8, 10],
    explanation: 90,
    firstTry: 81,
    weak: [["entanglement", "No signalling"], ["superposition", "Measurement"]],
    open: ["ftl_communication", "classical_randomness"],
    resolved: [],
    minutes: 151,
    daysAgo: 1,
  },
];

/** The sample cohort as progress reports, dated relative to `now`. */
export function sampleCohort(now: number = Date.now()): LearnerReport[] {
  return SAMPLES.map((sample, index) => ({
    v: 1,
    id: `sample-${index + 1}`,
    name: sample.name,
    at: now - sample.daysAgo * DAY,
    level: sample.level,
    concepts: sample.concepts,
    prediction: { total: sample.prediction[1], correct: sample.prediction[0] },
    practice: { total: sample.practice[1], correct: sample.practice[0] },
    explanationMastery: sample.explanation,
    firstTry: sample.firstTry,
    tutorQuestions: 3 + index * 2,
    circuitsRun: sample.prediction[1] + 4,
    minutes: sample.minutes,
    weak: sample.weak.map(([topic, concept]) => ({ topic, concept })),
    misconceptionsOpen: sample.open,
    misconceptionsResolved: sample.resolved,
    lastActiveAt: now - sample.daysAgo * DAY - 40 * 60 * 1000,
    sample: true,
  }));
}
