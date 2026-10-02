/**
 * DEMO ANALYTICS for the Educator Insights page.
 *
 * These are illustrative sample learners, written by hand for the demo.
 * No real students are connected to this MVP, and nothing here is measured.
 */

export interface SampleLearner {
  label: string;
  currentTopic: string;
  /** Share of the four MVP modules mastered, in %. */
  progress: number;
  predictionAccuracy: number;
  assessmentAverage: number;
  weakTopic: string | null;
}

export const SAMPLE_COHORT: SampleLearner[] = [
  { label: "Sample learner A", currentTopic: "Superposition & Measurement", progress: 50, predictionAccuracy: 58, assessmentAverage: 72, weakTopic: "Measurement" },
  { label: "Sample learner B", currentTopic: "Quantum Gates", progress: 25, predictionAccuracy: 49, assessmentAverage: 64, weakTopic: "Z gate" },
  { label: "Sample learner C", currentTopic: "Superposition & Measurement", progress: 50, predictionAccuracy: 55, assessmentAverage: 70, weakTopic: "Measurement" },
  { label: "Sample learner D", currentTopic: "Entanglement", progress: 75, predictionAccuracy: 71, assessmentAverage: 84, weakTopic: "Interference" },
  { label: "Sample learner E", currentTopic: "Qubit Fundamentals", progress: 0, predictionAccuracy: 62, assessmentAverage: 60, weakTopic: "Measurement" },
  { label: "Sample learner F", currentTopic: "Entanglement", progress: 75, predictionAccuracy: 53, assessmentAverage: 78, weakTopic: null },
];

export const SAMPLE_ENGAGEMENT: Array<{ event: string; label: string; count: number }> = [
  { event: "circuitExecuted", label: "Circuits run", count: 94 },
  { event: "predictionSubmitted", label: "Predictions submitted", count: 86 },
  { event: "lessonOpened", label: "Lessons opened", count: 31 },
  { event: "aiExplanationRequested", label: "Tutor explanations requested", count: 22 },
  { event: "hintRequested", label: "Hints requested", count: 17 },
  { event: "quizCompleted", label: "Mastery checks completed", count: 14 },
];

/** Sample cohort: which possible misconceptions the rule engine flagged, and for how many learners. */
export const SAMPLE_MISCONCEPTIONS: Array<{ id: string; learners: number; resolved: number }> = [
  { id: "classical_randomness", learners: 4, resolved: 1 },
  { id: "phase_confusion", learners: 3, resolved: 1 },
  { id: "always_fifty_fifty", learners: 2, resolved: 2 },
  { id: "ftl_communication", learners: 1, resolved: 0 },
];

/** Sample cohort: the stages where learners needed the most attempts to reach the threshold. */
export const SAMPLE_STAGE_FRICTION: Array<{ stage: string; averageAttempts: number }> = [
  { stage: "Explain", averageAttempts: 2.4 },
  { stage: "Assess", averageAttempts: 1.9 },
  { stage: "Next Challenge", averageAttempts: 1.5 },
  { stage: "Observe", averageAttempts: 1.2 },
];
