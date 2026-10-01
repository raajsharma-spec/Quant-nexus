/**
 * Contextual AI Tutor — MVP
 *
 * IMPORTANT: this is NOT a trained AI model and it calls no API.
 * It is a rule-based tutor that runs locally. It works in two steps:
 *   1. find out what the question is about (keyword matching)
 *   2. build an answer from the learner's own context: their language,
 *      current topic, last experiment, last prediction, weak concepts and
 *      the recommendation engine's next step.
 *
 * In production this module is where a RAG + LLM service would plug in.
 */

import { requiredChallenges } from "@/data/challenges";
import { topicTitle } from "@/data/topics";
import { computeInsights } from "./analytics";
import { currentTopic, hasUnresolvedError, topicMastery, topicStatus } from "./mastery";
import { getRecommendation } from "./recommendationEngine";
import type { AppState } from "./storage";
import type { L, Lang } from "./types";

export interface TutorReply {
  /** Paragraphs of the answer. */
  text: string[];
  /** What the tutor looked at to build this answer — shown to the learner. */
  contextUsed: string[];
  /** A place to go next, if useful. */
  link?: { label: string; href: string };
  followUps: string[];
  intent: string;
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

type Intent =
  | "why-wrong"
  | "why-result"
  | "next"
  | "unlock"
  | "bit-vs-qubit"
  | "qubit"
  | "h-gate"
  | "x-gate"
  | "y-gate"
  | "z-gate"
  | "cx-gate"
  | "superposition"
  | "measurement"
  | "probability"
  | "entanglement"
  | "ket"
  | "phase"
  | "interference"
  | "bloch"
  | "circuit"
  | "hardware"
  | "identity"
  | "python"
  | "progress"
  | "greeting"
  | "thanks"
  | "fallback";

/** Order matters: more specific questions are checked first. */
const INTENT_PATTERNS: Array<[Intent, RegExp]> = [
  ["why-wrong", /(prediction|guess|answer|jawab).*(wrong|galat|incorrect|miss)|(wrong|galat|miss).*(prediction|guess)|why.*(wrong|miss)|galat kyun/],
  ["why-result", /50\s*[\/\-:]\s*50|why did i get|why.*(result|output|outcome|happen)|kyun (mila|aaya|hua)|what happened|kya hua/],
  ["next", /(what|kya).*(next|aage)|(next|aage) kya|learn next|next (step|move|topic)|what should i|ab kya|recommend|suggest/],
  ["unlock", /unlock|locked|mastery|threshold|pass(ing)? score/],
  ["bit-vs-qubit", /(difference|differ|vs|versus|compare|fark|antar).*(bit)|bit.*(difference|vs|versus|qubit)/],
  ["cx-gate", /\bcx\b|cnot|controlled/],
  ["h-gate", /\bh\b gate|\bh gate|hadamard|what does h\b|h kya/],
  ["x-gate", /\bx\b gate|\bx gate|pauli[- ]?x|\bnot gate|what does x\b|x kya/],
  ["y-gate", /\by\b gate|\by gate|pauli[- ]?y|what does y\b|y kya/],
  ["z-gate", /\bz\b gate|\bz gate|pauli[- ]?z|what does z\b|z kya/],
  ["entanglement", /entangle|bell (pair|state)|linked qubits/],
  ["interference", /interfer|h twice|two h|do baar h/],
  ["superposition", /superposition/],
  ["measurement", /measure|measurement|\bm gate|collapse/],
  ["probability", /probabilit|chance|percent|amplitude|shots?/],
  ["ket", /\bket\b|bra-?ket|\|0|\|1|notation|bracket/],
  ["phase", /phase/],
  ["bloch", /bloch|sphere|arrow/],
  ["hardware", /real quantum|hardware|quantum computer|ibm|qiskit|simulator|simulat/],
  ["identity", /who are you|what are you|are you (an )?ai|chatgpt|llm|trained|model|tum kaun|aap kaun/],
  ["python", /python|variable|loop|function|list/],
  ["progress", /my progress|how am i doing|score|accuracy|weak|kaisa chal/],
  ["circuit", /circuit|wire|gate/],
  ["qubit", /qubit/],
  ["greeting", /^(hi|hello|hey|namaste|hii+|yo)\b/],
  ["thanks", /thank|thanks|shukriya|dhanyavaad/],
];

function detectIntent(question: string): Intent {
  const q = question.toLowerCase().trim();
  for (const [intent, pattern] of INTENT_PATTERNS) {
    if (pattern.test(q)) return intent;
  }
  return "fallback";
}

/** Short concept answers. Each has a simple version and an optional "going deeper" line. */
const CONCEPTS: Partial<Record<Intent, { simple: L; deeper?: L; link?: { label: string; href: string } }>> = {
  qubit: {
    simple: {
      en: "A qubit is the quantum version of a bit. Before you measure it, it holds a quantum state — a description of how likely each answer is. When you measure it, you always get a plain 0 or 1.",
      hi: "Qubit bit ka quantum version hai. Measure karne se pehle yeh ek quantum state hold karta hai — yaani har answer kitna likely hai. Measure karne par hamesha plain 0 ya 1 milta hai.",
    },
    deeper: {
      en: "Going deeper: the state is written a|0⟩ + b|1⟩. The numbers a and b are amplitudes, and the probability of each answer is the amplitude's size squared.",
      hi: "Thoda deeper: state ko a|0⟩ + b|1⟩ likhte hain. a aur b amplitudes hain, aur har answer ki probability us amplitude ke size ka square hoti hai.",
    },
    link: { label: "Qubit Fundamentals", href: "/learn/qubit" },
  },
  "bit-vs-qubit": {
    simple: {
      en: "A bit is always a definite 0 or 1 — like a switch. A qubit holds a quantum state, which can be a blend of |0⟩ and |1⟩. The state gives a probability for each answer, and measurement turns it into one definite 0 or 1.",
      hi: "Bit hamesha definite 0 ya 1 hota hai — switch ki tarah. Qubit ek quantum state hold karta hai, jo |0⟩ aur |1⟩ ka blend ho sakta hai. State har answer ki probability deta hai, aur measurement use ek definite 0 ya 1 mein badal deta hai.",
    },
    deeper: {
      en: "The real power is not 'two values at once' — it is that gates can make the paths of a superposition interfere, as you see when two H gates cancel.",
      hi: "Real power 'ek saath do values' nahi hai — balki yeh hai ki gates superposition ke paths ko interfere kara sakte hain, jaise do H gates cancel ho jaate hain.",
    },
    link: { label: "Qubit Fundamentals", href: "/learn/qubit" },
  },
  "h-gate": {
    simple: {
      en: "The Hadamard gate creates a superposition of |0⟩ and |1⟩. Apply H to |0⟩ and measurement gives 0 or 1 with equal probability.",
      hi: "Hadamard gate ek qubit ko superposition state mein le ja sakta hai, jahan measurement ke time |0⟩ ya |1⟩ milne ki probability hoti hai. |0⟩ par H lagao to 0 ya 1 equal probability se milta hai.",
    },
    deeper: {
      en: "Going deeper: H|0⟩ = (|0⟩ + |1⟩)/√2. Each amplitude is 1/√2, and (1/√2)² = 50%. Apply H again and you are back at |0⟩.",
      hi: "Thoda deeper: H|0⟩ = (|0⟩ + |1⟩)/√2. Har amplitude 1/√2 hai, aur (1/√2)² = 50%. H dobara lagao to wapas |0⟩ mil jaata hai.",
    },
    link: { label: "Try it in the Quantum Lab", href: "/lab" },
  },
  "x-gate": {
    simple: {
      en: "X is the quantum NOT gate. It flips the qubit: |0⟩ → |1⟩ and |1⟩ → |0⟩. Apply it twice and you are back where you started.",
      hi: "X quantum NOT gate hai. Yeh qubit ko flip karta hai: |0⟩ → |1⟩ aur |1⟩ → |0⟩. Do baar lagao to wapas wahin aa jaate ho.",
    },
    link: { label: "Quantum Gates", href: "/learn/gates" },
  },
  "y-gate": {
    simple: {
      en: "Y flips the qubit like X does and also changes its phase. If you apply Y to |0⟩ and measure, you get 1 every time — the phase is not visible in that measurement.",
      hi: "Y qubit ko X ki tarah flip karta hai aur saath mein phase bhi change karta hai. |0⟩ par Y lagakar measure karo to har baar 1 milta hai — phase us measurement mein dikhta nahi.",
    },
    link: { label: "Quantum Gates", href: "/learn/gates" },
  },
  "z-gate": {
    simple: {
      en: "Z leaves |0⟩ alone and puts a minus sign on |1⟩. That is a phase change, so on its own it does not change what you measure. Its effect shows up when you combine it with H: H, then Z, then H turns |0⟩ into |1⟩.",
      hi: "Z |0⟩ ko waise hi chhod deta hai aur |1⟩ par minus sign lagata hai. Yeh phase change hai, isliye akele measurement ka result change nahi hota. Iska effect H ke saath dikhta hai: H, phir Z, phir H se |0⟩ ban jaata hai |1⟩.",
    },
    link: { label: "Try H → Z → H in the Lab", href: "/lab" },
  },
  "cx-gate": {
    simple: {
      en: "CX (controlled-X) works on two qubits. It flips the target qubit only when the control qubit is |1⟩. With the control in superposition, CX entangles the two qubits.",
      hi: "CX (controlled-X) do qubits par kaam karta hai. Yeh target qubit ko tabhi flip karta hai jab control qubit |1⟩ ho. Control superposition mein ho to CX dono qubits ko entangle kar deta hai.",
    },
    link: { label: "Entanglement", href: "/learn/entanglement" },
  },
  superposition: {
    simple: {
      en: "Superposition means a qubit's state is a blend of |0⟩ and |1⟩. It is not secretly one of them — it has a probability for each. Measurement ends the blend and gives one definite answer.",
      hi: "Superposition ka matlab hai ki qubit ka state |0⟩ aur |1⟩ ka blend hai. Yeh secretly kisi ek mein nahi hai — dono ki apni probability hai. Measurement blend ko khatam karke ek definite answer deta hai.",
    },
    deeper: {
      en: "Proof that it is more than a coin flip: two H gates in a row give |0⟩ every time, because the two paths interfere.",
      hi: "Proof ki yeh sirf coin flip nahi hai: do H gates lagataar lagao to har baar |0⟩ milta hai, kyunki dono paths interfere karte hain.",
    },
    link: { label: "Superposition & Measurement", href: "/learn/superposition" },
  },
  measurement: {
    simple: {
      en: "Measurement reads a qubit and always returns a plain 0 or 1. If the qubit was in superposition, the result is random according to its probabilities, and the superposition is gone afterwards.",
      hi: "Measurement qubit ko read karta hai aur hamesha plain 0 ya 1 return karta hai. Qubit superposition mein tha to result uski probabilities ke according random hota hai, aur uske baad superposition khatam ho jaata hai.",
    },
    deeper: {
      en: "That is why the lab runs a circuit 1,024 times: one measurement gives one answer, many measurements reveal the probabilities.",
      hi: "Isliye lab circuit ko 1,024 baar run karta hai: ek measurement ek answer deta hai, kai measurements se probabilities dikhti hain.",
    },
    link: { label: "Superposition & Measurement", href: "/learn/superposition" },
  },
  probability: {
    simple: {
      en: "A quantum state gives each result a probability. One run gives one result; repeating the run many times (each repeat is called a shot) shows the probabilities. That is why you see ≈50% and not exactly 50%.",
      hi: "Quantum state har result ko ek probability deta hai. Ek run ek result deta hai; run ko kai baar repeat karne par (har repeat ko shot kehte hain) probabilities dikhti hain. Isliye ≈50% dikhta hai, exactly 50% nahi.",
    },
    deeper: {
      en: "Going deeper: each result has an amplitude, and probability = |amplitude|². Amplitudes can be negative, which is what makes interference possible.",
      hi: "Thoda deeper: har result ka ek amplitude hota hai, aur probability = |amplitude|². Amplitudes negative ho sakte hain, isi se interference possible hota hai.",
    },
  },
  entanglement: {
    simple: {
      en: "Entanglement links qubits so their results are connected. In a Bell pair (H on q0, then CX), each run gives 00 or 11 at random — the qubits always agree. It cannot be used to send messages faster than light.",
      hi: "Entanglement qubits ko aise link karta hai ki unke results connected rehte hain. Bell pair mein (q0 par H, phir CX) har run randomly 00 ya 11 deta hai — qubits hamesha agree karte hain. Isse light se faster message nahi bheja ja sakta.",
    },
    link: { label: "Entanglement", href: "/learn/entanglement" },
  },
  ket: {
    simple: {
      en: "|0⟩ is read “ket zero”. The |…⟩ brackets are a label that means “this is a quantum state”. |0⟩ always measures 0, |1⟩ always measures 1, and for two qubits we write |q0 q1⟩, so |10⟩ means q0 = 1 and q1 = 0.",
      hi: "|0⟩ ko “ket zero” padhte hain. |…⟩ brackets ek label hain jiska matlab hai “yeh quantum state hai”. |0⟩ hamesha 0 measure hota hai, |1⟩ hamesha 1, aur do qubits ke liye |q0 q1⟩ likhte hain, yaani |10⟩ ka matlab q0 = 1 aur q1 = 0.",
    },
    link: { label: "Qubit Fundamentals", href: "/learn/qubit" },
  },
  phase: {
    simple: {
      en: "Phase is a hidden part of a quantum state — think of it as a plus or minus sign on the |1⟩ part. It does not change a measurement directly, but it changes how later gates combine. Z changes the phase; a following H makes the change visible.",
      hi: "Phase quantum state ka ek hidden part hai — ise |1⟩ part par plus ya minus sign ki tarah socho. Yeh measurement ko directly change nahi karta, lekin baad ke gates kaise combine honge yeh change karta hai. Z phase change karta hai; uske baad H lagao to change dikhne lagta hai.",
    },
    link: { label: "Quantum Gates", href: "/learn/gates" },
  },
  interference: {
    simple: {
      en: "Interference is when the paths of a superposition add up or cancel. With two H gates, the two ways of reaching |1⟩ cancel and the two ways of reaching |0⟩ add up, so you measure 0 every time.",
      hi: "Interference tab hota hai jab superposition ke paths add ya cancel hote hain. Do H gates mein |1⟩ tak pahunchne ke dono raaste cancel ho jaate hain aur |0⟩ wale add ho jaate hain, isliye har baar 0 measure hota hai.",
    },
    link: { label: "Try H → H in the Lab", href: "/lab" },
  },
  bloch: {
    simple: {
      en: "The Bloch sphere is a picture of one qubit's state as an arrow. Pointing up is |0⟩, pointing down is |1⟩, and pointing sideways is an equal superposition. When a qubit is entangled, it has no arrow of its own, so the lab shows a dot at the centre.",
      hi: "Bloch sphere ek qubit ke state ko arrow ki tarah dikhata hai. Upar matlab |0⟩, neeche matlab |1⟩, aur sideways matlab equal superposition. Jab qubit entangled hota hai to uska apna arrow nahi hota, isliye lab centre mein ek dot dikhata hai.",
    },
  },
  circuit: {
    simple: {
      en: "A quantum circuit is a set of wires — one per qubit — with gates placed on them. Gates run from left to right, and an M gate at the end reads the result. In the lab, measurement must be the last thing on a wire.",
      hi: "Quantum circuit wires ka set hai — har qubit ke liye ek — jin par gates lage hote hain. Gates left se right run hote hain, aur end mein M gate result read karta hai. Lab mein measurement wire par last cheez honi chahiye.",
    },
    link: { label: "Open Quantum Lab", href: "/lab" },
  },
  hardware: {
    simple: {
      en: "Quantum Nexus runs every circuit in a Local Educational Quantum Simulator, written in TypeScript, inside your browser. It does not use real quantum hardware or any cloud service. A production version could connect to frameworks such as Qiskit Aer, PennyLane or Cirq — that is planned, not built.",
      hi: "Quantum Nexus har circuit ko Local Educational Quantum Simulator mein run karta hai, jo TypeScript mein likha hai aur aapke browser ke andar chalta hai. Yeh real quantum hardware ya koi cloud service use nahi karta. Production version Qiskit Aer, PennyLane ya Cirq jaise frameworks se connect ho sakta hai — woh planned hai, bana nahi hai.",
    },
    link: { label: "See the architecture", href: "/architecture" },
  },
  identity: {
    simple: {
      en: "I am the Contextual AI Tutor for this MVP. I am rule-based and run locally in your browser — I am not a trained AI model and I do not call any AI service. I build answers from your language choice, your current topic and your recent experiments.",
      hi: "Main is MVP ka Contextual AI Tutor hoon. Main rule-based hoon aur aapke browser mein locally chalta hoon — main koi trained AI model nahi hoon aur kisi AI service ko call nahi karta. Main aapki language choice, current topic aur recent experiments se answers banata hoon.",
    },
    link: { label: "See the architecture", href: "/architecture" },
  },
  python: {
    simple: {
      en: "You only need a little Python to read quantum code: variables, if/else, for loops, functions and lists. Python Foundations covers those in a few minutes.",
      hi: "Quantum code padhne ke liye thoda sa Python kaafi hai: variables, if/else, for loops, functions aur lists. Python Foundations inhe kuch minutes mein cover karta hai.",
    },
    link: { label: "Python Foundations", href: "/learn/python" },
  },
};

const FOLLOW_UPS: Partial<Record<Intent, L[]>> = {
  qubit: [SUGGESTED_QUESTIONS[7], SUGGESTED_QUESTIONS[3]],
  "bit-vs-qubit": [SUGGESTED_QUESTIONS[2], SUGGESTED_QUESTIONS[3]],
  "h-gate": [SUGGESTED_QUESTIONS[2], SUGGESTED_QUESTIONS[4]],
  superposition: [SUGGESTED_QUESTIONS[3], SUGGESTED_QUESTIONS[4]],
  measurement: [SUGGESTED_QUESTIONS[4], SUGGESTED_QUESTIONS[6]],
  "why-result": [SUGGESTED_QUESTIONS[5], SUGGESTED_QUESTIONS[6]],
  "why-wrong": [SUGGESTED_QUESTIONS[2], SUGGESTED_QUESTIONS[6]],
  next: [SUGGESTED_QUESTIONS[1], SUGGESTED_QUESTIONS[2]],
};

/** Which mastery-check concepts each kind of question relates to. */
const WEAK_CONCEPT_MATCH: Partial<Record<Intent, string[]>> = {
  "h-gate": ["H gate"],
  "x-gate": ["X gate"],
  "y-gate": ["Y gate"],
  "z-gate": ["Z gate"],
  "cx-gate": ["CX gate"],
  superposition: ["Superposition", "Predicting Superposition & Measurement"],
  measurement: ["Measurement"],
  probability: ["Probability"],
  entanglement: ["Entanglement", "Predicting Entanglement"],
  interference: ["Interference"],
  ket: ["Ket notation"],
  "bit-vs-qubit": ["Bit vs qubit"],
};

/** Answer a learner's question using their local context. */
export function answerQuestion(question: string, state: AppState, lang: Lang): TutorReply {
  const intent = detectIntent(question);
  const pick = (text: L) => (lang === "hi" ? text.hi : text.en);
  const topic = currentTopic(state);
  const title = topicTitle(topic);
  const insights = computeInsights(state);
  const last = state.lastExperiment;
  const name = state.profile?.name ?? "";

  const text: string[] = [];
  const contextUsed: string[] = [`Language: ${lang === "hi" ? "English + Hinglish" : "English"}`];
  let link: TutorReply["link"];

  // Learners past the basics get the "going deeper" line.
  const advanced = topicStatus(state, "gates") === "MASTERED";

  const describeLast = () => {
    if (!last) return;
    contextUsed.push(`Your last experiment: ${last.circuit}`);
    last.steps.forEach((s) => text.push(pick(s)));
    text.push(pick(last.summary));
  };

  switch (intent) {
    case "why-wrong": {
      if (!last) {
        text.push(
          pick({
            en: "You have not made a prediction yet, so there is nothing to compare. Build a circuit in the Quantum Lab, make a prediction, and I will walk you through the result.",
            hi: "Aapne abhi tak koi prediction nahi ki, isliye compare karne ke liye kuch nahi hai. Quantum Lab mein circuit banao, prediction karo, phir main result step-by-step samjhaunga.",
          })
        );
        link = { label: "Open Quantum Lab", href: "/lab" };
        break;
      }
      contextUsed.push(`Your last prediction: ${last.prediction}`);
      if (last.correct) {
        text.push(
          pick({
            en: `Your last prediction was actually right. You predicted ${last.prediction} for ${last.circuit}, and the simulation agreed. Here is why it worked:`,
            hi: `Aapki last prediction actually sahi thi. Aapne ${last.circuit} ke liye ${last.prediction} predict kiya, aur simulation ne wahi diya. Yeh isliye hua:`,
          })
        );
      } else {
        text.push(
          pick({
            en: `Your prediction was different from the simulation result. You predicted ${last.prediction}, and the circuit ${last.circuit} gave ${last.actual}. Let's look at it gate by gate:`,
            hi: `Yahan prediction miss hua. Aapne ${last.prediction} predict kiya, aur circuit ${last.circuit} ne ${last.actual} diya. Let's look at it gate by gate:`,
          })
        );
      }
      describeLast();
      link = { label: "Try another circuit", href: "/lab" };
      break;
    }

    case "why-result": {
      if (!last) {
        text.push(
          pick({
            en: "Run a circuit first and I will explain exactly what happened. Here is the classic case in the meantime:",
            hi: "Pehle ek circuit run karo, phir main exactly samjhaunga ki kya hua. Tab tak yeh classic case dekho:",
          }),
          pick(CONCEPTS["h-gate"]!.simple)
        );
        link = { label: "Open Quantum Lab", href: "/lab" };
        break;
      }
      text.push(
        pick({
          en: `Here is what happened in your last experiment (${last.circuit}), which gave ${last.actual}:`,
          hi: `Aapke last experiment (${last.circuit}) mein yeh hua, jisne ${last.actual} diya:`,
        })
      );
      describeLast();
      link = { label: "Try another circuit", href: "/lab" };
      break;
    }

    case "next": {
      const rec = getRecommendation(state);
      contextUsed.push(`Current topic: ${title}`, `Recommendation rule: ${rec.ruleId}`);
      text.push(
        pick({ en: `Your next move: ${rec.title.en}.`, hi: `Aapka next move: ${rec.title.hi}.` }),
        pick(rec.reason)
      );
      link = { label: pick(rec.cta), href: rec.href };
      break;
    }

    case "unlock": {
      const m = topicMastery(state, topic);
      const threshold = state.settings.masteryThreshold;
      const required = requiredChallenges(topic).length;
      contextUsed.push(`Current topic: ${title}`, `Mastery threshold: ${threshold}%`);
      text.push(
        pick({
          en: `To master ${title} and unlock what's next, three things need to be true:`,
          hi: `${title} master karke next unlock karne ke liye teen cheezein true honi chahiye:`,
        }),
        pick({
          en: `1. Mastery check at ${threshold}% or more — your best so far: ${m.bestScore === null ? "not taken yet" : m.bestScore + "%"}.`,
          hi: `1. Mastery check mein ${threshold}% ya zyada — aapka best abhi tak: ${m.bestScore === null ? "abhi liya nahi" : m.bestScore + "%"}.`,
        }),
        pick({
          en: `2. Required practice solved — ${m.practiceSolved} of ${required} done.`,
          hi: `2. Required practice solve — ${required} mein se ${m.practiceSolved} done.`,
        }),
        pick({
          en: `3. No unresolved circuit error — ${hasUnresolvedError(state) ? "your last lab run failed, so run one working circuit" : "you are clear"}.`,
          hi: `3. Koi unresolved circuit error nahi — ${hasUnresolvedError(state) ? "aapka last lab run fail hua, ek working circuit run karo" : "aap clear ho"}.`,
        }),
        pick({
          en: "You can retry the mastery check as many times as you like.",
          hi: "Mastery check aap jitni baar chaho retry kar sakte ho.",
        })
      );
      link = { label: "Mastery check", href: `/assessment?topic=${topic}` };
      break;
    }

    case "progress": {
      contextUsed.push("Your local learning records");
      const p = insights.prediction;
      text.push(
        pick({
          en: `You are working on ${title}. Concept mastery is ${insights.conceptMastery}%.`,
          hi: `Aap ${title} par kaam kar rahe ho. Concept mastery ${insights.conceptMastery}% hai.`,
        }),
        p.total === 0
          ? pick({
              en: "You have not made any predictions yet — that is the fastest way to build intuition.",
              hi: "Aapne abhi koi prediction nahi ki — intuition banane ka yahi fastest tareeka hai.",
            })
          : pick({
              en: `You have made ${p.total} predictions and ${p.correct} were right (${p.accuracy}%).`,
              hi: `Aapne ${p.total} predictions ki hain aur ${p.correct} sahi thi (${p.accuracy}%).`,
            })
      );
      if (insights.weakConcepts.length > 0) {
        const weak = insights.weakConcepts.map((w) => w.concept).join(", ");
        text.push(
          pick({
            en: `Concepts to strengthen: ${weak}.`,
            hi: `In concepts ko strong karna hai: ${weak}.`,
          })
        );
      }
      link = { label: "Your Progress", href: "/progress" };
      break;
    }

    case "greeting": {
      text.push(
        pick({
          en: `Hi${name ? " " + name : ""}. You are on ${title}. Ask me about a concept, or ask “why did I get this result?” after you run a circuit.`,
          hi: `Hi${name ? " " + name : ""}. Aap ${title} par ho. Mujhse koi concept poochho, ya circuit run karne ke baad poochho “mujhe yeh result kyun mila?”`,
        })
      );
      contextUsed.push(`Current topic: ${title}`);
      break;
    }

    case "thanks": {
      text.push(
        pick({
          en: "Any time. Ready for the next experiment?",
          hi: "Anytime. Next experiment ke liye ready?",
        })
      );
      link = { label: "Open Quantum Lab", href: "/lab" };
      break;
    }

    case "fallback": {
      text.push(
        pick({
          en: "I don't have an answer for that yet. I am a rule-based tutor for this MVP, so I can help with: qubits, bits vs qubits, the H, X, Y, Z, CX and M gates, superposition, measurement, probability, entanglement, your last experiment, and what to learn next.",
          hi: "Iska answer abhi mere paas nahi hai. Main is MVP ka rule-based tutor hoon, isliye main in cheezon mein help kar sakta hoon: qubits, bit vs qubit, H, X, Y, Z, CX aur M gates, superposition, measurement, probability, entanglement, aapka last experiment, aur next kya seekhna hai.",
        })
      );
      break;
    }

    default: {
      const concept = CONCEPTS[intent];
      if (concept) {
        text.push(pick(concept.simple));
        if (advanced && concept.deeper) {
          text.push(pick(concept.deeper));
          contextUsed.push("Your level: past Quantum Gates, so a deeper note is included");
        }
        link = concept.link;
      }
      // Tie the concept back to what the learner just did, when it is relevant.
      const lastUsedH = !!last && /\bH\b/.test(last.circuit);
      const relevant =
        intent === "measurement" || intent === "probability"
          ? !!last
          : (intent === "h-gate" || intent === "superposition") && lastUsedH;
      if (last && relevant) {
        contextUsed.push(`Your last experiment: ${last.circuit}`);
        text.push(
          pick({
            en: `You saw this yourself: your last experiment (${last.circuit}) gave ${last.actual}.`,
            hi: `Yeh aapne khud dekha: aapke last experiment (${last.circuit}) ne ${last.actual} diya.`,
          })
        );
      }
      // Point out when the question touches one of the learner's weak concepts.
      const related = WEAK_CONCEPT_MATCH[intent] ?? [];
      const weak = insights.weakConcepts.find((w) => related.includes(w.concept));
      if (weak) {
        contextUsed.push(`Weak concept: ${weak.concept}`);
        text.push(
          pick({
            en: `This is worth a second look — ${weak.concept} came up as a weak concept in your records.`,
            hi: `Isse ek baar aur dekhna worth hai — aapke records mein ${weak.concept} weak concept ki tarah aaya hai.`,
          })
        );
      }
    }
  }

  const followUps = (FOLLOW_UPS[intent] ?? [SUGGESTED_QUESTIONS[4], SUGGESTED_QUESTIONS[6]]).map(pick);
  return { text, contextUsed, link, followUps, intent };
}
