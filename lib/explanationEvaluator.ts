/**
 * Scores a learner's own explanation against a rubric (data/explanations.ts).
 *
 * What is evaluated:
 *   - key concepts   : which of the rubric's ideas the explanation contains
 *   - missing concepts: which required ideas are absent
 *   - misconceptions : wording that matches a known misconception
 *   - reasoning      : whether the ideas are connected ("because", "so", "isliye" …)
 *
 * The score reflects the CONCEPTS, not spelling, grammar, length or style.
 * An explanation in Hinglish is scored exactly like one in English.
 *
 * This is rule-based concept matching that runs in the browser. It is not a
 * language model, so it can miss an idea that is worded in an unusual way —
 * which is why the learner can always switch to the structured form.
 */

import type { ExplainRubric, RubricIdea } from "@/data/explanations";
import { detectInText, normalizeText, type Detection } from "./misconceptions";
import type { L } from "./types";

export type ReasoningQuality = "connected" | "listed" | "thin";

export interface ExplanationResult {
  /** 0–100. */
  score: number;
  covered: RubricIdea[];
  missing: RubricIdea[];
  /** Optional ideas that were present — a sign of deeper understanding. */
  bonus: RubricIdea[];
  misconceptions: Detection[];
  reasoning: ReasoningQuality;
  tooShort: boolean;
  /** One-line verdict for the learner. */
  verdict: L;
}

const CONNECTORS =
  /\b(because|since|so|therefore|hence|thus|which means|as a result|that is why|thats why|that's why|due to|kyunki|isliye|is liye|is wajah|to phir|jisse|iska matlab)\b/;

const MIN_WORDS = 4;

/** Does the text contain this idea? */
export function hasIdea(normalized: string, idea: RubricIdea): boolean {
  return idea.patterns.some((pattern) => new RegExp(pattern, "i").test(normalized));
}

function verdictFor(score: number, covered: number, required: number, hasMisconception: boolean): L {
  if (hasMisconception) {
    return {
      en: "One part of this explanation needs a second look — see the note below.",
      hi: "Is explanation ke ek part ko dobara dekhna hoga — neeche note dekho.",
    };
  }
  if (score >= 100) {
    return { en: "A complete explanation: every key idea is there.", hi: "Complete explanation: har key idea hai." };
  }
  if (covered === required) {
    return {
      en: "Every key idea is there. Linking them with “because” or “so” would make it stronger.",
      hi: "Har key idea hai. Unhe “kyunki” ya “isliye” se link karoge to yeh aur strong hoga.",
    };
  }
  if (covered === 0) {
    return {
      en: "This does not yet contain the key ideas. Use the pointers below and try again.",
      hi: "Isme abhi key ideas nahi hain. Neeche ke pointers use karke dobara try karo.",
    };
  }
  return {
    en: `Correct core idea. ${required - covered} key ${required - covered === 1 ? "idea is" : "ideas are"} still missing.`,
    hi: `Core idea sahi hai. ${required - covered} key ${required - covered === 1 ? "idea" : "ideas"} abhi missing ${required - covered === 1 ? "hai" : "hain"}.`,
  };
}

/** Evaluate an explanation written in the learner's own words. */
export function evaluateExplanation(text: string, rubric: ExplainRubric): ExplanationResult {
  const normalized = normalizeText(text);
  const words = normalized.split(" ").filter(Boolean);
  const required = rubric.ideas.filter((idea) => !idea.optional);
  const optional = rubric.ideas.filter((idea) => idea.optional);

  if (words.length < MIN_WORDS) {
    return {
      score: 0,
      covered: [],
      missing: required,
      bonus: [],
      misconceptions: [],
      reasoning: "thin",
      tooShort: true,
      verdict: {
        en: "That is too short to evaluate. Write one or two full sentences.",
        hi: "Yeh evaluate karne ke liye bahut chhota hai. Ek-do poore sentences likho.",
      },
    };
  }

  const covered = required.filter((idea) => hasIdea(normalized, idea));
  const missing = required.filter((idea) => !covered.includes(idea));
  const bonus = optional.filter((idea) => hasIdea(normalized, idea));
  // Only fairly confident matches count against an explanation.
  const misconceptions = detectInText(text).filter((d) => d.confidence >= 0.7);

  const connected = CONNECTORS.test(normalized);
  const reasoning: ReasoningQuality = connected ? "connected" : covered.length >= 2 ? "listed" : "thin";

  let score = required.length === 0 ? 100 : Math.round((covered.length / required.length) * 100);
  // All ideas present but simply listed, not reasoned: almost full marks.
  if (score === 100 && !connected) score = 95;
  // A misconception keeps the stage below the gate until it is corrected.
  if (misconceptions.length > 0) score = Math.min(score, 70);

  return {
    score,
    covered,
    missing,
    bonus,
    misconceptions,
    reasoning,
    tooShort: false,
    verdict: verdictFor(score, covered.length, required.length, misconceptions.length > 0),
  };
}

/** Evaluate the structured form: one sentence choice per idea. */
export function evaluateStructured(choices: Array<number | null>, rubric: ExplainRubric): ExplanationResult {
  const items = rubric.structured;
  const covered: RubricIdea[] = [];
  const missing: RubricIdea[] = [];
  const misconceptions: Detection[] = [];

  items.forEach((item, index) => {
    const idea = rubric.ideas.find((candidate) => candidate.id === item.idea);
    if (!idea) return;
    const choice = choices[index];
    if (choice === item.answer) {
      covered.push(idea);
      return;
    }
    missing.push(idea);
    const id = choice === null || choice === undefined ? undefined : item.misconceptions?.[choice];
    if (id && choice !== null && choice !== undefined) {
      misconceptions.push({
        misconception: id,
        confidence: 0.6,
        evidence: `Chose “${item.options[choice].en}”`,
      });
    }
  });

  const score = items.length === 0 ? 0 : Math.round((covered.length / items.length) * 100);
  return {
    score,
    covered,
    missing,
    bonus: [],
    misconceptions,
    reasoning: "connected",
    tooShort: false,
    verdict: verdictFor(score, covered.length, items.length, false),
  };
}
