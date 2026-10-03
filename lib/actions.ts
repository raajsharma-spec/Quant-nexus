/**
 * State transitions. Each function takes the current learning state and
 * returns a new one — no side effects — so they are easy to test and reason
 * about. The React provider calls these and then saves the result.
 *
 * Every stage of the journey updates THE SAME learning state through this
 * file. The mastery gate is enforced here: `updateStage` refuses to write a
 * score to a stage that is still locked.
 */

import { ACHIEVEMENTS } from "@/data/achievements";
import { findChallenge } from "@/data/challenges";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { assessScore } from "./adaptiveAssessment";
import { appendEvent, createEvent, track, type EventData } from "./events";
import type { BackendId } from "./execution";
import type { ExplanationResult } from "./explanationEvaluator";
import { isConceptUnlocked, nextTopic } from "./mastery";
import {
  detectFromOption,
  detectFromPrediction,
  detectInText,
  recordDetections,
  resolveByChallenge,
  resolveByQuestion,
  type Detection,
} from "./misconceptions";
import { allStagesPassed, isStageUnlocked, passes, stageScore, withStageScore } from "./stages";
import {
  clampThreshold,
  emptyConceptProgress,
  newId,
  SHOT_OPTIONS,
  type AppState,
  type AssessmentAnswer,
  type ConceptProgress,
  type EventType,
  type PythonLevel,
  type Settings,
  type StagePrediction,
  type StageRun,
} from "./storage";
import { stageMeta, type Confidence, type L, type Lang, type StageId, type TopicId } from "./types";

export { track };
export type { EventData };

// ---------------------------------------------------------------------------
// The mastery gate
// ---------------------------------------------------------------------------

/**
 * Write a score to one stage of a concept — the ONLY way a stage score changes.
 * Returns the state untouched when the concept or the stage is still locked.
 */
export function updateStage(
  state: AppState,
  topic: TopicId,
  stage: StageId,
  score: number,
  patch: (progress: ConceptProgress) => ConceptProgress = (p) => p
): AppState {
  if (!INTERACTIVE_TOPICS.includes(topic) || !isConceptUnlocked(state, topic)) return state;
  const threshold = state.settings.masteryThreshold;
  const existing = state.concepts[topic];
  const before = existing ?? emptyConceptProgress();
  if (!isStageUnlocked(before, stage, threshold)) return state; // 🔒 the gate

  const after = withStageScore(patch(before), stage, score, threshold);
  let next: AppState = { ...state, concepts: { ...state.concepts, [topic]: after } };
  if (!existing) next = track(next, "conceptStarted", { topic, detail: topicTitle(topic) });

  const passedBefore = passes(stageScore(before, stage), threshold);
  const passedNow = passes(stageScore(after, stage), threshold);
  if (!passedBefore && passedNow) {
    next = track(next, "stageCompleted", {
      topic,
      detail: stageMeta(stage).label,
      meta: { stage, score: stageScore(after, stage) },
    });
  }
  return next;
}

/** Change working data of a concept without touching any score (still gated by the concept lock). */
function patchConcept(state: AppState, topic: TopicId, patch: (progress: ConceptProgress) => ConceptProgress): AppState {
  if (!INTERACTIVE_TOPICS.includes(topic) || !isConceptUnlocked(state, topic)) return state;
  const before = state.concepts[topic] ?? emptyConceptProgress();
  return { ...state, concepts: { ...state.concepts, [topic]: { ...patch(before), updatedAt: Date.now() } } };
}

const share = (done: number, total: number) => (total <= 0 ? 100 : Math.round((Math.min(done, total) / total) * 100));

/**
 * Run after every change: mark concepts that have just been mastered, record
 * the unlock of the next concept, and award achievements that were earned.
 */
export function finalize(state: AppState, seeded = false): AppState {
  let next = state;
  const at = Date.now();
  const threshold = next.settings.masteryThreshold;

  for (const topic of INTERACTIVE_TOPICS) {
    const progress = next.concepts[topic];
    if (!progress || progress.masteredAt) continue;
    if (!allStagesPassed(progress, threshold)) continue;
    next = { ...next, concepts: { ...next.concepts, [topic]: { ...progress, masteredAt: at } } };
    next = track(next, "conceptMastered", { topic, detail: topicTitle(topic), seeded, at });
    const upcoming = nextTopic(topic);
    next = track(next, "topicUnlocked", {
      topic,
      detail: upcoming ? topicTitle(upcoming) : "all MVP modules",
      meta: { from: topic },
      seeded,
      at,
    });
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
// Profile and settings
// ---------------------------------------------------------------------------

export function enterAsLearner(state: AppState, name: string): AppState {
  const clean = name.trim().slice(0, 40) || "Learner";
  if (state.profile) {
    return { ...state, profile: { ...state.profile, name: clean, role: "learner" } };
  }
  return {
    ...state,
    profile: {
      id: newId("student"),
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
      id: newId("educator"),
      name: "Educator",
      role: "educator",
      pythonLevel: null,
      language: "en",
      onboarded: true,
      createdAt: Date.now(),
    },
  };
}

/**
 * Onboarding records the learning language and the one prerequisite check (Python comfort).
 * The learner's quantum level is inferred from behaviour, never asked.
 */
export function completeOnboarding(state: AppState, language: Lang, pythonLevel: PythonLevel | null = null): AppState {
  if (!state.profile) return state;
  return { ...state, profile: { ...state.profile, pythonLevel, language, onboarded: true } };
}

export function setLanguage(state: AppState, language: Lang): AppState {
  if (!state.profile) return state;
  return { ...state, profile: { ...state.profile, language } };
}

/** The mastery threshold can be raised from 90% up to 100%, never lowered below 90%. */
export function setThreshold(state: AppState, masteryThreshold: number): AppState {
  return { ...state, settings: { ...state.settings, masteryThreshold: clampThreshold(masteryThreshold) } };
}

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  const settings: Settings = { ...state.settings, ...patch };
  settings.masteryThreshold = clampThreshold(settings.masteryThreshold);
  if (!SHOT_OPTIONS.includes(settings.shots as (typeof SHOT_OPTIONS)[number])) settings.shots = state.settings.shots;
  if (settings.backend !== "qiskit" && settings.backend !== "browser") settings.backend = "browser";
  return { ...state, settings };
}

// ---------------------------------------------------------------------------
// Python Foundations (the optional warm-up keeps its simple lesson + check)
// ---------------------------------------------------------------------------

export function openLesson(state: AppState, topic: TopicId): AppState {
  const current = state.lessons[topic] ?? { opens: 0, step: 0, completed: false };
  let next: AppState = {
    ...state,
    lessons: { ...state.lessons, [topic]: { ...current, opens: current.opens + 1 } },
  };
  next = track(next, "lessonOpened", { topic });
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

/** The fixed five-question check used by Python Foundations. */
export function recordAssessment(state: AppState, topic: TopicId, answers: AssessmentAnswer[]): AppState {
  const score = answers.filter((a) => a.correct).length;
  const next: AppState = {
    ...state,
    assessments: [
      ...state.assessments,
      { id: newId("as"), at: Date.now(), topic, score, total: answers.length, answers, kind: "full" as const },
    ].slice(-100),
  };
  return track(next, "quizCompleted", {
    topic,
    detail: `${score}/${answers.length}`,
    meta: { score, total: answers.length },
  });
}

// ---------------------------------------------------------------------------
// The journey: Discover → … → Next Challenge
// ---------------------------------------------------------------------------

/** Opening a concept: remember the stage and record a visit. */
export function openStage(state: AppState, topic: TopicId, stage: StageId): AppState {
  if (!INTERACTIVE_TOPICS.includes(topic) || !isConceptUnlocked(state, topic)) return state;
  const existing = state.concepts[topic];
  const before = existing ?? emptyConceptProgress();
  if (!isStageUnlocked(before, stage, state.settings.masteryThreshold)) return state;
  const firstVisit = before.timeMs[stage] === undefined;
  if (existing && !firstVisit && before.lastStage === stage) return state; // nothing new to record
  let next: AppState = {
    ...state,
    concepts: {
      ...state.concepts,
      [topic]: {
        ...before,
        lastStage: stage,
        timeMs: firstVisit ? { ...before.timeMs, [stage]: 0 } : before.timeMs,
        updatedAt: Date.now(),
      },
    },
  };
  if (!existing) {
    next = track(next, "conceptStarted", { topic, detail: topicTitle(topic) });
    next = track(next, "lessonOpened", { topic });
  }
  if (firstVisit) next = track(next, "stageStarted", { topic, detail: stageMeta(stage).label, meta: { stage } });
  if (existing?.masteredAt && firstVisit === false && stage === "discover") next = track(next, "topicRevisited", { topic });
  return next;
}

export function addStageTime(state: AppState, topic: TopicId, stage: StageId, ms: number): AppState {
  if (!state.concepts[topic] || ms <= 0) return state;
  return patchConcept(state, topic, (p) => ({
    ...p,
    timeMs: { ...p.timeMs, [stage]: (p.timeMs[stage] ?? 0) + Math.min(ms, 30 * 60 * 1000) },
  }));
}

export function completeDiscover(state: AppState, topic: TopicId): AppState {
  return updateStage(state, topic, "discover", 100);
}

/** Learn: each theory block read raises the score. */
export function markLearnRead(state: AppState, topic: TopicId, blockId: string, totalBlocks: number): AppState {
  const before = state.concepts[topic]?.learnRead ?? [];
  const learnRead = before.includes(blockId) ? before : [...before, blockId];
  let next = updateStage(state, topic, "learn", share(learnRead.length, totalBlocks), (p) => ({ ...p, learnRead }));
  if (next !== state && learnRead.length === totalBlocks && before.length < totalBlocks) {
    next = track(next, "lessonCompleted", { topic });
  }
  return next;
}

/** Watch: each scene of the visual lesson (or share of a video) that has been seen. */
export function markWatched(state: AppState, topic: TopicId, sceneIndex: number, totalScenes: number): AppState {
  const before = state.concepts[topic]?.watchSeen ?? [];
  if (before.includes(sceneIndex)) return state;
  const watchSeen = [...before, sceneIndex].sort((a, b) => a - b);
  const percent = share(watchSeen.length, totalScenes);
  let next = updateStage(state, topic, "watch", percent, (p) => ({ ...p, watchSeen }));
  if (next === state) return state;
  if (before.length === 0) next = track(next, "videoStarted", { topic, meta: { watchPercentage: percent } });
  if (watchSeen.length === totalScenes) next = track(next, "videoCompleted", { topic, meta: { watchPercentage: 100 } });
  return next;
}

/** How many distinct uses of the interactive piece count as having explored it. */
export const INTERACTION_TARGET = 4;

export function recordInteraction(state: AppState, topic: TopicId): AppState {
  const count = (state.concepts[topic]?.interactions ?? 0) + 1;
  if (count > INTERACTION_TARGET + 20) return state; // enough evidence; stop filling the log
  let next = updateStage(state, topic, "interact", share(count, INTERACTION_TARGET), (p) => ({ ...p, interactions: count }));
  if (next !== state && count <= INTERACTION_TARGET) {
    next = track(next, "interactionUsed", { topic, meta: { count } });
  }
  return next;
}

export function reachGoal(state: AppState, topic: TopicId, goalId: string, totalGoals: number): AppState {
  const before = state.concepts[topic]?.goals ?? [];
  if (before.includes(goalId)) return state;
  const goals = [...before, goalId];
  let next = updateStage(state, topic, "experiment", share(goals.length, totalGoals), (p) => ({ ...p, goals }));
  if (next !== state) next = track(next, "interactionUsed", { topic, detail: `goal:${goalId}`, meta: { goals: goals.length } });
  return next;
}

export interface TutorQuestionInput {
  topic: TopicId;
  stage?: StageId;
  mode: string;
  question: string;
  sources: string[];
  /** True when the question was asked inside the concept journey (it counts for the Ask AI stage). */
  inJourney: boolean;
}

/** Every tutor question is logged; free text is also checked for misconceptions. */
export function recordTutorQuestion(state: AppState, input: TutorQuestionInput, detections: Detection[] = []): AppState {
  let next: AppState = {
    ...state,
    tutorLog: [
      ...state.tutorLog,
      {
        id: newId("ai"),
        at: Date.now(),
        topic: input.topic,
        stage: input.stage,
        mode: input.mode,
        question: input.question.slice(0, 240),
        sources: input.sources,
      },
    ].slice(-100),
  };
  next = track(next, "aiQuestion", { topic: input.topic, detail: input.mode, meta: { mode: input.mode } });
  if (input.mode === "HINT") next = track(next, "hintRequested", { topic: input.topic, detail: "tutor" });
  next = recordDetections(next, detections, input.topic, "tutor");
  if (input.inJourney) {
    const questions = (next.concepts[input.topic]?.questions ?? 0) + 1;
    next = updateStage(next, input.topic, "ask", 100, (p) => ({ ...p, questions }));
  }
  return next;
}

/** Predict: the learner commits to an answer and says how sure they are. */
export function submitStagePrediction(state: AppState, topic: TopicId, prediction: StagePrediction, circuit: string): AppState {
  let next = updateStage(state, topic, "predict", 100, (p) => ({
    ...p,
    prediction,
    attempts: { ...p.attempts, predict: (p.attempts.predict ?? 0) + 1 },
  }));
  if (next === state) return state;
  next = track(next, "predictionSubmitted", {
    topic,
    detail: circuit,
    meta: { confidence: prediction.confidence, prediction: prediction.label },
  });
  return next;
}

// ---------------------------------------------------------------------------
// Experiments (predict → run), used by the lab, practice, challenges and the journey
// ---------------------------------------------------------------------------

export interface ExperimentInput {
  source: "lab" | "practice" | "lesson" | "challenge";
  topic: TopicId;
  circuit: string;
  /** Comma-separated gate types used, e.g. "H,M". */
  gates: string;
  /** Every gate in the order it runs, e.g. "H,H,M" — used to read what a prediction reveals. */
  sequence?: string;
  prediction: string;
  /** The predicted probabilities, when the prediction was a distribution. */
  predicted?: Record<string, number> | null;
  actual: string;
  correct: boolean;
  steps: L[];
  summary: L;
  challengeId?: string;
  confidence?: Confidence;
  counts?: Record<string, number>;
  shots?: number;
  probabilities?: Record<string, number>;
  backend?: BackendId;
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
        confidence: input.confidence,
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
      counts: input.counts,
      shots: input.shots,
      probabilities: input.probabilities,
      backend: input.backend,
      confidence: input.confidence,
    },
  };

  if (input.counts && input.shots) {
    next = {
      ...next,
      runs: [
        ...next.runs,
        {
          id: newId("run"),
          at,
          source: input.source,
          topic: input.topic,
          circuit: input.circuit,
          shots: input.shots,
          counts: input.counts,
          backend: input.backend ?? "browser",
        },
      ].slice(-60),
    };
  }

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
    meta: { gates: input.gates, source: input.source, shots: input.shots ?? 0, backend: input.backend ?? "browser" },
  });
  next = track(next, input.correct ? "predictionCorrect" : "predictionWrong", {
    topic: input.topic,
    detail: input.circuit,
  });

  // What the prediction reveals.
  if (!input.correct && input.probabilities) {
    const detections = detectFromPrediction((input.sequence ?? input.gates).split(","), input.predicted ?? null, input.probabilities);
    next = recordDetections(next, detections, input.topic, "prediction");
  }

  // A solved challenge resolves the misconceptions it targets.
  if (input.challengeId && input.correct) {
    const challenge = findChallenge(input.challengeId);
    next = resolveByChallenge(next, input.challengeId, challenge?.targets ?? []);
    next = track(next, "challengeCompleted", { topic: input.topic, detail: challenge?.title.en ?? input.challengeId });
  }

  return next;
}

/** Run (stage 07): the core experiment of a concept has been executed. */
export function recordStageRun(state: AppState, topic: TopicId, run: StageRun, experiment: ExperimentInput): AppState {
  // The gate first: no run is recorded for a stage that is still locked.
  const gated = updateStage(state, topic, "run", 100, (p) => ({
    ...p,
    run,
    observed: [],
    attempts: { ...p.attempts, run: (p.attempts.run ?? 0) + 1 },
  }));
  if (gated === state) return state;
  return recordExperiment(gated, experiment);
}

/** Observe (stage 08): the learner answers short checks about the result in front of them. */
export function recordObservation(
  state: AppState,
  topic: TopicId,
  checkId: string,
  correct: boolean,
  totalChecks: number
): AppState {
  const before = state.concepts[topic]?.observed ?? [];
  const observed = correct && !before.includes(checkId) ? [...before, checkId] : before;
  let next = updateStage(state, topic, "observe", share(observed.length, totalChecks), (p) => ({
    ...p,
    observed,
    attempts: { ...p.attempts, observe: (p.attempts.observe ?? 0) + 1 },
  }));
  if (next !== state) {
    next = track(next, "resultObserved", { topic, detail: checkId, meta: { correct } });
  }
  return next;
}

export interface ExplanationInput {
  topic: TopicId;
  rubricId: string;
  mode: "written" | "structured";
  text: string;
  result: ExplanationResult;
  /** "explain" updates the Explain stage; "assess" is the written item of a mastery check. */
  purpose: "explain" | "assess";
}

/** Explain (stage 09) and the written item of a mastery check. */
export function recordExplanation(state: AppState, input: ExplanationInput): AppState {
  const { topic, result } = input;
  let next = state;

  if (input.purpose === "explain") {
    next = updateStage(state, topic, "explain", result.score, (p) => ({
      ...p,
      attempts: { ...p.attempts, explain: (p.attempts.explain ?? 0) + 1 },
    }));
    if (next === state) return state; // locked
  }

  next = {
    ...next,
    explanations: [
      ...next.explanations,
      {
        id: newId("ex"),
        at: Date.now(),
        topic,
        rubricId: input.rubricId,
        mode: input.mode,
        text: input.text.trim().slice(0, 600),
        score: result.score,
        covered: result.covered.map((idea) => idea.id),
        missing: result.missing.map((idea) => idea.id),
        misconceptions: result.misconceptions.map((m) => m.misconception),
      },
    ].slice(-80),
  };
  next = track(next, "explanationSubmitted", {
    topic,
    detail: `${result.score}%`,
    meta: { score: result.score, mode: input.mode, purpose: input.purpose },
  });
  next = recordDetections(next, result.misconceptions, topic, "explanation");
  return next;
}

export interface AssessItemResult {
  slot: string;
  /** The question, build task or rubric id that was used. */
  itemId: string;
  /** 0–1. */
  credit: number;
  difficulty: number;
  /** For multiple-choice items: the option the learner chose. */
  chosen?: number;
}

/** Assess (stage 10): store the result of a full or targeted mastery check. */
export function recordStageAssessment(
  state: AppState,
  topic: TopicId,
  results: AssessItemResult[],
  kind: "full" | "targeted"
): AppState {
  if (results.length === 0) return state;
  const at = Date.now();

  const gated = updateStage(state, topic, "assess", 0, (p) => {
    const assess = { ...p.assess };
    for (const result of results) {
      const previous = assess[result.slot];
      const credit = Math.max(0, Math.min(1, result.credit));
      assess[result.slot] = {
        questionId: result.itemId,
        // Latest evidence, but never below what has already been shown.
        credit: Math.max(previous?.credit ?? 0, credit),
        firstCredit: previous ? previous.firstCredit : credit,
        missedQuestionId: credit < 1 && result.chosen !== undefined ? result.itemId : previous?.missedQuestionId,
        tries: (previous?.tries ?? 0) + 1,
        at,
      };
    }
    return {
      ...p,
      assess,
      assessAttempts: p.assessAttempts + 1,
      attempts: { ...p.attempts, assess: (p.attempts.assess ?? 0) + 1 },
    };
  });
  if (gated === state) return state; // locked

  // Now that the items are stored, write the stage score they add up to.
  let next = updateStage(gated, topic, "assess", assessScore(gated.concepts[topic]!, topic));

  const answers: AssessmentAnswer[] = results.map((r) => ({
    questionId: r.itemId,
    concept: r.slot,
    correct: r.credit >= 0.9,
    credit: r.credit,
    difficulty: r.difficulty,
  }));
  const score = Math.round(results.reduce((sum, r) => sum + r.credit, 0) * 100) / 100;
  next = {
    ...next,
    assessments: [
      ...next.assessments,
      { id: newId("as"), at, topic, score, total: results.length, answers, kind },
    ].slice(-100),
  };
  next = track(next, "quizCompleted", {
    topic,
    detail: `${Math.round(score * 10) / 10}/${results.length}`,
    meta: { score, total: results.length, kind },
  });

  // Misconceptions revealed by wrong options, and resolved by right answers.
  for (const result of results) {
    if (result.chosen === undefined) continue;
    next = track(next, "quizAttempt", {
      topic,
      detail: result.itemId,
      meta: { correct: result.credit >= 1, concept: result.slot, difficulty: result.difficulty },
    });
    if (result.credit >= 1) {
      next = resolveByQuestion(next, topic, result.itemId);
    } else {
      const detection = detectFromOption(topic, result.itemId, result.chosen);
      if (detection) next = recordDetections(next, [detection], topic, "assessment");
    }
  }
  return next;
}

/** Review (stage 11): the learner has gone through their personalised review. */
export function completeReview(state: AppState, topic: TopicId): AppState {
  const next = updateStage(state, topic, "review", 100);
  if (next === state) return state;
  return track(next, "reviewCompleted", { topic });
}

export function startReview(state: AppState, topic: TopicId): AppState {
  if (!state.concepts[topic]) return state;
  return track(state, "reviewStarted", { topic });
}

/** Next Challenge (stage 12): remember which challenge was chosen for this learner. */
export function setStageChallenge(state: AppState, topic: TopicId, challengeId: string): AppState {
  if (state.concepts[topic]?.challengeId === challengeId) return state;
  return patchConcept(state, topic, (p) => ({ ...p, challengeId, challengeSolved: false }));
}

/** Next Challenge: the outcome of the learner's attempt at their targeted challenge. */
export function recordStageChallenge(state: AppState, topic: TopicId, experiment: ExperimentInput): AppState {
  const gated = updateStage(state, topic, "challenge", experiment.correct ? 100 : 0, (p) => ({
    ...p,
    challengeSolved: p.challengeSolved || experiment.correct,
    attempts: { ...p.attempts, challenge: (p.attempts.challenge ?? 0) + 1 },
  }));
  if (gated === state) return state; // locked
  return recordExperiment(gated, experiment);
}

/** Spaced review: one short question on a concept that was mastered earlier. */
export function recordQuickReview(
  state: AppState,
  topic: TopicId,
  questionId: string,
  chosen: number,
  correct: boolean
): AppState {
  const previous = state.reviews[topic];
  let next: AppState = {
    ...state,
    reviews: {
      ...state.reviews,
      [topic]: {
        lastAt: Date.now(),
        streak: correct ? (previous?.streak ?? 0) + 1 : 0,
        needsReview: !correct,
        lastQuestionId: questionId,
      },
    },
  };
  next = track(next, "quickReview", { topic, detail: questionId, meta: { correct } });
  if (correct) return resolveByQuestion(next, topic, questionId);
  const detection = detectFromOption(topic, questionId, chosen);
  return detection ? recordDetections(next, [detection], topic, "assessment") : next;
}

/** Free text the learner typed somewhere other than the tutor (kept for completeness). */
export function scanText(state: AppState, topic: TopicId, text: string): AppState {
  return recordDetections(state, detectInText(text), topic, "explanation");
}

export type { EventType };
export { appendEvent, createEvent };
