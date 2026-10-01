/**
 * "Your Next Move" — a transparent, rule-based recommendation engine.
 *
 * There is no machine learning here. Each rule below is a plain IF → THEN
 * check on the learner's local records, and every recommendation says WHY
 * it was chosen. Rules are tried from top to bottom; the first match wins.
 */

import { requiredChallenges } from "@/data/challenges";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { computeInsights } from "./analytics";
import { allMastered, currentTopic, nextTopic, topicMastery } from "./mastery";
import type { AppState } from "./storage";
import type { L, TopicId } from "./types";

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
    id: "python-first",
    when: "Python comfort is “Beginner” and Python Foundations is not finished",
    then: "Recommend Python Foundations",
  },
  {
    id: "circuit-errors",
    when: "2 or more of the last 5 lab runs ended in a circuit error",
    then: "Recommend Circuit Construction Review",
  },
  { id: "finish-lesson", when: "The current topic's lesson is not finished", then: "Recommend the lesson" },
  {
    id: "prediction-practice",
    when: "Prediction accuracy for the current topic is below 60% (3+ predictions)",
    then: "Recommend Predict-Before-Run practice",
  },
  {
    id: "review-weak-concept",
    when: "The latest mastery check for the current topic scored below 70%",
    then: "Recommend reviewing the weakest concept",
  },
  { id: "finish-practice", when: "Required practice is not complete", then: "Recommend practice" },
  {
    id: "take-mastery-check",
    when: "Lesson and practice are done but the mastery check is not passed",
    then: "Recommend the mastery check",
  },
  {
    id: "resolve-error",
    when: "Score and practice are complete but the last lab run ended in a circuit error",
    then: "Recommend running one working circuit",
  },
  { id: "next-topic", when: "Mastery is at or above the threshold", then: "Recommend the next topic" },
];

const ruleText = (id: string) => {
  const r = RULES.find((x) => x.id === id);
  return r ? `IF ${r.when} → ${r.then}` : id;
};

export function getRecommendation(state: AppState): Recommendation {
  const insights = computeInsights(state);
  const topic = currentTopic(state);
  const title = topicTitle(topic);
  const m = topicMastery(state, topic);
  const threshold = state.settings.masteryThreshold;

  // Rule 1 — remove the Python barrier first, for learners who asked for it.
  if (state.profile?.pythonLevel === "beginner" && !state.lessons.python?.completed) {
    return {
      ruleId: "python-first",
      rule: ruleText("python-first"),
      title: { en: "Start with Python Foundations", hi: "Python Foundations se start karo" },
      reason: {
        en: "Recommended because you told us you are a beginner in Python. A short warm-up makes the quantum examples easier to read. You can skip it any time.",
        hi: "Recommended kyunki aapne bataya ki aap Python mein beginner ho. Ek chhota warm-up quantum examples ko padhna easy bana deta hai. Aap ise kabhi bhi skip kar sakte ho.",
      },
      cta: { en: "Start Python Foundations", hi: "Python Foundations start karo" },
      href: "/learn/python",
      topic: "python",
    };
  }

  // Rule 2 — repeated circuit errors.
  if (insights.recentErrors >= 2) {
    return {
      ruleId: "circuit-errors",
      rule: ruleText("circuit-errors"),
      title: { en: "Review circuit construction", hi: "Circuit construction review karo" },
      reason: {
        en: `Recommended because ${insights.recentErrors} of your last 5 lab runs stopped with a circuit error. A quick look at how gates and measurement fit on a wire will fix that.`,
        hi: `Recommended kyunki aapke last 5 lab runs mein se ${insights.recentErrors} circuit error par ruk gaye. Gates aur measurement wire par kaise fit hote hain, yeh ek baar dekh lo.`,
      },
      cta: { en: "Review Quantum Gates", hi: "Quantum Gates review karo" },
      href: "/learn/gates",
      topic: "gates",
    };
  }

  // Everything mastered — keep experimenting.
  if (allMastered(state)) {
    return {
      ruleId: "next-topic",
      rule: ruleText("next-topic"),
      title: { en: "Experiment freely in the Quantum Lab", hi: "Quantum Lab mein freely experiment karo" },
      reason: {
        en: "Recommended because you have mastered every module available in this MVP. Build your own circuits and keep testing your predictions.",
        hi: "Recommended kyunki aapne is MVP ke saare available modules master kar liye hain. Apne circuits banao aur predictions test karte raho.",
      },
      cta: { en: "Open Quantum Lab", hi: "Quantum Lab kholo" },
      href: "/lab",
      topic,
    };
  }

  // Rule 3 — learn before you practise.
  if (!m.lessonCompleted) {
    const started = !!state.lessons[topic];
    const index = INTERACTIVE_TOPICS.indexOf(topic);
    const previous = index > 0 ? INTERACTIVE_TOPICS[index - 1] : null;

    // Rule 8 — the previous topic was mastered, so this one has just unlocked.
    if (!started && previous) {
      const best = topicMastery(state, previous).bestScore ?? threshold;
      return {
        ruleId: "next-topic",
        rule: ruleText("next-topic"),
        title: { en: `Start ${title}`, hi: `${title} start karo` },
        reason: {
          en: `Recommended because you scored ${best}% in ${topicTitle(previous)} — at or above the ${threshold}% mastery threshold — so ${title} is now unlocked.`,
          hi: `Recommended kyunki aapne ${topicTitle(previous)} mein ${best}% score kiya — jo ${threshold}% mastery threshold ke barabar ya upar hai — isliye ${title} ab unlock ho gaya hai.`,
        },
        cta: { en: "Start lesson", hi: "Lesson start karo" },
        href: `/learn/${topic}`,
        topic,
      };
    }

    return {
      ruleId: "finish-lesson",
      rule: ruleText("finish-lesson"),
      title: {
        en: `${started ? "Continue" : "Start"} ${title}`,
        hi: `${title} ${started ? "continue" : "start"} karo`,
      },
      reason: {
        en: started
          ? `Recommended because you have started ${title} but not finished the lesson yet.`
          : `Recommended because ${title} is the first concept on your roadmap.`,
        hi: started
          ? `Recommended kyunki aapne ${title} start kiya hai lekin lesson abhi complete nahi hua.`
          : `Recommended kyunki ${title} aapke roadmap ka pehla concept hai.`,
      },
      cta: { en: started ? "Continue lesson" : "Start lesson", hi: started ? "Lesson continue karo" : "Lesson start karo" },
      href: `/learn/${topic}`,
      topic,
    };
  }

  // Rule 4 — prediction accuracy below 60%.
  const acc = insights.predictionByTopic[topic];
  if (acc && acc.total >= 3 && acc.accuracy !== null && acc.accuracy < 60) {
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

  // Rule 5 — a weak mastery check points at a concept to review.
  if (m.lastScore !== null && m.lastScore < 70 && !m.assessmentPassed) {
    const weak = insights.weakConcepts.find((w) => w.topic === topic && w.reason === "mastery-check");
    const concept = weak?.concept ?? title;
    return {
      ruleId: "review-weak-concept",
      rule: ruleText("review-weak-concept"),
      title: { en: `Review ${concept}`, hi: `${concept} review karo` },
      reason: {
        en: `Recommended because your last ${title} mastery check scored ${m.lastScore}%, and ${concept} was the concept you missed.`,
        hi: `Recommended kyunki aapke last ${title} mastery check mein ${m.lastScore}% aaya, aur ${concept} wala concept miss hua.`,
      },
      cta: { en: "Review the lesson", hi: "Lesson review karo" },
      href: `/learn/${topic}`,
      topic,
    };
  }

  // Rule 6 — required practice.
  if (!m.practiceDone) {
    const left = requiredChallenges(topic).length - m.practiceSolved;
    return {
      ruleId: "finish-practice",
      rule: ruleText("finish-practice"),
      title: { en: `Practice ${title}`, hi: `${title} practice karo` },
      reason: {
        en: `Recommended because ${left} required ${left === 1 ? "challenge is" : "challenges are"} still open for ${title}. Practice is needed to unlock the next topic.`,
        hi: `Recommended kyunki ${title} ke ${left} required ${left === 1 ? "challenge" : "challenges"} abhi baaki hain. Next topic unlock karne ke liye practice zaroori hai.`,
      },
      cta: { en: "Start practice", hi: "Practice start karo" },
      href: `/practice?topic=${topic}`,
      topic,
    };
  }

  // Rule 7 — ready for the mastery check.
  if (!m.assessmentPassed) {
    const retry = m.attempts > 0;
    return {
      ruleId: "take-mastery-check",
      rule: ruleText("take-mastery-check"),
      title: {
        en: `${retry ? "Retry" : "Take"} the ${title} mastery check`,
        hi: `${title} mastery check ${retry ? "retry" : "do"}`,
      },
      reason: {
        en: retry
          ? `Recommended because your best score is ${m.bestScore}% and you need ${threshold}% to unlock the next topic. You're getting closer.`
          : `Recommended because you finished the lesson and the required practice. Score ${threshold}% or more to unlock the next topic.`,
        hi: retry
          ? `Recommended kyunki aapka best score ${m.bestScore}% hai aur next topic unlock karne ke liye ${threshold}% chahiye. Aap close ho.`
          : `Recommended kyunki aapne lesson aur required practice complete kar li hai. Next topic unlock karne ke liye ${threshold}% ya zyada score karo.`,
      },
      cta: { en: retry ? "Retry mastery check" : "Start mastery check", hi: retry ? "Mastery check retry karo" : "Mastery check start karo" },
      href: `/assessment?topic=${topic}`,
      topic,
    };
  }

  // Last case — score and practice are done but the last lab run failed.
  const upcoming = nextTopic(topic);
  return {
    ruleId: "resolve-error",
    rule: ruleText("resolve-error"),
    title: { en: "Fix your last lab run", hi: "Apna last lab run fix karo" },
    reason: {
      en: `Recommended because your ${title} score and practice are complete, but your last lab run stopped with a circuit error. Run one working circuit to unlock ${upcoming ? topicTitle(upcoming) : "the next topic"}.`,
      hi: `Recommended kyunki ${title} ka score aur practice complete hai, lekin aapka last lab run circuit error par ruk gaya. ${upcoming ? topicTitle(upcoming) : "Next topic"} unlock karne ke liye ek working circuit run karo.`,
    },
    cta: { en: "Open Quantum Lab", hi: "Quantum Lab kholo" },
    href: "/lab",
    topic,
  };
}
