/**
 * The adaptive mastery check.
 *
 * A mastery check is made of ITEMS, one per assessment slot of the concept:
 *   - knowledge slots  → one question each, chosen from the bank by difficulty
 *   - "build"          → build a circuit; checked by actually simulating it
 *   - "write"          → explain in your own words; scored against a rubric
 *
 * So it never relies on multiple choice alone.
 *
 * It adapts in three ways:
 *   1. The first question's difficulty comes from the learner's inferred level.
 *   2. After a correct answer the next question is harder; after a miss, easier.
 *   3. A retry is TARGETED: only the items that were missed come back, each
 *      with a different question, and questions that address an open
 *      misconception are preferred.
 *
 * The stage score is the share of items the learner has demonstrated, using
 * the latest evidence for each item.
 */

import { conceptContent, type BuildTask } from "@/data/curriculum";
import { rubricById, type ExplainRubric } from "@/data/explanations";
import { MISCONCEPTIONS } from "@/data/misconceptions";
import { questionBank, type Difficulty, type QuizQuestion } from "@/data/quizzes";
import { difficultyFor, inferLevel } from "./learnerLevel";
import { activeMisconceptions } from "./misconceptions";
import { simulateCircuit, type Circuit } from "./quantumSimulator";
import type { AppState, ConceptProgress } from "./storage";
import type { L, TopicId } from "./types";

export const BUILD_SLOT = "build";
export const WRITE_SLOT = "write";

/** An item counts as demonstrated once its credit reaches this value. */
export const DEMONSTRATED = 0.9;

export type AssessItem =
  | { kind: "question"; slot: string; question: QuizQuestion }
  | { kind: "build"; slot: string; task: BuildTask }
  | { kind: "write"; slot: string; rubric: ExplainRubric };

/** Every item of a concept's mastery check, in the order they are asked. */
export function assessmentSlots(topic: TopicId): string[] {
  const content = conceptContent(topic);
  if (!content) return [];
  return [...content.assessment.slots, BUILD_SLOT, WRITE_SLOT];
}

/** A readable name for a slot. */
export function slotLabel(topic: TopicId, slot: string): string {
  if (slot === BUILD_SLOT) return "Build a circuit";
  if (slot === WRITE_SLOT) return "Explain in your own words";
  return slot;
}

/** Stage score, 0–100: the share of items demonstrated, from the latest evidence. */
export function assessScore(progress: ConceptProgress, topic: TopicId): number {
  const slots = assessmentSlots(topic);
  if (slots.length === 0) return 0;
  const total = slots.reduce((sum, slot) => sum + Math.max(0, Math.min(1, progress.assess[slot]?.credit ?? 0)), 0);
  return Math.round((total / slots.length) * 100);
}

/** Step the difficulty up after a correct answer and down after a miss. */
export function nextDifficulty(current: Difficulty, wasCorrect: boolean): Difficulty {
  const next = wasCorrect ? current + 1 : current - 1;
  return Math.max(1, Math.min(4, next)) as Difficulty;
}

/**
 * Choose the question for a slot.
 *   exclude : question ids not to repeat (the one asked last time)
 *   prefer  : question ids to use if possible (they target an open misconception)
 */
export function pickQuestion(
  topic: TopicId,
  slot: string,
  target: Difficulty,
  exclude: string[] = [],
  prefer: string[] = []
): QuizQuestion | null {
  const pool = questionBank(topic).filter((q) => q.concept === slot);
  if (pool.length === 0) return null;
  const fresh = pool.filter((q) => !exclude.includes(q.id));
  const candidates = fresh.length > 0 ? fresh : pool;

  const preferred = candidates.filter((q) => prefer.includes(q.id));
  const from = preferred.length > 0 ? preferred : candidates;
  return [...from].sort(
    (a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target) || a.difficulty - b.difficulty
  )[0];
}

export interface AssessmentPlan {
  kind: "full" | "targeted";
  slots: string[];
  startDifficulty: Difficulty;
  /** Question ids worth asking because they address an open misconception. */
  prefer: string[];
}

/** Decide what the next mastery check for this learner should contain. */
export function planAssessment(state: AppState, topic: TopicId): AssessmentPlan {
  const all = assessmentSlots(topic);
  const progress = state.concepts[topic];
  const attempted = progress ? Object.keys(progress.assess).length > 0 : false;
  const open = all.filter((slot) => (progress?.assess[slot]?.credit ?? 0) < DEMONSTRATED);

  const prefer = activeMisconceptions(state)
    .map((m) => m.info.id)
    .flatMap((id) => {
      const direct = MISCONCEPTIONS.find((m) => m.id === id)?.questionId;
      const tagged = questionBank(topic)
        .filter((q) => Object.values(q.misconceptions ?? {}).includes(id))
        .map((q) => q.id);
      return direct ? [direct, ...tagged] : tagged;
    });

  // On a retry start one step easier: the learner has just struggled with these items.
  const level = difficultyFor(inferLevel(state).level);
  const targeted = attempted && open.length > 0 && open.length < all.length;
  return {
    kind: targeted ? "targeted" : "full",
    slots: targeted ? open : all,
    startDifficulty: (targeted ? Math.max(1, level - 1) : level) as Difficulty,
    prefer: Array.from(new Set(prefer)),
  };
}

/** Build the item for one slot. */
export function buildItem(
  state: AppState,
  topic: TopicId,
  slot: string,
  difficulty: Difficulty,
  prefer: string[]
): AssessItem | null {
  const content = conceptContent(topic);
  if (!content) return null;
  if (slot === BUILD_SLOT) return { kind: "build", slot, task: content.assessment.build };
  if (slot === WRITE_SLOT) {
    const rubric = rubricById(content.assessment.writeRubric);
    return rubric ? { kind: "write", slot, rubric } : null;
  }
  const last = state.concepts[topic]?.assess[slot]?.questionId;
  const question = pickQuestion(topic, slot, difficulty, last ? [last] : [], prefer);
  return question ? { kind: "question", slot, question } : null;
}

export interface BuildCheck {
  correct: boolean;
  /** Why it is not right yet — or a confirmation. */
  message: L;
}

/** Check a "build a circuit" answer by simulating what the learner built. */
export function checkBuild(task: BuildTask, circuit: Circuit): BuildCheck {
  const result = simulateCircuit(circuit, { shots: 1 });
  if (!result.ok) return { correct: false, message: result.message };

  if (result.measuredQubits.length !== task.qubits) {
    return {
      correct: false,
      message: {
        en: task.qubits === 1 ? "Add a measurement (M) at the end." : "Measure every qubit: add M at the end of each wire.",
        hi: task.qubits === 1 ? "End mein measurement (M) lagao." : "Har qubit measure karo: har wire ke end mein M lagao.",
      },
    };
  }

  const used = new Set(circuit.gates.map((g) => g.type));
  const forbidden = (task.mustNotUse ?? []).find((g) => used.has(g));
  if (forbidden) {
    return {
      correct: false,
      message: {
        en: `This task asks you not to use the ${forbidden} gate.`,
        hi: `Is task mein ${forbidden} gate use nahi karna hai.`,
      },
    };
  }
  const missing = (task.mustUse ?? []).find((g) => !used.has(g));
  if (missing) {
    return {
      correct: false,
      message: {
        en: `This task asks you to use the ${missing} gate.`,
        hi: `Is task mein ${missing} gate use karna hai.`,
      },
    };
  }

  const matches = Object.entries(task.target).every(
    ([label, probability]) => Math.abs((result.probabilities[label] ?? 0) - probability) < 0.02
  );
  if (!matches) {
    const got = Object.entries(result.probabilities)
      .filter(([, p]) => p > 0.005)
      .map(([label, p]) => `${Math.round(p * 100)}% |${label}⟩`)
      .join(" + ");
    return {
      correct: false,
      message: {
        en: `Your circuit runs, but it gives ${got}. That is not what the task asks for.`,
        hi: `Aapka circuit run hota hai, lekin yeh ${got} deta hai. Task yeh nahi maang raha.`,
      },
    };
  }
  return {
    correct: true,
    message: { en: "Your circuit does exactly what was asked.", hi: "Aapka circuit exactly wahi karta hai jo maanga gaya tha." },
  };
}
