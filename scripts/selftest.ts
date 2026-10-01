/**
 * Engine self-test. Run with:  npm run test:engine
 * Checks the simulator, prediction builder, mastery rules, recommendations,
 * tutor and demo data without opening a browser.
 */

import { ACHIEVEMENTS } from "../data/achievements";
import { CHALLENGES } from "../data/challenges";
import { LESSONS } from "../data/concepts";
import { QUIZZES } from "../data/quizzes";
import { INTERACTIVE_TOPICS } from "../data/topics";
import { completeLesson, finalize, recordAssessment, recordExperiment, track } from "../lib/actions";
import { answerQuestion, SUGGESTED_QUESTIONS } from "../lib/aiTutor";
import { computeInsights } from "../lib/analytics";
import { buildDemoState } from "../lib/demoSeed";
import { explainCircuit } from "../lib/explain";
import { currentTopic, loopPosition, topicMastery, topicStatus } from "../lib/mastery";
import { buildPredictionOptions } from "../lib/prediction";
import { buildCircuit, simulateCircuit, type GateType } from "../lib/quantumSimulator";
import { getRecommendation } from "../lib/recommendationEngine";
import { createInitialState, type AppState } from "../lib/storage";

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

type Spec = Array<[GateType, number, number, number?]>;
const probs = (qubits: number, spec: Spec) => {
  const r = simulateCircuit(buildCircuit(qubits, spec));
  if (!r.ok) throw new Error(`unexpected error: ${r.code}`);
  return r.probabilities;
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

// --- Simulator -------------------------------------------------------------
console.log("Simulator");
check("fresh qubit measures 0", near(probs(1, [["M", 0, 0]])["0"], 1));
check("X flips to 1", near(probs(1, [["X", 0, 0], ["M", 0, 1]])["1"], 1));
check("X twice returns to 0", near(probs(1, [["X", 0, 0], ["X", 0, 1], ["M", 0, 2]])["0"], 1));
check("Y flips to 1", near(probs(1, [["Y", 0, 0], ["M", 0, 1]])["1"], 1));
check("Z leaves 0", near(probs(1, [["Z", 0, 0], ["M", 0, 1]])["0"], 1));
const h = probs(1, [["H", 0, 0], ["M", 0, 1]]);
check("H gives 50/50", near(h["0"], 0.5) && near(h["1"], 0.5));
check("H twice returns to 0", near(probs(1, [["H", 0, 0], ["H", 0, 1], ["M", 0, 2]])["0"], 1));
check("H Z H gives 1", near(probs(1, [["H", 0, 0], ["Z", 0, 1], ["H", 0, 2], ["M", 0, 3]])["1"], 1));
const bell = probs(2, [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]]);
check("Bell pair gives 00/11", near(bell["00"], 0.5) && near(bell["11"], 0.5) && near(bell["01"], 0) && near(bell["10"], 0));
check("X then CX gives 11", near(probs(2, [["X", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]])["11"], 1));
check("CX with control 0 does nothing", near(probs(2, [["CX", 0, 0, 1], ["M", 0, 1], ["M", 1, 1]])["00"], 1));
check("reverse CX (q1 controls q0)", near(probs(2, [["X", 1, 0], ["CX", 1, 1, 0], ["M", 0, 2], ["M", 1, 2]])["11"], 1));
check("measuring only q1", near(probs(2, [["X", 1, 0], ["M", 1, 1]])["1"], 1));

const run = simulateCircuit(buildCircuit(1, [["H", 0, 0], ["M", 0, 1]]), { shots: 1024 });
if (run.ok) {
  const total = Object.values(run.counts).reduce((a, b) => a + b, 0);
  check("shots add up", total === 1024);
  check("sampled counts are near 50%", Math.abs(run.counts["0"] / 1024 - 0.5) < 0.1);
  check("Bloch vector on equator after H", near(run.bloch[0].x, 1) && near(run.bloch[0].z, 0));
}
const bellRun = simulateCircuit(buildCircuit(2, [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]]));
if (bellRun.ok) {
  const v = bellRun.bloch[0];
  check("entangled qubit has no Bloch arrow", near(v.x, 0) && near(v.y, 0) && near(v.z, 0));
  const text = explainCircuit(bellRun);
  check("Bell explanation mentions entanglement", text.steps.some((s) => s.en.includes("entangled")));
}

// --- Validation errors -----------------------------------------------------
console.log("Validation");
const errorCode = (qubits: number, spec: Spec) => {
  const r = simulateCircuit(buildCircuit(qubits, spec));
  return r.ok ? "OK" : r.code;
};
check("empty circuit is rejected", errorCode(1, []) === "EMPTY");
check("no measurement is rejected", errorCode(1, [["H", 0, 0]]) === "NO_MEASUREMENT");
check("gate after measurement is rejected", errorCode(1, [["M", 0, 0], ["X", 0, 1]]) === "GATE_AFTER_MEASUREMENT");
check("CX after measurement is rejected", errorCode(2, [["M", 1, 0], ["CX", 0, 1, 1], ["M", 0, 2]]) === "GATE_AFTER_MEASUREMENT");

// --- Prediction options ----------------------------------------------------
console.log("Prediction options");
for (const challenge of CHALLENGES) {
  const set = buildPredictionOptions(buildCircuit(challenge.circuit.qubits, challenge.circuit.gates));
  check(`options for ${challenge.id}`, !!set && set.options.some((o) => o.id === set.correctId));
  if (set) {
    const ids = set.options.map((o) => o.id);
    check(`unique options for ${challenge.id}`, new Set(ids).size === ids.length);
  }
  if (challenge.options !== "auto") {
    check(`${challenge.id} has a valid correct option`, challenge.options.some((o) => o.id === challenge.correctId));
  }
}

// --- Content ---------------------------------------------------------------
console.log("Content");
for (const topic of ["python", ...INTERACTIVE_TOPICS] as const) {
  check(`${topic} has a lesson`, !!LESSONS[topic]);
  const quiz = QUIZZES[topic] ?? [];
  check(`${topic} has 5 questions`, quiz.length === 5);
  quiz.forEach((q) => check(`${q.id} answer in range`, q.answer >= 0 && q.answer < q.options.length));
}

// --- Mastery, unlocking, recommendations -----------------------------------
console.log("Mastery and recommendations");
let s: AppState = createInitialState();
s = { ...s, profile: { name: "Test", role: "learner", pythonLevel: "beginner", language: "en", onboarded: true, createdAt: Date.now() } };
check("beginner is sent to Python first", getRecommendation(s).ruleId === "python-first");
s = { ...s, profile: { ...s.profile!, pythonLevel: "comfortable" } };
check("fresh learner starts the first lesson", getRecommendation(s).ruleId === "finish-lesson");
check("fresh learner is at Learn", loopPosition(s) === "Learn");
check("gates locked at the start", topicStatus(s, "gates") === "LOCKED");

s = finalize(completeLesson(s, "qubit"));
check("after the lesson: Predict", loopPosition(s) === "Predict");
check("after the lesson: practice is recommended", getRecommendation(s).ruleId === "finish-practice");

const experiment = (state: AppState, challengeId: string, topic: "qubit" | "gates" | "superposition", correct: boolean, gates = "M") =>
  finalize(
    recordExperiment(state, {
      source: "practice", topic, circuit: "q0: M", gates, prediction: "x", actual: "y", correct,
      steps: [], summary: { en: "", hi: "" }, challengeId,
    })
  );
s = experiment(s, "fresh-qubit", "qubit", true);
check("practice done → mastery check recommended", getRecommendation(s).ruleId === "take-mastery-check");
check("first prediction achievement", !!s.achievements["first-prediction"]);
check("first circuit achievement", !!s.achievements["first-circuit"]);

const answers = (topic: "qubit" | "gates", wrong: number) =>
  (QUIZZES[topic] ?? []).map((q, i) => ({ questionId: q.id, concept: q.concept, correct: i >= wrong }));
s = finalize(recordAssessment(s, "qubit", answers("qubit", 2))); // 3/5 = 60%
check("60% does not unlock", topicStatus(s, "gates") === "LOCKED");
check("low score → review weak concept", getRecommendation(s).ruleId === "review-weak-concept");
check("weak concepts found", computeInsights(s).weakConcepts.length > 0);

s = finalize(recordAssessment(s, "qubit", answers("qubit", 1))); // 4/5 = 80%
check("80% masters the topic", topicStatus(s, "qubit") === "MASTERED");
check("next topic unlocked", topicStatus(s, "gates") === "AVAILABLE");
check("current topic moves on", currentTopic(s) === "gates");
check("next-topic recommendation", getRecommendation(s).ruleId === "next-topic");
check("mastery achievement", !!s.achievements["mastery-unlocked"]);
check("unlock event recorded", s.events.some((e) => e.type === "topicUnlocked"));

// A failed lab run must not take a mastered topic away.
s = track(s, "executionError", { detail: "NO_MEASUREMENT" });
check("mastered topic stays mastered after an error", topicStatus(s, "qubit") === "MASTERED");
s = track(track(s, "executionError"), "executionError");
check("repeated errors → circuit review", getRecommendation(s).ruleId === "circuit-errors");

// Threshold is configurable.
const strict = { ...s, settings: { masteryThreshold: 100 } };
check("raising the threshold re-locks", topicMastery(strict, "qubit").assessmentPassed === false);

// --- Demo data ---------------------------------------------------------------
console.log("Demo data");
const demo = buildDemoState();
const insights = computeInsights(demo);
check("demo: 14 predictions", insights.prediction.total === 14, String(insights.prediction.total));
check("demo: 9 correct", insights.prediction.correct === 9, String(insights.prediction.correct));
check("demo: practice accuracy 78%", insights.practice.accuracy === 78, String(insights.practice.accuracy));
check("demo: 4 hints", insights.hintsRequested === 4);
check("demo: streak of 4", insights.streak === 4, String(insights.streak));
check("demo: current topic is superposition", currentTopic(demo) === "superposition");
check("demo: prediction practice recommended", getRecommendation(demo).ruleId === "prediction-practice");
check("demo: every record is flagged", demo.events.every((e) => e.seeded) && demo.predictions.every((p) => p.seeded));
console.log(`  demo snapshot → mastery ${insights.conceptMastery}%, XP ${insights.xp}, level ${insights.level}, achievements ${Object.keys(demo.achievements).length}/${ACHIEVEMENTS.length}`);

// --- Tutor -------------------------------------------------------------------
console.log("Tutor");
const expected = ["qubit", "h-gate", "superposition", "measurement", "why-result", "why-wrong", "next", "bit-vs-qubit"];
SUGGESTED_QUESTIONS.forEach((q, i) => {
  const en = answerQuestion(q.en, demo, "en");
  const hi = answerQuestion(q.hi, demo, "hi");
  check(`EN "${q.en}" → ${expected[i]}`, en.intent === expected[i], `(got ${en.intent})`);
  check(`HI "${q.hi}" → ${expected[i]}`, hi.intent === expected[i], `(got ${hi.intent})`);
  check(`answer not empty for "${q.en}"`, en.text.length > 0 && hi.text.length > 0);
});
check("tutor admits what it cannot answer", answerQuestion("who won the cricket match", demo, "en").intent === "fallback");
check("tutor is honest about what it is", answerQuestion("are you a trained AI model?", demo, "en").text[0].includes("not a trained AI model"));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
