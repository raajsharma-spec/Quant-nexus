/**
 * "Your Next Move" — a transparent, rule-based recommendation engine.
 *
 * There is no machine learning here. Each rule below is a plain IF → THEN
 * check on the learner's local records, and every recommendation says WHY
 * it was chosen. Rules are tried from top to bottom; the first match wins.
 */

import { findChallenge } from "@/data/challenges";
import { coreExperiment } from "@/data/concepts";
import { conceptContent } from "@/data/curriculum";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { assessmentSlots, DEMONSTRATED, slotLabel } from "./adaptiveAssessment";
import { computeInsights } from "./analytics";
import { allMastered, canOpenStage, currentStageOf, currentTopic, topicMastery } from "./mastery";
import { activeMisconceptions } from "./misconceptions";
import { dueReviews } from "./review";
import { progressOf, stageScore } from "./stages";
import type { AppState } from "./storage";
import { STAGE_IDS, stageMeta, type L, type StageId, type TopicId } from "./types";

export interface Recommendation {
  ruleId: string;
  /** The rule in plain words, shown so the learner can see how it works. */
  rule: string;
  title: L;
  reason: L;
  cta: L;
  href: string;
  topic: TopicId;
}

/** The rules, in the order they are checked. Also displayed on the Progress and Architecture pages. */
export const RULES: Array<{ id: string; when: string; then: string }> = [
  {
    id: "circuit-errors",
    when: "2 or more of the last 5 lab runs ended in a circuit error",
    then: "Recommend Circuit Construction Review",
  },
  {
    id: "misconception",
    when: "A possible misconception has been detected and is still open",
    then: "Recommend the challenge that tests it",
  },
  {
    id: "quick-review",
    when: "A mastered concept is due for its spaced Quick Review",
    then: "Recommend the one-question review",
  },
  { id: "all-mastered", when: "Every available concept is mastered", then: "Recommend free experiments in the lab" },
  {
    id: "prediction-practice",
    when: "Prediction accuracy for the current concept is below 60% (3+ predictions)",
    then: "Recommend Predict-Before-Run practice",
  },
  {
    id: "targeted-retry",
    when: "The mastery check has been taken but is below the mastery threshold",
    then: "Recommend the targeted retry on the missed items",
  },
  {
    id: "next-topic",
    when: "The previous concept is mastered and this one has not been started",
    then: "Recommend starting the next concept",
  },
  {
    id: "continue-stage",
    when: "The current stage has not reached the mastery threshold",
    then: "Recommend continuing that stage",
  },
];

const ruleText = (id: string) => {
  const r = RULES.find((x) => x.id === id);
  return r ? `IF ${r.when} → ${r.then}` : id;
};

/** What a stage asks the learner to do, in one line. */
export function stageAction(state: AppState, topic: TopicId, stage: StageId): L {
  const progress = progressOf(state, topic);
  const content = conceptContent(topic);
  const title = topicTitle(topic);
  switch (stage) {
    case "discover":
      return { en: `See what ${title} is about and why it matters.`, hi: `Dekho ${title} kya hai aur kyun matter karta hai.` };
    case "learn":
      return { en: "Read the short theory blocks.", hi: "Chhote theory blocks padho." };
    case "watch":
      return { en: "Watch the short visual lesson.", hi: "Chhota visual lesson dekho." };
    case "interact":
      return { en: "Try the interactive demonstration.", hi: "Interactive demonstration try karo." };
    case "experiment": {
      const left = (content?.sandbox.goals.length ?? 0) - progress.goals.length;
      return {
        en: `Reach the experiment goals${left > 0 ? ` (${left} left)` : ""}.`,
        hi: `Experiment goals reach karo${left > 0 ? ` (${left} baaki)` : ""}.`,
      };
    }
    case "ask":
      return { en: `Ask the tutor one question about ${title}.`, hi: `Tutor se ${title} ke baare mein ek question poochho.` };
    case "predict": {
      const core = coreExperiment(topic);
      if (core?.question) return core.question;
      return { en: "Predict what the circuit will do.", hi: "Predict karo circuit kya karega." };
    }
    case "run":
      return { en: "Run the circuit you just predicted.", hi: "Jo circuit abhi predict kiya use run karo." };
    case "observe":
      return { en: "Read the measurement result and answer the two observation checks.", hi: "Measurement result padho aur do observation checks answer karo." };
    case "explain":
      return { en: "Explain in your own words why the result happened.", hi: "Apne words mein explain karo ki result kyun aaya." };
    case "assess":
      return progress.assessAttempts > 0
        ? { en: "Take the targeted retry: only the items you missed.", hi: "Targeted retry lo: sirf wahi items jo miss hue." }
        : { en: "Take the adaptive mastery check.", hi: "Adaptive mastery check lo." };
    case "review":
      return { en: "Read your personalised review.", hi: "Apna personalised review padho." };
    case "challenge":
      return { en: "Solve the challenge chosen for you.", hi: "Aapke liye chosen challenge solve karo." };
  }
}

export interface NextAction {
  topic: TopicId;
  stage: StageId | null;
  /** 0–100: score in the current stage. */
  score: number;
  action: L;
  href: string;
}

/** The learner's current concept, stage and the one thing to do next. */
export function nextAction(state: AppState): NextAction {
  const topic = currentTopic(state);
  const stage = currentStageOf(state, topic);
  if (!stage) {
    return {
      topic,
      stage: null,
      score: 100,
      action: { en: "Every available concept is mastered. Experiment freely in the lab.", hi: "Har available concept master ho gaya. Lab mein freely experiment karo." },
      href: "/lab",
    };
  }
  return {
    topic,
    stage,
    score: stageScore(progressOf(state, topic), stage),
    action: stageAction(state, topic, stage),
    href: `/learn/${topic}`,
  };
}

export function getRecommendation(state: AppState): Recommendation {
  const insights = computeInsights(state);
  const topic = currentTopic(state);
  const title = topicTitle(topic);
  const m = topicMastery(state, topic);
  const threshold = state.settings.masteryThreshold;

  // Rule 1 — repeated circuit errors.
  if (insights.recentErrors >= 2) {
    return {
      ruleId: "circuit-errors",
      rule: ruleText("circuit-errors"),
      title: { en: "Review circuit construction", hi: "Circuit construction review karo" },
      reason: {
        en: `Recommended because ${insights.recentErrors} of your last 5 lab runs stopped with a circuit error. A quick look at how gates and measurement fit on a wire will fix that.`,
        hi: `Recommended kyunki aapke last 5 lab runs mein se ${insights.recentErrors} circuit error par ruk gaye. Gates aur measurement wire par kaise fit hote hain, yeh ek baar dekh lo.`,
      },
      cta: { en: "Ask the tutor about circuits", hi: "Tutor se circuits ke baare mein poochho" },
      href: "/ai-tutor?q=How%20do%20I%20read%20a%20quantum%20circuit%3F",
      topic: "gates",
    };
  }

  // Rule 2 — an open misconception, once the challenge that tests it can be opened.
  // (Before that, the concept's own Review and Next Challenge stages deal with it.)
  for (const misconception of activeMisconceptions(state)) {
    const challenge = findChallenge(misconception.info.challengeId);
    if (!challenge || !canOpenStage(state, challenge.topic, "predict")) continue;
    return {
      ruleId: "misconception",
      rule: ruleText("misconception"),
      title: {
        en: `Clear up: ${misconception.info.title.en}`,
        hi: `Clear karo: ${misconception.info.title.hi}`,
      },
      reason: {
        en: `Recommended because a possible misconception showed up in your ${misconception.sources.join(" and ")} (confidence ${Math.round(misconception.confidence * 100)}%). ${misconception.info.evidence.en}`,
        hi: `Recommended kyunki aapke ${misconception.sources.join(" aur ")} mein ek possible misconception dikhi (confidence ${Math.round(misconception.confidence * 100)}%). ${misconception.info.evidence.hi}`,
      },
      cta: { en: "Try the targeted challenge", hi: "Targeted challenge try karo" },
      href: `/practice?challenge=${challenge.id}`,
      topic: misconception.info.topic,
    };
  }

  // Rule 3 — spaced review of something mastered earlier.
  const due = dueReviews(state)[0];
  if (due) {
    return {
      ruleId: "quick-review",
      rule: ruleText("quick-review"),
      title: { en: `Quick Review: ${topicTitle(due)}`, hi: `Quick Review: ${topicTitle(due)}` },
      reason: state.reviews[due]?.needsReview
        ? {
            en: `Recommended because you missed the last quick review of ${topicTitle(due)}. One short question keeps it fresh.`,
            hi: `Recommended kyunki ${topicTitle(due)} ka last quick review miss hua. Ek chhota question ise fresh rakhega.`,
          }
        : {
            en: `Recommended because you mastered ${topicTitle(due)} a while ago. One short question checks that it has stuck.`,
            hi: `Recommended kyunki aapne ${topicTitle(due)} kuch time pehle master kiya tha. Ek chhota question check karega ki yaad hai.`,
          },
      cta: { en: "Answer one question", hi: "Ek question answer karo" },
      href: `/practice?review=${due}`,
      topic: due,
    };
  }

  // Rule 4 — everything mastered.
  if (allMastered(state)) {
    return {
      ruleId: "all-mastered",
      rule: ruleText("all-mastered"),
      title: { en: "Experiment freely in the Quantum Lab", hi: "Quantum Lab mein freely experiment karo" },
      reason: {
        en: "Recommended because you have mastered every concept available in this build. Build your own circuits and keep testing your predictions.",
        hi: "Recommended kyunki aapne is build ke saare available concepts master kar liye hain. Apne circuits banao aur predictions test karte raho.",
      },
      cta: { en: "Open Quantum Lab", hi: "Quantum Lab kholo" },
      href: "/lab",
      topic,
    };
  }

  const stage = m.stage ?? "discover";
  const meta = stageMeta(stage);
  const stageIndex = STAGE_IDS.indexOf(stage);
  const upcoming = STAGE_IDS[stageIndex + 1];

  // Rule 5 — prediction accuracy below 60%, once practice is open.
  const acc = insights.predictionByTopic[topic];
  if (acc && acc.total >= 3 && acc.accuracy !== null && acc.accuracy < 60 && canOpenStage(state, topic, "predict")) {
    return {
      ruleId: "prediction-practice",
      rule: ruleText("prediction-practice"),
      title: { en: `Practice ${title} prediction`, hi: `${title} prediction practice karo` },
      reason: {
        en: `Recommended because your prediction accuracy for ${title} is currently ${acc.accuracy}% (${acc.correct} of ${acc.total}), which is below 60%.`,
        hi: `Recommended kyunki ${title} mein aapki prediction accuracy abhi ${acc.accuracy}% hai (${acc.total} mein se ${acc.correct}), jo 60% se kam hai.`,
      },
      cta: { en: "Start practice", hi: "Practice start karo" },
      href: `/practice?topic=${topic}`,
      topic,
    };
  }

  // Rule 6 — the mastery check was taken but is below the gate.
  if (stage === "assess" && m.attempts > 0) {
    const progress = progressOf(state, topic);
    const missed = assessmentSlots(topic)
      .filter((slot) => (progress.assess[slot]?.credit ?? 0) < DEMONSTRATED)
      .map((slot) => slotLabel(topic, slot));
    return {
      ruleId: "targeted-retry",
      rule: ruleText("targeted-retry"),
      title: { en: `Targeted retry: ${title}`, hi: `Targeted retry: ${title}` },
      reason: {
        en: `Recommended because your ${title} mastery check is at ${m.bestScore}% and ${threshold}% is needed. Only the ${missed.length} missed ${missed.length === 1 ? "item comes" : "items come"} back: ${missed.join(", ")}.`,
        hi: `Recommended kyunki aapka ${title} mastery check ${m.bestScore}% par hai aur ${threshold}% chahiye. Sirf ${missed.length} missed ${missed.length === 1 ? "item" : "items"} wapas aayenge: ${missed.join(", ")}.`,
      },
      cta: { en: "Take the targeted retry", hi: "Targeted retry lo" },
      href: `/learn/${topic}?stage=assess`,
      topic,
    };
  }

  // Rule 7 — the previous concept is mastered and this one is untouched.
  const index = INTERACTIVE_TOPICS.indexOf(topic);
  const previous = index > 0 ? INTERACTIVE_TOPICS[index - 1] : null;
  if (previous && !state.concepts[topic]) {
    return {
      ruleId: "next-topic",
      rule: ruleText("next-topic"),
      title: { en: `Start ${title}`, hi: `${title} start karo` },
      reason: {
        en: `Recommended because every stage of ${topicTitle(previous)} reached ${threshold}% mastery, so ${title} is now unlocked.`,
        hi: `Recommended kyunki ${topicTitle(previous)} ka har stage ${threshold}% mastery tak pahunch gaya, isliye ${title} ab unlock ho gaya hai.`,
      },
      cta: { en: "Start the concept", hi: "Concept start karo" },
      href: `/learn/${topic}`,
      topic,
    };
  }

  // Rule 8 — carry on with the current stage.
  const started = !!state.concepts[topic];
  return {
    ruleId: "continue-stage",
    rule: ruleText("continue-stage"),
    title: {
      en: `${started ? "Continue" : "Start"} ${title}: ${meta.label}`,
      hi: `${title} ${started ? "continue" : "start"} karo: ${meta.label}`,
    },
    reason: started
      ? {
          en: `Recommended because you are on stage ${meta.number} ${meta.label.toUpperCase()}, currently at ${m.stageScore}%. Reaching ${threshold}% unlocks ${upcoming ? stageMeta(upcoming).label.toUpperCase() : "the next concept"}.`,
          hi: `Recommended kyunki aap stage ${meta.number} ${meta.label.toUpperCase()} par ho, abhi ${m.stageScore}% par. ${threshold}% reach karne par ${upcoming ? stageMeta(upcoming).label.toUpperCase() : "next concept"} unlock hoga.`,
        }
      : {
          en: `Recommended because ${title} is the first concept on your roadmap.`,
          hi: `Recommended kyunki ${title} aapke roadmap ka pehla concept hai.`,
        },
    cta: { en: started ? "Continue learning" : "Start learning", hi: started ? "Learning continue karo" : "Learning start karo" },
    href: `/learn/${topic}`,
    topic,
  };
}
