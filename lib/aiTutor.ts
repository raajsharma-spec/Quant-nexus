/**
 * Contextual AI Tutor
 *
 * IMPORTANT: this build of the tutor is NOT a trained language model and it
 * calls no AI service. It is a local, retrieval-grounded tutor:
 *
 *   1. Understand   — what is being asked, and in which MODE (teach, hint,
 *                     why, math, result analysis, review, challenge …)
 *   2. Retrieve     — the best-matching entries from the verified knowledge
 *                     base (lib/knowledgeBase.ts)
 *   3. Personalise  — combine them with the learner's own context: language,
 *                     inferred level, current concept and stage, last
 *                     experiment (with the real counts), misconceptions
 *   4. Cite         — every answer lists the entries it used; if nothing was
 *                     retrieved, it says so instead of inventing an answer
 *
 * It is not a generic chatbot: it only answers from the course material and
 * the learner's records. In production, step 2 becomes pgvector retrieval and
 * step 3 an LLM call — `answerQuestion` is the single place they would plug in.
 */

import { findChallenge } from "@/data/challenges";
import { conceptContent } from "@/data/curriculum";
import { rubricById } from "@/data/explanations";
import { knowledgeById, type KnowledgeEntry } from "@/data/knowledge";
import { misconceptionById } from "@/data/misconceptions";
import { questionById } from "@/data/quizzes";
import { topicTitle } from "@/data/topics";
import type { GateSpec } from "./quantumSimulator";
import { assessmentSlots, DEMONSTRATED } from "./adaptiveAssessment";
import { computeInsights } from "./analytics";
import { retrieve } from "./knowledgeBase";
import { LEVEL_LABEL } from "./learnerLevel";
import { canOpenStage, currentStageOf, currentTopic, topicMastery } from "./mastery";
import { activeMisconceptions, detectInText, type Detection } from "./misconceptions";
import { getRecommendation } from "./recommendationEngine";
import { chooseChallenge } from "./review";
import { progressOf } from "./stages";
import type { AppState } from "./storage";
import { STAGE_IDS, stageMeta, type L, type Lang, type StageId, type TopicId } from "./types";

/** The response modes the tutor supports. */
export type TutorMode =
  | "TEACH"
  | "HINT"
  | "EXPLAIN"
  | "SIMPLIFY"
  | "WHY"
  | "MATH"
  | "VISUALIZE"
  | "RESULT_ANALYSIS"
  | "MISCONCEPTION_CORRECTION"
  | "REVIEW"
  | "CHALLENGE"
  | "ASSESSMENT_FEEDBACK"
  | "GUIDE";

export interface TutorSource {
  id: string;
  title: string;
  /** Where in the product this content is taught. */
  ref: string;
  version: string;
}

export interface TutorVisual {
  qubits: number;
  gates: GateSpec[];
  caption: string;
}

export interface TutorReply {
  mode: TutorMode;
  /** Paragraphs of the answer. */
  text: string[];
  /** What the tutor looked at to build this answer — shown to the learner. */
  contextUsed: string[];
  /** Verified knowledge-base entries the answer was built from. Empty when none were retrieved. */
  sources: TutorSource[];
  /** A state the chat can draw (Bloch sphere + probabilities). */
  visual?: TutorVisual;
  /** A place to go next, if useful. */
  link?: { label: string; href: string };
  followUps: string[];
  /** What the question was understood as: a knowledge entry id or a contextual intent. */
  intent: string;
  /** The knowledge entry this answer was about — quick actions act on it next. */
  focus?: string;
  /** Possible misconceptions found in what the learner wrote. */
  detections: Detection[];
}

export interface TutorContext {
  /** The concept and stage the learner has open, when asked from inside the journey. */
  topic?: TopicId;
  stage?: StageId;
  /** Knowledge entry of the previous answer. */
  focus?: string;
}

/** Questions offered as one-tap chips. */
export const SUGGESTED_QUESTIONS: L[] = [
  { en: "What is a qubit?", hi: "Qubit kya hai?" },
  { en: "What does H gate do?", hi: "H gate kya karta hai?" },
  { en: "What is superposition?", hi: "Superposition kya hai?" },
  { en: "What is measurement?", hi: "Measurement kya hai?" },
  { en: "Why did I get 50/50?", hi: "Mujhe 50/50 kyun mila?" },
  { en: "Why was my prediction wrong?", hi: "Meri prediction galat kyun thi?" },
  { en: "What should I learn next?", hi: "Mujhe next kya seekhna chahiye?" },
  {
    en: "What is the difference between a bit and a qubit?",
    hi: "Bit aur qubit mein kya difference hai?",
  },
];

export type QuickActionId =
  | "simplify"
  | "hint"
  | "why"
  | "math"
  | "visualize"
  | "result"
  | "challenge"
  | "mistake";

/** The quick actions under the chat box. */
export const QUICK_ACTIONS: Array<{ id: QuickActionId; label: L; mode: TutorMode }> = [
  { id: "simplify", label: { en: "Explain simply", hi: "Simple explain karo" }, mode: "SIMPLIFY" },
  { id: "hint", label: { en: "Give me a hint", hi: "Hint do" }, mode: "HINT" },
  { id: "why", label: { en: "Why?", hi: "Kyun?" }, mode: "WHY" },
  { id: "math", label: { en: "Show the math", hi: "Math dikhao" }, mode: "MATH" },
  { id: "visualize", label: { en: "Visualize this", hi: "Visualize karo" }, mode: "VISUALIZE" },
  { id: "result", label: { en: "Explain my result", hi: "Mera result explain karo" }, mode: "RESULT_ANALYSIS" },
  { id: "challenge", label: { en: "Challenge me", hi: "Challenge do" }, mode: "CHALLENGE" },
  { id: "mistake", label: { en: "Review my mistake", hi: "Meri mistake review karo" }, mode: "REVIEW" },
];

type ContextIntent =
  | "why-wrong"
  | "why-result"
  | "next"
  | "unlock"
  | "progress"
  | "greeting"
  | "thanks";

/** Questions about the learner's own situation. Order matters: specific ones first. */
const CONTEXT_PATTERNS: Array<[ContextIntent, RegExp]> = [
  ["why-wrong", /(prediction|guess|answer|jawab).*(wrong|galat|incorrect|miss)|(wrong|galat|miss).*(prediction|guess)|why.*(wrong|miss)|galat kyun/],
  ["why-result", /50\s*[\/\-:]\s*50|why did i get|why.*(this result|my result|the result|output|outcome)|kyun (mila|aaya)|what happened|kya hua/],
  ["next", /(what|kya).*(next|aage)|(next|aage) kya|learn next|next (step|move|topic)|what should i|ab kya|recommend/],
  ["unlock", /unlock|locked|mastery|threshold|pass(ing)? score|why can.?t i (open|start|go)/],
  ["progress", /my progress|how am i doing|my score|my accuracy|my level|weak (area|concept)|kaisa chal/],
  ["greeting", /^(hi|hello|hey|namaste|hii+|yo)\b/],
  ["thanks", /thank|thanks|shukriya|dhanyavaad/],
];

/** Typed versions of the quick actions ("give me a hint", "show the math" …). */
const ACTION_PATTERNS: Array<[QuickActionId, RegExp]> = [
  ["result", /explain my result|analy[sz]e my result|mera result|my result/],
  ["mistake", /review my mistake|my mistake|where did i go wrong|meri (mistake|galti)/],
  ["hint", /\bhint\b|give me a clue|nudge/],
  ["challenge", /challenge me|give me a challenge|test me|quiz me|challenge do/],
  ["visualize", /visuali[sz]e|show me (a |the )?(picture|diagram|bloch)|draw (it|this)/],
];

const MATH_WORDS = /\b(math|maths|mathematics|equation|formula|matrix|matrices|state.?vector|dirac|notation|derive|proof)\b/;
const SIMPLE_WORDS = /\b(simply|simple|simpler|easy|easily|eli5|basic|aasan|simple words|layman)\b/;
const WHY_WORDS = /^(why|kyun|but why|how come)\b/;

const sourceOf = (entry: KnowledgeEntry): TutorSource => ({
  id: entry.id,
  title: entry.title,
  ref: entry.ref,
  version: entry.meta.version,
});

const percent = (value: number) => `${(Math.round(value * 1000) / 10).toFixed(1)}%`;

/** The knowledge entry that fits the core experiment of each concept. */
const EXPERIMENT_FOCUS: Partial<Record<TopicId, string>> = {
  qubit: "x-gate",
  gates: "z-gate",
  superposition: "h-gate",
  entanglement: "entanglement-basics",
};

/** Which entry a quick action should act on when the learner has not just asked about one. */
function defaultFocus(state: AppState, topic: TopicId, stage: StageId | undefined): KnowledgeEntry | undefined {
  const experimentStages: StageId[] = ["predict", "run", "observe", "explain", "challenge"];
  const content = conceptContent(topic);
  if (stage && experimentStages.includes(stage) && EXPERIMENT_FOCUS[topic]) {
    return knowledgeById(EXPERIMENT_FOCUS[topic]!);
  }
  return content ? knowledgeById(content.keyIdea) : knowledgeById("qubit-basics");
}

/** Answer a learner's question, or carry out a quick action, using their local context. */
export function answerQuestion(
  question: string,
  state: AppState,
  lang: Lang,
  context: TutorContext = {},
  action?: QuickActionId
): TutorReply {
  const pick = (text: L) => (lang === "hi" ? text.hi : text.en);
  const q = question.toLowerCase().trim();
  const topic = context.topic ?? currentTopic(state);
  const stage = context.stage ?? currentStageOf(state, topic) ?? undefined;
  const title = topicTitle(topic);
  const insights = computeInsights(state);
  const level = insights.learner;
  const last = state.lastExperiment;
  const name = state.profile?.name ?? "";
  const progress = progressOf(state, topic);

  const reply: TutorReply = {
    mode: "TEACH",
    text: [],
    contextUsed: [
      `Language: ${lang === "hi" ? "English + Hinglish" : "English"}`,
      `Level (inferred): ${LEVEL_LABEL[level.level]}`,
      `Concept: ${title}${stage ? ` · stage ${stageMeta(stage).label}` : ""}`,
    ],
    sources: [],
    followUps: [],
    intent: "fallback",
    detections: [],
  };
  const say = (...lines: string[]) => reply.text.push(...lines);
  const cite = (entry: KnowledgeEntry | undefined) => {
    if (!entry || reply.sources.some((s) => s.id === entry.id)) return;
    reply.sources.push(sourceOf(entry));
  };
  const suggest = (...items: L[]) => (reply.followUps = items.map(pick));

  const focusEntry = (): KnowledgeEntry | undefined =>
    (context.focus ? knowledgeById(context.focus) : undefined) ?? defaultFocus(state, topic, stage);

  /** Walk through the last experiment using its REAL data. */
  const describeLast = (withNumbers: boolean) => {
    if (!last) return;
    reply.contextUsed.push(`Your last experiment: ${last.circuit}`);
    if (withNumbers && last.counts && last.shots) {
      const shots = last.shots;
      const rows = Object.keys(last.counts)
        .sort()
        .map((bits) => `|${bits}⟩ = ${last.counts![bits]} (${percent(last.counts![bits] / shots)})`);
      say(
        pick({
          en: `Measured over ${shots.toLocaleString()} shots: ${rows.join(", ")}.`,
          hi: `${shots.toLocaleString()} shots mein measure hua: ${rows.join(", ")}.`,
        })
      );
      if (last.probabilities) {
        const exact = Object.keys(last.probabilities)
          .sort()
          .filter((bits) => last.probabilities![bits] > 0.0005)
          .map((bits) => `|${bits}⟩ ${percent(last.probabilities![bits])}`);
        const gaps = Object.keys(last.counts).map((bits) =>
          Math.abs(last.counts![bits] / shots - (last.probabilities![bits] ?? 0))
        );
        const largest = Math.max(...gaps);
        const random = Object.values(last.probabilities).some((p) => p > 0.0005 && p < 0.9995);
        say(
          pick({
            en: `Exact probabilities from the state: ${exact.join(", ")}.`,
            hi: `State se exact probabilities: ${exact.join(", ")}.`,
          })
        );
        if (random) {
          say(
            pick({
              en: `The largest gap between measured and exact is ${percent(largest)}. With ${shots.toLocaleString()} shots a gap of this size is normal sampling variation — it is not a simulation error.`,
              hi: `Measured aur exact ke beech largest gap ${percent(largest)} hai. ${shots.toLocaleString()} shots mein itna gap normal sampling variation hai — yeh simulation error nahi hai.`,
            })
          );
        }
      }
    }
    last.steps.forEach((s) => say(pick(s)));
    say(pick(last.summary));
  };

  const teach = (entry: KnowledgeEntry, mode: TutorMode) => {
    reply.mode = mode;
    reply.intent = entry.id;
    reply.focus = entry.id;
    cite(entry);
    reply.link = entry.link;

    if (mode === "MATH") {
      if (entry.math) {
        say(pick(entry.math));
        say(
          pick({
            en: "In words: " + entry.simple.en,
            hi: "Words mein: " + entry.simple.hi,
          })
        );
      } else {
        say(
          pick({
            en: "The verified material has no extra mathematics for this idea at this level. Here it is in words:",
            hi: "Is idea ke liye is level par verified material mein extra mathematics nahi hai. Words mein yeh hai:",
          }),
          pick(entry.simple)
        );
      }
      return;
    }
    if (mode === "WHY") {
      say(pick(entry.why ?? entry.deeper ?? entry.simple));
      return;
    }
    if (mode === "SIMPLIFY") {
      say(pick(entry.simple));
      return;
    }

    // TEACH: adapt the depth to the learner's inferred level.
    say(pick(entry.simple));
    if ((level.level === "PROFICIENT" || level.level === "ADVANCED") && (entry.deeper ?? entry.why)) {
      say(pick((entry.deeper ?? entry.why)!));
      reply.contextUsed.push("Depth: one level deeper, because your level is " + LEVEL_LABEL[level.level]);
    }
    if (level.level === "ADVANCED" && entry.math) say(pick(entry.math));
  };

  // -------------------------------------------------------------------------
  // 1. Possible misconceptions in what the learner wrote
  // -------------------------------------------------------------------------
  if (!action && question.trim().length > 0) {
    const detections = detectInText(question).filter((d) => d.confidence >= 0.7);
    if (detections.length > 0) {
      const active = detections[0];
      const info = misconceptionById(active.misconception);
      if (info) {
        reply.mode = "MISCONCEPTION_CORRECTION";
        reply.intent = `misconception:${info.id}`;
        reply.detections = detections;
        const entry = knowledgeById(info.knowledgeId);
        cite(entry);
        reply.focus = entry?.id;
        say(
          pick({
            en: "One idea in what you wrote is worth a second look — it is a very common one.",
            hi: "Aapne jo likha usme ek idea ko dobara dekhna worth hai — yeh bahut common hai.",
          }),
          pick({ en: `The idea: ${info.belief.en}`, hi: `Idea: ${info.belief.hi}` }),
          pick(info.correction),
          pick({ en: `How to check it yourself: ${info.evidence.en}`, hi: `Khud check karne ke liye: ${info.evidence.hi}` })
        );
        const challenge = findChallenge(info.challengeId);
        if (challenge && canOpenStage(state, challenge.topic, "predict")) {
          reply.link = { label: pick({ en: `Try the challenge: ${challenge.title.en}`, hi: `Challenge try karo: ${challenge.title.hi}` }), href: `/practice?challenge=${challenge.id}` };
        } else if (entry?.link) {
          reply.link = entry.link;
        }
        reply.contextUsed.push(`Possible misconception: ${info.title.en} (confidence ${Math.round(active.confidence * 100)}%)`);
        suggest({ en: "Why?", hi: "Kyun?" }, { en: "Show the math", hi: "Math dikhao" });
        return reply;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. Quick actions (clicked, or typed in words)
  // -------------------------------------------------------------------------
  const typedAction = action ?? ACTION_PATTERNS.find(([, pattern]) => pattern.test(q))?.[0];
  const bareWhy = !action && /^(why|kyun|but why)\??$/.test(q);

  if (typedAction === "hint") {
    reply.mode = "HINT";
    reply.intent = "hint";
    if (stage === "assess") {
      say(
        pick({
          en: "You are in a mastery check, so I will not give hints for its questions — the check has to show what YOU know. I can explain any concept before you start, or review an item afterwards.",
          hi: "Aap mastery check mein ho, isliye main uske questions ke hints nahi dunga — check ko dikhana hai ki AAP kya jaante ho. Start karne se pehle koi bhi concept explain kar sakta hoon, ya baad mein item review kar sakta hoon.",
        })
      );
      reply.mode = "ASSESSMENT_FEEDBACK";
      return reply;
    }
    if (stage === "explain") {
      const rubric = rubricById(conceptContent(topic)?.explainRubric ?? "");
      const lastExplanation = [...state.explanations].reverse().find((e) => e.topic === topic && e.rubricId === rubric?.id);
      const missing = rubric?.ideas.filter((idea) => !idea.optional && !(lastExplanation?.covered ?? []).includes(idea.id)) ?? [];
      const idea = missing[0] ?? rubric?.ideas[0];
      if (idea) {
        say(pick({ en: "A hint for your explanation, not the answer:", hi: "Aapke explanation ke liye hint, answer nahi:" }), pick(idea.hint));
        reply.contextUsed.push(lastExplanation ? "Your last explanation attempt" : "The explanation prompt for this concept");
        return reply;
      }
    }
    if (stage === "challenge" && progress.challengeId) {
      const challenge = findChallenge(progress.challengeId);
      if (challenge) {
        say(pick({ en: "A hint for your challenge:", hi: "Aapke challenge ke liye hint:" }), pick(challenge.hint));
        reply.contextUsed.push(`Your challenge: ${challenge.title.en}`);
        return reply;
      }
    }
    if (stage === "experiment") {
      const goals = conceptContent(topic)?.sandbox.goals ?? [];
      const open = goals.find((goal) => !progress.goals.includes(goal.id));
      if (open) {
        say(
          pick({ en: `Your open goal: ${open.text.en}`, hi: `Aapka open goal: ${open.text.hi}` }),
          pick({
            en: "Hint: press one gate at a time and watch the probability bars. Use Reset whenever you want a clean start.",
            hi: "Hint: ek-ek gate dabao aur probability bars dekho. Clean start ke liye kabhi bhi Reset use karo.",
          })
        );
        return reply;
      }
    }
    const entry = focusEntry();
    cite(entry);
    reply.focus = entry?.id;
    say(
      pick({ en: "Here is a hint, not the answer:", hi: "Yeh hint hai, answer nahi:" }),
      entry?.hint
        ? pick(entry.hint)
        : pick({
            en: "Ask yourself what state the qubit is in just before the measurement: definite, or a superposition?",
            hi: "Khud se poochho ki measurement se just pehle qubit kis state mein hai: definite, ya superposition?",
          })
    );
    suggest({ en: "Explain simply", hi: "Simple explain karo" }, { en: "Why?", hi: "Kyun?" });
    return reply;
  }

  if (typedAction === "result" || (!action && CONTEXT_PATTERNS[1][1].test(q))) {
    reply.mode = "RESULT_ANALYSIS";
    reply.intent = "why-result";
    if (!last) {
      const entry = knowledgeById("h-gate");
      cite(entry);
      say(
        pick({
          en: "You have not run a circuit yet, so there is no result of yours to explain. Run one and I will use its real counts. In the meantime, here is the classic case:",
          hi: "Aapne abhi koi circuit run nahi kiya, isliye explain karne ke liye aapka koi result nahi hai. Ek run karo aur main uske real counts use karunga. Tab tak yeh classic case dekho:",
        }),
        entry ? pick(entry.simple) : ""
      );
      reply.link = { label: "Open Quantum Lab", href: "/lab" };
      return reply;
    }
    say(
      pick({
        en: `Here is what happened in your last experiment (${last.circuit}).`,
        hi: `Aapke last experiment (${last.circuit}) mein yeh hua.`,
      })
    );
    say(
      last.correct
        ? pick({ en: `You predicted ${last.prediction} — that matched.`, hi: `Aapne ${last.prediction} predict kiya — woh match hua.` })
        : pick({ en: `You predicted ${last.prediction}. The simulation showed ${last.actual}.`, hi: `Aapne ${last.prediction} predict kiya. Simulation ne ${last.actual} dikhaya.` })
    );
    describeLast(true);
    reply.contextUsed.push(`Your prediction: ${last.prediction}`);
    reply.link = { label: pick({ en: "Try another circuit", hi: "Ek aur circuit try karo" }), href: "/lab" };
    suggest({ en: "Why?", hi: "Kyun?" }, { en: "Challenge me", hi: "Challenge do" });
    return reply;
  }

  if (typedAction === "mistake" || (!action && CONTEXT_PATTERNS[0][1].test(q))) {
    reply.mode = "REVIEW";
    reply.intent = "why-wrong";
    const misconception = activeMisconceptions(state)[0];
    const wrongPrediction = last && !last.correct ? last : null;
    const missedSlot = assessmentSlots(topic)
      .map((slot) => progress.assess[slot])
      .find((record) => record && record.credit < DEMONSTRATED && record.missedQuestionId);

    if (wrongPrediction) {
      reply.contextUsed.push(`Your last prediction: ${wrongPrediction.prediction}`);
      say(
        pick({
          en: `Your prediction was different from the simulation result. You predicted ${wrongPrediction.prediction}, and the circuit ${wrongPrediction.circuit} gave ${wrongPrediction.actual}. Let's look at it gate by gate:`,
          hi: `Yahan prediction miss hua. Aapne ${wrongPrediction.prediction} predict kiya, aur circuit ${wrongPrediction.circuit} ne ${wrongPrediction.actual} diya. Let's look at it gate by gate:`,
        })
      );
      describeLast(false);
      reply.link = { label: pick({ en: "Try another circuit", hi: "Ek aur circuit try karo" }), href: "/lab" };
    } else if (misconception) {
      const entry = knowledgeById(misconception.info.knowledgeId);
      cite(entry);
      reply.mode = "MISCONCEPTION_CORRECTION";
      reply.contextUsed.push(`Possible misconception on record: ${misconception.info.title.en}`);
      say(
        pick({
          en: `Your records show a possible misconception: “${misconception.info.title.en}”. What triggered it: ${misconception.lastEvidence}`,
          hi: `Aapke records mein ek possible misconception hai: “${misconception.info.title.hi}”. Trigger: ${misconception.lastEvidence}`,
        }),
        pick(misconception.info.correction),
        pick({ en: `How to check it yourself: ${misconception.info.evidence.en}`, hi: `Khud check karne ke liye: ${misconception.info.evidence.hi}` })
      );
      const challenge = findChallenge(misconception.info.challengeId);
      if (challenge && canOpenStage(state, challenge.topic, "predict")) {
        reply.link = { label: pick({ en: `Try the challenge: ${challenge.title.en}`, hi: `Challenge try karo: ${challenge.title.hi}` }), href: `/practice?challenge=${challenge.id}` };
      }
    } else if (missedSlot?.missedQuestionId) {
      const question = questionById(missedSlot.missedQuestionId);
      reply.mode = "ASSESSMENT_FEEDBACK";
      if (question) {
        reply.contextUsed.push(`An item you missed in the ${title} mastery check: ${question.concept}`);
        say(
          pick({ en: `In the ${title} mastery check you missed this item:`, hi: `${title} mastery check mein yeh item miss hua:` }),
          pick(question.prompt),
          pick({ en: `Correct answer: ${question.options[question.answer].en}`, hi: `Correct answer: ${question.options[question.answer].hi}` }),
          pick(question.explanation)
        );
      }
    } else if (last) {
      say(
        pick({
          en: `Your last prediction was actually right. You predicted ${last.prediction} for ${last.circuit}, and the simulation agreed. Here is why it worked:`,
          hi: `Aapki last prediction actually sahi thi. Aapne ${last.circuit} ke liye ${last.prediction} predict kiya, aur simulation ne wahi diya. Yeh isliye hua:`,
        })
      );
      reply.contextUsed.push(`Your last prediction: ${last.prediction}`);
      describeLast(false);
    } else {
      say(
        pick({
          en: "There is no mistake on record yet — you have not made a prediction or taken a mastery check. Make a prediction in the Quantum Lab and I will walk you through the result.",
          hi: "Abhi record mein koi mistake nahi hai — aapne koi prediction ya mastery check nahi kiya. Quantum Lab mein prediction karo, phir main result step-by-step samjhaunga.",
        })
      );
      reply.link = { label: "Open Quantum Lab", href: "/lab" };
    }
    suggest({ en: "Challenge me", hi: "Challenge do" }, { en: "What should I learn next?", hi: "Mujhe next kya seekhna chahiye?" });
    return reply;
  }

  if (typedAction === "challenge") {
    reply.mode = "CHALLENGE";
    reply.intent = "challenge";
    if (stage === "assess") {
      say(
        pick({
          en: "You are in a mastery check right now — that is the challenge. Finish it first, then I will pick one for your weakest area.",
          hi: "Aap abhi mastery check mein ho — wahi challenge hai. Pehle use finish karo, phir main aapke weakest area ke liye ek pick karunga.",
        })
      );
      return reply;
    }
    const choice = chooseChallenge(state, topic);
    if (choice && canOpenStage(state, topic, "predict")) {
      reply.contextUsed.push(choice.target ? `Weak area: ${choice.target}` : "No weak area on record: a stretch challenge");
      say(
        pick({ en: `Your challenge: ${choice.challenge.title.en}.`, hi: `Aapka challenge: ${choice.challenge.title.hi}.` }),
        pick(choice.challenge.question),
        pick(choice.reason),
        pick({ en: "Predict first, then run it.", hi: "Pehle predict karo, phir run karo." })
      );
      reply.link = { label: pick({ en: "Open the challenge", hi: "Challenge kholo" }), href: `/practice?challenge=${choice.challenge.id}` };
    } else {
      const entry = focusEntry();
      cite(entry);
      say(
        pick({
          en: `Circuit challenges for ${title} open once you reach its Predict stage. Until then, here is something to think about:`,
          hi: `${title} ke circuit challenges tab open honge jab aap uske Predict stage par pahunchoge. Tab tak isse socho:`,
        }),
        entry?.hint ? pick(entry.hint) : pick({ en: "What does one measurement of a qubit return?", hi: "Qubit ka ek measurement kya return karta hai?" })
      );
      reply.link = { label: pick({ en: `Continue ${title}`, hi: `${title} continue karo` }), href: `/learn/${topic}` };
    }
    return reply;
  }

  if (typedAction === "visualize") {
    reply.mode = "VISUALIZE";
    const retrieved = action ? undefined : retrieve(question, { topic })[0]?.entry;
    const candidates = [retrieved, focusEntry(), knowledgeById(conceptContent(topic)?.keyIdea ?? ""), knowledgeById("bloch-sphere")];
    const entry = candidates.find((candidate) => candidate?.visual) ?? candidates.find(Boolean);
    reply.intent = "visualize";
    reply.focus = entry?.id;
    cite(entry);
    if (entry?.visual) {
      reply.visual = { qubits: entry.visual.qubits, gates: entry.visual.gates, caption: pick(entry.visual.caption) };
      say(pick(entry.visual.caption), pick(entry.simple));
    } else if (entry) {
      say(
        pick({
          en: "There is no picture for this idea in the verified material. In words:",
          hi: "Is idea ke liye verified material mein picture nahi hai. Words mein:",
        }),
        pick(entry.simple)
      );
    }
    reply.link = { label: pick({ en: "Explore it in the Quantum Lab", hi: "Quantum Lab mein explore karo" }), href: "/lab" };
    suggest({ en: "Why?", hi: "Kyun?" }, { en: "Show the math", hi: "Math dikhao" });
    return reply;
  }

  if (typedAction === "why" || bareWhy) {
    // "Why?" on its own: explain the cause of the result just seen, or of the idea just discussed.
    const experimentStages: StageId[] = ["run", "observe", "explain", "challenge"];
    if (last && !context.focus && (!stage || experimentStages.includes(stage))) {
      reply.mode = "WHY";
      reply.intent = "why-result";
      say(
        pick({
          en: `Why ${last.circuit} gave ${last.actual}:`,
          hi: `${last.circuit} ne ${last.actual} kyun diya:`,
        })
      );
      describeLast(false);
      return reply;
    }
    const entry = focusEntry();
    if (entry) {
      teach(entry, "WHY");
      suggest({ en: "Show the math", hi: "Math dikhao" }, { en: "Visualize this", hi: "Visualize karo" });
      return reply;
    }
  }

  if (typedAction === "math" || typedAction === "simplify") {
    const entry = focusEntry();
    if (entry) {
      teach(entry, typedAction === "math" ? "MATH" : "SIMPLIFY");
      suggest(
        typedAction === "math" ? { en: "Explain simply", hi: "Simple explain karo" } : { en: "Why?", hi: "Kyun?" },
        { en: "Visualize this", hi: "Visualize karo" }
      );
      return reply;
    }
  }

  // -------------------------------------------------------------------------
  // 3. Questions about the learner's own situation
  // -------------------------------------------------------------------------
  const contextIntent = CONTEXT_PATTERNS.find(([, pattern]) => pattern.test(q))?.[0];

  if (contextIntent === "next") {
    const rec = getRecommendation(state);
    reply.mode = "GUIDE";
    reply.intent = "next";
    reply.contextUsed.push(`Recommendation rule: ${rec.ruleId}`);
    say(pick({ en: `Your next move: ${rec.title.en}.`, hi: `Aapka next move: ${rec.title.hi}.` }), pick(rec.reason));
    reply.link = { label: pick(rec.cta), href: rec.href };
    return reply;
  }

  if (contextIntent === "unlock") {
    const threshold = state.settings.masteryThreshold;
    const m = topicMastery(state, topic);
    reply.mode = "GUIDE";
    reply.intent = "unlock";
    reply.contextUsed.push(`Mastery threshold: ${threshold}%`);
    const upcoming = stage ? STAGE_IDS[STAGE_IDS.indexOf(stage) + 1] : undefined;
    say(
      pick({
        en: `Each concept is learned in ${STAGE_IDS.length} stages. A stage unlocks only when the stage before it reaches ${threshold}% mastery — nothing unlocks automatically.`,
        hi: `Har concept ${STAGE_IDS.length} stages mein seekha jaata hai. Koi stage tabhi unlock hota hai jab usse pehle wala stage ${threshold}% mastery tak pahunche — kuch bhi automatically unlock nahi hota.`,
      }),
      stage
        ? pick({
            en: `In ${title} you are on ${stageMeta(stage).label.toUpperCase()} at ${m.stageScore}%.${upcoming ? ` Reaching ${threshold}% unlocks ${stageMeta(upcoming).label.toUpperCase()}.` : ` Reaching ${threshold}% masters the concept and unlocks the next one.`}`,
            hi: `${title} mein aap ${stageMeta(stage).label.toUpperCase()} par ho, ${m.stageScore}% par.${upcoming ? ` ${threshold}% reach karne par ${stageMeta(upcoming).label.toUpperCase()} unlock hoga.` : ` ${threshold}% reach karne par concept master hoga aur next unlock hoga.`}`,
          })
        : pick({ en: `${title} is fully mastered.`, hi: `${title} fully mastered hai.` }),
      pick({
        en: "Every stage can be retried as often as you like, and your best score is kept.",
        hi: "Har stage jitni baar chaho retry kar sakte ho, aur aapka best score rakha jaata hai.",
      })
    );
    reply.link = { label: pick({ en: `Continue ${title}`, hi: `${title} continue karo` }), href: `/learn/${topic}` };
    return reply;
  }

  if (contextIntent === "progress") {
    reply.mode = "GUIDE";
    reply.intent = "progress";
    reply.contextUsed.push("Your local learning records");
    const p = insights.prediction;
    say(
      pick({
        en: `You are working on ${title}${stage ? `, stage ${stageMeta(stage).label}` : ""}. Overall progress is ${insights.overallProgress}% and concept mastery is ${insights.conceptMastery}%.`,
        hi: `Aap ${title}${stage ? `, stage ${stageMeta(stage).label}` : ""} par kaam kar rahe ho. Overall progress ${insights.overallProgress}% hai aur concept mastery ${insights.conceptMastery}%.`,
      }),
      p.total === 0
        ? pick({
            en: "You have not made any predictions yet — that is the fastest way to build intuition.",
            hi: "Aapne abhi koi prediction nahi ki — intuition banane ka yahi fastest tareeka hai.",
          })
        : pick({
            en: `You have made ${p.total} predictions and ${p.correct} were right (${p.accuracy}%).`,
            hi: `Aapne ${p.total} predictions ki hain aur ${p.correct} sahi thi (${p.accuracy}%).`,
          }),
      pick({
        en: `Your learning path is adapting to your current understanding: ${LEVEL_LABEL[level.level]} (inferred from ${level.evidence.join("; ") || "your activity"}).`,
        hi: `Aapka learning path aapki current understanding ke hisaab se adapt ho raha hai: ${LEVEL_LABEL[level.level]} (${level.evidence.join("; ") || "aapki activity"} se inferred).`,
      })
    );
    if (insights.weakConcepts.length > 0) {
      const weak = insights.weakConcepts.map((w) => w.concept).join(", ");
      say(pick({ en: `Concepts to strengthen: ${weak}.`, hi: `In concepts ko strong karna hai: ${weak}.` }));
    }
    reply.link = { label: pick({ en: "Your Progress", hi: "Aapka Progress" }), href: "/progress" };
    return reply;
  }

  if (contextIntent === "greeting") {
    reply.mode = "GUIDE";
    reply.intent = "greeting";
    say(
      pick({
        en: `Hi${name ? " " + name : ""}. You are on ${title}${stage ? `, stage ${stageMeta(stage).label}` : ""}. Ask me about a concept, or use a quick action below — “Explain my result” works after you run a circuit.`,
        hi: `Hi${name ? " " + name : ""}. Aap ${title}${stage ? `, stage ${stageMeta(stage).label}` : ""} par ho. Mujhse koi concept poochho, ya neeche quick action use karo — circuit run karne ke baad “Mera result explain karo” kaam karta hai.`,
      })
    );
    return reply;
  }

  if (contextIntent === "thanks") {
    reply.mode = "GUIDE";
    reply.intent = "thanks";
    say(pick({ en: "Any time. Ready for the next experiment?", hi: "Anytime. Next experiment ke liye ready?" }));
    reply.link = { label: pick({ en: `Continue ${title}`, hi: `${title} continue karo` }), href: `/learn/${topic}` };
    return reply;
  }

  // -------------------------------------------------------------------------
  // 4. Concept questions: retrieve from the verified knowledge base
  // -------------------------------------------------------------------------
  const retrieved = retrieve(question, { topic });
  if (retrieved.length > 0) {
    const entry = retrieved[0].entry;
    const mode: TutorMode = MATH_WORDS.test(q) ? "MATH" : SIMPLE_WORDS.test(q) ? "SIMPLIFY" : WHY_WORDS.test(q) ? "WHY" : "TEACH";
    teach(entry, mode);
    reply.contextUsed.push(`Retrieved ${retrieved.length} verified ${retrieved.length === 1 ? "entry" : "entries"} (best match: ${entry.title})`);

    // Tie the concept back to what the learner just did, when it is relevant.
    if (last && last.counts && /\bH\b/.test(last.circuit) && ["h-gate", "superposition-basics", "sampling-variation", "probability-basics"].includes(entry.id)) {
      reply.contextUsed.push(`Your last experiment: ${last.circuit}`);
      say(
        pick({
          en: `You saw this yourself: your last experiment (${last.circuit}) gave ${last.actual}.`,
          hi: `Yeh aapne khud dekha: aapke last experiment (${last.circuit}) ne ${last.actual} diya.`,
        })
      );
    }
    // Point out when the question touches one of the learner's weak areas.
    const weak = insights.weakConcepts.find((w) => w.concept === entry.concept && w.topic === entry.topic);
    if (weak) {
      reply.contextUsed.push(`Weak concept: ${weak.concept}`);
      say(
        pick({
          en: `This is worth a second look — ${weak.concept} is still open in your mastery check.`,
          hi: `Isse ek baar aur dekhna worth hai — ${weak.concept} aapke mastery check mein abhi open hai.`,
        })
      );
    }
    suggest({ en: "Why?", hi: "Kyun?" }, { en: "Show the math", hi: "Math dikhao" }, { en: "Visualize this", hi: "Visualize karo" });
    return reply;
  }

  // -------------------------------------------------------------------------
  // 5. Nothing retrieved: say so. Never invent an answer or a source.
  // -------------------------------------------------------------------------
  reply.mode = "GUIDE";
  reply.intent = "fallback";
  say(
    pick({
      en: "I could not find that in the verified course material, so I will not guess. I can help with: qubits, bits vs qubits, ket notation, the H, X, Y, Z, S, T, CX and M gates, phase, superposition, measurement, probability and sampling, interference, entanglement, your last experiment, and what to learn next.",
      hi: "Yeh mujhe verified course material mein nahi mila, isliye main guess nahi karunga. Main in cheezon mein help kar sakta hoon: qubits, bit vs qubit, ket notation, H, X, Y, Z, S, T, CX aur M gates, phase, superposition, measurement, probability aur sampling, interference, entanglement, aapka last experiment, aur next kya seekhna hai.",
    })
  );
  reply.followUps = SUGGESTED_QUESTIONS.slice(0, 4).map(pick);
  return reply;
}

/** What the tutor says when something goes wrong while building an answer. */
export const TUTOR_UNAVAILABLE: L = {
  en: "AI Tutor is temporarily unavailable. Your lessons and the Quantum Lab still work — please try again in a moment.",
  hi: "AI Tutor abhi temporarily unavailable hai. Aapke lessons aur Quantum Lab kaam kar rahe hain — thodi der mein dobara try karo.",
};
