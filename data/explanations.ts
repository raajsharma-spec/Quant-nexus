/**
 * Rubrics for the learner's own explanations.
 *
 * In the Explain stage (and once in each mastery check) the learner says, in
 * their own words, WHY a result happened. The evaluator
 * (lib/explanationEvaluator.ts) reads the text against a rubric:
 *
 *   - each `idea` is a key concept the explanation should contain
 *   - `patterns` are the ways that idea is usually worded (English + Hinglish)
 *   - the score is based on the ideas, not on writing style or length
 *
 * This is rule-based concept matching, not a language model. For learners who
 * prefer not to type, `structured` offers the same ideas as sentence choices.
 *
 * Patterns are matched against normalised text: lower case, |0⟩ written as 0.
 */

import type { L, TopicId } from "@/lib/types";

export interface RubricIdea {
  id: string;
  /** The idea, as shown in feedback. */
  label: L;
  patterns: string[];
  /** A nudge shown when the idea is missing — it points, without writing the answer. */
  hint: L;
  /** Optional ideas are noted when present but are not needed for a full score. */
  optional?: boolean;
}

export interface StructuredItem {
  /** The idea this sentence checks. */
  idea: string;
  stem: L;
  options: L[];
  answer: number;
  /** Wrong options that reveal a known misconception: option index → misconception id. */
  misconceptions?: Record<number, string>;
}

export interface ExplainRubric {
  id: string;
  topic: TopicId;
  prompt: L;
  ideas: RubricIdea[];
  /** A model explanation, shown only after the learner has reached the threshold. */
  model: L;
  structured: StructuredItem[];
}

// Wordings shared by several rubrics.
const STARTS_IN_ZERO = [
  "start\\w*\\s+(in|at|as|from|with|off)?\\s*(the\\s+)?(state\\s+)?(0|zero)\\b",
  "(begin\\w*|began|initial\\w*)\\b.*\\b(0|zero)\\b",
  "\\b(0|zero)\\s+(se|par|mein)\\s+(start|shuru)",
  "fresh\\s+qubit",
  "\\b(0|zero)\\b\\s+(at first|initially|by default|to begin)",
  "default\\s+(state\\s+)?(is\\s+)?(0|zero)\\b",
];

const DEFINITE = [
  "definite|certain\\w*|deterministic|for\\s+sure|pakka",
  "always|every\\s+(time|run|shot|measurement)|each\\s+(time|run|shot)|har\\s+(baar|run)|hamesha",
  "100\\s*(%|percent)",
  "no\\s+random\\w*|not\\s+random|nothing\\s+random|koi\\s+randomness\\s+nahi",
];

export const RUBRICS: ExplainRubric[] = [
  // -------------------------------------------------------------------------
  {
    id: "qubit-explain",
    topic: "qubit",
    prompt: {
      en: "Every run gave 1. In your own words: why?",
      hi: "Har run ne 1 diya. Apne words mein batao: kyun?",
    },
    ideas: [
      {
        id: "start",
        label: { en: "The qubit starts in |0⟩", hi: "Qubit |0⟩ se start hota hai" },
        patterns: STARTS_IN_ZERO,
        hint: { en: "Say which state the qubit was in before any gate.", hi: "Batao koi gate lagne se pehle qubit kis state mein tha." },
      },
      {
        id: "flip",
        label: { en: "X flips |0⟩ to |1⟩", hi: "X |0⟩ ko |1⟩ mein flip karta hai" },
        patterns: [
          "flip\\w*",
          "(quantum|like\\s+a?|the)\\s+not\\b|\\bnot\\s+gate",
          "\\b(0|zero)\\s+(to|into|ko|se)\\s+(a\\s+)?(1|one)\\b",
          "\\bx\\b.*\\b(chang\\w*|turn\\w*|mak\\w*|convert\\w*|badal\\w*|bana\\w*)\\b.*\\b(1|one)\\b",
          "invert\\w*",
        ],
        hint: { en: "Say what the X gate does to that state.", hi: "Batao X gate us state ke saath kya karta hai." },
      },
      {
        id: "definite",
        label: {
          en: "|1⟩ is a definite state, so nothing is random",
          hi: "|1⟩ definite state hai, isliye kuch random nahi",
        },
        patterns: DEFINITE,
        hint: {
          en: "Say why the result is the same on every run — is the state before measurement definite or a superposition?",
          hi: "Batao result har run mein same kyun hai — measurement se pehle state definite hai ya superposition?",
        },
      },
    ],
    model: {
      en: "The qubit starts in |0⟩. X is the quantum NOT, so it flips |0⟩ to |1⟩. That is a definite state, not a superposition, so measurement gives 1 on every run.",
      hi: "Qubit |0⟩ se start hota hai. X quantum NOT hai, isliye yeh |0⟩ ko |1⟩ mein flip karta hai. Yeh definite state hai, superposition nahi, isliye measurement har run mein 1 deta hai.",
    },
    structured: [
      {
        idea: "start",
        stem: { en: "Before any gate, the qubit is in…", hi: "Koi gate lagne se pehle qubit … mein hota hai" },
        options: [
          { en: "|0⟩", hi: "|0⟩" },
          { en: "|1⟩", hi: "|1⟩" },
          { en: "an equal superposition", hi: "equal superposition" },
          { en: "an unknown state", hi: "unknown state" },
        ],
        answer: 0,
        misconceptions: { 2: "always_fifty_fifty" },
      },
      {
        idea: "flip",
        stem: { en: "The X gate…", hi: "X gate…" },
        options: [
          { en: "creates a superposition", hi: "superposition banata hai" },
          { en: "flips |0⟩ to |1⟩", hi: "|0⟩ ko |1⟩ mein flip karta hai" },
          { en: "measures the qubit", hi: "qubit ko measure karta hai" },
          { en: "changes only the phase", hi: "sirf phase change karta hai" },
        ],
        answer: 1,
      },
      {
        idea: "definite",
        stem: { en: "The result is 1 on every run because…", hi: "Result har run mein 1 hai kyunki…" },
        options: [
          { en: "the simulator ran the circuit only once", hi: "simulator ne circuit sirf ek baar run kiya" },
          { en: "measurement always gives 1", hi: "measurement hamesha 1 deta hai" },
          {
            en: "|1⟩ is a definite state — there is nothing random to sample",
            hi: "|1⟩ definite state hai — sample karne ke liye kuch random nahi hai",
          },
          { en: "the results are random but average to 1", hi: "results random hain lekin average 1 aata hai" },
        ],
        answer: 2,
        misconceptions: { 3: "always_fifty_fifty" },
      },
    ],
  },
  {
    id: "qubit-write",
    topic: "qubit",
    prompt: {
      en: "A fresh qubit is measured 1,024 times with no gate before it, and every run gives 0. Explain why.",
      hi: "Ek fresh qubit ko bina kisi gate ke 1,024 baar measure kiya jaata hai, aur har run 0 deta hai. Explain karo kyun.",
    },
    ideas: [
      {
        id: "start",
        label: { en: "A qubit starts in |0⟩", hi: "Qubit |0⟩ se start hota hai" },
        patterns: STARTS_IN_ZERO,
        hint: { en: "Which state does every qubit begin in?", hi: "Har qubit kis state se begin hota hai?" },
      },
      {
        id: "nogate",
        label: { en: "No gate changed the state", hi: "Kisi gate ne state change nahi kiya" },
        patterns: [
          "no\\s+gates?\\b",
          "without\\s+(any\\s+|a\\s+)?gates?\\b",
          "nothing\\s+(has\\s+|was\\s+|is\\s+)?(chang\\w*|happen\\w*|appl\\w*|act\\w*|done)",
          "(unchanged|untouched|unmodified)",
          "not\\s+(been\\s+)?(changed|touched|modified)",
          "koi\\s+(bhi\\s+)?gate\\s+(\\w+\\s+){0,2}nahi|kuch\\s+(change|badla)\\s+nahi",
          "gate\\s+nahi\\s+(laga|lagaya|hai|tha)",
          "(still|stays?|remains?)\\s+(in\\s+)?(the\\s+)?(state\\s+)?(0|zero)\\b",
          "abhi\\s+bhi\\s+(0|zero)\\b",
        ],
        hint: { en: "What happened to the state between the start and the measurement?", hi: "Start aur measurement ke beech state ke saath kya hua?" },
      },
      {
        id: "definite",
        label: { en: "|0⟩ is definite, so measurement gives 0 every time", hi: "|0⟩ definite hai, isliye measurement har baar 0 deta hai" },
        patterns: DEFINITE,
        hint: { en: "Why is there no randomness here?", hi: "Yahan randomness kyun nahi hai?" },
      },
    ],
    model: {
      en: "Every qubit starts in |0⟩. No gate was applied, so the state is still |0⟩ at the measurement. |0⟩ is a definite state, so every one of the 1,024 runs gives 0.",
      hi: "Har qubit |0⟩ se start hota hai. Koi gate apply nahi hua, isliye measurement ke time state abhi bhi |0⟩ hai. |0⟩ definite state hai, isliye 1,024 mein se har run 0 deta hai.",
    },
    structured: [
      {
        idea: "start",
        stem: { en: "A fresh qubit is in…", hi: "Fresh qubit … mein hota hai" },
        options: [
          { en: "a random state", hi: "random state" },
          { en: "|0⟩", hi: "|0⟩" },
          { en: "|1⟩", hi: "|1⟩" },
          { en: "a superposition", hi: "superposition" },
        ],
        answer: 1,
        misconceptions: { 0: "always_fifty_fifty", 3: "always_fifty_fifty" },
      },
      {
        idea: "nogate",
        stem: { en: "With no gate before M, the state…", hi: "M se pehle koi gate na ho to state…" },
        options: [
          { en: "stays |0⟩", hi: "|0⟩ hi rehta hai" },
          { en: "becomes random", hi: "random ho jaata hai" },
          { en: "becomes |1⟩", hi: "|1⟩ ban jaata hai" },
          { en: "is destroyed", hi: "destroy ho jaata hai" },
        ],
        answer: 0,
      },
      {
        idea: "definite",
        stem: { en: "So measurement gives…", hi: "Isliye measurement … deta hai" },
        options: [
          { en: "0 or 1 at random", hi: "randomly 0 ya 1" },
          { en: "0.5", hi: "0.5" },
          { en: "0 every time, because |0⟩ is a definite state", hi: "har baar 0, kyunki |0⟩ definite state hai" },
          { en: "nothing", hi: "kuch nahi" },
        ],
        answer: 2,
        misconceptions: { 0: "always_fifty_fifty" },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: "gates-explain",
    topic: "gates",
    prompt: {
      en: "Z was applied, yet every run still gave 0. In your own words: why did Z not change the result?",
      hi: "Z apply hua, phir bhi har run ne 0 diya. Apne words mein batao: Z ne result change kyun nahi kiya?",
    },
    ideas: [
      {
        id: "phase",
        label: { en: "Z changes only the phase", hi: "Z sirf phase change karta hai" },
        patterns: ["phase"],
        hint: { en: "What kind of change does Z make to a state?", hi: "Z state mein kis type ka change karta hai?" },
      },
      {
        id: "zero-untouched",
        label: { en: "Z acts on the |1⟩ part; |0⟩ has none", hi: "Z |1⟩ part par act karta hai; |0⟩ mein woh hai hi nahi" },
        patterns: [
          "(leaves?|keeps?|left|chhod\\w*)\\b.*\\b(0|zero)\\b",
          "\\b(0|zero)\\b.*\\b(alone|unchanged|untouched|same|as\\s+it\\s+is|waise\\s+hi)",
          "(only|sirf|just)\\b.*\\b(1|one)\\b",
          "(minus|negative)\\s+sign|sign\\b.*\\b(1|one)\\b",
          "\\b(1|one)\\s+(part|component|wala)",
          "no\\s+(1|one)\\b",
        ],
        hint: {
          en: "Which part of a state does Z act on — and does |0⟩ have that part?",
          hi: "Z state ke kis part par act karta hai — aur kya |0⟩ mein woh part hai?",
        },
      },
      {
        id: "same-probability",
        label: { en: "The measurement probabilities stay the same", hi: "Measurement probabilities same rehti hain" },
        patterns: [
          "probabilit\\w*\\b.*\\b(same|unchanged|stay\\w*|remain\\w*|not\\s+chang\\w*|doesn.?t\\s+chang\\w*|do\\s+not\\s+chang\\w*)",
          "(does\\s+not|doesn.?t|did\\s+not|didn.?t|not|nahi)\\s+(chang\\w*|affect\\w*)\\b.*\\b(measur\\w*|result\\w*|probabilit\\w*|outcome\\w*|odds)",
          "(still|always|hamesha)\\b.*\\b(0|zero)\\b",
          "every\\s+(time|run)|har\\s+baar",
          "100\\s*(%|percent)",
          "(measur\\w*|result\\w*|odds|outcome\\w*)\\b.*\\b(same|unchanged)",
          "same\\s+(result|odds|probabilit\\w*|outcome)",
        ],
        hint: {
          en: "Connect it to the measurement: what happens to the chance of 0 and of 1?",
          hi: "Ise measurement se connect karo: 0 aur 1 ke chance ke saath kya hota hai?",
        },
      },
    ],
    model: {
      en: "Z changes only the phase: it puts a minus sign on the |1⟩ part of a state. |0⟩ has no |1⟩ part, so the state is unchanged, the measurement probabilities stay the same, and every run gives 0.",
      hi: "Z sirf phase change karta hai: yeh state ke |1⟩ part par minus sign lagata hai. |0⟩ mein |1⟩ part hai hi nahi, isliye state same rehta hai, measurement probabilities same rehti hain, aur har run 0 deta hai.",
    },
    structured: [
      {
        idea: "phase",
        stem: { en: "The Z gate changes…", hi: "Z gate … change karta hai" },
        options: [
          { en: "0 into 1", hi: "0 ko 1 mein" },
          { en: "only the phase of the |1⟩ part", hi: "sirf |1⟩ part ka phase" },
          { en: "the qubit into a superposition", hi: "qubit ko superposition mein" },
          { en: "nothing at all, in any circuit", hi: "kuch bhi nahi, kisi bhi circuit mein" },
        ],
        answer: 1,
        misconceptions: { 0: "phase_confusion", 3: "phase_confusion" },
      },
      {
        idea: "zero-untouched",
        stem: { en: "Applied to |0⟩…", hi: "|0⟩ par apply karne se…" },
        options: [
          { en: "the state becomes |1⟩", hi: "state |1⟩ ban jaata hai" },
          { en: "the state becomes random", hi: "state random ho jaata hai" },
          {
            en: "the state stays |0⟩, because there is no |1⟩ part to act on",
            hi: "state |0⟩ hi rehta hai, kyunki act karne ke liye |1⟩ part hai hi nahi",
          },
          { en: "the state is erased", hi: "state erase ho jaata hai" },
        ],
        answer: 2,
        misconceptions: { 0: "phase_confusion", 1: "always_fifty_fifty" },
      },
      {
        idea: "same-probability",
        stem: { en: "So the measurement…", hi: "Isliye measurement…" },
        options: [
          { en: "gives 0 every time — the probabilities did not change", hi: "har baar 0 deta hai — probabilities change nahi hui" },
          { en: "is 50/50", hi: "50/50 hota hai" },
          { en: "gives 1 every time", hi: "har baar 1 deta hai" },
          { en: "fails", hi: "fail ho jaata hai" },
        ],
        answer: 0,
        misconceptions: { 1: "always_fifty_fifty", 2: "phase_confusion" },
      },
    ],
  },
  {
    id: "gates-write",
    topic: "gates",
    prompt: {
      en: "Applying X twice returns the qubit to |0⟩. Explain why, and what that tells you about quantum gates.",
      hi: "X do baar apply karne par qubit wapas |0⟩ ban jaata hai. Explain karo kyun, aur isse quantum gates ke baare mein kya pata chalta hai.",
    },
    ideas: [
      {
        id: "two-flips",
        label: { en: "The first X flips to |1⟩ and the second flips back", hi: "Pehla X |1⟩ par flip karta hai aur doosra wapas" },
        patterns: [
          "flip\\w*\\b.*\\b(back|again|twice|second|dobara|wapas)",
          "(first|pehla|ek)\\b.*\\b(second|doosra|dobara|then)\\b",
          "\\b(0|zero)\\b.*\\b(1|one)\\b.*\\b(0|zero)\\b",
          "(two|2|do|double)\\s+flips?",
          "(twice|two\\s+times|do\\s+baar)\\b.*\\bflip",
        ],
        hint: { en: "Follow the state through each X: where is it after the first, and after the second?", hi: "State ko har X ke through follow karo: pehle ke baad kahan hai, aur doosre ke baad?" },
      },
      {
        id: "reversible",
        label: { en: "Gates can be undone (they are reversible)", hi: "Gates undo ho sakte hain (reversible hain)" },
        patterns: ["undo\\w*|undone", "revers\\w*", "cancel\\w*", "invers\\w*", "its\\s+own", "can\\s+be\\s+(undone|reversed|cancelled)"],
        hint: { en: "What general property of quantum gates does this show?", hi: "Yeh quantum gates ki kaunsi general property dikhata hai?" },
      },
      {
        id: "definite",
        label: { en: "The final state is a definite |0⟩", hi: "Final state definite |0⟩ hai" },
        patterns: [...DEFINITE, "(measur\\w*|gives?|result\\w*)\\b.*\\b(0|zero)\\b"],
        hint: { en: "What would a measurement give at the end, and how often?", hi: "End mein measurement kya dega, aur kitni baar?" },
      },
    ],
    model: {
      en: "The first X flips |0⟩ to |1⟩ and the second X flips it back to |0⟩, so a measurement gives 0 every time. This shows that quantum gates are reversible: X undoes itself.",
      hi: "Pehla X |0⟩ ko |1⟩ mein flip karta hai aur doosra X use wapas |0⟩ mein, isliye measurement har baar 0 deta hai. Isse pata chalta hai ki quantum gates reversible hain: X khud ko undo karta hai.",
    },
    structured: [
      {
        idea: "two-flips",
        stem: { en: "The second X…", hi: "Doosra X…" },
        options: [
          { en: "flips |1⟩ back to |0⟩", hi: "|1⟩ ko wapas |0⟩ mein flip karta hai" },
          { en: "creates a superposition", hi: "superposition banata hai" },
          { en: "does nothing", hi: "kuch nahi karta" },
          { en: "measures the qubit", hi: "qubit ko measure karta hai" },
        ],
        answer: 0,
      },
      {
        idea: "reversible",
        stem: { en: "This shows that quantum gates…", hi: "Isse pata chalta hai ki quantum gates…" },
        options: [
          { en: "are random", hi: "random hote hain" },
          { en: "only work once", hi: "sirf ek baar kaam karte hain" },
          { en: "can be undone — they are reversible", hi: "undo ho sakte hain — reversible hote hain" },
          { en: "destroy the state", hi: "state ko destroy kar dete hain" },
        ],
        answer: 2,
        misconceptions: { 0: "randomness_no_structure" },
      },
      {
        idea: "definite",
        stem: { en: "A measurement at the end gives…", hi: "End mein measurement … deta hai" },
        options: [
          { en: "1 every time", hi: "har baar 1" },
          { en: "0 every time", hi: "har baar 0" },
          { en: "0 or 1, half each", hi: "0 ya 1, aadha-aadha" },
          { en: "no result", hi: "koi result nahi" },
        ],
        answer: 1,
        misconceptions: { 2: "always_fifty_fifty" },
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: "superposition-explain",
    topic: "superposition",
    prompt: {
      en: "Why did the H gate produce approximately equal measurement results — and why not exactly 50/50?",
      hi: "H gate ne approximately equal measurement results kyun diye — aur exactly 50/50 kyun nahi?",
    },
    ideas: [
      {
        id: "superposition",
        label: { en: "H puts the qubit into a superposition", hi: "H qubit ko superposition mein daalta hai" },
        patterns: ["superposition", "(combination|blend|mix\\w*)\\s+(of|ka)"],
        hint: { en: "Name the kind of state H creates from |0⟩.", hi: "H |0⟩ se jis type ka state banata hai uska naam batao." },
      },
      {
        id: "equal",
        label: { en: "The two results are equally likely", hi: "Dono results equally likely hain" },
        patterns: ["equal\\w*", "\\b50\\b|fifty", "\\bhalf\\b|aadha", "same\\s+(chance|probabilit\\w*|amplitude\\w*|odds)", "barabar", "1/2"],
        hint: { en: "What does that state give each result?", hi: "Woh state har result ko kya deta hai?" },
      },
      {
        id: "one-outcome",
        label: { en: "Each run returns a single, random 0 or 1", hi: "Har run ek single, random 0 ya 1 return karta hai" },
        patterns: [
          "(each|every|one|single|a)\\s+(run|shot|measurement)\\b",
          "(one|single|ek)\\s+(definite\\s+)?(answer|result|outcome)",
          "random\\w*",
          "collaps\\w*",
          "har\\s+(run|baar|shot|measurement)",
          "either\\s+(a\\s+)?(0|zero)\\s+or\\s+(a\\s+)?(1|one)",
        ],
        hint: { en: "What does ONE measurement return?", hi: "EK measurement kya return karta hai?" },
      },
      {
        id: "sampling",
        label: {
          en: "A finite number of shots is a sample, so the counts vary a little",
          hi: "Finite shots ek sample hai, isliye counts thoda vary karte hain",
        },
        patterns: [
          "sampl\\w*",
          "finite|limited",
          "statistic\\w*",
          "variation|vary|varies|varied|varying|fluctuat\\w*|wobbl\\w*|noise|deviat\\w*",
          "(not|never|rarely|na)\\s+(be\\s+)?exact\\w*|inexact",
          "approximat\\w*|roughly|close\\s+to",
          "(more|fewer|less|many|few|zyada|kam)\\s+(runs|shots)",
          "law\\s+of\\s+large",
          "exactly\\s+nahi|thoda\\s+(sa\\s+)?(alag|upar|neeche|different)|aas[- ]?paas|lagbhag",
          "(number\\s+of|1,?024|1000|1,000)\\s*(runs|shots)",
        ],
        hint: {
          en: "Explain why 1,024 runs give something like 503 and 521 instead of 512 and 512.",
          hi: "Explain karo ki 1,024 runs 512 aur 512 ki jagah 503 aur 521 jaisa kyun dete hain.",
        },
      },
      {
        id: "amplitude",
        label: { en: "Probability is the amplitude squared (1/√2 → 1/2)", hi: "Probability amplitude ka square hai (1/√2 → 1/2)" },
        patterns: ["amplitude\\w*", "1/√2|1/sqrt|root\\s*2", "squar\\w*"],
        hint: { en: "For a deeper answer, connect the probability to the amplitude.", hi: "Deeper answer ke liye probability ko amplitude se connect karo." },
        optional: true,
      },
    ],
    model: {
      en: "H turns |0⟩ into an equal superposition of |0⟩ and |1⟩, so each result has probability 1/2. Each run returns a single random 0 or 1. Because 1,024 runs are a finite sample, the counts land close to 512 each but vary a little — that is sampling variation, not an error.",
      hi: "H |0⟩ ko |0⟩ aur |1⟩ ke equal superposition mein le jaata hai, isliye har result ki probability 1/2 hai. Har run ek single random 0 ya 1 return karta hai. 1,024 runs finite sample hain, isliye counts 512 ke paas aate hain lekin thoda vary karte hain — yeh sampling variation hai, error nahi.",
    },
    structured: [
      {
        idea: "superposition",
        stem: { en: "After H, the qubit is…", hi: "H ke baad qubit…" },
        options: [
          { en: "secretly either 0 or 1", hi: "secretly 0 ya 1 hai" },
          { en: "in a superposition: a combination of |0⟩ and |1⟩", hi: "superposition mein hai: |0⟩ aur |1⟩ ka combination" },
          { en: "exactly |1⟩", hi: "exactly |1⟩ hai" },
          { en: "both 0 and 1, and you can read both", hi: "0 aur 1 dono hai, aur aap dono read kar sakte ho" },
        ],
        answer: 1,
        misconceptions: { 0: "classical_randomness", 3: "qubit_extra_states" },
      },
      {
        idea: "equal",
        stem: { en: "The two results have…", hi: "Dono results ki…" },
        options: [
          { en: "probability 1/√2 each", hi: "probability 1/√2 each hai" },
          { en: "probability 1 each", hi: "probability 1 each hai" },
          { en: "equal probability: 1/2 each", hi: "probability equal hai: 1/2 each" },
          { en: "no probability until you measure twice", hi: "koi probability nahi jab tak do baar measure na karo" },
        ],
        answer: 2,
        misconceptions: { 0: "amplitude_is_probability" },
      },
      {
        idea: "one-outcome",
        stem: { en: "Each single run…", hi: "Har single run…" },
        options: [
          { en: "returns one result: 0 or 1", hi: "ek result return karta hai: 0 ya 1" },
          { en: "returns both 0 and 1", hi: "0 aur 1 dono return karta hai" },
          { en: "returns 0.5", hi: "0.5 return karta hai" },
          { en: "returns nothing", hi: "kuch return nahi karta" },
        ],
        answer: 0,
        misconceptions: { 1: "qubit_extra_states" },
      },
      {
        idea: "sampling",
        stem: { en: "The counts are not exactly 512 and 512 because…", hi: "Counts exactly 512 aur 512 nahi hain kyunki…" },
        options: [
          { en: "the simulator made an error", hi: "simulator ne error kiya" },
          { en: "the H gate is slightly biased", hi: "H gate thoda biased hai" },
          { en: "measurement changes the gate", hi: "measurement gate ko change karta hai" },
          { en: "a finite number of runs is a sample, and samples vary", hi: "finite runs ek sample hain, aur samples vary karte hain" },
        ],
        answer: 3,
        misconceptions: { 0: "variation_is_error", 1: "variation_is_error" },
      },
    ],
  },
  {
    id: "superposition-write",
    topic: "superposition",
    prompt: {
      en: "Two H gates in a row give 0 every time. Explain why, and why this shows that superposition is not a hidden coin flip.",
      hi: "Do H gates lagataar lagane par har baar 0 milta hai. Explain karo kyun, aur isse kaise pata chalta hai ki superposition hidden coin flip nahi hai.",
    },
    ideas: [
      {
        id: "undo",
        label: { en: "The second H returns the qubit to |0⟩", hi: "Doosra H qubit ko wapas |0⟩ bana deta hai" },
        patterns: [
          "undo\\w*|undone|revers\\w*|cancel\\w*|invers\\w*",
          "(back|return\\w*|wapas)\\b.*\\b(0|zero)\\b",
          "\\b(0|zero)\\b.*\\b(again|back|wapas)",
        ],
        hint: { en: "What does the second H do to the state the first H made?", hi: "Pehle H ke banaye state ke saath doosra H kya karta hai?" },
      },
      {
        id: "interference",
        label: { en: "The paths interfere: the |1⟩ parts cancel", hi: "Paths interfere karte hain: |1⟩ parts cancel hote hain" },
        patterns: ["interfer\\w*", "\\bpaths?\\b|raast\\w*", "amplitude\\w*", "phase", "(opposite|minus|negative)\\s+sign"],
        hint: { en: "Name what happens when the parts of a superposition add up or cancel.", hi: "Jab superposition ke parts add ya cancel hote hain to use kya kehte hain?" },
      },
      {
        id: "definite",
        label: { en: "The result is a definite 0, with no randomness", hi: "Result definite 0 hai, bina randomness ke" },
        patterns: DEFINITE,
        hint: { en: "How often do you get 0?", hi: "0 kitni baar milta hai?" },
      },
      {
        id: "coin",
        label: { en: "A hidden coin flip would still be 50/50", hi: "Hidden coin flip abhi bhi 50/50 hota" },
        patterns: [
          "coin|sikka",
          "hidden|secret\\w*",
          "classical",
          "would\\s+(still\\s+)?(be|give|stay|remain|have)\\b.*\\b(50|random|half)",
          "(still|abhi\\s+bhi)\\s+(be\\s+|give\\s+)?(50|random|half)",
          "not\\s+(just\\s+|simply\\s+)?(random|chance|luck)",
        ],
        hint: { en: "What would a hidden coin flip give after a second 'shuffle'?", hi: "Doosre 'shuffle' ke baad hidden coin flip kya deta?" },
      },
    ],
    model: {
      en: "The first H creates a superposition. The second H makes the two paths interfere: the |1⟩ parts cancel and the |0⟩ parts add, so the qubit returns to |0⟩ and you measure 0 every time. A hidden coin flip would still be 50/50 after a second shuffle, so superposition must be something more than hidden randomness.",
      hi: "Pehla H superposition banata hai. Doosra H dono paths ko interfere karata hai: |1⟩ parts cancel aur |0⟩ parts add hote hain, isliye qubit wapas |0⟩ ban jaata hai aur har baar 0 measure hota hai. Hidden coin flip doosre shuffle ke baad bhi 50/50 hota, isliye superposition hidden randomness se kuch zyada hai.",
    },
    structured: [
      {
        idea: "undo",
        stem: { en: "After the second H, the qubit is…", hi: "Doosre H ke baad qubit…" },
        options: [
          { en: "back in |0⟩", hi: "wapas |0⟩ mein hai" },
          { en: "still in superposition", hi: "abhi bhi superposition mein hai" },
          { en: "in |1⟩", hi: "|1⟩ mein hai" },
          { en: "measured", hi: "measure ho chuka hai" },
        ],
        answer: 0,
      },
      {
        idea: "interference",
        stem: { en: "That happens because the second H…", hi: "Yeh isliye hota hai kyunki doosra H…" },
        options: [
          { en: "randomises the qubit again", hi: "qubit ko dobara randomise karta hai" },
          {
            en: "makes the two paths interfere: the |1⟩ parts cancel and the |0⟩ parts add",
            hi: "dono paths ko interfere karata hai: |1⟩ parts cancel aur |0⟩ parts add hote hain",
          },
          { en: "measures the qubit", hi: "qubit ko measure karta hai" },
          { en: "does nothing", hi: "kuch nahi karta" },
        ],
        answer: 1,
        misconceptions: { 0: "classical_randomness" },
      },
      {
        idea: "definite",
        stem: { en: "So the measurement gives…", hi: "Isliye measurement … deta hai" },
        options: [
          { en: "0 or 1, half each", hi: "0 ya 1, aadha-aadha" },
          { en: "1 every time", hi: "har baar 1" },
          { en: "0 every time", hi: "har baar 0" },
          { en: "0 about 25% of the time", hi: "0 lagbhag 25% baar" },
        ],
        answer: 2,
        misconceptions: { 0: "classical_randomness" },
      },
      {
        idea: "coin",
        stem: { en: "A hidden coin flip, shuffled twice, would…", hi: "Hidden coin flip ko do baar shuffle karo to…" },
        options: [
          { en: "also give 0 every time", hi: "woh bhi har baar 0 deta" },
          { en: "give 1 every time", hi: "har baar 1 deta" },
          { en: "be impossible to run", hi: "run hi nahi hota" },
          { en: "still be 50/50 — so superposition is something else", hi: "abhi bhi 50/50 hota — isliye superposition kuch aur hai" },
        ],
        answer: 3,
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: "entanglement-explain",
    topic: "entanglement",
    prompt: {
      en: "Why did you only ever see |00⟩ or |11⟩ — and never |01⟩ or |10⟩?",
      hi: "Aapko sirf |00⟩ ya |11⟩ hi kyun dikha — |01⟩ ya |10⟩ kabhi kyun nahi?",
    },
    ideas: [
      {
        id: "h-superposition",
        label: { en: "H puts q0 into a superposition", hi: "H q0 ko superposition mein daalta hai" },
        patterns: [
          "superposition",
          "\\bh\\b.*\\b(q0|first|control|qubit\\s*0)\\b",
          "(q0|first\\s+qubit|control)\\b.*\\b(50|half|both|either|combination|blend)",
        ],
        hint: { en: "What state is q0 in after the H gate?", hi: "H gate ke baad q0 kis state mein hai?" },
      },
      {
        id: "cx-rule",
        label: { en: "CX flips q1 only where q0 is 1", hi: "CX q1 ko wahin flip karta hai jahan q0 1 hai" },
        patterns: [
          "(cx|cnot|controlled)\\b.*\\b(flip\\w*|target|only|when|if|jab|tabhi|cop\\w*)",
          "flip\\w*\\b.*\\b(when|if|jab|tabhi|only|sirf|where)\\b",
          "(when|if|jab|where)\\b.*\\b(control|q0)\\b.*\\b(1|one)\\b",
          "(q1|second\\s+qubit|target)\\b.*\\b(follow\\w*|cop(y|ies)|same\\s+as|match\\w*)\\b.*\\b(q0|control|first)",
        ],
        hint: { en: "State the rule CX follows — when does the target flip?", hi: "CX ka rule batao — target kab flip hota hai?" },
      },
      {
        id: "linked",
        label: { en: "The two results are linked (entangled): they always agree", hi: "Dono results linked (entangled) hain: hamesha agree karte hain" },
        patterns: [
          "entangl\\w*",
          "link\\w*",
          "correlat\\w*",
          "(always|hamesha)\\s+(agree|match|the\\s+same|same|equal)",
          "agree\\w*|match\\w*",
          "connected|tied|jud\\w*",
          "same\\s+(result|value|answer|outcome)",
        ],
        hint: { en: "Describe the relationship between q0's result and q1's result.", hi: "q0 ke result aur q1 ke result ke beech relationship describe karo." },
      },
      {
        id: "random",
        label: { en: "Which of the two you get is random, about half each", hi: "Dono mein se kaunsa milega yeh random hai, lagbhag aadha-aadha" },
        patterns: [
          "random\\w*",
          "\\b50\\b|fifty",
          "\\bhalf\\b|aadha",
          "either",
          "equal\\w*\\s+(likely|probab\\w*|chance)",
          "(can.?t|cannot)\\s+(be\\s+)?predict\\w*|unpredictable",
        ],
        hint: { en: "Can you tell in advance whether a run gives 00 or 11?", hi: "Kya aap pehle se bata sakte ho ki run 00 dega ya 11?" },
      },
    ],
    model: {
      en: "H puts q0 into a superposition of |0⟩ and |1⟩. CX then flips q1 only in the part where q0 is 1, so the state becomes |00⟩ + |11⟩. The two qubits are entangled: each run is random — about half 00 and half 11 — but the results always agree, so 01 and 10 never appear.",
      hi: "H q0 ko |0⟩ aur |1⟩ ke superposition mein daalta hai. Phir CX q1 ko sirf us part mein flip karta hai jahan q0 1 hai, isliye state |00⟩ + |11⟩ ban jaata hai. Dono qubits entangled hain: har run random hai — lagbhag aadha 00 aur aadha 11 — lekin results hamesha agree karte hain, isliye 01 aur 10 kabhi nahi aate.",
    },
    structured: [
      {
        idea: "h-superposition",
        stem: { en: "H on q0 puts q0…", hi: "q0 par H, q0 ko…" },
        options: [
          { en: "into |1⟩", hi: "|1⟩ bana deta hai" },
          { en: "into a superposition of |0⟩ and |1⟩", hi: "|0⟩ aur |1⟩ ke superposition mein daalta hai" },
          { en: "into the same state as q1", hi: "q1 jaisa state bana deta hai" },
          { en: "into a measured state", hi: "measured state bana deta hai" },
        ],
        answer: 1,
      },
      {
        idea: "cx-rule",
        stem: { en: "CX then flips q1…", hi: "Phir CX q1 ko…" },
        options: [
          { en: "always", hi: "hamesha flip karta hai" },
          { en: "never", hi: "kabhi flip nahi karta" },
          { en: "only in the part of the state where q0 is 1", hi: "sirf state ke us part mein flip karta hai jahan q0 1 hai" },
          { en: "at random", hi: "randomly flip karta hai" },
        ],
        answer: 2,
        misconceptions: { 3: "randomness_no_structure" },
      },
      {
        idea: "linked",
        stem: { en: "So the possible results are…", hi: "Isliye possible results hain…" },
        options: [
          { en: "|00⟩ and |11⟩ — the qubits always agree", hi: "|00⟩ aur |11⟩ — qubits hamesha agree karte hain" },
          { en: "all four, 25% each", hi: "chaaron, 25% each" },
          { en: "|01⟩ and |10⟩", hi: "|01⟩ aur |10⟩" },
          { en: "|11⟩ only", hi: "sirf |11⟩" },
        ],
        answer: 0,
        misconceptions: { 1: "randomness_no_structure" },
      },
      {
        idea: "random",
        stem: { en: "Which one you get in a single run is…", hi: "Single run mein kaunsa milega yeh…" },
        options: [
          { en: "chosen by whoever measures first, as a message", hi: "jo pehle measure kare woh message ki tarah choose karta hai" },
          { en: "always 00 first", hi: "hamesha pehle 00" },
          { en: "decided by q1", hi: "q1 decide karta hai" },
          { en: "random: about half 00 and half 11", hi: "random hai: lagbhag aadha 00 aur aadha 11" },
        ],
        answer: 3,
        misconceptions: { 0: "ftl_communication" },
      },
    ],
  },
  {
    id: "entanglement-write",
    topic: "entanglement",
    prompt: {
      en: "X on q0, then CX (q0 controls q1), then measure both: you get |11⟩ every time. Explain why there is no randomness and no entanglement here.",
      hi: "q0 par X, phir CX (q0 control, q1 target), phir dono measure: har baar |11⟩ milta hai. Explain karo ki yahan na randomness hai na entanglement, kyun.",
    },
    ideas: [
      {
        id: "x-definite",
        label: { en: "X makes q0 a definite |1⟩", hi: "X q0 ko definite |1⟩ banata hai" },
        patterns: [
          "\\bx\\b.*\\b(flip\\w*|mak\\w*|turn\\w*|set\\w*|put\\w*|chang\\w*|bana\\w*)\\b.*\\b(1|one)\\b",
          "(q0|control|first\\s+qubit)\\b.*\\b(is|becomes|ban\\w*|=)\\b.*\\b(1|one)\\b",
          "(q0|control)\\b.*\\bdefinite",
          "definite\\b.*\\b(1|one)\\b",
        ],
        hint: { en: "What state is q0 in after X?", hi: "X ke baad q0 kis state mein hai?" },
      },
      {
        id: "cx-flips",
        label: { en: "With the control at |1⟩, CX flips q1", hi: "Control |1⟩ ho to CX q1 ko flip karta hai" },
        patterns: [
          "(cx|cnot|controlled)\\b.*\\b(flip\\w*|target|q1)",
          "flip\\w*\\b.*\\b(q1|target|second)",
          "(q1|target|second\\s+qubit)\\b.*\\bflip\\w*",
          "(q1|target)\\b.*\\b(becomes|turns\\s+(in)?to|ban\\w*)\\s+(a\\s+)?(1|one)\\b",
        ],
        hint: { en: "What does CX do when its control is 1?", hi: "Control 1 ho to CX kya karta hai?" },
      },
      {
        id: "no-superposition",
        label: { en: "There is no superposition, so nothing to entangle and nothing random", hi: "Superposition nahi hai, isliye na entangle karne ko kuch hai na random" },
        patterns: [
          "no\\s+superposition",
          "not\\s+(in\\s+)?(a\\s+)?superposition",
          "without\\s+(a\\s+)?superposition",
          "(needs?|requires?|chahiye)\\b.*\\bsuperposition",
          "superposition\\b.*\\b(needed|required|nahi|chahiye|missing)",
          "never\\s+(in\\s+)?(a\\s+)?superposition",
          "only\\s+one\\s+(possib\\w*|result|outcome|path|part|state)",
        ],
        hint: { en: "What ingredient was missing that a Bell pair has?", hi: "Bell pair mein jo ingredient hota hai, woh yahan kaunsa missing tha?" },
      },
    ],
    model: {
      en: "X makes q0 a definite |1⟩. With the control at |1⟩, CX simply flips q1, giving exactly |11⟩. There is no superposition anywhere, so there is nothing random and nothing to entangle — CX needs a superposition on the control to create a link.",
      hi: "X q0 ko definite |1⟩ banata hai. Control |1⟩ ho to CX bas q1 ko flip karta hai, aur exactly |11⟩ milta hai. Kahin bhi superposition nahi hai, isliye na kuch random hai na entangle karne ko kuch — link banane ke liye CX ko control par superposition chahiye.",
    },
    structured: [
      {
        idea: "x-definite",
        stem: { en: "After X, q0 is…", hi: "X ke baad q0…" },
        options: [
          { en: "in superposition", hi: "superposition mein hai" },
          { en: "a definite |1⟩", hi: "definite |1⟩ hai" },
          { en: "already entangled", hi: "pehle se entangled hai" },
          { en: "random", hi: "random hai" },
        ],
        answer: 1,
        misconceptions: { 3: "always_fifty_fifty" },
      },
      {
        idea: "cx-flips",
        stem: { en: "With a definite |1⟩ on the control, CX…", hi: "Control par definite |1⟩ ho to CX…" },
        options: [
          { en: "flips q1, so the state is exactly |11⟩", hi: "q1 ko flip karta hai, isliye state exactly |11⟩ hai" },
          { en: "flips q1 half the time", hi: "q1 ko aadhi baar flip karta hai" },
          { en: "does nothing", hi: "kuch nahi karta" },
          { en: "measures q0", hi: "q0 ko measure karta hai" },
        ],
        answer: 0,
        misconceptions: { 1: "always_fifty_fifty" },
      },
      {
        idea: "no-superposition",
        stem: { en: "There is no entanglement because…", hi: "Entanglement nahi hai kyunki…" },
        options: [
          { en: "X destroys entanglement", hi: "X entanglement destroy kar deta hai" },
          { en: "entanglement needs three qubits", hi: "entanglement ko teen qubits chahiye" },
          { en: "CX needs a superposition on the control to create a link", hi: "link banane ke liye CX ko control par superposition chahiye" },
          { en: "the simulator runs locally", hi: "simulator locally chalta hai" },
        ],
        answer: 2,
      },
    ],
  },
];

export function rubricById(id: string): ExplainRubric | undefined {
  return RUBRICS.find((rubric) => rubric.id === id);
}
