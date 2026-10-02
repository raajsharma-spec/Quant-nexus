/**
 * The misconception engine.
 *
 * It looks for known misconceptions (data/misconceptions.ts) in three kinds of
 * evidence and stores what it finds in the learning state:
 *
 *   1. free text   — an explanation or a question typed to the tutor
 *   2. a choice    — a wrong option in a mastery check that is tagged with a misconception
 *   3. a prediction — a predicted result that only makes sense under a misconception
 *
 * Each detection has a confidence between 0 and 1. Repeated evidence for the
 * same misconception raises the combined confidence; solving the targeted
 * challenge or question resolves it.
 *
 * This is transparent pattern matching. It is not a trained model, and it says
 * "possible misconception", never a diagnosis.
 */

import { MISCONCEPTIONS, misconceptionById, type Misconception } from "@/data/misconceptions";
import { questionBank } from "@/data/quizzes";
import { appendEvent, createEvent } from "./events";
import { newId, type AppState, type MisconceptionRecord } from "./storage";
import type { TopicId } from "./types";

export interface Detection {
  misconception: string;
  confidence: number;
  /** A short quote or description of what triggered it. */
  evidence: string;
}

/** Lower case, kets written as plain digits, punctuation calmed down. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\|\s*([01+\-]{1,3})\s*[⟩>]/g, " $1 ")
    .replace(/[“”"‘’]/g, "'")
    .replace(/→|->|=>/g, " to ")
    .replace(/[^a-z0-9%√/.'?!,+\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NEGATION = /\b(not|never|no|cannot|can't|cant|isn't|isnt|doesn't|doesnt|don't|dont|nahi|nahin|without|wrong to say|myth|misconception)\b[^.!?]{0,40}$/;

/**
 * A sentence that argues AGAINST an idea usually states it as a counterfactual
 * or a contrast: "a hidden coin flip WOULD still be 50/50", "it is MORE THAN
 * hidden randomness", "UNLIKE a coin…". Such sentences are not treated as
 * evidence of the misconception.
 */
const COUNTERFACTUAL =
  /\b(would|wouldn't|wouldnt|could never|more than|unlike|rather than|instead of|as opposed to|rules? (it |that |this )?out|se (kuch )?(zyada|alag)|hota to|hoti to|hota,|hoti,|ki tarah nahi)\b/;

/**
 * Find misconceptions in something the learner wrote.
 * Questions are skipped ("can entanglement send messages?" is curiosity, not a
 * belief), and so are sentences that deny the idea ("it is NOT just random")
 * or argue against it.
 */
export function detectInText(text: string): Detection[] {
  const found = new Map<string, Detection>();
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const raw of sentences) {
    if (raw.endsWith("?")) continue;
    const sentence = normalizeText(raw);
    if (COUNTERFACTUAL.test(sentence)) continue;
    for (const misconception of MISCONCEPTIONS) {
      for (const { pattern, confidence } of misconception.patterns) {
        const match = new RegExp(pattern, "i").exec(sentence);
        if (!match) continue;
        const before = sentence.slice(0, match.index);
        if (NEGATION.test(before)) continue;
        const previous = found.get(misconception.id);
        if (!previous || previous.confidence < confidence) {
          found.set(misconception.id, {
            misconception: misconception.id,
            confidence,
            evidence: raw.length > 140 ? `${raw.slice(0, 137)}…` : raw,
          });
        }
      }
    }
  }
  return Array.from(found.values()).sort((a, b) => b.confidence - a.confidence);
}

/** A wrong option in a mastery check can point at a misconception. */
export function detectFromOption(topic: TopicId, questionId: string, optionIndex: number): Detection | null {
  const question = questionBank(topic).find((q) => q.id === questionId);
  const id = question?.misconceptions?.[optionIndex];
  if (!question || !id || optionIndex === question.answer) return null;
  return {
    misconception: id,
    confidence: 0.6,
    evidence: `Chose “${question.options[optionIndex].en}”`,
  };
}

const outcomes = (distribution: Record<string, number>) =>
  Object.entries(distribution).filter(([, p]) => p > 0.005);
const isCertain = (distribution: Record<string, number>) => outcomes(distribution).length === 1;
const isUniform = (distribution: Record<string, number>, size: number) => {
  const list = outcomes(distribution);
  return list.length === size && list.every(([, p]) => Math.abs(p - 1 / size) < 0.01);
};

/**
 * What a prediction reveals. Only clear-cut cases are flagged; an ordinary
 * wrong guess is just a wrong guess.
 */
export function detectFromPrediction(
  gateTypes: string[],
  predicted: Record<string, number> | null,
  actual: Record<string, number>
): Detection[] {
  if (!predicted) return [];
  const width = Object.keys(actual)[0]?.length ?? 1;
  const quantumGates = gateTypes.filter((g) => g !== "M");
  const hCount = quantumGates.filter((g) => g === "H").length;
  const onlyPhaseAndFlip = quantumGates.every((g) => ["X", "Y", "Z", "S", "T"].includes(g));
  const hasPhaseGate = quantumGates.some((g) => ["Z", "S", "T"].includes(g));
  const detections: Detection[] = [];

  // Predicted a coin flip where the state is definite.
  if (width === 1 && isCertain(actual) && isUniform(predicted, 2)) {
    if (hCount >= 2) {
      detections.push({
        misconception: "classical_randomness",
        confidence: 0.65,
        evidence: "Predicted 50/50 for a circuit where two H gates interfere and give a certain result",
      });
    } else if (onlyPhaseAndFlip) {
      detections.push({
        misconception: "always_fifty_fifty",
        confidence: 0.6,
        evidence: "Predicted 50/50 for a circuit whose result is certain",
      });
    }
  }

  // Predicted that a phase gate flips, or that phase can never matter.
  if (width === 1 && hasPhaseGate && isCertain(actual) && isCertain(predicted)) {
    const predictedKey = outcomes(predicted)[0][0];
    const actualKey = outcomes(actual)[0][0];
    const noFlipGate = !quantumGates.some((g) => g === "X" || g === "Y");
    if (predictedKey !== actualKey && noFlipGate) {
      detections.push({
        misconception: "phase_confusion",
        confidence: 0.6,
        evidence:
          hCount >= 2
            ? "Predicted that the phase gate between two H gates would change nothing"
            : "Predicted that a phase gate would flip the measured value",
      });
    }
  }

  // Predicted "everything equally likely" for an entangled pair.
  if (width === 2 && isUniform(predicted, 4) && outcomes(actual).length === 2) {
    detections.push({
      misconception: "randomness_no_structure",
      confidence: 0.6,
      evidence: "Predicted all four results for a circuit that allows only two",
    });
  }

  return detections;
}

/** Store detections in the learning state and log them as telemetry. */
export function recordDetections(
  state: AppState,
  detections: Detection[],
  topic: TopicId,
  source: MisconceptionRecord["source"]
): AppState {
  if (detections.length === 0) return state;
  let next = state;
  const at = Date.now();
  for (const detection of detections) {
    const info = misconceptionById(detection.misconception);
    if (!info) continue;
    const record: MisconceptionRecord = {
      id: newId("mc"),
      at,
      misconception: detection.misconception,
      // File it under the concept it belongs to, so the right review picks it up.
      concept: info.topic === topic ? topic : info.topic,
      confidence: Math.round(detection.confidence * 100) / 100,
      source,
      evidence: detection.evidence,
    };
    next = { ...next, misconceptions: [...next.misconceptions, record].slice(-120) };
    next = appendEvent(
      next,
      createEvent("misconceptionDetected", {
        topic: record.concept,
        detail: info.title.en,
        meta: { misconception: record.misconception, confidence: record.confidence, source },
      })
    );
  }
  return next;
}

export interface ActiveMisconception {
  info: Misconception;
  /** Combined confidence over all unresolved detections: 1 − Π(1 − cᵢ). */
  confidence: number;
  count: number;
  lastAt: number;
  lastEvidence: string;
  sources: MisconceptionRecord["source"][];
}

function group(records: MisconceptionRecord[]): ActiveMisconception[] {
  const byId = new Map<string, MisconceptionRecord[]>();
  records.forEach((record) => {
    byId.set(record.misconception, [...(byId.get(record.misconception) ?? []), record]);
  });
  const result: ActiveMisconception[] = [];
  byId.forEach((list, id) => {
    const info = misconceptionById(id);
    if (!info) return;
    const miss = list.reduce((product, record) => product * (1 - record.confidence), 1);
    const last = list[list.length - 1];
    result.push({
      info,
      confidence: Math.round((1 - miss) * 100) / 100,
      count: list.length,
      lastAt: last.at,
      lastEvidence: last.evidence,
      sources: Array.from(new Set(list.map((record) => record.source))),
    });
  });
  return result.sort((a, b) => b.confidence - a.confidence || b.lastAt - a.lastAt);
}

/** Misconceptions that have been detected and not yet resolved, strongest first. */
export function activeMisconceptions(state: AppState, topic?: TopicId): ActiveMisconception[] {
  return group(
    state.misconceptions.filter((record) => !record.resolvedAt && (!topic || record.concept === topic))
  );
}

/** Misconceptions the learner has already worked through. */
export function resolvedMisconceptions(state: AppState): ActiveMisconception[] {
  const unresolved = new Set(
    state.misconceptions.filter((record) => !record.resolvedAt).map((record) => record.misconception)
  );
  return group(
    state.misconceptions.filter((record) => record.resolvedAt && !unresolved.has(record.misconception))
  );
}

function resolve(state: AppState, ids: string[]): AppState {
  const open = ids.filter((id) => state.misconceptions.some((r) => r.misconception === id && !r.resolvedAt));
  if (open.length === 0) return state;
  const at = Date.now();
  let next: AppState = {
    ...state,
    misconceptions: state.misconceptions.map((record) =>
      open.includes(record.misconception) && !record.resolvedAt ? { ...record, resolvedAt: at } : record
    ),
  };
  for (const id of open) {
    const info = misconceptionById(id);
    next = appendEvent(
      next,
      createEvent("misconceptionResolved", {
        topic: info?.topic,
        detail: info?.title.en ?? id,
        meta: { misconception: id },
      })
    );
  }
  return next;
}

/** Solving a challenge resolves the misconceptions it targets. */
export function resolveByChallenge(state: AppState, challengeId: string, targets: string[]): AppState {
  const ids = MISCONCEPTIONS.filter((m) => m.challengeId === challengeId || targets.includes(m.id)).map((m) => m.id);
  return resolve(state, ids);
}

/** Answering correctly a question whose wrong options carry a misconception resolves it. */
export function resolveByQuestion(state: AppState, topic: TopicId, questionId: string): AppState {
  const question = questionBank(topic).find((q) => q.id === questionId);
  const tagged = Object.values(question?.misconceptions ?? {});
  const direct = MISCONCEPTIONS.filter((m) => m.questionId === questionId).map((m) => m.id);
  return resolve(state, Array.from(new Set([...tagged, ...direct])));
}
