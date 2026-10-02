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

/**
 * The learning journey every concept follows — ONE loop for the whole platform:
 *
 *   Discover → Learn → Watch → Interact → Experiment → Ask AI → Predict → Run
 *   → Observe → Explain → Assess → (Analyze) → Review → Next Challenge
 *   → Mastery → Next concept
 *
 * Each stage has a score from 0 to 100. A stage unlocks only when the stage
 * before it reaches the mastery threshold (90% by default). See lib/stages.ts.
 */
export const STAGES = [
  {
    id: "discover",
    number: "00",
    label: "Discover",
    hint: { en: "Meet the concept", hi: "Concept se milo" },
  },
  {
    id: "learn",
    number: "01",
    label: "Learn",
    hint: { en: "Short theory blocks", hi: "Chhote theory blocks" },
  },
  {
    id: "watch",
    number: "02",
    label: "Watch",
    hint: { en: "A visual lesson", hi: "Ek visual lesson" },
  },
  {
    id: "interact",
    number: "03",
    label: "Interact",
    hint: { en: "Play with the idea", hi: "Idea ke saath khelo" },
  },
  {
    id: "experiment",
    number: "04",
    label: "Experiment",
    hint: { en: "Reach the goals", hi: "Goals reach karo" },
  },
  {
    id: "ask",
    number: "05",
    label: "Ask AI",
    hint: { en: "Question the tutor", hi: "Tutor se poochho" },
  },
  {
    id: "predict",
    number: "06",
    label: "Predict",
    hint: { en: "Commit to a guess", hi: "Guess commit karo" },
  },
  {
    id: "run",
    number: "07",
    label: "Run",
    hint: { en: "Simulate the circuit", hi: "Circuit simulate karo" },
  },
  {
    id: "observe",
    number: "08",
    label: "Observe",
    hint: { en: "Read the result", hi: "Result padho" },
  },
  {
    id: "explain",
    number: "09",
    label: "Explain",
    hint: { en: "Say why it happened", hi: "Batao kyun hua" },
  },
  {
    id: "assess",
    number: "10",
    label: "Assess",
    hint: { en: "Adaptive mastery check", hi: "Adaptive mastery check" },
  },
  {
    id: "review",
    number: "11",
    label: "Review",
    hint: { en: "Your personal review", hi: "Aapka personal review" },
  },
  {
    id: "challenge",
    number: "12",
    label: "Next Challenge",
    hint: { en: "A challenge built for you", hi: "Aapke liye bana challenge" },
  },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
export const STAGE_IDS: StageId[] = STAGES.map((stage) => stage.id);

export function stageMeta(id: StageId) {
  return STAGES.find((stage) => stage.id === id) ?? STAGES[0];
}

/** The learner's level. Never asked — always inferred from behaviour (lib/learnerLevel.ts). */
export type LearnerLevel = "BEGINNER" | "DEVELOPING" | "PROFICIENT" | "ADVANCED";

export const LEVEL_ORDER: LearnerLevel[] = ["BEGINNER", "DEVELOPING", "PROFICIENT", "ADVANCED"];

/** How sure the learner says they are when they commit to a prediction. */
export type Confidence = "low" | "medium" | "high";
