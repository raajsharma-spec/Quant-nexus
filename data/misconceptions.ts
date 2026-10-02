/**
 * The misconception catalogue.
 *
 * These are well-known ways in which beginners misread quantum ideas. The
 * misconception engine (lib/misconceptions.ts) looks for them in three places:
 *   - what the learner WRITES (explanations and tutor questions)   → `patterns`
 *   - which wrong option they PICK in a mastery check              → tagged in data/quizzes.ts
 *   - what they PREDICT for a circuit                              → rules in lib/misconceptions.ts
 *
 * Detection is rule-based pattern matching, not a trained model. Each entry
 * therefore carries a confidence that says how strong that kind of evidence is.
 */

import type { L, TopicId } from "@/lib/types";

export type MisconceptionId =
  | "classical_randomness"
  | "always_fifty_fifty"
  | "amplitude_is_probability"
  | "qubit_extra_states"
  | "ftl_communication"
  | "randomness_no_structure"
  | "measurement_passive"
  | "phase_confusion"
  | "variation_is_error";

export interface TextPattern {
  /** Regular expression source, matched case-insensitively against the learner's text. */
  pattern: string;
  /** How strongly this wording points at the misconception, 0–1. */
  confidence: number;
}

export interface Misconception {
  id: MisconceptionId;
  /** The concept it belongs to. */
  topic: TopicId;
  title: L;
  /** The mistaken idea, in the learner's words. */
  belief: L;
  /** The corrective explanation. */
  correction: L;
  /** One experiment that shows the belief cannot be right. */
  evidence: L;
  patterns: TextPattern[];
  /** Knowledge-base entry that explains the right idea. */
  knowledgeId: string;
  /** Challenge that targets this misconception (id from data/challenges.ts). */
  challengeId: string;
  /** Review question that targets it (id from data/quizzes.ts). */
  questionId: string;
}

export const MISCONCEPTIONS: Misconception[] = [
  {
    id: "classical_randomness",
    topic: "superposition",
    title: { en: "Superposition = hidden coin flip", hi: "Superposition = hidden coin flip" },
    belief: {
      en: "A qubit in superposition is secretly already 0 or 1 — we just do not know which.",
      hi: "Superposition wala qubit secretly pehle se 0 ya 1 hai — bas humein pata nahi kaunsa.",
    },
    correction: {
      en: "Superposition is a quantum state written as a combination of |0⟩ and |1⟩, with an amplitude for each. It is not a hidden value. The amplitudes can interfere, which a hidden coin flip could never do.",
      hi: "Superposition ek quantum state hai jo |0⟩ aur |1⟩ ke combination ki tarah likha jaata hai, har ek ka apna amplitude hota hai. Yeh koi hidden value nahi hai. Amplitudes interfere kar sakte hain, jo hidden coin flip kabhi nahi kar sakta.",
    },
    evidence: {
      en: "Apply H twice and measure: you get 0 every time. A hidden coin flip would still be 50/50 after the second H.",
      hi: "H do baar lagao aur measure karo: har baar 0 milta hai. Hidden coin flip hota to doosre H ke baad bhi 50/50 hi aata.",
    },
    patterns: [
      { pattern: "(just|only|simply|sirf|bas)\\s+(a\\s+)?random(ly)?", confidence: 0.86 },
      { pattern: "randomly\\s+(either\\s+)?(0|zero)\\s+or\\s+(1|one)", confidence: 0.86 },
      { pattern: "secretly|already\\s+(a\\s+)?(0|1|zero|one)|pehle se (0|1)", confidence: 0.82 },
      { pattern: "(we|you)\\s+(just\\s+)?(do not|don.?t|dont)\\s+know\\s+which", confidence: 0.8 },
      { pattern: "(like|same as|jaise)\\s+(a\\s+)?(coin|sikka)", confidence: 0.7 },
      { pattern: "hidden\\s+(value|answer|state|coin)", confidence: 0.75 },
    ],
    knowledgeId: "superposition-not-coin",
    challengeId: "h-twice",
    questionId: "super-4",
  },
  {
    id: "always_fifty_fifty",
    topic: "qubit",
    title: { en: "Measurement always gives 50/50", hi: "Measurement hamesha 50/50 deta hai" },
    belief: {
      en: "Any quantum measurement is random, half 0 and half 1.",
      hi: "Har quantum measurement random hota hai, aadha 0 aur aadha 1.",
    },
    correction: {
      en: "The probabilities come from the state. |0⟩ measures 0 every time and |1⟩ measures 1 every time. You only get 50/50 when the state is an equal superposition.",
      hi: "Probabilities state se aati hain. |0⟩ har baar 0 measure hota hai aur |1⟩ har baar 1. 50/50 tabhi milta hai jab state equal superposition ho.",
    },
    evidence: {
      en: "Apply X and measure: 1 every time, with no randomness at all.",
      hi: "X lagao aur measure karo: har baar 1, bilkul bhi randomness nahi.",
    },
    patterns: [
      { pattern: "always\\s+(gives?\\s+|is\\s+)?(50|fifty|half)", confidence: 0.86 },
      { pattern: "measurement\\s+is\\s+always\\s+random", confidence: 0.86 },
      { pattern: "(hamesha|har baar)\\s+(50|aadha|random)", confidence: 0.84 },
      { pattern: "every\\s+(quantum\\s+)?measurement\\s+is\\s+random", confidence: 0.84 },
      { pattern: "quantum\\s+(is|means)\\s+always\\s+random", confidence: 0.78 },
    ],
    knowledgeId: "measurement-basics",
    challengeId: "x-on-zero",
    questionId: "qubit-9",
  },
  {
    id: "amplitude_is_probability",
    topic: "qubit",
    title: { en: "Amplitude = probability", hi: "Amplitude = probability" },
    belief: {
      en: "The amplitude of a result is its probability.",
      hi: "Kisi result ka amplitude hi uski probability hai.",
    },
    correction: {
      en: "An amplitude is not a probability. The probability is the squared size of the amplitude: an amplitude of 1/√2 gives (1/√2)² = 50%. Amplitudes can also be negative or complex, which probabilities never are.",
      hi: "Amplitude probability nahi hai. Probability amplitude ke size ka square hoti hai: 1/√2 amplitude se (1/√2)² = 50% milta hai. Amplitudes negative ya complex bhi ho sakte hain, probabilities kabhi nahi.",
    },
    evidence: {
      en: "After H the amplitudes are 1/√2 ≈ 0.707 each. If amplitudes were probabilities they would add up to 141%.",
      hi: "H ke baad dono amplitudes 1/√2 ≈ 0.707 hote hain. Agar amplitudes hi probabilities hote to total 141% ho jaata.",
    },
    patterns: [
      { pattern: "amplitude\\s+(is|=|equals|means)\\s+(the\\s+)?probabilit", confidence: 0.88 },
      { pattern: "amplitude\\s+(hi|hai)\\s+probabilit", confidence: 0.86 },
      { pattern: "amplitude\\s+(of\\s+)?(0\\.5|1/2|half)\\s+(means|gives|is)\\s+(50|half)", confidence: 0.86 },
      { pattern: "probabilit(y|ies)\\s+(is|are|=)\\s+(the\\s+)?amplitudes?\\b(?!.*squar)", confidence: 0.8 },
    ],
    knowledgeId: "amplitude-vs-probability",
    challengeId: "h-measure",
    questionId: "qubit-8",
  },
  {
    id: "qubit_extra_states",
    topic: "qubit",
    title: { en: "A qubit is a bit with extra values", hi: "Qubit extra values wala bit hai" },
    belief: {
      en: "A qubit stores 0 and 1 at the same time, and reading it shows you both.",
      hi: "Qubit ek saath 0 aur 1 dono store karta hai, aur read karne par dono dikhte hain.",
    },
    correction: {
      en: "A qubit holds a quantum state — a combination of |0⟩ and |1⟩ described by amplitudes. Reading it never shows both: every measurement returns one plain 0 or 1.",
      hi: "Qubit ek quantum state hold karta hai — |0⟩ aur |1⟩ ka combination jo amplitudes se describe hota hai. Read karne par dono kabhi nahi dikhte: har measurement ek plain 0 ya 1 deta hai.",
    },
    evidence: {
      en: "Run H then M once: the result is a single 0 or a single 1, never both.",
      hi: "H phir M ek baar run karo: result sirf ek 0 ya ek 1 hota hai, dono kabhi nahi.",
    },
    patterns: [
      { pattern: "both\\s+(0|zero)\\s+and\\s+(1|one)\\s+(at\\s+(the\\s+)?(same\\s+time|once)|simultaneously|together)", confidence: 0.72 },
      { pattern: "(0|zero)\\s+and\\s+(1|one)\\s+(at\\s+the\\s+same\\s+time|simultaneously)", confidence: 0.7 },
      { pattern: "(0|zero)\\s+aur\\s+(1|one)\\s+(dono\\s+)?ek\\s+saath", confidence: 0.72 },
      { pattern: "stores?\\s+(two|2|both|many)\\s+values", confidence: 0.8 },
      { pattern: "(shows?|see|read)\\s+both", confidence: 0.82 },
    ],
    knowledgeId: "qubit-basics",
    challengeId: "fresh-qubit",
    questionId: "qubit-6",
  },
  {
    id: "ftl_communication",
    topic: "entanglement",
    title: { en: "Entanglement sends messages instantly", hi: "Entanglement instantly message bhejta hai" },
    belief: {
      en: "Entangled qubits let you communicate faster than light.",
      hi: "Entangled qubits se light se faster communicate kiya ja sakta hai.",
    },
    correction: {
      en: "Entanglement links results, but it cannot carry a message. Each side sees random results on its own, and nobody can choose which result appears. The link only shows up when the two sides compare notes over an ordinary channel.",
      hi: "Entanglement results ko link karta hai, lekin message carry nahi kar sakta. Har side ko akele random results dikhte hain, aur koi choose nahi kar sakta ki kaunsa result aayega. Link tabhi dikhta hai jab dono sides ordinary channel par results compare karein.",
    },
    evidence: {
      en: "In a Bell pair, look only at q1: about half 0 and half 1, whatever is done to q0. There is nothing to read.",
      hi: "Bell pair mein sirf q1 ko dekho: lagbhag aadha 0 aur aadha 1, q0 ke saath kuch bhi karo. Padhne ke liye kuch hai hi nahi.",
    },
    patterns: [
      { pattern: "faster\\s+than\\s+light", confidence: 0.6 },
      { pattern: "(send|sends|sending|transmit)\\w*\\s+(a\\s+)?(message|signal|information|data)\\s+(instantly|instantaneously|faster)", confidence: 0.86 },
      { pattern: "instant(ly|aneous)?\\s+(communicat|message|signal|transfer)", confidence: 0.84 },
      { pattern: "communicat\\w*\\s+(instantly|faster)", confidence: 0.84 },
      { pattern: "light\\s+se\\s+(faster|tez)\\s+(message|signal|communicat)", confidence: 0.86 },
      { pattern: "tells?\\s+the\\s+other\\s+qubit|sends?\\s+a\\s+signal\\s+to\\s+the\\s+other", confidence: 0.74 },
    ],
    knowledgeId: "entanglement-no-signalling",
    challengeId: "bell-marginal",
    questionId: "ent-12",
  },
  {
    id: "randomness_no_structure",
    topic: "entanglement",
    title: { en: "Quantum randomness has no rules", hi: "Quantum randomness ke koi rules nahi" },
    belief: {
      en: "Quantum results are completely random, so nothing about them can be calculated.",
      hi: "Quantum results completely random hote hain, isliye unke baare mein kuch calculate nahi ho sakta.",
    },
    correction: {
      en: "A single result is random, but the probabilities are fixed exactly by the mathematics of the state. For a Bell pair the rule is strict: |01⟩ and |10⟩ have probability 0, so they never appear.",
      hi: "Ek single result random hota hai, lekin probabilities state ki mathematics se exactly fix hoti hain. Bell pair mein rule strict hai: |01⟩ aur |10⟩ ki probability 0 hai, isliye woh kabhi nahi aate.",
    },
    evidence: {
      en: "Run a Bell pair 1,024 times: you see only |00⟩ and |11⟩. A rule-free process would show all four results.",
      hi: "Bell pair 1,024 baar run karo: sirf |00⟩ aur |11⟩ dikhte hain. Bina rule wala process chaaron results dikhata.",
    },
    patterns: [
      { pattern: "(completely|totally|purely|fully|bilkul)\\s+random", confidence: 0.78 },
      { pattern: "no\\s+(rule|rules|pattern|structure|maths?|logic)", confidence: 0.8 },
      { pattern: "(can.?t|cannot|can not)\\s+be\\s+(calculated|predicted|computed)", confidence: 0.76 },
      { pattern: "anything\\s+can\\s+happen|koi\\s+(rule|pattern)\\s+nahi", confidence: 0.8 },
    ],
    knowledgeId: "probability-structure",
    challengeId: "bell-pair",
    questionId: "ent-9",
  },
  {
    id: "measurement_passive",
    topic: "superposition",
    title: { en: "Measurement only looks", hi: "Measurement sirf dekhta hai" },
    belief: {
      en: "Measuring a qubit just reads it and leaves the state unchanged.",
      hi: "Qubit ko measure karna sirf use read karta hai aur state same rehta hai.",
    },
    correction: {
      en: "Measurement changes the state. A superposition ends when you measure it: after you see 1, the qubit is a definite |1⟩, and measuring again gives 1 again.",
      hi: "Measurement state ko change karta hai. Measure karte hi superposition khatam ho jaata hai: 1 dikhne ke baad qubit definite |1⟩ hai, aur dobara measure karne par phir 1 hi milta hai.",
    },
    evidence: {
      en: "That is why the lab does not allow a gate after M on the same wire: the quantum part of that wire has ended.",
      hi: "Isiliye lab same wire par M ke baad gate allow nahi karta: us wire ka quantum part khatam ho chuka hota hai.",
    },
    patterns: [
      { pattern: "measur\\w*\\s+(does\\s+not|doesn.?t|doesnt|never)\\s+(change|affect|disturb)", confidence: 0.86 },
      { pattern: "measur\\w*\\s+(just|only|simply)\\s+(reads?|looks?|reveals?|shows?)", confidence: 0.8 },
      { pattern: "(still|remains?)\\s+in\\s+(the\\s+)?(same\\s+)?superposition\\s+after\\s+measur", confidence: 0.86 },
      { pattern: "measurement\\s+(sirf|bas)\\s+(read|dekh)", confidence: 0.8 },
    ],
    knowledgeId: "measurement-collapse",
    challengeId: "h-measure",
    questionId: "super-3",
  },
  {
    id: "phase_confusion",
    topic: "gates",
    title: { en: "Phase either always or never matters", hi: "Phase ya to hamesha matter karta hai ya kabhi nahi" },
    belief: {
      en: "A phase gate such as Z flips the measured value — or, the opposite mistake, phase never affects anything.",
      hi: "Z jaisa phase gate measured value flip kar deta hai — ya ulti galti, phase ka kabhi koi effect nahi hota.",
    },
    correction: {
      en: "Z, S and T change only the phase of the |1⟩ part. On their own they do not change the measurement probabilities. But phase is real: a later H gate turns a phase difference into a different result (H, Z, H gives 1 every time).",
      hi: "Z, S aur T sirf |1⟩ part ka phase change karte hain. Akele yeh measurement probabilities change nahi karte. Lekin phase real hai: baad ka H gate phase difference ko alag result mein badal deta hai (H, Z, H har baar 1 deta hai).",
    },
    evidence: {
      en: "Compare Z then M (0 every time) with H, Z, H then M (1 every time).",
      hi: "Z phir M (har baar 0) ko H, Z, H phir M (har baar 1) se compare karo.",
    },
    patterns: [
      { pattern: "z\\s+(gate\\s+)?(flips?|changes?)\\s+(the\\s+)?(qubit|value|bit|0\\s+to\\s+1)", confidence: 0.84 },
      { pattern: "phase\\s+(does\\s+not|doesn.?t|never)\\s+(matter|do anything|affect anything)", confidence: 0.82 },
      { pattern: "phase\\s+(is|has)\\s+(useless|no\\s+effect|meaningless)", confidence: 0.82 },
      { pattern: "z\\s+(gate\\s+)?does\\s+nothing(?!\\s+(to|on)\\s+\\|?0)", confidence: 0.7 },
    ],
    knowledgeId: "phase-basics",
    challengeId: "h-z-h",
    questionId: "gates-7",
  },
  {
    id: "variation_is_error",
    topic: "superposition",
    title: { en: "Not exactly 50% means an error", hi: "Exactly 50% nahi matlab error" },
    belief: {
      en: "If the counts are not exactly half and half, the simulation or the gate is wrong.",
      hi: "Agar counts exactly aadhe-aadhe nahi hain, to simulation ya gate galat hai.",
    },
    correction: {
      en: "A finite number of shots is a sample. Samples vary: with 1,024 shots, a spread of about ±1.6% around 50% is completely normal. More shots make the spread smaller, but it never reaches exactly zero.",
      hi: "Finite shots ek sample hota hai. Samples vary karte hain: 1,024 shots mein 50% ke aas-paas lagbhag ±1.6% ka spread bilkul normal hai. Zyada shots se spread chhota hota hai, lekin exactly zero kabhi nahi hota.",
    },
    evidence: {
      en: "Run the same H circuit several times: the counts change a little on every run, and both directions are equally common.",
      hi: "Same H circuit ko kai baar run karo: counts har run mein thoda change hote hain, aur dono directions equally common hain.",
    },
    patterns: [
      { pattern: "(simulator|simulation|gate|result)\\s+(is|was|must be)\\s+(wrong|broken|buggy|inaccurate|faulty)", confidence: 0.82 },
      { pattern: "(should|must)\\s+be\\s+exactly\\s+(50|512|half)", confidence: 0.84 },
      { pattern: "(bug|error|mistake|galti)\\s+(in|of)\\s+(the\\s+)?(simulator|simulation|gate)", confidence: 0.84 },
      { pattern: "exactly\\s+(50|512)\\s+hona\\s+chahiye", confidence: 0.84 },
    ],
    knowledgeId: "sampling-variation",
    challengeId: "h-measure",
    questionId: "super-11",
  },
];

export function misconceptionById(id: string): Misconception | undefined {
  return MISCONCEPTIONS.find((m) => m.id === id);
}
