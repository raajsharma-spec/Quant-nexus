/**
 * "Start Demo" data.
 *
 * This builds an ILLUSTRATIVE learner so judges can see a populated dashboard
 * straight away: two concepts mastered, and Superposition in progress at the
 * Predict stage. It is not real learner data: every record is flagged
 * `seeded`, it lives in its own storage slot, and the UI shows a DEMO DATA
 * label while it is active.
 *
 * The demo learner is not hand-written numbers. It is produced by REPLAYING a
 * scripted session through the same functions a real learner triggers
 * (lib/actions.ts) with the real simulator and the real evaluators — so every
 * score, misconception and unlock on screen follows the product's actual rules.
 */

import { coreExperiment, learnBlockIds } from "@/data/concepts";
import { conceptContent } from "@/data/curriculum";
import { rubricById } from "@/data/explanations";
import { questionById } from "@/data/quizzes";
import * as A from "./actions";
import { assessmentSlots, BUILD_SLOT, WRITE_SLOT } from "./adaptiveAssessment";
import { answerQuestion } from "./aiTutor";
import { experimentInput } from "./experiment";
import { evaluateExplanation } from "./explanationEvaluator";
import { detectInText } from "./misconceptions";
import { buildPredictionOptions, distributionLabel } from "./prediction";
import { buildCircuit, describeCircuit, simulateCircuit, type GateSpec, type SimulationSuccess } from "./quantumSimulator";
import { chooseChallenge } from "./review";
import { createInitialState, type AppState } from "./storage";
import type { Confidence, TopicId } from "./types";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const DEMO_LEARNER_NAME = "Raaj";

/** A small seeded random generator so the demo's measurement counts are repeatable. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemoState(now: number = Date.now()): AppState {
  const realNow = Date.now;
  let clock = now;
  const random = seededRandom(26140);
  let state: AppState = createInitialState("demo");

  /** Move the scripted clock, then apply an action and the usual bookkeeping. */
  const at = (time: number, change: (s: AppState) => AppState) => {
    clock = time;
    state = A.finalize(change(state), true);
  };

  const run = (qubits: number, gates: GateSpec[]): { circuit: ReturnType<typeof buildCircuit>; result: SimulationSuccess } => {
    const circuit = buildCircuit(qubits, gates);
    const result = simulateCircuit(circuit, { shots: 1024, random });
    if (!result.ok) throw new Error(`Demo circuit failed: ${result.code}`);
    return { circuit, result };
  };

  /** A predict → run cycle outside the journey (lab or practice). */
  const experiment = (
    time: number,
    source: "lab" | "practice",
    topic: TopicId,
    qubits: number,
    gates: GateSpec[],
    predicted: Record<string, number>,
    confidence: Confidence,
    challengeId?: string
  ) => {
    const { circuit, result } = run(qubits, gates);
    const options = buildPredictionOptions(circuit);
    const label = distributionLabel(predicted);
    const correct = !!options && options.options.find((o) => o.label.en === label)?.id === options.correctId;
    at(time, (s) => A.track(s, "predictionSubmitted", { topic, detail: describeCircuit(circuit), meta: { confidence } }));
    at(time + 20000, (s) =>
      A.recordExperiment(
        s,
        experimentInput({ circuit, result, source, topic, predictionLabel: label, predicted, correct, confidence, challengeId })
      )
    );
  };

  /** Work through every stage of one concept, as scripted. */
  const journey = (
    topic: TopicId,
    start: number,
    script: {
      tutorQuestion: string;
      predicted: Record<string, number>;
      confidence: Confidence;
      explanations: string[];
      /** Slot → index of the option chosen in the first mastery check (missing = correct). */
      wrongFirst: Record<string, number>;
      writeAnswer: string;
      /** Wrong first prediction for the Next Challenge, if any. */
      challengeMiss?: Record<string, number>;
      stopAfter?: "ask";
    }
  ) => {
    const content = conceptContent(topic)!;
    const core = coreExperiment(topic)!;
    let t = start;
    const step = (minutes: number) => (t += minutes * MINUTE);

    at(t, (s) => A.openStage(s, topic, "discover"));
    at(step(1), (s) => A.completeDiscover(s, topic));

    const blocks = learnBlockIds(topic);
    at(step(0.2), (s) => A.openStage(s, topic, "learn"));
    blocks.forEach((block) => at(step(1.2), (s) => A.markLearnRead(s, topic, block, blocks.length)));

    at(step(0.2), (s) => A.openStage(s, topic, "watch"));
    content.lesson.scenes.forEach((_, index) =>
      at(step(0.2), (s) => A.markWatched(s, topic, index, content.lesson.scenes.length))
    );

    at(step(0.2), (s) => A.openStage(s, topic, "interact"));
    for (let i = 0; i < A.INTERACTION_TARGET; i++) at(step(0.3), (s) => A.recordInteraction(s, topic));

    at(step(0.2), (s) => A.openStage(s, topic, "experiment"));
    content.sandbox.goals.forEach((goal) =>
      at(step(0.8), (s) => A.reachGoal(s, topic, goal.id, content.sandbox.goals.length))
    );

    at(step(0.2), (s) => A.openStage(s, topic, "ask"));
    at(step(1), (s) => {
      const reply = answerQuestion(script.tutorQuestion, s, "en", { topic, stage: "ask" });
      return A.recordTutorQuestion(
        s,
        { topic, stage: "ask", mode: reply.mode, question: script.tutorQuestion, sources: reply.sources.map((x) => x.id), inJourney: true },
        detectInText(script.tutorQuestion).filter((d) => d.confidence >= 0.7)
      );
    });
    if (script.stopAfter === "ask") {
      at(step(0.5), (s) => A.openStage(s, topic, "predict"));
      return;
    }

    // Predict → Run → Observe on the concept's core experiment.
    const { circuit, result } = run(core.circuit.qubits, core.circuit.gates);
    const options = buildPredictionOptions(circuit)!;
    const label = distributionLabel(script.predicted);
    const chosen = options.options.find((o) => o.label.en === label) ?? options.options[0];
    const correct = chosen.id === options.correctId;
    at(step(0.3), (s) => A.openStage(s, topic, "predict"));
    at(step(1), (s) =>
      A.submitStagePrediction(
        s,
        topic,
        { optionId: chosen.id, label: chosen.label.en, distribution: chosen.distribution, confidence: script.confidence, at: clock },
        describeCircuit(circuit)
      )
    );
    at(step(0.3), (s) => A.openStage(s, topic, "run"));
    at(step(0.5), (s) =>
      A.recordStageRun(
        s,
        topic,
        {
          at: clock,
          circuit: describeCircuit(circuit),
          shots: result.shots,
          counts: result.counts,
          probabilities: result.probabilities,
          measured: result.measuredQubits,
          backend: "browser",
          predictionCorrect: correct,
        },
        experimentInput({
          circuit,
          result,
          source: "lesson",
          topic,
          predictionLabel: chosen.label.en,
          predicted: chosen.distribution,
          correct,
          confidence: script.confidence,
        })
      )
    );
    at(step(0.3), (s) => A.openStage(s, topic, "observe"));
    at(step(0.5), (s) => A.recordObservation(s, topic, "most", true, 2));
    at(step(0.5), (s) => A.recordObservation(s, topic, "why", true, 2));

    // Explain: each scripted attempt is scored by the real evaluator.
    const rubric = rubricById(content.explainRubric)!;
    at(step(0.3), (s) => A.openStage(s, topic, "explain"));
    script.explanations.forEach((text) =>
      at(step(2), (s) =>
        A.recordExplanation(s, {
          topic,
          rubricId: rubric.id,
          mode: "written",
          text,
          result: evaluateExplanation(text, rubric),
          purpose: "explain",
        })
      )
    );

    // Assess: a full adaptive check, then a targeted retry on what was missed.
    const writeRubric = rubricById(content.assessment.writeRubric)!;
    const writeResult = evaluateExplanation(script.writeAnswer, writeRubric);
    at(step(0.3), (s) => A.openStage(s, topic, "assess"));
    at(step(0.2), (s) => A.track(s, "quizStarted", { topic }));
    at(step(5), (s) => {
      const withWriting = A.recordExplanation(s, {
        topic,
        rubricId: writeRubric.id,
        mode: "written",
        text: script.writeAnswer,
        result: writeResult,
        purpose: "assess",
      });
      const results: A.AssessItemResult[] = assessmentSlots(topic).map((slot) => {
        if (slot === BUILD_SLOT) return { slot, itemId: content.assessment.build.id, credit: 1, difficulty: 2 };
        if (slot === WRITE_SLOT) return { slot, itemId: writeRubric.id, credit: writeResult.score / 100, difficulty: 2 };
        const bank = DEMO_FIRST_QUESTIONS[topic]?.[slot];
        const question = questionById(bank ?? "")!;
        const wrong = script.wrongFirst[slot];
        return {
          slot,
          itemId: question.id,
          credit: wrong === undefined ? 1 : 0,
          difficulty: question.difficulty,
          chosen: wrong ?? question.answer,
        };
      });
      return A.recordStageAssessment(withWriting, topic, results, "full");
    });
    const missedSlots = Object.keys(script.wrongFirst);
    if (missedSlots.length > 0) {
      at(step(3), (s) =>
        A.recordStageAssessment(
          s,
          topic,
          missedSlots.map((slot) => {
            const question = questionById(DEMO_RETRY_QUESTIONS[topic]?.[slot] ?? "")!;
            return { slot, itemId: question.id, credit: 1, difficulty: question.difficulty, chosen: question.answer };
          }),
          "targeted"
        )
      );
    }

    // Review, then the challenge the engine picks for this learner's weak area.
    at(step(0.3), (s) => A.openStage(s, topic, "review"));
    at(step(0.2), (s) => A.startReview(s, topic));
    at(step(2), (s) => A.completeReview(s, topic));
    at(step(0.3), (s) => A.openStage(s, topic, "challenge"));
    const choice = chooseChallenge(state, topic);
    if (choice) {
      const challenge = choice.challenge;
      at(step(0.2), (s) => A.setStageChallenge(s, topic, challenge.id));
      const attempt = (predicted: Record<string, number>) => {
        const built = run(challenge.circuit.qubits, challenge.circuit.gates);
        const set = buildPredictionOptions(built.circuit)!;
        const text = distributionLabel(predicted);
        const option = set.options.find((o) => o.label.en === text) ?? set.options[0];
        at(step(1.5), (s) =>
          A.recordStageChallenge(
            s,
            topic,
            experimentInput({
              circuit: built.circuit,
              result: built.result,
              source: "challenge",
              topic,
              predictionLabel: option.label.en,
              predicted: option.distribution,
              correct: option.id === set.correctId,
              confidence: "medium",
              challengeId: challenge.id,
            })
          )
        );
      };
      if (script.challengeMiss) attempt(script.challengeMiss);
      const solved = run(challenge.circuit.qubits, challenge.circuit.gates);
      attempt(solved.result.probabilities);
    }
  };

  try {
    Date.now = () => clock;

    // ---- Day 1 (three days ago): Qubit Fundamentals ---------------------------
    const d1 = now - 3 * DAY;
    at(d1, (s) => A.completeOnboarding(A.enterAsLearner(s, DEMO_LEARNER_NAME), "en"));
    journey("qubit", d1 + MINUTE, {
      tutorQuestion: "What is a qubit?",
      predicted: { "0": 1, "1": 0 }, // thought X would change nothing
      confidence: "medium",
      explanations: [
        "The X gate flips the qubit so we always get 1.",
        "The qubit starts in 0. X flips it to 1, which is a definite state, so every run gives 1.",
      ],
      wrongFirst: { Measurement: 0 },
      writeAnswer: "A fresh qubit starts in 0 and no gate changed it, so it is a definite state and every run gives 0.",
    });

    // ---- Day 2: Quantum Gates -------------------------------------------------
    const d2 = now - 2 * DAY;
    journey("gates", d2, {
      tutorQuestion: "What does the Z gate do?",
      predicted: { "0": 1, "1": 0 },
      confidence: "high",
      explanations: [
        "Z only changes the phase of the 1 part. The state 0 has no 1 part, so the probabilities stay the same and it is still 0 every time.",
      ],
      wrongFirst: { "Z gate": 0 },
      writeAnswer:
        "The first X flips 0 to 1 and the second X flips it back, so the result is always 0. This shows gates can be undone: X is its own inverse.",
      challengeMiss: { "0": 1, "1": 0 },
    });
    experiment(d2 + 70 * MINUTE, "practice", "gates", 1, [["X", 0, 0], ["M", 0, 1]], { "0": 0, "1": 1 }, "high", "x-on-zero");
    at(d2 + 74 * MINUTE, (s) => A.track(s, "hintRequested", { topic: "gates", detail: "x-twice" }));
    experiment(d2 + 75 * MINUTE, "practice", "gates", 1, [["X", 0, 0], ["X", 0, 1], ["M", 0, 2]], { "0": 1, "1": 0 }, "medium", "x-twice");
    experiment(d2 + 82 * MINUTE, "lab", "gates", 1, [["Y", 0, 0], ["M", 0, 1]], { "0": 0.5, "1": 0.5 }, "low");
    experiment(d2 + 88 * MINUTE, "practice", "gates", 1, [["Y", 0, 0], ["M", 0, 1]], { "0": 0, "1": 1 }, "medium", "y-on-zero");

    // ---- Day 3: Superposition & Measurement, up to the Predict stage ----------
    const d3 = now - 1 * DAY;
    journey("superposition", d3, {
      tutorQuestion: "I think superposition means the qubit is just randomly 0 or 1.",
      predicted: {},
      confidence: "medium",
      explanations: [],
      wrongFirst: {},
      writeAnswer: "",
      stopAfter: "ask",
    });
    experiment(d3 + 40 * MINUTE, "lab", "superposition", 1, [["H", 0, 0], ["H", 0, 1], ["M", 0, 2]], { "0": 0.5, "1": 0.5 }, "medium");
    at(d3 + 44 * MINUTE, (s) => A.track(s, "hintRequested", { topic: "superposition", detail: "tutor" }));

    // ---- Today ---------------------------------------------------------------
    const d4 = now - 2 * HOUR;
    at(d4, (s) => A.openStage(s, "superposition", "predict"));
    experiment(d4 + 4 * MINUTE, "lab", "superposition", 1, [["H", 0, 0], ["X", 0, 1], ["M", 0, 2]], { "0": 1, "1": 0 }, "medium");
    experiment(d4 + 9 * MINUTE, "lab", "superposition", 1, [["H", 0, 0], ["M", 0, 1]], { "0": 0.5, "1": 0.5 }, "high");
  } finally {
    Date.now = realNow;
  }

  // Flag every record as demo data.
  const seeded = <T extends object>(item: T): T => ({ ...item, seeded: true });
  return {
    ...state,
    mode: "demo",
    events: state.events.map(seeded),
    predictions: state.predictions.map(seeded),
    assessments: state.assessments.map(seeded),
    explanations: state.explanations.map(seeded),
    misconceptions: state.misconceptions.map(seeded),
    tutorLog: state.tutorLog.map(seeded),
    runs: state.runs.map(seeded),
  };
}

/** The questions the scripted learner meets first in each mastery-check slot. */
const DEMO_FIRST_QUESTIONS: Partial<Record<TopicId, Record<string, string>>> = {
  qubit: { "Bit vs qubit": "qubit-1", "Ket notation": "qubit-2", Measurement: "qubit-3", Probability: "qubit-4" },
  gates: { "X gate": "gates-1", "H gate": "gates-3", "Z gate": "gates-4", "Y gate": "gates-5" },
};

/** …and on the targeted retry. */
const DEMO_RETRY_QUESTIONS: Partial<Record<TopicId, Record<string, string>>> = {
  qubit: { Measurement: "qubit-9" },
  gates: { "Z gate": "gates-11" },
};
