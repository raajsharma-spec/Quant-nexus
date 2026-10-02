/**
 * The curriculum, as structured data.
 *
 *   Curriculum → Module → Concept → Learning stages → Assessment → Mastery
 *
 * A university can change the syllabus by editing data files (this one,
 * concepts.ts, quizzes.ts, challenges.ts, explanations.ts) — no interface code
 * needs to change. Each concept carries `meta` (version, status, source,
 * verified, updatedAt) so content can be reviewed and updated on its own.
 */

import type { GateSpec, GateType } from "@/lib/quantumSimulator";
import type { L, TopicId } from "@/lib/types";
import { VERIFIED, type ContentMeta } from "./knowledge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One scene of a visual lesson. The picture is computed by the simulator from `gates`. */
export interface LessonScene {
  id: string;
  title: L;
  /** The narration shown under the picture. */
  caption: L;
  gates: GateSpec[];
  /** When set, the scene also samples this many runs and shows the counts. */
  shots?: number;
  seconds: number;
}

export interface VisualLesson {
  title: L;
  /** A real video file can be attached later; when null the animated visual lesson is shown. */
  videoUrl: string | null;
  qubits: number;
  scenes: LessonScene[];
}

/** A button in the experiment sandbox. */
export interface SandboxOp {
  id: string;
  label: string;
  gate: GateType;
  qubit: number;
  target?: number;
}

/** Something to achieve in the sandbox. Checked against the real simulated state. */
export interface SandboxGoal {
  id: string;
  text: L;
  /** Target probability of each result when every qubit is measured. */
  probabilities: Record<string, number>;
  /** Minimum number of gates applied. */
  minGates?: number;
  /** Every one of these gates must have been used. */
  mustUse?: GateType[];
  /** At least one of these gates must have been used. */
  mustUseAny?: GateType[];
  /** None of these gates may have been used. */
  mustNotUse?: GateType[];
  /** The starting state the goal requires (1 = start from |1⟩). */
  start?: 0 | 1;
  /** What reaching the goal demonstrates. */
  insight: L;
}

export interface Sandbox {
  qubits: 1 | 2;
  intro: L;
  /** Let the learner start from |1⟩ as well as |0⟩ (single qubit only). */
  chooseStart: boolean;
  ops: SandboxOp[];
  goals: SandboxGoal[];
}

/** "Build a circuit that…" — checked by simulating what the learner builds. */
export interface BuildTask {
  id: string;
  concept: string;
  prompt: L;
  qubits: number;
  palette: GateType[];
  /** Exact probabilities the finished circuit must produce. */
  target: Record<string, number>;
  mustUse?: GateType[];
  mustNotUse?: GateType[];
  explanation: L;
}

export interface ConceptContent {
  id: TopicId;
  /** Shown on the Discover stage. */
  difficulty: L;
  whyItMatters: L;
  intuition: L;
  realWorld: L;
  objectives: L[];
  minutes: number;
  lesson: VisualLesson;
  sandbox: Sandbox;
  /** Explanations for learners who want state vectors, matrices and Dirac notation. */
  advanced: L[];
  /** Id of the rubric used in the Explain stage (data/explanations.ts). */
  explainRubric: string;
  assessment: {
    /** Knowledge items, one question each, chosen adaptively from data/quizzes.ts. */
    slots: string[];
    build: BuildTask;
    /** Rubric for the written item. */
    writeRubric: string;
  };
  /** Knowledge-base entry that states the concept's key idea. */
  keyIdea: string;
  meta: ContentMeta;
}

export interface CurriculumModule {
  number: string;
  title: string;
  /** Concepts taught in this module. Empty for modules that are planned but not built. */
  concepts: TopicId[];
}

// ---------------------------------------------------------------------------
// Course structure
// ---------------------------------------------------------------------------

export const CURRICULUM: {
  id: string;
  title: string;
  version: string;
  modules: CurriculumModule[];
} = {
  id: "quantum-foundations",
  title: "Quantum Foundations",
  version: "1.1",
  modules: [
    { number: "01", title: "Qubits", concepts: ["qubit"] },
    { number: "02", title: "Quantum Gates", concepts: ["gates"] },
    { number: "03", title: "Superposition & Measurement", concepts: ["superposition"] },
    { number: "04", title: "Entanglement", concepts: ["entanglement"] },
    { number: "05", title: "Quantum Circuits", concepts: [] },
    { number: "06", title: "Quantum Algorithms: Deutsch-Jozsa", concepts: [] },
    { number: "07", title: "Quantum Algorithms: Grover", concepts: [] },
    { number: "08", title: "Advanced Topics: Quantum Fourier Transform", concepts: [] },
  ],
};

// ---------------------------------------------------------------------------
// Concept content
// ---------------------------------------------------------------------------

const BEGINNER: L = { en: "Beginner — no background needed", hi: "Beginner — koi background nahi chahiye" };
const BEGINNER_PLUS: L = { en: "Beginner — builds on the last concept", hi: "Beginner — pichhle concept par build hota hai" };

export const CONCEPTS: Partial<Record<TopicId, ConceptContent>> = {
  // -------------------------------------------------------------------------
  qubit: {
    id: "qubit",
    difficulty: BEGINNER,
    minutes: 12,
    whyItMatters: {
      en: "Every quantum circuit and every quantum algorithm is built from qubits. Once you understand one qubit, the rest of this course is combinations of things you already know.",
      hi: "Har quantum circuit aur har quantum algorithm qubits se banta hai. Ek qubit samajh aa gaya to baaki course unhi cheezon ke combinations hain jo aap already jaante ho.",
    },
    intuition: {
      en: "A bit is a switch: off or on. A qubit holds a quantum state, which sets how likely each answer is — and reading it always gives a plain 0 or 1.",
      hi: "Bit ek switch hai: off ya on. Qubit ek quantum state hold karta hai, jo decide karta hai ki har answer kitna likely hai — aur read karne par hamesha plain 0 ya 1 milta hai.",
    },
    realWorld: {
      en: "Real qubits are built from superconducting circuits, trapped ions or single photons. Researchers use them to study chemistry, optimisation and secure communication.",
      hi: "Real qubits superconducting circuits, trapped ions ya single photons se bante hain. Researchers inhe chemistry, optimisation aur secure communication study karne ke liye use karte hain.",
    },
    objectives: [
      { en: "What a qubit represents, and how it differs from a bit", hi: "Qubit kya represent karta hai, aur bit se kaise alag hai" },
      { en: "How to read |0⟩ and |1⟩", hi: "|0⟩ aur |1⟩ ko kaise read karte hain" },
      { en: "How a state gives each answer a probability", hi: "State har answer ko probability kaise deta hai" },
      { en: "What a measurement returns", hi: "Measurement kya return karta hai" },
    ],
    lesson: {
      title: { en: "One qubit, from start to measurement", hi: "Ek qubit, start se measurement tak" },
      videoUrl: null,
      qubits: 1,
      scenes: [
        {
          id: "start",
          title: { en: "Every qubit starts in |0⟩", hi: "Har qubit |0⟩ se start hota hai" },
          caption: {
            en: "The arrow shows the qubit's state. Pointing up means |0⟩. If you measured now you would get 0 every single time.",
            hi: "Arrow qubit ka state dikhata hai. Upar point karna matlab |0⟩. Abhi measure karo to har baar 0 hi milega.",
          },
          gates: [],
          seconds: 7,
        },
        {
          id: "flip",
          title: { en: "A gate changes the state", hi: "Gate state ko change karta hai" },
          caption: {
            en: "The X gate flips the arrow to the bottom: |1⟩. Now a measurement gives 1 every time. So far a qubit behaves like a bit.",
            hi: "X gate arrow ko neeche flip kar deta hai: |1⟩. Ab measurement har baar 1 deta hai. Abhi tak qubit bit ki tarah behave karta hai.",
          },
          gates: [["X", 0, 0]],
          seconds: 8,
        },
        {
          id: "between",
          title: { en: "A state can sit between |0⟩ and |1⟩", hi: "State |0⟩ aur |1⟩ ke beech bhi ho sakta hai" },
          caption: {
            en: "Here the arrow lies on the equator. The state is a combination of |0⟩ and |1⟩, and it gives each answer a probability — here 50% each. This is what a bit cannot do.",
            hi: "Yahan arrow equator par hai. State |0⟩ aur |1⟩ ka combination hai, aur har answer ko ek probability deta hai — yahan 50% each. Bit yeh nahi kar sakta.",
          },
          gates: [["H", 0, 0]],
          seconds: 9,
        },
        {
          id: "measure",
          title: { en: "Measurement gives one answer", hi: "Measurement ek answer deta hai" },
          caption: {
            en: "Each run returns one plain 0 or 1. Only many runs reveal the probabilities, which is why the counts are close to 50% and not exactly 50%.",
            hi: "Har run ek plain 0 ya 1 return karta hai. Probabilities kai runs ke baad hi dikhti hain, isliye counts 50% ke paas hote hain, exactly 50% nahi.",
          },
          gates: [
            ["H", 0, 0],
            ["M", 0, 1],
          ],
          shots: 200,
          seconds: 10,
        },
      ],
    },
    sandbox: {
      qubits: 1,
      chooseStart: false,
      intro: {
        en: "Press a gate and watch the state change. Nothing is measured here — you are looking straight at the state. Reach all three goals.",
        hi: "Gate dabao aur state ko change hote dekho. Yahan kuch measure nahi hota — aap seedha state dekh rahe ho. Teeno goals reach karo.",
      },
      ops: [
        { id: "x", label: "X", gate: "X", qubit: 0 },
        { id: "h", label: "H", gate: "H", qubit: 0 },
      ],
      goals: [
        {
          id: "certain-one",
          text: { en: "Make the qubit certain to measure 1.", hi: "Qubit ko aisa banao ki 1 measure hona certain ho." },
          probabilities: { "0": 0, "1": 1 },
          insight: { en: "X flips |0⟩ to |1⟩ — a definite state.", hi: "X |0⟩ ko |1⟩ mein flip karta hai — definite state." },
        },
        {
          id: "back-to-zero",
          text: {
            en: "Bring it back to a certain 0, using at least two gates.",
            hi: "Kam se kam do gates use karke ise wapas certain 0 par lao.",
          },
          probabilities: { "0": 1, "1": 0 },
          minGates: 2,
          insight: { en: "Gates can be undone.", hi: "Gates undo ho sakte hain." },
        },
        {
          id: "equal",
          text: {
            en: "Find a state where 0 and 1 are equally likely.",
            hi: "Aisa state dhoondo jahan 0 aur 1 equally likely hon.",
          },
          probabilities: { "0": 0.5, "1": 0.5 },
          insight: {
            en: "A state can give each answer a probability. You will meet this gate, H, properly in the next concepts.",
            hi: "State har answer ko ek probability de sakta hai. Is gate, H, se aap next concepts mein properly miloge.",
          },
        },
      ],
    },
    advanced: [
      {
        en: "A qubit's state is |ψ⟩ = α|0⟩ + β|1⟩. α and β are complex numbers called amplitudes, with |α|² + |β|² = 1.",
        hi: "Qubit ka state |ψ⟩ = α|0⟩ + β|1⟩ hota hai. α aur β complex numbers hain jinhe amplitudes kehte hain, aur |α|² + |β|² = 1.",
      },
      {
        en: "An amplitude is not a probability. P(0) = |α|² and P(1) = |β|². An amplitude of 1/√2 means a probability of 1/2.",
        hi: "Amplitude probability nahi hai. P(0) = |α|² aur P(1) = |β|². 1/√2 amplitude ka matlab 1/2 probability.",
      },
      {
        en: "On the Bloch sphere the same state is written cos(θ/2)|0⟩ + e^{iφ}·sin(θ/2)|1⟩: θ is the angle from the north pole and φ is the phase.",
        hi: "Bloch sphere par wahi state cos(θ/2)|0⟩ + e^{iφ}·sin(θ/2)|1⟩ likha jaata hai: θ north pole se angle hai aur φ phase hai.",
      },
    ],
    explainRubric: "qubit-explain",
    assessment: {
      slots: ["Bit vs qubit", "Ket notation", "Measurement", "Probability"],
      build: {
        id: "qubit-build",
        concept: "Building a circuit",
        prompt: {
          en: "Build a circuit that measures 1 every time.",
          hi: "Aisa circuit banao jo har baar 1 measure kare.",
        },
        qubits: 1,
        palette: ["X", "H", "M"],
        target: { "0": 0, "1": 1 },
        explanation: {
          en: "X flips |0⟩ to |1⟩, a definite state, and M then reads 1 every time. An odd number of X gates works too.",
          hi: "X |0⟩ ko |1⟩ mein flip karta hai, jo definite state hai, aur phir M har baar 1 read karta hai. Odd number of X gates bhi kaam karte hain.",
        },
      },
      writeRubric: "qubit-write",
    },
    keyIdea: "qubit-basics",
    meta: VERIFIED,
  },

  // -------------------------------------------------------------------------
  gates: {
    id: "gates",
    difficulty: BEGINNER_PLUS,
    minutes: 14,
    whyItMatters: {
      en: "Gates are the only way to change a qubit. Every quantum algorithm, however famous, is a sequence of gates followed by measurement.",
      hi: "Gates hi qubit ko change karne ka ek-matra tareeka hain. Har quantum algorithm, chahe kitna bhi famous ho, gates ka sequence hai jiske baad measurement hota hai.",
    },
    intuition: {
      en: "Picture the state as an arrow on a sphere. Every single-qubit gate turns that arrow. Some turns change what you will measure; others change only the phase.",
      hi: "State ko sphere par ek arrow ki tarah socho. Har single-qubit gate us arrow ko ghumata hai. Kuch turns measurement ka result change karte hain; kuch sirf phase change karte hain.",
    },
    realWorld: {
      en: "On real devices a gate is a carefully shaped microwave or laser pulse. On superconducting chips such a pulse lasts only tens of billionths of a second.",
      hi: "Real devices par gate ek carefully shaped microwave ya laser pulse hota hai. Superconducting chips par aisa pulse sirf kuch tens of billionths of a second tak chalta hai.",
    },
    objectives: [
      { en: "What X, H, Y and Z do to a qubit", hi: "X, H, Y aur Z qubit ke saath kya karte hain" },
      {
        en: "The difference between changing a probability and changing a phase",
        hi: "Probability change karne aur phase change karne mein difference",
      },
      { en: "How to read a circuit from left to right", hi: "Circuit ko left se right kaise read karte hain" },
      { en: "Why gates can be undone", hi: "Gates undo kyun ho sakte hain" },
    ],
    lesson: {
      title: { en: "Gates turn the arrow", hi: "Gates arrow ko ghumate hain" },
      videoUrl: null,
      qubits: 1,
      scenes: [
        {
          id: "start",
          title: { en: "Start at |0⟩", hi: "|0⟩ se start" },
          caption: {
            en: "A gate is an operation on the state. Watch the arrow as each gate is applied.",
            hi: "Gate state par ek operation hai. Har gate apply hote hi arrow ko dekho.",
          },
          gates: [],
          seconds: 6,
        },
        {
          id: "x",
          title: { en: "X flips", hi: "X flip karta hai" },
          caption: {
            en: "X is the quantum NOT: |0⟩ becomes |1⟩. The measurement result changes from 0 to 1.",
            hi: "X quantum NOT hai: |0⟩ ban jaata hai |1⟩. Measurement result 0 se 1 ho jaata hai.",
          },
          gates: [["X", 0, 0]],
          seconds: 7,
        },
        {
          id: "xx",
          title: { en: "X again undoes it", hi: "X dobara lagao to undo" },
          caption: {
            en: "A second X flips the arrow back. Quantum gates are reversible — measurement is the only step that cannot be undone.",
            hi: "Doosra X arrow ko wapas flip kar deta hai. Quantum gates reversible hote hain — sirf measurement undo nahi hota.",
          },
          gates: [
            ["X", 0, 0],
            ["X", 0, 1],
          ],
          seconds: 8,
        },
        {
          id: "h",
          title: { en: "H goes to the equator", hi: "H equator par le jaata hai" },
          caption: {
            en: "H turns the arrow to the equator: an equal superposition, 50% for each answer.",
            hi: "H arrow ko equator par le jaata hai: equal superposition, har answer ke liye 50%.",
          },
          gates: [["H", 0, 0]],
          seconds: 8,
        },
        {
          id: "hz",
          title: { en: "Z changes only the phase", hi: "Z sirf phase change karta hai" },
          caption: {
            en: "Z turns the arrow around the vertical axis. The arrow moves, but the bars do not: the probabilities are still 50/50.",
            hi: "Z arrow ko vertical axis ke around ghumata hai. Arrow move hota hai, lekin bars nahi: probabilities abhi bhi 50/50 hain.",
          },
          gates: [
            ["H", 0, 0],
            ["Z", 0, 1],
          ],
          seconds: 9,
        },
        {
          id: "hzh",
          title: { en: "A second H reveals the phase", hi: "Doosra H phase reveal karta hai" },
          caption: {
            en: "Add another H and the hidden phase becomes a visible result: now you measure 1 every time. Phase is real.",
            hi: "Ek aur H lagao to hidden phase visible result ban jaata hai: ab har baar 1 measure hota hai. Phase real hai.",
          },
          gates: [
            ["H", 0, 0],
            ["Z", 0, 1],
            ["H", 0, 2],
          ],
          seconds: 9,
        },
      ],
    },
    sandbox: {
      qubits: 1,
      chooseStart: false,
      intro: {
        en: "Six gates, one qubit. Watch which gates move the bars and which only move the arrow.",
        hi: "Chhe gates, ek qubit. Dekho kaunse gates bars ko move karte hain aur kaunse sirf arrow ko.",
      },
      ops: [
        { id: "h", label: "H", gate: "H", qubit: 0 },
        { id: "x", label: "X", gate: "X", qubit: 0 },
        { id: "y", label: "Y", gate: "Y", qubit: 0 },
        { id: "z", label: "Z", gate: "Z", qubit: 0 },
        { id: "s", label: "S", gate: "S", qubit: 0 },
        { id: "t", label: "T", gate: "T", qubit: 0 },
      ],
      goals: [
        {
          id: "flip-without-x",
          text: {
            en: "Flip the qubit to a certain 1 without using X.",
            hi: "X use kiye bina qubit ko certain 1 par flip karo.",
          },
          probabilities: { "0": 0, "1": 1 },
          mustNotUse: ["X"],
          insight: {
            en: "Y flips too — and so does H, Z, H. There is more than one route to the same result.",
            hi: "Y bhi flip karta hai — aur H, Z, H bhi. Same result tak ek se zyada raaste hain.",
          },
        },
        {
          id: "phase-only",
          text: {
            en: "Create a superposition with H, then change only its phase: the arrow moves but the bars stay 50/50.",
            hi: "H se superposition banao, phir sirf uska phase change karo: arrow move ho lekin bars 50/50 rahein.",
          },
          probabilities: { "0": 0.5, "1": 0.5 },
          mustUse: ["H"],
          mustUseAny: ["Z", "S", "T"],
          insight: {
            en: "Z, S and T are phase gates. They change the state without changing the measurement probabilities.",
            hi: "Z, S aur T phase gates hain. Yeh measurement probabilities change kiye bina state change karte hain.",
          },
        },
        {
          id: "undo",
          text: {
            en: "Return to a certain 0 after applying at least two gates.",
            hi: "Kam se kam do gates lagane ke baad wapas certain 0 par aao.",
          },
          probabilities: { "0": 1, "1": 0 },
          minGates: 2,
          insight: {
            en: "X, Y, Z and H each undo themselves when applied twice.",
            hi: "X, Y, Z aur H do baar lagane par khud ko undo kar dete hain.",
          },
        },
      ],
    },
    advanced: [
      {
        en: "Gates are 2×2 matrices: X = [[0, 1], [1, 0]], Z = [[1, 0], [0, −1]], H = (1/√2)·[[1, 1], [1, −1]], S = [[1, 0], [0, i]], T = [[1, 0], [0, e^{iπ/4}]].",
        hi: "Gates 2×2 matrices hote hain: X = [[0, 1], [1, 0]], Z = [[1, 0], [0, −1]], H = (1/√2)·[[1, 1], [1, −1]], S = [[1, 0], [0, i]], T = [[1, 0], [0, e^{iπ/4}]].",
      },
      {
        en: "Every gate is unitary: U†U = I. That is the mathematical reason every gate can be undone.",
        hi: "Har gate unitary hota hai: U†U = I. Yahi mathematical reason hai ki har gate undo ho sakta hai.",
      },
      {
        en: "T·T = S and S·S = Z. On the Bloch sphere X, Y and Z are half-turns around their own axes.",
        hi: "T·T = S aur S·S = Z. Bloch sphere par X, Y aur Z apne-apne axis ke around half-turns hain.",
      },
    ],
    explainRubric: "gates-explain",
    assessment: {
      slots: ["X gate", "H gate", "Z gate", "Y gate"],
      build: {
        id: "gates-build",
        concept: "Building a circuit",
        prompt: {
          en: "Build a circuit that measures 1 every time — without using the X gate.",
          hi: "Aisa circuit banao jo har baar 1 measure kare — X gate use kiye bina.",
        },
        qubits: 1,
        palette: ["H", "X", "Y", "Z", "S", "T", "M"],
        target: { "0": 0, "1": 1 },
        mustNotUse: ["X"],
        explanation: {
          en: "Y flips |0⟩ to |1⟩ (with a phase you cannot see here). H, Z, H works as well: the Z phase flip becomes a visible flip after the second H.",
          hi: "Y |0⟩ ko |1⟩ mein flip karta hai (ek phase ke saath jo yahan dikhta nahi). H, Z, H bhi kaam karta hai: Z ka phase flip doosre H ke baad visible flip ban jaata hai.",
        },
      },
      writeRubric: "gates-write",
    },
    keyIdea: "phase-basics",
    meta: VERIFIED,
  },

  // -------------------------------------------------------------------------
  superposition: {
    id: "superposition",
    difficulty: BEGINNER_PLUS,
    minutes: 15,
    whyItMatters: {
      en: "Superposition is the idea that makes quantum computing different. Quantum algorithms put qubits into superposition and then make the parts interfere so that right answers add up and wrong ones cancel.",
      hi: "Superposition woh idea hai jo quantum computing ko alag banata hai. Quantum algorithms qubits ko superposition mein daalte hain aur phir parts ko interfere karate hain taaki right answers add hon aur wrong ones cancel.",
    },
    intuition: {
      en: "A superposition is a quantum state written as a combination of |0⟩ and |1⟩. It is not a hidden 0 or 1: the amplitudes of the combination decide the measurement probabilities.",
      hi: "Superposition ek quantum state hai jo |0⟩ aur |1⟩ ke combination ki tarah likha jaata hai. Yeh hidden 0 ya 1 nahi hai: combination ke amplitudes measurement probabilities decide karte hain.",
    },
    realWorld: {
      en: "Grover's search and the Deutsch-Jozsa algorithm both begin by putting their qubits into superposition with H gates.",
      hi: "Grover's search aur Deutsch-Jozsa algorithm dono apne qubits ko H gates se superposition mein daalkar start hote hain.",
    },
    objectives: [
      { en: "What superposition means — and what it does not mean", hi: "Superposition ka matlab kya hai — aur kya nahi hai" },
      { en: "How the H gate creates a superposition", hi: "H gate superposition kaise banata hai" },
      { en: "How measurement turns a state into probabilities", hi: "Measurement state ko probabilities mein kaise badalta hai" },
      {
        en: "Why results are close to 50%, not exactly 50%",
        hi: "Results 50% ke paas kyun hote hain, exactly 50% kyun nahi",
      },
    ],
    lesson: {
      title: { en: "From |0⟩ to a measurement", hi: "|0⟩ se measurement tak" },
      videoUrl: null,
      qubits: 1,
      scenes: [
        {
          id: "start",
          title: { en: "A definite start", hi: "Definite start" },
          caption: {
            en: "The qubit starts in |0⟩. The arrow points up and a measurement would give 0 with certainty.",
            hi: "Qubit |0⟩ se start hota hai. Arrow upar hai aur measurement certainly 0 dega.",
          },
          gates: [],
          seconds: 6,
        },
        {
          id: "h",
          title: { en: "H creates the superposition", hi: "H superposition banata hai" },
          caption: {
            en: "H turns the arrow to the equator. The state is now a combination of |0⟩ and |1⟩ with equal amplitudes, so each result has probability 1/2. Nothing has been measured yet.",
            hi: "H arrow ko equator par le jaata hai. State ab |0⟩ aur |1⟩ ka equal amplitudes wala combination hai, isliye har result ki probability 1/2 hai. Abhi kuch measure nahi hua.",
          },
          gates: [["H", 0, 0]],
          seconds: 10,
        },
        {
          id: "measure",
          title: { en: "Measurement: one answer per run", hi: "Measurement: har run mein ek answer" },
          caption: {
            en: "Each run gives a single 0 or 1 and ends the superposition. Watch the counts build up: they settle near 50%, but a finite sample is almost never exactly 50%. That is sampling variation, not an error.",
            hi: "Har run ek single 0 ya 1 deta hai aur superposition khatam kar deta hai. Counts ko build hote dekho: woh 50% ke paas settle hote hain, lekin finite sample almost kabhi exactly 50% nahi hota. Yeh sampling variation hai, error nahi.",
          },
          gates: [
            ["H", 0, 0],
            ["M", 0, 1],
          ],
          shots: 300,
          seconds: 11,
        },
        {
          id: "hh",
          title: { en: "H twice: not a coin flip", hi: "H do baar: coin flip nahi" },
          caption: {
            en: "Skip the measurement and apply H again. The arrow returns to |0⟩. If superposition were a hidden coin flip, this would still be 50/50 — instead the two paths interfere and |1⟩ cancels.",
            hi: "Measurement skip karo aur H dobara lagao. Arrow wapas |0⟩ par aa jaata hai. Agar superposition hidden coin flip hota, to yeh abhi bhi 50/50 hota — lekin dono paths interfere karte hain aur |1⟩ cancel ho jaata hai.",
          },
          gates: [
            ["H", 0, 0],
            ["H", 0, 1],
          ],
          seconds: 11,
        },
      ],
    },
    sandbox: {
      qubits: 1,
      chooseStart: true,
      intro: {
        en: "Create a superposition, undo it, and try it from the other starting state.",
        hi: "Superposition banao, use undo karo, aur doosre starting state se bhi try karo.",
      },
      ops: [
        { id: "h", label: "H", gate: "H", qubit: 0 },
        { id: "x", label: "X", gate: "X", qubit: 0 },
        { id: "z", label: "Z", gate: "Z", qubit: 0 },
      ],
      goals: [
        {
          id: "make",
          text: {
            en: "Starting from |0⟩, create an equal superposition.",
            hi: "|0⟩ se start karke equal superposition banao.",
          },
          probabilities: { "0": 0.5, "1": 0.5 },
          start: 0,
          mustUse: ["H"],
          insight: {
            en: "H|0⟩ gives each result a probability of 1/2.",
            hi: "H|0⟩ har result ko 1/2 probability deta hai.",
          },
        },
        {
          id: "undo",
          text: {
            en: "Use H at least twice and end on a certain 0.",
            hi: "H kam se kam do baar use karo aur certain 0 par end karo.",
          },
          probabilities: { "0": 1, "1": 0 },
          start: 0,
          mustUse: ["H"],
          minGates: 2,
          insight: {
            en: "The second H undoes the first: the two paths to |1⟩ cancel. A coin flip cannot be un-flipped like this.",
            hi: "Doosra H pehle ko undo karta hai: |1⟩ ke dono raaste cancel ho jaate hain. Coin flip aise un-flip nahi ho sakta.",
          },
        },
        {
          id: "from-one",
          text: {
            en: "Start from |1⟩ and create an equal superposition.",
            hi: "|1⟩ se start karo aur equal superposition banao.",
          },
          probabilities: { "0": 0.5, "1": 0.5 },
          start: 1,
          mustUse: ["H"],
          insight: {
            en: "H|1⟩ is also 50/50, but the arrow points the opposite way: same probabilities, different state.",
            hi: "H|1⟩ bhi 50/50 hai, lekin arrow opposite side point karta hai: same probabilities, alag state.",
          },
        },
      ],
    },
    advanced: [
      {
        en: "H|0⟩ = (|0⟩ + |1⟩)/√2 = |+⟩ and H|1⟩ = (|0⟩ − |1⟩)/√2 = |−⟩. Both give 50/50; the minus sign is a relative phase.",
        hi: "H|0⟩ = (|0⟩ + |1⟩)/√2 = |+⟩ aur H|1⟩ = (|0⟩ − |1⟩)/√2 = |−⟩. Dono 50/50 dete hain; minus sign relative phase hai.",
      },
      {
        en: "Interference: H·H|0⟩ = ½(|0⟩ + |1⟩) + ½(|0⟩ − |1⟩) = |0⟩. The |1⟩ amplitudes are +½ and −½ and cancel.",
        hi: "Interference: H·H|0⟩ = ½(|0⟩ + |1⟩) + ½(|0⟩ − |1⟩) = |0⟩. |1⟩ ke amplitudes +½ aur −½ hain aur cancel ho jaate hain.",
      },
      {
        en: "With N shots the observed fraction typically differs from p by about √(p(1−p)/N): 1.6% for p = 0.5 and N = 1,024.",
        hi: "N shots mein observed fraction p se typically lagbhag √(p(1−p)/N) differ karta hai: p = 0.5 aur N = 1,024 ke liye 1.6%.",
      },
    ],
    explainRubric: "superposition-explain",
    assessment: {
      slots: ["Superposition", "Measurement", "Interference", "Probability"],
      build: {
        id: "superposition-build",
        concept: "Building a circuit",
        prompt: {
          en: "Build a circuit that uses the H gate and still measures 0 every time.",
          hi: "Aisa circuit banao jo H gate use kare aur phir bhi har baar 0 measure kare.",
        },
        qubits: 1,
        palette: ["H", "X", "Z", "M"],
        target: { "0": 1, "1": 0 },
        mustUse: ["H"],
        explanation: {
          en: "H followed by H returns the qubit to |0⟩: the second H makes the two paths interfere, so the |1⟩ result cancels.",
          hi: "H ke baad H qubit ko wapas |0⟩ bana deta hai: doosra H dono paths ko interfere karata hai, isliye |1⟩ result cancel ho jaata hai.",
        },
      },
      writeRubric: "superposition-write",
    },
    keyIdea: "superposition-basics",
    meta: VERIFIED,
  },

  // -------------------------------------------------------------------------
  entanglement: {
    id: "entanglement",
    difficulty: BEGINNER_PLUS,
    minutes: 15,
    whyItMatters: {
      en: "Entanglement links qubits in a way no classical system can copy. It is the resource behind quantum teleportation, error correction and most quantum speed-ups.",
      hi: "Entanglement qubits ko aise link karta hai jaise koi classical system copy nahi kar sakta. Quantum teleportation, error correction aur zyada-tar quantum speed-ups ke peeche yahi resource hai.",
    },
    intuition: {
      en: "Two entangled qubits share one joint state. Each qubit on its own looks random, but the pair as a whole is perfectly organised.",
      hi: "Do entangled qubits ek joint state share karte hain. Har qubit akele random lagta hai, lekin pair as a whole perfectly organised hota hai.",
    },
    realWorld: {
      en: "Entangled photons are used in quantum key distribution experiments, including links between ground stations and satellites.",
      hi: "Entangled photons quantum key distribution experiments mein use hote hain, jisme ground stations aur satellites ke beech ke links bhi shaamil hain.",
    },
    objectives: [
      { en: "What the two-qubit CX gate does", hi: "Two-qubit CX gate kya karta hai" },
      { en: "How H followed by CX creates a Bell pair", hi: "H ke baad CX se Bell pair kaise banta hai" },
      { en: "Why entangled results are random yet always linked", hi: "Entangled results random hote hue bhi hamesha linked kyun hote hain" },
      {
        en: "Why entanglement cannot send a message faster than light",
        hi: "Entanglement se light se faster message kyun nahi bheja ja sakta",
      },
    ],
    lesson: {
      title: { en: "Building a Bell pair", hi: "Bell pair banana" },
      videoUrl: null,
      qubits: 2,
      scenes: [
        {
          id: "start",
          title: { en: "Two qubits, both |0⟩", hi: "Do qubits, dono |0⟩" },
          caption: {
            en: "Results are written |q0 q1⟩. Right now only |00⟩ is possible.",
            hi: "Results |q0 q1⟩ ki tarah likhe jaate hain. Abhi sirf |00⟩ possible hai.",
          },
          gates: [],
          seconds: 6,
        },
        {
          id: "h",
          title: { en: "H on q0", hi: "q0 par H" },
          caption: {
            en: "q0 is now in superposition, q1 is still |0⟩. The two possible results are |00⟩ and |10⟩. The qubits are not linked yet.",
            hi: "q0 ab superposition mein hai, q1 abhi bhi |0⟩ hai. Do possible results |00⟩ aur |10⟩ hain. Qubits abhi linked nahi hain.",
          },
          gates: [["H", 0, 0]],
          seconds: 9,
        },
        {
          id: "cx",
          title: { en: "CX links them", hi: "CX unhe link karta hai" },
          caption: {
            en: "CX flips q1 only in the part where q0 is 1. Now only |00⟩ and |11⟩ are possible. Each qubit's own arrow has shrunk to a dot: neither has a state of its own any more.",
            hi: "CX q1 ko sirf us part mein flip karta hai jahan q0 1 hai. Ab sirf |00⟩ aur |11⟩ possible hain. Har qubit ka apna arrow shrink hokar dot ban gaya hai: ab kisi ka apna alag state nahi hai.",
          },
          gates: [
            ["H", 0, 0],
            ["CX", 0, 1, 1],
          ],
          seconds: 11,
        },
        {
          id: "measure",
          title: { en: "Random, but always matching", hi: "Random, lekin hamesha matching" },
          caption: {
            en: "Each run gives 00 or 11 at random. q0 alone is 50/50 and so is q1 — so nothing can be signalled — yet the two always agree.",
            hi: "Har run randomly 00 ya 11 deta hai. q0 akele 50/50 hai aur q1 bhi — isliye koi signal nahi bheja ja sakta — phir bhi dono hamesha agree karte hain.",
          },
          gates: [
            ["H", 0, 0],
            ["CX", 0, 1, 1],
            ["M", 0, 2],
            ["M", 1, 2],
          ],
          shots: 300,
          seconds: 11,
        },
      ],
    },
    sandbox: {
      qubits: 2,
      chooseStart: false,
      intro: {
        en: "Two qubits and one two-qubit gate. Results are written |q0 q1⟩.",
        hi: "Do qubits aur ek two-qubit gate. Results |q0 q1⟩ ki tarah likhe jaate hain.",
      },
      ops: [
        { id: "h0", label: "H on q0", gate: "H", qubit: 0 },
        { id: "x0", label: "X on q0", gate: "X", qubit: 0 },
        { id: "x1", label: "X on q1", gate: "X", qubit: 1 },
        { id: "cx", label: "CX q0→q1", gate: "CX", qubit: 0, target: 1 },
      ],
      goals: [
        {
          id: "flip-with-cx",
          text: {
            en: "Make |11⟩ certain, using CX to flip q1.",
            hi: "CX se q1 ko flip karke |11⟩ ko certain banao.",
          },
          probabilities: { "00": 0, "01": 0, "10": 0, "11": 1 },
          mustUse: ["CX"],
          insight: {
            en: "With a definite |1⟩ on the control, CX simply flips the target. No randomness, no entanglement.",
            hi: "Control par definite |1⟩ ho to CX bas target ko flip karta hai. Na randomness, na entanglement.",
          },
        },
        {
          id: "bell",
          text: {
            en: "Create a Bell pair: only |00⟩ and |11⟩, half each.",
            hi: "Bell pair banao: sirf |00⟩ aur |11⟩, aadha-aadha.",
          },
          probabilities: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
          mustUse: ["H", "CX"],
          insight: {
            en: "CX needs a superposition on the control to create a link.",
            hi: "Link banane ke liye CX ko control par superposition chahiye.",
          },
        },
        {
          id: "disagree",
          text: {
            en: "Make the two qubits always disagree: only |01⟩ and |10⟩.",
            hi: "Dono qubits ko hamesha disagree karao: sirf |01⟩ aur |10⟩.",
          },
          probabilities: { "00": 0, "01": 0.5, "10": 0.5, "11": 0 },
          mustUse: ["H", "CX"],
          insight: {
            en: "Entangled results can be linked as 'always different' too. The link is the point, not the sameness.",
            hi: "Entangled results 'always different' ki tarah bhi linked ho sakte hain. Point link hai, sameness nahi.",
          },
        },
      ],
    },
    advanced: [
      {
        en: "The Bell state is |Φ⁺⟩ = (|00⟩ + |11⟩)/√2. It cannot be factored into (state of q0) ⊗ (state of q1) — that is the definition of entangled.",
        hi: "Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 hai. Ise (q0 ka state) ⊗ (q1 ka state) mein factor nahi kiya ja sakta — yahi entangled ki definition hai.",
      },
      {
        en: "CX = |0⟩⟨0| ⊗ I + |1⟩⟨1| ⊗ X. Applied to (|0⟩ + |1⟩)/√2 ⊗ |0⟩ it gives (|00⟩ + |11⟩)/√2.",
        hi: "CX = |0⟩⟨0| ⊗ I + |1⟩⟨1| ⊗ X. (|0⟩ + |1⟩)/√2 ⊗ |0⟩ par apply karne se (|00⟩ + |11⟩)/√2 milta hai.",
      },
      {
        en: "Each qubit of a Bell pair, taken alone, is in a maximally mixed state: its Bloch vector has length 0, which is why the lab shows a dot.",
        hi: "Bell pair ka har qubit akele maximally mixed state mein hota hai: uske Bloch vector ki length 0 hai, isliye lab dot dikhata hai.",
      },
    ],
    explainRubric: "entanglement-explain",
    assessment: {
      slots: ["CX gate", "Bell pair", "Linked results", "No signalling"],
      build: {
        id: "entanglement-build",
        concept: "Building a circuit",
        prompt: {
          en: "Build a Bell pair and measure both qubits: only |00⟩ and |11⟩, about half each.",
          hi: "Bell pair banao aur dono qubits measure karo: sirf |00⟩ aur |11⟩, lagbhag aadha-aadha.",
        },
        qubits: 2,
        palette: ["H", "X", "CX", "M"],
        target: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
        explanation: {
          en: "H on q0, then CX from q0 to q1, then M on both. H creates the superposition and CX ties q1 to it.",
          hi: "q0 par H, phir q0 se q1 par CX, phir dono par M. H superposition banata hai aur CX q1 ko usse tie kar deta hai.",
        },
      },
      writeRubric: "entanglement-write",
    },
    keyIdea: "entanglement-basics",
    meta: VERIFIED,
  },
};

export function conceptContent(topic: TopicId): ConceptContent | null {
  return CONCEPTS[topic] ?? null;
}
