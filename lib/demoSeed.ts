/**
 * "Start Demo" data.
 *
 * This builds an ILLUSTRATIVE learner so judges can see a populated dashboard
 * straight away. It is not real learner data: every record is flagged
 * `seeded`, it lives in its own storage slot, and the UI shows a DEMO DATA
 * label while it is active.
 */

import { quizFor } from "@/data/quizzes";
import { finalize } from "./actions";
import { createEvent } from "./analytics";
import {
  createInitialState,
  dayKey,
  newId,
  type AppState,
  type AssessmentAttempt,
  type PredictionRecord,
  type TelemetryEvent,
} from "./storage";
import type { TopicId } from "./types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const DEMO_LEARNER_NAME = "Raaj";

export function buildDemoState(now: number = Date.now()): AppState {
  const state = createInitialState("demo");
  const events: TelemetryEvent[] = [];
  const predictions: PredictionRecord[] = [];

  const ev = (
    type: TelemetryEvent["type"],
    at: number,
    data: Partial<Pick<TelemetryEvent, "topic" | "detail" | "meta">> = {}
  ) => events.push(createEvent(type, { ...data, at, seeded: true }));

  const experiment = (
    at: number,
    source: PredictionRecord["source"],
    topic: TopicId,
    circuit: string,
    gates: string,
    prediction: string,
    actual: string,
    correct: boolean,
    challengeId?: string
  ) => {
    predictions.push({
      id: newId("pr"),
      at,
      source,
      topic,
      circuit,
      prediction,
      actual,
      correct,
      challengeId,
      seeded: true,
    });
    ev("predictionSubmitted", at - 20000, { topic, detail: circuit });
    ev("circuitExecuted", at, { topic, detail: circuit, meta: { gates, source } });
    ev(correct ? "predictionCorrect" : "predictionWrong", at + 1000, { topic, detail: circuit });
  };

  const assessment = (at: number, topic: TopicId, wrongIndexes: number[]): AssessmentAttempt => {
    const questions = quizFor(topic);
    const answers = questions.map((q, i) => ({
      questionId: q.id,
      concept: q.concept,
      correct: !wrongIndexes.includes(i),
    }));
    const score = answers.filter((a) => a.correct).length;
    ev("quizStarted", at - 4 * 60000, { topic });
    ev("quizCompleted", at, { topic, detail: `${score}/${answers.length}`, meta: { score, total: answers.length } });
    return { id: newId("as"), at, topic, score, total: answers.length, answers, seeded: true };
  };

  // ---- Day 1 (three days ago): Qubit Fundamentals -------------------------
  const d1 = now - 3 * DAY;
  ev("lessonOpened", d1, { topic: "qubit" });
  experiment(d1 + 5 * 60000, "lesson", "gates", "q0: X → M", "X,M", "100% |0⟩", "100% |1⟩", false);
  ev("lessonCompleted", d1 + 8 * 60000, { topic: "qubit" });
  experiment(d1 + 12 * 60000, "practice", "qubit", "q0: M", "M", "100% |0⟩", "100% |0⟩", true, "fresh-qubit");
  const a1 = assessment(d1 + 20 * 60000, "qubit", []);

  // ---- Day 2: Quantum Gates -----------------------------------------------
  const d2 = now - 2 * DAY;
  ev("lessonOpened", d2, { topic: "gates" });
  ev("lessonCompleted", d2 + 9 * 60000, { topic: "gates" });
  experiment(d2 + 12 * 60000, "practice", "gates", "q0: X → M", "X,M", "100% |1⟩", "100% |1⟩", true, "x-on-zero");
  ev("hintRequested", d2 + 14 * 60000, { topic: "gates", detail: "x-twice" });
  experiment(d2 + 15 * 60000, "practice", "gates", "q0: X → X → M", "X,M", "|0⟩ — back where it started", "100% |0⟩", true, "x-twice");
  experiment(d2 + 17 * 60000, "practice", "gates", "q0: X → X → M", "X,M", "|0⟩ — back where it started", "100% |0⟩", true, "x-twice");
  experiment(d2 + 20 * 60000, "practice", "gates", "q0: Z → M", "Z,M", "100% |0⟩", "100% |0⟩", true, "z-on-zero");
  experiment(d2 + 26 * 60000, "lab", "gates", "q0: Y → M", "Y,M", "50% |0⟩ + 50% |1⟩", "100% |1⟩", false);
  const a2 = assessment(d2 + 35 * 60000, "gates", [3]); // missed the Z gate question

  // ---- Day 3: Superposition & Measurement ----------------------------------
  const d3 = now - 1 * DAY;
  ev("lessonOpened", d3, { topic: "superposition" });
  ev("lessonCompleted", d3 + 10 * 60000, { topic: "superposition" });
  ev("lessonOpened", d3 + 11 * 60000, { topic: "gates" });
  ev("topicRevisited", d3 + 11 * 60000, { topic: "gates" });
  experiment(d3 + 14 * 60000, "practice", "superposition", "q0: H → M", "H,M", "An equal superposition of |0⟩ and |1⟩", "≈50% |0⟩ + ≈50% |1⟩", true, "h-state");
  ev("hintRequested", d3 + 16 * 60000, { topic: "superposition", detail: "h-measure" });
  experiment(d3 + 17 * 60000, "practice", "superposition", "q0: H → M", "H,M", "100% |1⟩", "≈49% |0⟩ + ≈51% |1⟩", false, "h-measure");
  experiment(d3 + 22 * 60000, "practice", "superposition", "q0: H → H → M", "H,M", "100% |0⟩", "100% |0⟩", true, "h-twice");
  experiment(d3 + 30 * 60000, "lab", "superposition", "q0: H → M", "H,M", "50% |0⟩ + 50% |1⟩", "≈51% |0⟩ + ≈49% |1⟩", true);
  experiment(d3 + 36 * 60000, "lab", "superposition", "q0: H → Z → M", "H,Z,M", "100% |0⟩", "≈50% |0⟩ + ≈50% |1⟩", false);

  // ---- Today ---------------------------------------------------------------
  const d4 = now - 2 * HOUR;
  ev("lessonOpened", d4, { topic: "superposition" });
  ev("topicRevisited", d4, { topic: "superposition" });
  ev("hintRequested", d4 + 2 * 60000, { topic: "superposition", detail: "h-measure" });
  experiment(d4 + 4 * 60000, "practice", "superposition", "q0: H → M", "H,M", "100% |0⟩", "≈50% |0⟩ + ≈50% |1⟩", false, "h-measure");
  ev("hintRequested", d4 + 9 * 60000, { topic: "superposition", detail: "h-twice" });
  experiment(d4 + 12 * 60000, "lab", "superposition", "q0: H → X → M", "H,X,M", "50% |0⟩ + 50% |1⟩", "≈48% |0⟩ + ≈52% |1⟩", true);
  ev("aiExplanationRequested", d4 + 14 * 60000, { topic: "superposition" });
  const a3 = assessment(d4 + 25 * 60000, "superposition", [2, 3]); // missed Measurement and Interference

  events.sort((a, b) => a.at - b.at);
  predictions.sort((a, b) => a.at - b.at);

  const seeded: AppState = {
    ...state,
    profile: {
      name: DEMO_LEARNER_NAME,
      role: "learner",
      pythonLevel: "basics",
      language: "en",
      onboarded: true,
      createdAt: d1,
    },
    events,
    predictions,
    practice: {
      "fresh-qubit": { attempts: 1, correctAttempts: 1, solved: true, firstTry: true, lastAt: d1 },
      "x-on-zero": { attempts: 1, correctAttempts: 1, solved: true, firstTry: true, lastAt: d2 },
      "x-twice": { attempts: 2, correctAttempts: 2, solved: true, firstTry: true, lastAt: d2 },
      "z-on-zero": { attempts: 1, correctAttempts: 1, solved: true, firstTry: true, lastAt: d2 },
      "h-state": { attempts: 1, correctAttempts: 1, solved: true, firstTry: true, lastAt: d3 },
      "h-twice": { attempts: 1, correctAttempts: 1, solved: true, firstTry: true, lastAt: d3 },
      "h-measure": { attempts: 2, correctAttempts: 0, solved: false, firstTry: false, lastAt: d4 },
    },
    assessments: [a1, a2, a3],
    lessons: {
      qubit: { opens: 1, step: 4, completed: true },
      gates: { opens: 2, step: 4, completed: true },
      superposition: { opens: 2, step: 4, completed: true },
    },
    activeDays: [dayKey(d1), dayKey(d2), dayKey(d3), dayKey(now)],
    lastExperiment: {
      at: d4 + 12 * 60000,
      source: "lab",
      topic: "superposition",
      circuit: "q0: H → X → M",
      prediction: "50% |0⟩ + 50% |1⟩",
      actual: "≈48% |0⟩ + ≈52% |1⟩",
      correct: true,
      steps: [
        { en: "Every qubit starts in |0⟩.", hi: "Har qubit |0⟩ se start hota hai." },
        {
          en: "H on q0: |0⟩ becomes an equal superposition — a 50/50 blend of |0⟩ and |1⟩.",
          hi: "q0 par H gate: |0⟩ ek equal superposition ban jaata hai — |0⟩ aur |1⟩ dono ki probability 50-50.",
        },
        {
          en: "X on q0 swaps the |0⟩ and |1⟩ parts. In an equal superposition that changes nothing you can measure — the odds stay 50/50.",
          hi: "q0 par X gate |0⟩ aur |1⟩ parts ko swap karta hai. Equal superposition mein isse measurement par koi farak nahi padta — probability 50-50 hi rehti hai.",
        },
      ],
      summary: {
        en: "So you see |0⟩ or |1⟩, about 50% each.",
        hi: "Isliye |0⟩ ya |1⟩ dikhta hai, lagbhag 50% each.",
      },
    },
  };

  // Award the unlocks and achievements this illustrative record has earned…
  const awarded = finalize(seeded, true);

  // …then place them at the moment in the illustrative timeline where they would have happened.
  const when: Record<string, number> = {
    "First Prediction": d1 + 5 * 60000 + 2000,
    "First Circuit": d1 + 5 * 60000 + 3000,
    "Mastery Unlocked": d1 + 20 * 60000 + 3000,
    "Prediction Master": d2 + 20 * 60000 + 2000,
    "Superposition Starter": d3 + 14 * 60000 + 2000,
    "Quantum Explorer": d3 + 14 * 60000 + 3000,
    qubit: d1 + 20 * 60000 + 2000,
    gates: d2 + 35 * 60000 + 2000,
  };
  const timeline = awarded.events
    .map((e) => {
      if (e.type === "achievementEarned" && e.detail && when[e.detail]) return { ...e, at: when[e.detail] };
      if (e.type === "topicUnlocked" && typeof e.meta?.from === "string" && when[e.meta.from]) {
        return { ...e, at: when[e.meta.from] };
      }
      return e;
    })
    .sort((a, b) => a.at - b.at);

  return { ...awarded, events: timeline, activeDays: seeded.activeDays };
}
