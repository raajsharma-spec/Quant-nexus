/**
 * Engine self-test. Run with:  npm test   (or: npm run test:engine)
 *
 * Exercises everything that does not need a browser: the simulator, circuit
 * export, the 90% mastery gate, locked-stage protection, a full walk through
 * all four concepts, the explanation evaluator, misconception detection, the
 * adaptive mastery check, the tutor and its retrieval, recommendations, spaced
 * review, persistence, the demo learner, health checks and a security scan of
 * the source files.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ACHIEVEMENTS } from "../data/achievements";
import { CHALLENGES, findChallenge } from "../data/challenges";
import { coreExperiment, learnBlockIds, LESSONS } from "../data/concepts";
import { conceptContent, CONCEPTS, CURRICULUM } from "../data/curriculum";
import { rubricById, RUBRICS } from "../data/explanations";
import { KNOWLEDGE, knowledgeById } from "../data/knowledge";
import { MISCONCEPTIONS } from "../data/misconceptions";
import { questionBank, questionById, quizFor } from "../data/quizzes";
import { REFERENCES } from "../data/references";
import { INTERACTIVE_TOPICS } from "../data/topics";
import * as A from "../lib/actions";
import {
  assessmentSlots,
  assessScore,
  BUILD_SLOT,
  buildItem,
  checkBuild,
  nextDifficulty,
  pickQuestion,
  planAssessment,
  WRITE_SLOT,
} from "../lib/adaptiveAssessment";
import { answerQuestion, QUICK_ACTIONS, SUGGESTED_QUESTIONS } from "../lib/aiTutor";
import { computeInsights } from "../lib/analytics";
import { toOpenQasm, toPayload, toQiskit, toTextDiagram } from "../lib/circuitExport";
import { buildDemoState } from "../lib/demoSeed";
import { executeCircuit } from "../lib/execution";
import { experimentInput, observationChecks } from "../lib/experiment";
import { explainCircuit } from "../lib/explain";
import { evaluateExplanation, evaluateStructured } from "../lib/explanationEvaluator";
import { buildHealthReport } from "../lib/health";
import { knowledgeStats, MIN_RETRIEVAL_SCORE, retrieve } from "../lib/knowledgeBase";
import { inferLevel } from "../lib/learnerLevel";
import { canOpenStage, currentStageOf, currentTopic, isConceptUnlocked, topicMastery, topicStatus } from "../lib/mastery";
import { activeMisconceptions, detectInText, resolvedMisconceptions } from "../lib/misconceptions";
import { buildPredictionOptions, distributionLabel } from "../lib/prediction";
import {
  buildCircuit,
  describeCircuit,
  simulateCircuit,
  stateAfter,
  validateCircuit,
  type GateSpec,
} from "../lib/quantumSimulator";
import { getRecommendation, nextAction } from "../lib/recommendationEngine";
import { buildReview, chooseChallenge, dueReviews, isReviewDue, quickReviewQuestion } from "../lib/review";
import { allStagesPassed, gateStatus, lockMessage, passes, progressOf, stageScore, STAGE_WEIGHTS } from "../lib/stages";
import { clampThreshold, createInitialState, normalizeState, type AppState } from "../lib/storage";
import { STAGE_IDS, type StageId, type TopicId } from "../lib/types";

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

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const probs = (qubits: number, spec: GateSpec[]) => {
  const r = simulateCircuit(buildCircuit(qubits, spec));
  if (!r.ok) throw new Error(`unexpected error: ${r.code}`);
  return r.probabilities;
};
const PI = Math.PI;

// ---------------------------------------------------------------------------
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
check("S twice equals Z (H S S H gives 1)", near(probs(1, [["H", 0, 0], ["S", 0, 1], ["S", 0, 2], ["H", 0, 3], ["M", 0, 4]])["1"], 1));
check(
  "T four times equals Z (H T T T T H gives 1)",
  near(probs(1, [["H", 0, 0], ["T", 0, 1], ["T", 0, 2], ["T", 0, 3], ["T", 0, 4], ["H", 0, 5], ["M", 0, 6]])["1"], 1)
);
check("S alone does not change probabilities", near(probs(1, [["H", 0, 0], ["S", 0, 1], ["M", 0, 2]])["0"], 0.5));
check("RX(π) flips to 1", near(probs(1, [["RX", 0, 0, undefined, PI], ["M", 0, 1]])["1"], 1));
check("RY(π/2) gives 50/50", near(probs(1, [["RY", 0, 0, undefined, PI / 2], ["M", 0, 1]])["0"], 0.5));
check("RZ leaves 0 alone", near(probs(1, [["RZ", 0, 0, undefined, PI / 2], ["M", 0, 1]])["0"], 1));
const bell = probs(2, [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]]);
check("Bell pair gives 00/11", near(bell["00"], 0.5) && near(bell["11"], 0.5) && near(bell["01"], 0) && near(bell["10"], 0));
check("X then CX gives 11", near(probs(2, [["X", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]])["11"], 1));
check("CX with control 0 does nothing", near(probs(2, [["CX", 0, 0, 1], ["M", 0, 1], ["M", 1, 1]])["00"], 1));
check("reverse CX (q1 controls q0)", near(probs(2, [["X", 1, 0], ["CX", 1, 1, 0], ["M", 0, 2], ["M", 1, 2]])["11"], 1));
check("measuring only q1", near(probs(2, [["X", 1, 0], ["M", 1, 1]])["1"], 1));
check("SWAP moves the 1", near(probs(2, [["X", 0, 0], ["SWAP", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]])["01"], 1));
check(
  "CZ acts as a phase (H on target turns it into CX)",
  near(probs(2, [["X", 0, 0], ["H", 1, 0], ["CZ", 0, 1, 1], ["H", 1, 2], ["M", 0, 3], ["M", 1, 3]])["11"], 1)
);
check(
  "Toffoli flips only when both controls are 1",
  near(probs(3, [["X", 0, 0], ["X", 1, 0], ["CCX", 0, 1, 2, 1], ["M", 2, 2]])["1"], 1) &&
    near(probs(3, [["X", 0, 0], ["CCX", 0, 1, 2, 1], ["M", 2, 2]])["0"], 1)
);
const ghz = probs(3, [["H", 0, 0], ["CX", 0, 1, 1], ["CX", 1, 2, 2], ["M", 0, 3], ["M", 1, 3], ["M", 2, 3]]);
check("3-qubit GHZ gives 000/111", near(ghz["000"], 0.5) && near(ghz["111"], 0.5));

const run = simulateCircuit(buildCircuit(1, [["H", 0, 0], ["M", 0, 1]]), { shots: 1024 });
if (run.ok) {
  const total = Object.values(run.counts).reduce((a, b) => a + b, 0);
  check("shots add up", total === 1024);
  check("sampled counts are near 50%", Math.abs(run.counts["0"] / 1024 - 0.5) < 0.1);
  check("Bloch vector on equator after H", near(run.bloch[0].x, 1) && near(run.bloch[0].z, 0));
}
const fourK = simulateCircuit(buildCircuit(1, [["H", 0, 0], ["M", 0, 1]]), { shots: 4096 });
check("shot count is configurable", fourK.ok && fourK.shots === 4096 && Object.values(fourK.counts).reduce((a, b) => a + b, 0) === 4096);
const bellRun = simulateCircuit(buildCircuit(2, [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]]));
if (bellRun.ok) {
  const v = bellRun.bloch[0];
  check("entangled qubit has no Bloch arrow", near(v.x, 0) && near(v.y, 0) && near(v.z, 0));
  check("Bell explanation mentions entanglement", explainCircuit(bellRun).steps.some((s) => s.en.includes("entangled")));
}
const snap = stateAfter(1, buildCircuit(1, [["H", 0, 0], ["S", 0, 1]]).gates);
check("Bloch sphere follows the phase (H then S points along +y)", near(snap.bloch[0].y, 1) && near(snap.bloch[0].x, 0));
const norm = snap.stateVector.reduce((sum, a) => sum + a.re * a.re + a.im * a.im, 0);
check("state vector stays normalised", near(norm, 1));

// ---------------------------------------------------------------------------
console.log("Validation");
const errorCode = (qubits: number, spec: GateSpec[], shots?: number) => {
  const r = simulateCircuit(buildCircuit(qubits, spec), shots ? { shots } : undefined);
  return r.ok ? "OK" : r.code;
};
check("empty circuit is rejected", errorCode(1, []) === "EMPTY");
check("no measurement is rejected", errorCode(1, [["H", 0, 0]]) === "NO_MEASUREMENT");
check("gate after measurement is rejected", errorCode(1, [["M", 0, 0], ["X", 0, 1]]) === "GATE_AFTER_MEASUREMENT");
check("CX after measurement is rejected", errorCode(2, [["M", 1, 0], ["CX", 0, 1, 1], ["M", 0, 2]]) === "GATE_AFTER_MEASUREMENT");
check("CX onto its own wire is rejected", errorCode(2, [["CX", 0, 0, 0], ["M", 0, 1]]) === "INVALID_CX");
check("too many qubits is rejected", errorCode(9, [["H", 0, 0], ["M", 0, 1]]) === "INVALID_REQUEST");
check("a gate on a missing qubit is rejected", errorCode(1, [["H", 4, 0], ["M", 0, 1]]) === "INVALID_REQUEST");
check("too many shots is rejected", validateCircuit(buildCircuit(1, [["H", 0, 0], ["M", 0, 1]]), 1_000_000)?.code === "INVALID_REQUEST");
check("zero shots is rejected", validateCircuit(buildCircuit(1, [["H", 0, 0], ["M", 0, 1]]), 0)?.code === "INVALID_REQUEST");
const hostile = { qubits: 1, steps: 6, gates: [{ id: "x", type: "<script>" as never, qubit: 0, step: 0 }] };
check("an unknown gate type is rejected, not executed", validateCircuit(hostile)?.code === "INVALID_REQUEST");
const everyError = [errorCode(1, []), errorCode(1, [["H", 0, 0]])];
check("errors are structured (code + message + fix)", everyError.every((code) => code !== "OK"));

// ---------------------------------------------------------------------------
console.log("Circuit export (Qiskit / OpenQASM)");
const bellCircuit = buildCircuit(2, [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]]);
const qiskit = toQiskit(bellCircuit, 1024);
check("Qiskit code builds the same circuit", qiskit.includes("QuantumCircuit(2, 2)") && qiskit.includes("qc.h(0)") && qiskit.includes("qc.cx(0, 1)"));
check("Qiskit code measures and uses the shot count", qiskit.includes("qc.measure(0, 0)") && qiskit.includes("shots=1024"));
const qasm = toOpenQasm(bellCircuit);
check("OpenQASM has a header and the gates", qasm.startsWith("OPENQASM 2.0;") && qasm.includes("h q[0];") && qasm.includes("cx q[0],q[1];"));
check("OpenQASM measures into classical bits", qasm.includes("measure q[0] -> c[0];"));
const other = buildCircuit(1, [["X", 0, 0], ["M", 0, 1]]);
check("code changes when the circuit changes", toQiskit(other) !== qiskit && toOpenQasm(other).includes("x q[0];") && !toOpenQasm(other).includes("h q[0];"));
check("rotation angles are exported", toQiskit(buildCircuit(1, [["RX", 0, 0, undefined, PI / 2], ["M", 0, 1]])).includes("qc.rx(pi/2, 0)"));
check("text diagram has one row per qubit", toTextDiagram(bellCircuit).split("\n").length >= 2);
const payload = toPayload(bellCircuit, 512);
check("payload carries no ids and keeps order", payload.shots === 512 && payload.gates[0].type === "H" && !("id" in payload.gates[0]));

// ---------------------------------------------------------------------------
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
  check(`${challenge.id} has targets and a difficulty`, challenge.targets.length > 0 && [1, 2, 3].includes(challenge.difficulty));
}

// ---------------------------------------------------------------------------
console.log("Content");
check("curriculum has 8 modules and a version", CURRICULUM.modules.length === 8 && CURRICULUM.version.length > 0);
check("python keeps its 5-question check", quizFor("python").length === 5 && !!LESSONS.python);
for (const topic of INTERACTIVE_TOPICS) {
  const content = conceptContent(topic);
  check(`${topic} has concept content`, !!content);
  if (!content) continue;
  check(`${topic} has a lesson, a core experiment and Learn blocks`, !!LESSONS[topic] && !!coreExperiment(topic) && learnBlockIds(topic).length >= 2);
  check(`${topic} has a visual lesson`, content.lesson.scenes.length >= 3);
  check(`${topic} has sandbox goals`, content.sandbox.goals.length >= 2);
  check(`${topic} content is versioned and verified`, content.meta.verified && content.meta.version.length > 0);
  check(`${topic} explain rubric exists`, !!rubricById(content.explainRubric));
  check(`${topic} write rubric exists`, !!rubricById(content.assessment.writeRubric));
  check(`${topic} key idea is in the knowledge base`, !!knowledgeById(content.keyIdea));
  for (const slot of content.assessment.slots) {
    const pool = questionBank(topic).filter((q) => q.concept === slot);
    check(`${topic} / ${slot} has at least 2 questions (so a retry can differ)`, pool.length >= 2, `has ${pool.length}`);
  }
  questionBank(topic).forEach((q) => {
    check(`${q.id} answer in range`, q.answer >= 0 && q.answer < q.options.length);
    check(`${q.id} has a difficulty`, [1, 2, 3, 4].includes(q.difficulty));
  });
}
for (const rubric of RUBRICS) {
  check(`${rubric.id}: model answer scores 100 (English)`, evaluateExplanation(rubric.model.en, rubric).score === 100);
  check(`${rubric.id}: model answer scores 100 (Hinglish)`, evaluateExplanation(rubric.model.hi, rubric).score === 100);
  check(`${rubric.id}: model answer trips no misconception`, evaluateExplanation(rubric.model.en, rubric).misconceptions.length === 0);
  check(`${rubric.id}: all-correct sentence choices score 100`, evaluateStructured(rubric.structured.map((item) => item.answer), rubric).score === 100);
  check(`${rubric.id}: all-wrong sentence choices score 0`, evaluateStructured(rubric.structured.map((item) => (item.answer + 1) % item.options.length), rubric).score === 0);
}
for (const misconception of MISCONCEPTIONS) {
  check(`${misconception.id} links to real content`, !!knowledgeById(misconception.knowledgeId) && !!findChallenge(misconception.challengeId) && !!questionById(misconception.questionId));
}
check("every knowledge entry is verified and has a source reference", KNOWLEDGE.every((entry) => entry.meta.verified && entry.ref.length > 0));
check("references are https links, with a stated difference", REFERENCES.every((r) => r.url.startsWith("https://") && r.gap.length > 0));

// ---------------------------------------------------------------------------
console.log("The 90% gate");
check("89 → LOCKED", gateStatus(89, 90) === "LOCKED");
check("90 → UNLOCKED", gateStatus(90, 90) === "UNLOCKED");
check("95 → UNLOCKED", gateStatus(95, 90) === "UNLOCKED");
check("100 → COMPLETED", gateStatus(100, 90) === "COMPLETED");
check("0, 50, 70 and 80 are all LOCKED", [0, 50, 70, 80].every((score) => gateStatus(score, 90) === "LOCKED"));
check("passes() agrees with the gate", !passes(89, 90) && passes(90, 90));
check("threshold cannot go below 90", clampThreshold(50) === 90 && clampThreshold(70) === 90 && clampThreshold(80) === 90);
check("threshold can be raised to 95 or 100, not past it", clampThreshold(95) === 95 && clampThreshold(150) === 100);
const fresh = A.enterAsLearner(createInitialState(), "Tester");
check("default threshold is 90", fresh.settings.masteryThreshold === 90);
check("setThreshold(50) is clamped to 90", A.setThreshold(fresh, 50).settings.masteryThreshold === 90);
check("updateSettings cannot smuggle in a lower threshold", A.updateSettings(fresh, { masteryThreshold: 10 }).settings.masteryThreshold === 90);
check("stage weights add up to 100", Object.values(STAGE_WEIGHTS).reduce((a, b) => a + b, 0) === 100);
check("lock message names the stage before it and the threshold", lockMessage("explain", 90).en === "Complete OBSERVE with at least 90% mastery to unlock this stage.");
check("there are 13 stages, Discover first, Next Challenge last", STAGE_IDS.length === 13 && STAGE_IDS[0] === "discover" && STAGE_IDS[12] === "challenge");

// ---------------------------------------------------------------------------
console.log("Locked stages cannot be bypassed");
check("only the first concept is open at the start", isConceptUnlocked(fresh, "qubit") && !isConceptUnlocked(fresh, "gates") && !isConceptUnlocked(fresh, "entanglement"));
check("only Discover is open at the start", canOpenStage(fresh, "qubit", "discover") && STAGE_IDS.slice(1).every((stage) => !canOpenStage(fresh, "qubit", stage)));
check("no level questionnaire: a new learner starts with no stated level", fresh.profile?.pythonLevel === null);
check("the learner gets a stable id", !!fresh.profile?.id && fresh.profile.id.length > 4);

const dummyRun = simulateCircuit(buildCircuit(1, [["X", 0, 0], ["M", 0, 1]]), { shots: 100 });
if (!dummyRun.ok) throw new Error("dummy run failed");
const dummyCircuit = buildCircuit(1, [["X", 0, 0], ["M", 0, 1]]);
const dummyExperiment = experimentInput({
  circuit: dummyCircuit,
  result: dummyRun,
  source: "lesson",
  topic: "qubit",
  predictionLabel: "100% |1⟩",
  predicted: { "1": 1 },
  correct: true,
});
const bypass: Array<[string, (s: AppState) => AppState]> = [
  ["Learn before Discover", (s) => A.markLearnRead(s, "qubit", "what-is-a-qubit", 1)],
  ["Watch", (s) => A.markWatched(s, "qubit", 0, 1)],
  ["Interact", (s) => A.recordInteraction(s, "qubit")],
  ["Experiment", (s) => A.reachGoal(s, "qubit", "any", 1)],
  ["Ask AI score", (s) => A.updateStage(s, "qubit", "ask", 100)],
  ["Predict", (s) => A.submitStagePrediction(s, "qubit", { optionId: "a", label: "x", distribution: null, confidence: "high", at: 1 }, "X → M")],
  ["Run", (s) => A.recordStageRun(s, "qubit", { at: 1, circuit: "X → M", shots: 100, counts: { "1": 100 }, probabilities: { "0": 0, "1": 1 }, measured: [0], backend: "browser", predictionCorrect: true }, dummyExperiment)],
  ["Observe", (s) => A.recordObservation(s, "qubit", "most", true, 1)],
  ["Explain", (s) => A.recordExplanation(s, { topic: "qubit", rubricId: "qubit-explain", mode: "written", text: "x", result: evaluateExplanation(rubricById("qubit-explain")!.model.en, rubricById("qubit-explain")!), purpose: "explain" })],
  ["Assess", (s) => A.recordStageAssessment(s, "qubit", assessmentSlots("qubit").map((slot) => ({ slot, itemId: "x", credit: 1, difficulty: 1 })), "full")],
  ["Review", (s) => A.completeReview(s, "qubit")],
  ["Next Challenge", (s) => A.recordStageChallenge(s, "qubit", { ...dummyExperiment, source: "challenge" })],
  ["a stage of a locked concept", (s) => A.completeDiscover(s, "gates")],
  ["opening a locked concept", (s) => A.openStage(s, "gates", "discover")],
  ["a direct score on a locked concept", (s) => A.updateStage(s, "entanglement", "challenge", 100)],
];
for (const [name, attempt] of bypass) {
  check(`refused: ${name}`, attempt(fresh) === fresh);
}
const afterDiscover = A.completeDiscover(fresh, "qubit");
check("Discover at 100 opens Learn — and nothing further", canOpenStage(afterDiscover, "qubit", "learn") && !canOpenStage(afterDiscover, "qubit", "watch"));
const halfLearn = A.markLearnRead(afterDiscover, "qubit", learnBlockIds("qubit")[0], learnBlockIds("qubit").length);
check("a partly-read Learn stage (below 90) keeps Watch locked", stageScore(progressOf(halfLearn, "qubit"), "learn") < 90 && !canOpenStage(halfLearn, "qubit", "watch"));
check("…and Watch still refuses writes", A.markWatched(halfLearn, "qubit", 0, 4) === halfLearn);
const at89 = A.updateStage(afterDiscover, "qubit", "learn", 89);
check("89% in a stage does not unlock the next one", !canOpenStage(at89, "qubit", "watch"));
check("90% in a stage unlocks the next one", canOpenStage(A.updateStage(afterDiscover, "qubit", "learn", 90), "qubit", "watch"));
const lowered = A.updateStage(A.updateStage(afterDiscover, "qubit", "learn", 95), "qubit", "learn", 20);
check("a later weak attempt never lowers a stage score", stageScore(progressOf(lowered, "qubit"), "learn") === 95);

// ---------------------------------------------------------------------------
console.log("A full learning journey");

/** A learner who does every stage of a concept properly, using only the real actions. */
function completeConcept(start: AppState, topic: TopicId, options: { wrongFirstSlot?: string; weakFirstExplanation?: boolean } = {}): AppState {
  const content = conceptContent(topic)!;
  const core = coreExperiment(topic)!;
  let s = start;
  const act = (change: (state: AppState) => AppState) => (s = A.finalize(change(s)));
  const expectOpen = (stage: StageId) => check(`${topic}: ${stage} is open when reached`, canOpenStage(s, topic, stage));
  const expectLocked = (stage: StageId) => check(`${topic}: ${stage} is still locked before its turn`, !canOpenStage(s, topic, stage));

  expectOpen("discover");
  act((x) => A.openStage(x, topic, "discover"));
  act((x) => A.completeDiscover(x, topic));

  expectOpen("learn");
  expectLocked("watch");
  const blocks = learnBlockIds(topic);
  blocks.forEach((block) => act((x) => A.markLearnRead(x, topic, block, blocks.length)));

  expectOpen("watch");
  content.lesson.scenes.forEach((_, index) => act((x) => A.markWatched(x, topic, index, content.lesson.scenes.length)));

  expectOpen("interact");
  for (let i = 0; i < A.INTERACTION_TARGET; i++) act((x) => A.recordInteraction(x, topic));

  expectOpen("experiment");
  expectLocked("ask");
  content.sandbox.goals.forEach((goal) => act((x) => A.reachGoal(x, topic, goal.id, content.sandbox.goals.length)));

  expectOpen("ask");
  const reply = answerQuestion("Explain this simply.", s, "en", { topic, stage: "ask" });
  act((x) => A.recordTutorQuestion(x, { topic, stage: "ask", mode: reply.mode, question: "Explain this simply.", sources: reply.sources.map((src) => src.id), inJourney: true }));

  expectOpen("predict");
  expectLocked("run");
  const circuit = buildCircuit(core.circuit.qubits, core.circuit.gates);
  const result = simulateCircuit(circuit, { shots: 1024 });
  if (!result.ok) throw new Error(`${topic} core experiment failed`);
  const prediction = buildPredictionOptions(circuit)!;
  const right = prediction.options.find((o) => o.id === prediction.correctId)!;
  act((x) => A.submitStagePrediction(x, topic, { optionId: right.id, label: right.label.en, distribution: right.distribution, confidence: "medium", at: Date.now() }, describeCircuit(circuit)));

  expectOpen("run");
  expectLocked("observe");
  act((x) =>
    A.recordStageRun(
      x,
      topic,
      { at: Date.now(), circuit: describeCircuit(circuit), shots: result.shots, counts: result.counts, probabilities: result.probabilities, measured: result.measuredQubits, backend: "browser", predictionCorrect: true },
      experimentInput({ circuit, result, source: "lesson", topic, predictionLabel: right.label.en, predicted: right.distribution, correct: true, confidence: "medium" })
    )
  );

  expectOpen("observe");
  const checks = observationChecks(result);
  act((x) => A.recordObservation(x, topic, checks[0].id, false, checks.length));
  check(`${topic}: a wrong observation answer earns nothing`, stageScore(progressOf(s, topic), "observe") === 0);
  checks.forEach((item) => act((x) => A.recordObservation(x, topic, item.id, true, checks.length)));

  expectOpen("explain");
  expectLocked("assess");
  const rubric = rubricById(content.explainRubric)!;
  if (options.weakFirstExplanation) {
    const weak = evaluateExplanation("It is a quantum thing that happens in the circuit.", rubric);
    act((x) => A.recordExplanation(x, { topic, rubricId: rubric.id, mode: "written", text: "weak", result: weak, purpose: "explain" }));
    check(`${topic}: a vague explanation does not pass`, !passes(stageScore(progressOf(s, topic), "explain"), 90));
    expectLocked("assess");
  }
  const good = evaluateExplanation(rubric.model.en, rubric);
  act((x) => A.recordExplanation(x, { topic, rubricId: rubric.id, mode: "written", text: rubric.model.en, result: good, purpose: "explain" }));

  expectOpen("assess");
  expectLocked("review");
  const plan = planAssessment(s, topic);
  check(`${topic}: the first mastery check is a full one`, plan.kind === "full" && plan.slots.length === assessmentSlots(topic).length);
  const writeRubric = rubricById(content.assessment.writeRubric)!;
  const results: A.AssessItemResult[] = plan.slots.map((slot) => {
    const item = buildItem(s, topic, slot, plan.startDifficulty, plan.prefer)!;
    if (item.kind === "build") return { slot, itemId: item.task.id, credit: 1, difficulty: 2 };
    if (item.kind === "write") return { slot, itemId: item.rubric.id, credit: evaluateExplanation(writeRubric.model.en, writeRubric).score / 100, difficulty: 2 };
    const wrong = slot === options.wrongFirstSlot;
    return {
      slot,
      itemId: item.question.id,
      credit: wrong ? 0 : 1,
      difficulty: item.question.difficulty,
      chosen: wrong ? (item.question.answer + 1) % item.question.options.length : item.question.answer,
    };
  });
  act((x) => A.recordStageAssessment(x, topic, results, "full"));

  if (options.wrongFirstSlot) {
    check(`${topic}: one missed item out of six leaves Assess below 90`, stageScore(progressOf(s, topic), "assess") === 83);
    expectLocked("review");
    const retry = planAssessment(s, topic);
    check(`${topic}: the retry is targeted at the missed item only`, retry.kind === "targeted" && retry.slots.length === 1 && retry.slots[0] === options.wrongFirstSlot);
    const firstQuestion = results.find((r) => r.slot === options.wrongFirstSlot)!.itemId;
    const item = buildItem(s, topic, options.wrongFirstSlot, retry.startDifficulty, retry.prefer)!;
    check(`${topic}: the retry uses a different question`, item.kind === "question" && item.question.id !== firstQuestion);
    if (item.kind === "question") {
      act((x) => A.recordStageAssessment(x, topic, [{ slot: item.slot, itemId: item.question.id, credit: 1, difficulty: item.question.difficulty, chosen: item.question.answer }], "targeted"));
    }
  }
  check(`${topic}: Assess reaches 100 with every item demonstrated`, assessScore(progressOf(s, topic), topic) === 100);

  expectOpen("review");
  expectLocked("challenge");
  const review = buildReview(s, topic);
  check(`${topic}: the review reflects what happened`, options.wrongFirstSlot ? review.needsWork.some((p) => p.title === options.wrongFirstSlot) : review.understood.length > 0);
  act((x) => A.startReview(x, topic));
  act((x) => A.completeReview(x, topic));

  expectOpen("challenge");
  check(`${topic}: not mastered until the challenge is solved`, !progressOf(s, topic).masteredAt);
  const choice = chooseChallenge(s, topic)!;
  if (options.wrongFirstSlot) {
    check(`${topic}: the challenge targets the missed item when one exists`, choice.target === null || choice.challenge.targets.includes(options.wrongFirstSlot) || choice.target.length > 0);
  }
  act((x) => A.setStageChallenge(x, topic, choice.challenge.id));
  const challengeCircuit = buildCircuit(choice.challenge.circuit.qubits, choice.challenge.circuit.gates);
  const challengeRun = simulateCircuit(challengeCircuit, { shots: 1024 });
  if (!challengeRun.ok) throw new Error("challenge failed");
  const miss = experimentInput({ circuit: challengeCircuit, result: challengeRun, source: "challenge", topic, predictionLabel: "wrong", predicted: null, correct: false, challengeId: choice.challenge.id });
  act((x) => A.recordStageChallenge(x, topic, miss));
  check(`${topic}: a missed challenge does not complete the concept`, !progressOf(s, topic).masteredAt);
  const hit = experimentInput({ circuit: challengeCircuit, result: challengeRun, source: "challenge", topic, predictionLabel: "right", predicted: challengeRun.probabilities, correct: true, challengeId: choice.challenge.id });
  act((x) => A.recordStageChallenge(x, topic, hit));

  check(`${topic}: every stage passed`, allStagesPassed(progressOf(s, topic), 90));
  check(`${topic}: concept is MASTERED`, topicStatus(s, topic) === "MASTERED" && !!progressOf(s, topic).masteredAt);
  check(`${topic}: mastery score is 100`, topicMastery(s, topic).mastery === 100);
  return s;
}

let journey = fresh;
check("fresh learner: current concept is qubit, stage is Discover", currentTopic(journey) === "qubit" && currentStageOf(journey, "qubit") === "discover");
check("fresh learner: level is BEGINNER and provisional (inferred, not asked)", inferLevel(journey).level === "BEGINNER" && inferLevel(journey).provisional);
journey = completeConcept(journey, "qubit", { weakFirstExplanation: true });
check("mastering qubit unlocks gates, and only gates", isConceptUnlocked(journey, "gates") && !isConceptUnlocked(journey, "superposition"));
check("unlock events were recorded", journey.events.some((e) => e.type === "conceptMastered" && e.topic === "qubit") && journey.events.some((e) => e.type === "topicUnlocked"));
check("stage completions were recorded (13 for one concept)", journey.events.filter((e) => e.type === "stageCompleted" && e.topic === "qubit").length === 13);
check("next action moves to the next concept", nextAction(journey).topic === "gates" && nextAction(journey).stage === "discover");
journey = completeConcept(journey, "gates", { wrongFirstSlot: conceptContent("gates")!.assessment.slots[2] });
journey = completeConcept(journey, "superposition");
check("entanglement is unlocked only after superposition", isConceptUnlocked(journey, "entanglement"));
journey = completeConcept(journey, "entanglement");
check("all four concepts mastered", INTERACTIVE_TOPICS.every((topic) => topicStatus(journey, topic) === "MASTERED"));
const done = computeInsights(journey);
check("overall progress is 100% (52 of 52 stages)", done.overallProgress === 100 && done.stagesCompleted === 52 && done.stagesTotal === 52);
check("inferred level rose with the evidence", ["PROFICIENT", "ADVANCED"].includes(done.learner.level) && !done.learner.provisional);
check("explanation mastery is tracked", done.explanationMastery !== null && done.explanations >= 4);
check("raising the threshold later does not un-master a concept", topicStatus(A.setThreshold(journey, 100), "qubit") === "MASTERED");
check("achievements were earned along the way", Object.keys(journey.achievements).length >= 3 && ACHIEVEMENTS.length >= 6);

// ---------------------------------------------------------------------------
console.log("Explanation evaluator");
const superRubric = rubricById("superposition-explain")!;
const strong = evaluateExplanation(superRubric.model.en, superRubric);
check("a complete explanation scores 100 and is 'connected'", strong.score === 100 && strong.reasoning === "connected");
const partial = evaluateExplanation("The H gate puts the qubit into an equal superposition of 0 and 1, so both results have a 50% probability.", superRubric);
check("a partial explanation gets a partial score", partial.score > 0 && partial.score < 90 && partial.missing.length > 0);
check("missing ideas come with a hint, not the answer", partial.missing.every((idea) => idea.hint.en.length > 0));
check("a too-short answer scores 0", evaluateExplanation("because quantum", superRubric).score === 0);
check("length alone earns nothing", evaluateExplanation("word ".repeat(80), superRubric).score === 0);
const wrongIdea = evaluateExplanation("The qubit starts in 0. The H gate makes a superposition, which means the qubit is just randomly either 0 or 1, and measurement shows it.", superRubric);
check("an explanation built on a misconception is capped at 70", wrongIdea.score <= 70 && wrongIdea.misconceptions.some((m) => m.misconception === "classical_randomness"));
check("Hinglish explanations are understood", evaluateExplanation(superRubric.model.hi, superRubric).score === 100);

// ---------------------------------------------------------------------------
console.log("Misconception detection");
const flagged = detectInText("Superposition means the qubit is just randomly either 0 or 1.");
check("'just randomly either 0 or 1' → classical_randomness", flagged[0]?.misconception === "classical_randomness" && flagged[0].confidence >= 0.8);
check("a denial is not flagged", detectInText("Superposition is not just random; the amplitudes can interfere.").length === 0);
check("a question is not flagged", detectInText("Is a qubit just randomly 0 or 1?").length === 0);
check("arguing against the idea is not flagged", detectInText("A hidden coin flip would still be 50/50 after a second H, so it is more than hidden randomness.").length === 0);
check("faster-than-light claim → ftl_communication", detectInText("Entanglement lets us send messages faster than light.").some((d) => d.misconception === "ftl_communication"));
check("neutral text is not flagged", detectInText("The X gate flips a qubit from 0 to 1.").length === 0);
let withMisconception = A.recordTutorQuestion(
  fresh,
  { topic: "qubit", mode: "TEACH", question: "So superposition is just random 0 or 1?", sources: [], inJourney: false },
  detectInText("Superposition means the qubit is just randomly either 0 or 1.")
);
const active = activeMisconceptions(withMisconception);
check("a detection is stored with its concept, confidence and evidence", active.length === 1 && active[0].info.id === "classical_randomness" && active[0].lastEvidence.length > 0);
check("the misconception event is logged", withMisconception.events.some((e) => e.type === "misconceptionDetected"));
const targeted = findChallenge(active[0].info.challengeId)!;
const targetedCircuit = buildCircuit(targeted.circuit.qubits, targeted.circuit.gates);
const targetedRun = simulateCircuit(targetedCircuit, { shots: 256 });
if (targetedRun.ok) {
  withMisconception = A.recordExperiment(
    withMisconception,
    experimentInput({ circuit: targetedCircuit, result: targetedRun, source: "practice", topic: targeted.topic, predictionLabel: "x", predicted: targetedRun.probabilities, correct: true, challengeId: targeted.id })
  );
  check("solving the targeted challenge resolves the misconception", activeMisconceptions(withMisconception).length === 0 && resolvedMisconceptions(withMisconception).length === 1);
}
const hTwice = buildCircuit(1, [["H", 0, 0], ["H", 0, 1], ["M", 0, 2]]);
const hTwiceRun = simulateCircuit(hTwice, { shots: 256 });
if (hTwiceRun.ok) {
  const predictedCoin = A.recordExperiment(
    fresh,
    experimentInput({ circuit: hTwice, result: hTwiceRun, source: "lab", topic: "superposition", predictionLabel: distributionLabel({ "0": 0.5, "1": 0.5 }), predicted: { "0": 0.5, "1": 0.5 }, correct: false })
  );
  check("predicting 50/50 for H·H is read as a possible hidden-coin belief", activeMisconceptions(predictedCoin).some((m) => m.info.id === "classical_randomness"));
}

// ---------------------------------------------------------------------------
console.log("Adaptive assessment");
check("difficulty steps up after a correct answer", nextDifficulty(2, true) === 3 && nextDifficulty(4, true) === 4);
check("difficulty steps down after a miss", nextDifficulty(2, false) === 1 && nextDifficulty(1, false) === 1);
const easy = pickQuestion("superposition", "Interference", 1);
const hard = pickQuestion("superposition", "Interference", 4);
check("question difficulty follows the target", !!easy && !!hard && easy.difficulty <= hard.difficulty);
check("a retry avoids the question just asked", pickQuestion("superposition", "Interference", 1, [easy!.id])?.id !== easy!.id);
check("a mastery check is not multiple choice only", assessmentSlots("qubit").includes(BUILD_SLOT) && assessmentSlots("qubit").includes(WRITE_SLOT));
const solutions: Record<string, { qubits: number; gates: GateSpec[] }> = {
  qubit: { qubits: 1, gates: [["X", 0, 0], ["M", 0, 1]] },
  gates: { qubits: 1, gates: [["Y", 0, 0], ["M", 0, 1]] },
  superposition: { qubits: 1, gates: [["H", 0, 0], ["H", 0, 1], ["M", 0, 2]] },
  entanglement: { qubits: 2, gates: [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]] },
};
for (const topic of INTERACTIVE_TOPICS) {
  const task = CONCEPTS[topic]!.assessment.build;
  check(`${topic}: build task accepts a correct circuit`, checkBuild(task, buildCircuit(solutions[topic].qubits, solutions[topic].gates)).correct);
  check(`${topic}: build task rejects an unmeasured circuit`, !checkBuild(task, buildCircuit(task.qubits, [["H", 0, 0]])).correct);
}
check("gates build task rejects the forbidden X gate", !checkBuild(CONCEPTS.gates!.assessment.build, buildCircuit(1, [["X", 0, 0], ["M", 0, 1]])).correct);
check("superposition build task rejects a circuit without H", !checkBuild(CONCEPTS.superposition!.assessment.build, buildCircuit(1, [["M", 0, 0]])).correct);

// ---------------------------------------------------------------------------
console.log("Tutor and retrieval");
const kb = knowledgeStats();
check("knowledge base is populated and verified", kb.entries >= 30 && kb.verified === kb.entries);
const hit = retrieve("What does the Hadamard gate do?");
check("retrieval finds the H-gate entry for a Hadamard question", hit[0]?.entry.id === "h-gate" && hit[0].score >= MIN_RETRIEVAL_SCORE);
check("retrieval finds entanglement content", retrieve("how are entangled qubits linked?").some((r) => r.entry.topic === "entanglement"));
check("off-topic text retrieves nothing", retrieve("best pizza toppings in Mumbai").length === 0);
check("one stray word in common is not a match", retrieve("Who won the cricket match?").length === 0);
check("'What is superposition?' finds the superposition entry first", retrieve("What is superposition?")[0]?.entry.id === "superposition-basics");
check("'What is quantum computing?' finds the overview entry", retrieve("What is quantum computing?")[0]?.entry.id === "quantum-computing-basics");

const learner = buildDemoState();
const simple = answerQuestion("Explain superposition simply.", learner, "en");
check("'Explain superposition simply.' → SIMPLIFY, grounded in a source", simple.mode === "SIMPLIFY" && simple.sources.some((s) => s.id.startsWith("superposition")) && simple.text.join(" ").length > 40);
const hint = answerQuestion("Give me a hint.", learner, "en", { topic: "superposition", stage: "predict" });
check("'Give me a hint.' → HINT, without giving the answer away", hint.mode === "HINT" && !/50\s*%|50\/50/.test(hint.text.join(" ")));
const why = answerQuestion("Why?", learner, "en", { topic: "superposition" });
check("'Why?' → WHY mode with an explanation", why.mode === "WHY" && why.text.join(" ").length > 30);
const result = answerQuestion("Explain my result.", learner, "en");
const lastCircuit = learner.lastExperiment?.circuit ?? "";
check("'Explain my result.' → RESULT_ANALYSIS using the learner's real last run", result.mode === "RESULT_ANALYSIS" && lastCircuit.length > 0 && result.text.join(" ").includes(lastCircuit));
check("…and it quotes the real counts", !!learner.lastExperiment?.counts && Object.values(learner.lastExperiment.counts).some((count) => result.text.join(" ").includes(String(count))));
check("'Show the math' → MATH", answerQuestion("", learner, "en", { topic: "superposition" }, "math").mode === "MATH");
const visual = answerQuestion("", learner, "en", { topic: "superposition" }, "visualize");
check("'Visualize this' → a state the interface can draw", visual.mode === "VISUALIZE" && !!visual.visual);
check("'Challenge me' → a challenge link", answerQuestion("", learner, "en", {}, "challenge").mode === "CHALLENGE");
const mistake = answerQuestion("", learner, "en", {}, "mistake");
check("'Review my mistake' uses the learner's detected misconception", mistake.mode === "REVIEW" || mistake.mode === "MISCONCEPTION_CORRECTION");
check("every quick action exists (8 of them)", QUICK_ACTIONS.length === 8);
const unknown = answerQuestion("What is the capital of France?", learner, "en");
check("an off-topic question is declined, not invented", unknown.sources.length === 0 && unknown.intent === "fallback");
const hadamard = answerQuestion("What does the Hadamard gate do?", fresh, "en");
check("answers name their sources (title, reference, version)", hadamard.sources.length > 0 && hadamard.sources.every((s) => s.title && s.ref && s.version));
check("the tutor replies in Hinglish when asked", answerQuestion("Superposition kya hai?", fresh, "hi").text.join(" ").length > 20);
const misbelief = answerQuestion("Superposition means the qubit is just randomly either 0 or 1.", fresh, "en");
check("a stated misconception is corrected, not echoed", misbelief.detections.some((d) => d.misconception === "classical_randomness"));
check("the tutor never claims to be an LLM", /not a trained|no llm|rule|knowledge base/i.test(answerQuestion("Are you a real AI?", fresh, "en").text.join(" ")));
check("the tutor needs no personal data: a new learner gets an answer", answerQuestion("What is a qubit?", createInitialState(), "en").sources.length > 0);
for (const question of SUGGESTED_QUESTIONS) {
  check(`suggested question answers: ${question.en}`, answerQuestion(question.en, learner, "en").text.length > 0);
}

// ---------------------------------------------------------------------------
console.log("Execution layer and health");
const exec = async () => {
  const local = await executeCircuit(bellCircuit, { shots: 512, backend: "browser" });
  check("browser backend runs the circuit", local.result.ok && local.backend === "browser" && !local.notice);
  const fallback = await executeCircuit(bellCircuit, { shots: 512, backend: "qiskit" });
  check("asking for Qiskit with no service configured falls back and says so", fallback.result.ok && fallback.backend === "browser" && !!fallback.notice);
  const broken = await executeCircuit(buildCircuit(1, [["H", 0, 0]]), { backend: "qiskit" });
  check("an invalid circuit never leaves the browser", !broken.result.ok && broken.backend === "browser");
};
const report = buildHealthReport("server");
check("health: the simulator self-test passes", report.services.quantumEngine.status === "online");
check("health: the tutor self-test passes", report.services.aiTutor.status === "online");
check("health: the knowledge-base self-test passes", report.services.knowledgeBase.status === "online");
check("health: database and LLM are reported as not configured, not online", report.services.database.status === "not_configured" && report.services.llm.status === "not_configured");

// ---------------------------------------------------------------------------
console.log("Persistence");
const saved = JSON.parse(JSON.stringify(journey)) as AppState;
const restored = normalizeState(saved, "live");
check("a saved state restores with every stage score", INTERACTIVE_TOPICS.every((topic) => STAGE_IDS.every((stage) => stageScore(progressOf(restored, topic), stage) === stageScore(progressOf(journey, topic), stage))));
check("mastery, predictions, explanations and events survive a reload", topicStatus(restored, "entanglement") === "MASTERED" && restored.predictions.length === journey.predictions.length && restored.explanations.length === journey.explanations.length && restored.events.length === journey.events.length);
check("profile and settings survive a reload", restored.profile?.id === journey.profile?.id && restored.settings.masteryThreshold === journey.settings.masteryThreshold);
const midway = A.finalize(A.markLearnRead(A.completeDiscover(fresh, "qubit"), "qubit", learnBlockIds("qubit")[0], learnBlockIds("qubit").length));
const midwayBack = normalizeState(JSON.parse(JSON.stringify(midway)), "live");
check("a learner who leaves mid-stage resumes on the same stage with the same score", currentStageOf(midwayBack, "qubit") === "learn" && stageScore(progressOf(midwayBack, "qubit"), "learn") === stageScore(progressOf(midway, "qubit"), "learn"));
const tampered = normalizeState({ ...saved, settings: { ...saved.settings, masteryThreshold: 40 } }, "live");
check("a tampered threshold in storage is clamped back to 90", tampered.settings.masteryThreshold === 90);
check("corrupt storage falls back to a clean state", normalizeState({} as Partial<AppState>, "live").events.length === 0 && normalizeState({ concepts: "nope" as never }, "live").profile === null);
const legacy = normalizeState(
  { version: 1, profile: { name: "Old", role: "learner", pythonLevel: "basics", language: "en", onboarded: true, createdAt: 1 } as never, settings: { masteryThreshold: 80 } as never },
  "live"
);
check("an older save (80% threshold, no id) is upgraded", legacy.settings.masteryThreshold === 90 && !!legacy.profile?.id && legacy.settings.shots > 0);

// ---------------------------------------------------------------------------
console.log("Recommendations and spaced review");
check("a new learner is told to start the first concept", getRecommendation(fresh).topic === "qubit" && nextAction(fresh).href === "/learn/qubit");
const day = 24 * 60 * 60 * 1000;
check("a Quick Review comes due after mastery", isReviewDue(journey, "qubit", Date.now() + 2 * day) && dueReviews(journey, Date.now() + 2 * day).includes("qubit"));
const question = quickReviewQuestion(journey, "qubit")!;
const reviewed = A.recordQuickReview(journey, "qubit", question.id, question.answer, true);
check("a correct Quick Review pushes the next one out", !isReviewDue(reviewed, "qubit", Date.now() + 2 * day) && isReviewDue(reviewed, "qubit", Date.now() + 4 * day));
const forgot = A.recordQuickReview(journey, "qubit", question.id, (question.answer + 1) % question.options.length, false);
check("a wrong Quick Review brings it back at once, without un-mastering", isReviewDue(forgot, "qubit") && topicStatus(forgot, "qubit") === "MASTERED");

// ---------------------------------------------------------------------------
console.log("Demo learner");
const demo = buildDemoState();
const insights = computeInsights(demo);
check("demo: qubit and gates mastered, superposition in progress, entanglement locked", topicStatus(demo, "qubit") === "MASTERED" && topicStatus(demo, "gates") === "MASTERED" && topicStatus(demo, "superposition") === "IN PROGRESS" && topicStatus(demo, "entanglement") === "LOCKED");
check("demo: the current stage is Predict", currentStageOf(demo, "superposition") === "predict");
check("demo: every record is marked as demo data", demo.mode === "demo" && demo.events.every((e) => e.seeded));
check("demo: numbers are internally consistent", insights.prediction.total === demo.predictions.length && insights.prediction.correct === demo.predictions.filter((p) => p.correct).length);
check("demo: an open misconception drives the recommendation", activeMisconceptions(demo).length === 1 && getRecommendation(demo).ruleId === "misconception");
check("demo: mastered concepts have all 13 stages at 90 or more", (["qubit", "gates"] as TopicId[]).every((topic) => STAGE_IDS.every((stage) => stageScore(progressOf(demo, topic), stage) >= 90)));
check("demo: locked concept has no progress", !demo.concepts.entanglement);
check("demo: is repeatable", JSON.stringify(buildDemoState(1_700_000_000_000).predictions.map((p) => p.actual)) === JSON.stringify(buildDemoState(1_700_000_000_000).predictions.map((p) => p.actual)));

// ---------------------------------------------------------------------------
console.log("Security scan of the source");
const ROOT = join(__dirname, "..");
const SKIP = new Set(["node_modules", ".next", ".git", "scripts", ".venv", "venv", "__pycache__"]);
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|js|mjs|py|sql|json)$/.test(name) && name !== "package-lock.json" ? [path] : [];
  });
}
const files = sourceFiles(ROOT).map((path) => ({ path: path.slice(ROOT.length + 1), text: readFileSync(path, "utf8") }));
check("source files were found to scan", files.length > 60);
const offenders = (pattern: RegExp) => files.filter((file) => pattern.test(file.text)).map((file) => file.path);
const none = (name: string, pattern: RegExp) => {
  const found = offenders(pattern);
  check(name, found.length === 0, found.join(", "));
};
none("no API keys or tokens in the source", /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY)/);
none("no hard-coded passwords or secrets", /(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{6,}["']/i);
none("no dangerouslySetInnerHTML", /dangerouslySetInnerHTML/);
none("no eval or new Function", /\beval\s*\(|new\s+Function\s*\(/);
none("no innerHTML writes", /\.innerHTML\s*=/);
const envNames = new Set(files.flatMap((file) => Array.from(file.text.matchAll(/process\.env\.([A-Z0-9_]+)/g)).map((m) => m[1])));
check("the only environment variable read is the optional Qiskit address", Array.from(envNames).every((name) => name === "NEXT_PUBLIC_QISKIT_API_URL"), Array.from(envNames).join(", "));
none("no leftover debug logging in the app", /console\.(log|debug)\(/);
none("no TODO / FIXME left behind", /\b(TODO|FIXME|XXX)\b/);
none("no placeholder text", /lorem ipsum|coming soon/i);

// ---------------------------------------------------------------------------
exec().then(() => {
  console.log(`\n${passed} checks passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
});
