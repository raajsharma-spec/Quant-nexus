// Shared types used across Quantum Nexus.

/** Learning language. "hi" means Hinglish (conversational Hindi + English), not a Hindi translation. */
export type Lang = "en" | "hi";

/** A piece of text available in both languages. Quantum terms stay unchanged in both. */
export type L = { en: string; hi: string };

/** Pick the right language from a bilingual text. */
export function tr(text: L, lang: Lang): string {
  return lang === "hi" ? text.hi : text.en;
}

/** Topics the learner can study. The first five are interactive in this MVP. */
export type TopicId =
  | "python"
  | "qubit"
  | "gates"
  | "superposition"
  | "entanglement"
  | "circuits"
  | "deutsch-jozsa"
  | "grover"
  | "qft";

/** The eight steps of the Quantum Nexus learning loop. */
export const LOOP_STEPS = [
  "Learn",
  "Predict",
  "Practice",
  "Run",
  "Observe",
  "Explain",
  "Assess",
  "Unlock",
] as const;
export type LoopStep = (typeof LOOP_STEPS)[number];
