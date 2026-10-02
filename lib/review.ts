/**
 * Personalised review, targeted challenges and spaced review.
 *
 * After a mastery check the learner does not simply move on. This file reads
 * their own records for the concept and produces:
 *
 *   WHAT YOU UNDERSTAND · WHAT NEEDS WORK · WHY YOU MISSED IT
 *   KEY CONCEPT TO REVIEW · TARGETED PRACTICE · NEXT STEP
 *
 * It also chooses the Next Challenge for the learner's weakest area, and
 * decides when a mastered concept should come back as a one-question
 * Quick Review. All of it is rule-based and uses only local records.
 */

import { challengesFor, type Challenge } from "@/data/challenges";
import { coreExperiment } from "@/data/concepts";
import { conceptContent } from "@/data/curriculum";
import { rubricById } from "@/data/explanations";
import { KNOWLEDGE, knowledgeById, type KnowledgeEntry } from "@/data/knowledge";
import { questionBank, questionById, type QuizQuestion } from "@/data/quizzes";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { assessmentSlots, BUILD_SLOT, DEMONSTRATED, slotLabel, WRITE_SLOT } from "./adaptiveAssessment";
import { difficultyFor, inferLevel } from "./learnerLevel";
import { activeMisconceptions } from "./misconceptions";
import { passes, stageScore } from "./stages";
import type { AppState, ReviewSchedule } from "./storage";
import type { L, TopicId } from "./types";

// ---------------------------------------------------------------------------
// Targeted challenge
// ---------------------------------------------------------------------------

export interface ChallengeChoice {
  challenge: Challenge;
  /** Why this challenge was chosen for this learner. */
  reason: L;
  /** The weak area it targets, or null for a stretch challenge. */
  target: string | null;
}

/** Challenges of a concept, leaving out the one that repeats its core experiment. */
export function challengePool(topic: TopicId): Challenge[] {
  const core = coreExperiment(topic);
  const coreKey = core ? JSON.stringify(core.circuit.gates) : "";
  return challengesFor(topic).filter((c) => JSON.stringify(c.circuit.gates) !== coreKey);
}

/** The learner's weak areas in a concept, most important first. */
export function weakAreas(state: AppState, topic: TopicId): Array<{ id: string; label: string; kind: "misconception" | "item" }> {
  const areas: Array<{ id: string; label: string; kind: "misconception" | "item" }> = [];
  for (const active of activeMisconceptions(state)) {
    if (active.info.topic === topic || challengesFor(topic).some((c) => c.targets.includes(active.info.id))) {
      areas.push({ id: active.info.id, label: active.info.title.en, kind: "misconception" });
    }
  }
  const progress = state.concepts[topic];
  if (progress) {
    const missed = assessmentSlots(topic)
      .filter((slot) => slot !== BUILD_SLOT && slot !== WRITE_SLOT)
      .map((slot) => ({ slot, record: progress.assess[slot] }))
      .filter(({ record }) => record && record.firstCredit < DEMONSTRATED)
      .sort((a, b) => (a.record!.credit - b.record!.credit) || (b.record!.tries - a.record!.tries));
    missed.forEach(({ slot }) => areas.push({ id: slot, label: slot, kind: "item" }));
  }
  return areas;
}

/**
 * Choose the Next Challenge: one that targets the learner's weakest area.
 * With no weak area, the learner gets a stretch challenge suited to their level.
 * `avoid` lets a learner who missed a challenge move on to a different one.
 */
export function chooseChallenge(state: AppState, topic: TopicId, avoid: string[] = []): ChallengeChoice | null {
  const pool = challengePool(topic);
  if (pool.length === 0) return null;
  const usable = pool.filter((c) => !avoid.includes(c.id));
  const candidates = usable.length > 0 ? usable : pool;
  const unsolved = candidates.filter((c) => !state.practice[c.id]?.solved);
  const from = unsolved.length > 0 ? unsolved : candidates;
  const level = Math.min(3, difficultyFor(inferLevel(state).level));

  for (const area of weakAreas(state, topic)) {
    const match = from
      .filter((c) => c.targets.includes(area.id))
      .sort((a, b) => Math.abs(a.difficulty - level) - Math.abs(b.difficulty - level))[0];
    if (!match) continue;
    return {
      challenge: match,
      target: area.label,
      reason:
        area.kind === "misconception"
          ? {
              en: `Chosen for you because a possible misconception was detected: “${area.label}”. This circuit puts it to the test.`,
              hi: `Aapke liye chosen kyunki ek possible misconception detect hui: “${area.label}”. Yeh circuit use test karta hai.`,
            }
          : {
              en: `Chosen for you because “${area.label}” was an item you missed in the mastery check.`,
              hi: `Aapke liye chosen kyunki “${area.label}” woh item tha jo mastery check mein miss hua.`,
            },
    };
  }

  // No weak area on record: a stretch challenge near (or just above) the learner's level.
  const stretch = [...from].sort(
    (a, b) => Math.abs(a.difficulty - (level + 1)) - Math.abs(b.difficulty - (level + 1)) || b.difficulty - a.difficulty
  )[0];
  return {
    challenge: stretch,
    target: null,
    reason: {
      en: "No weak area showed up in this concept, so this is a stretch challenge at your level.",
      hi: "Is concept mein koi weak area nahi dikha, isliye yeh aapke level ka stretch challenge hai.",
    },
  };
}

// ---------------------------------------------------------------------------
// Personalised review
// ---------------------------------------------------------------------------

export interface ReviewPoint {
  title: string;
  detail: L;
}

export interface PersonalReview {
  understood: ReviewPoint[];
  needsWork: ReviewPoint[];
  whyMissed: ReviewPoint[];
  keyConcept: KnowledgeEntry | null;
  practice: ChallengeChoice | null;
  nextStep: L;
  /** True when nothing was missed anywhere in the concept. */
  clean: boolean;
}

function entryForSlot(topic: TopicId, slot: string): KnowledgeEntry | null {
  return KNOWLEDGE.find((entry) => entry.topic === topic && entry.concept === slot) ?? null;
}

export function buildReview(state: AppState, topic: TopicId): PersonalReview {
  const content = conceptContent(topic);
  const progress = state.concepts[topic];
  const threshold = state.settings.masteryThreshold;
  const understood: ReviewPoint[] = [];
  const needsWork: ReviewPoint[] = [];
  const whyMissed: ReviewPoint[] = [];
  let keyConcept: KnowledgeEntry | null = null;

  if (!content || !progress) {
    return {
      understood,
      needsWork,
      whyMissed,
      keyConcept: content ? knowledgeById(content.keyIdea) ?? null : null,
      practice: chooseChallenge(state, topic),
      nextStep: {
        en: "Start the concept to build your personal review.",
        hi: "Apna personal review banane ke liye concept start karo.",
      },
      clean: true,
    };
  }

  // --- Mastery-check items -------------------------------------------------
  for (const slot of assessmentSlots(topic)) {
    const record = progress.assess[slot];
    if (!record) continue;
    const label = slotLabel(topic, slot);
    if (record.firstCredit >= DEMONSTRATED) {
      understood.push({
        title: label,
        detail: { en: "Right on the first attempt in the mastery check.", hi: "Mastery check mein first attempt par sahi." },
      });
      continue;
    }
    const fixed = record.credit >= DEMONSTRATED;
    needsWork.push({
      title: label,
      detail: fixed
        ? {
            en: `Missed at first, then got it on try ${record.tries}. Worth one more look.`,
            hi: `Pehle miss hua, phir try ${record.tries} par sahi hua. Ek baar aur dekhna worth hai.`,
          }
        : { en: "Not demonstrated yet in the mastery check.", hi: "Mastery check mein abhi demonstrate nahi hua." },
    });
    const missed = record.missedQuestionId ? questionById(record.missedQuestionId) : undefined;
    if (missed) whyMissed.push({ title: label, detail: missed.explanation });
    else if (slot === BUILD_SLOT) whyMissed.push({ title: label, detail: content.assessment.build.explanation });
    else if (slot === WRITE_SLOT) {
      const rubric = rubricById(content.assessment.writeRubric);
      if (rubric) whyMissed.push({ title: label, detail: rubric.model });
    }
    if (!keyConcept) keyConcept = entryForSlot(topic, slot);
  }

  // --- Prediction in the core experiment ------------------------------------
  if (progress.run) {
    if (progress.run.predictionCorrect) {
      understood.push({
        title: "Prediction",
        detail: {
          en: `You predicted the core experiment correctly (${progress.run.circuit}).`,
          hi: `Aapne core experiment sahi predict kiya (${progress.run.circuit}).`,
        },
      });
    } else {
      needsWork.push({
        title: "Prediction",
        detail: {
          en: `Your prediction for ${progress.run.circuit} differed from the simulation.`,
          hi: `${progress.run.circuit} ke liye aapki prediction simulation se alag thi.`,
        },
      });
    }
  }

  // --- Explanation ------------------------------------------------------------
  const explanations = state.explanations.filter((e) => e.topic === topic && e.rubricId === content.explainRubric);
  if (explanations.length > 0) {
    const first = explanations[0];
    const rubric = rubricById(content.explainRubric);
    const label = (id: string) => rubric?.ideas.find((idea) => idea.id === id)?.label.en ?? id;
    if (first.covered.length > 0) {
      understood.push({
        title: "Explanation",
        detail: {
          en: `Your first explanation already contained: ${first.covered.map(label).join("; ")}.`,
          hi: `Aapke first explanation mein pehle se tha: ${first.covered.map(label).join("; ")}.`,
        },
      });
    }
    if (first.missing.length > 0) {
      needsWork.push({
        title: "Explanation",
        detail: {
          en: `Your first explanation left out: ${first.missing.map(label).join("; ")}.`,
          hi: `Aapke first explanation mein yeh nahi tha: ${first.missing.map(label).join("; ")}.`,
        },
      });
    }
  }

  // --- Misconceptions ---------------------------------------------------------
  const active = activeMisconceptions(state).filter(
    (m) => m.info.topic === topic || state.misconceptions.some((r) => r.misconception === m.info.id && r.concept === topic)
  );
  for (const misconception of active) {
    needsWork.unshift({
      title: `Possible misconception: ${misconception.info.title.en}`,
      detail: misconception.info.belief,
    });
    whyMissed.unshift({ title: misconception.info.title.en, detail: misconception.info.correction });
  }
  if (active.length > 0) keyConcept = knowledgeById(active[0].info.knowledgeId) ?? keyConcept;
  if (!keyConcept) keyConcept = knowledgeById(content.keyIdea) ?? null;

  const practice = chooseChallenge(state, topic);
  const assessPassed = passes(stageScore(progress, "assess"), threshold);
  const nextStep: L = !assessPassed
    ? {
        en: "Re-read the key concept, then take the targeted retry: only the items you missed come back.",
        hi: "Key concept dobara padho, phir targeted retry lo: sirf wahi items wapas aayenge jo miss hue the.",
      }
    : practice
      ? {
          en: `Solve the challenge “${practice.challenge.title.en}”. Getting it right completes ${topicTitle(topic)}.`,
          hi: `Challenge “${practice.challenge.title.hi}” solve karo. Ise sahi karne par ${topicTitle(topic)} complete ho jaayega.`,
        }
      : { en: "Continue to the next concept.", hi: "Next concept par continue karo." };

  return { understood, needsWork, whyMissed, keyConcept, practice, nextStep, clean: needsWork.length === 0 };
}

// ---------------------------------------------------------------------------
// Spaced review
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

/** Days to wait before the next quick review, by how many were answered right in a row. */
export function reviewIntervalDays(streak: number): number {
  if (streak <= 0) return 1;
  if (streak === 1) return 3;
  return 7;
}

/** Is a one-question Quick Review due for this mastered concept? */
export function isReviewDue(state: AppState, topic: TopicId, now: number = Date.now()): boolean {
  const progress = state.concepts[topic];
  if (!progress?.masteredAt) return false;
  const schedule: ReviewSchedule | undefined = state.reviews[topic];
  if (schedule?.needsReview) return true;

  if (!schedule || schedule.lastAt === null) {
    // First review: a day after mastery, or as soon as the learner has moved
    // into the next concept — whichever comes first.
    const index = INTERACTIVE_TOPICS.indexOf(topic);
    const next = INTERACTIVE_TOPICS[index + 1];
    const nextProgress = next ? state.concepts[next] : undefined;
    const movedOn = !!nextProgress && passes(stageScore(nextProgress, "learn"), state.settings.masteryThreshold);
    return movedOn || now - progress.masteredAt >= DAY;
  }
  return now - schedule.lastAt >= reviewIntervalDays(schedule.streak) * DAY;
}

/** Mastered concepts whose Quick Review is due, earliest concept first. */
export function dueReviews(state: AppState, now: number = Date.now()): TopicId[] {
  return INTERACTIVE_TOPICS.filter((topic) => isReviewDue(state, topic, now));
}

/** The single question for a Quick Review — short, and not the one asked last time. */
export function quickReviewQuestion(state: AppState, topic: TopicId): QuizQuestion | null {
  const bank = questionBank(topic).filter((q) => q.difficulty <= 3);
  if (bank.length === 0) return null;
  const last = state.reviews[topic]?.lastQuestionId;
  const fresh = bank.filter((q) => q.id !== last);
  const pool = fresh.length > 0 ? fresh : bank;

  // Prefer a question about something the learner found hard.
  const progress = state.concepts[topic];
  const weakSlots = progress
    ? Object.entries(progress.assess)
        .filter(([, record]) => record.firstCredit < DEMONSTRATED)
        .map(([slot]) => slot)
    : [];
  const weak = pool.filter((q) => weakSlots.includes(q.concept));
  const from = weak.length > 0 ? weak : pool;

  // Rotate through the pool so repeated reviews are not always the same question.
  const asked = state.events.filter((e) => e.type === "quickReview" && e.topic === topic).length;
  return from[asked % from.length];
}
