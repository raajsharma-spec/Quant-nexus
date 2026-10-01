import type { GateType } from "@/lib/quantumSimulator";
import type { L, TopicId } from "@/lib/types";

/** A circuit written as [gate, qubit, step, target?] rows. */
export interface CircuitSpec {
  qubits: number;
  gates: Array<[GateType, number, number, number?]>;
}

export interface ChallengeOption {
  id: string;
  label: L;
}

export interface Challenge {
  id: string;
  topic: TopicId;
  title: L;
  question: L;
  circuit: CircuitSpec;
  /**
   * "auto" builds probability options straight from the circuit.
   * A list lets a challenge ask about the state in words instead.
   */
  options: "auto" | ChallengeOption[];
  correctId?: string;
  hint: L;
  /** Required challenges must be solved before the next topic unlocks. */
  required: boolean;
}

const UNSURE: ChallengeOption = {
  id: "unsure",
  label: { en: "Not sure yet — show me", hi: "Abhi sure nahi — dikhao" },
};

export const CHALLENGES: Challenge[] = [
  {
    id: "fresh-qubit",
    topic: "qubit",
    title: { en: "Measure a fresh qubit", hi: "Fresh qubit ko measure karo" },
    question: {
      en: "A qubit is measured straight away, with no gate before it. What will you see?",
      hi: "Ek qubit ko bina kisi gate ke seedha measure kiya jaata hai. Kya dikhega?",
    },
    circuit: { qubits: 1, gates: [["M", 0, 1]] },
    options: "auto",
    hint: {
      en: "Every qubit starts in |0⟩, and nothing has changed it.",
      hi: "Har qubit |0⟩ se start hota hai, aur yahan use kisi ne change nahi kiya.",
    },
    required: true,
  },
  {
    id: "x-on-zero",
    topic: "gates",
    title: { en: "Apply X to |0⟩", hi: "|0⟩ par X apply karo" },
    question: {
      en: "X is applied to |0⟩, then the qubit is measured. Predict the result.",
      hi: "|0⟩ par X apply hota hai, phir qubit measure hota hai. Result predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["X", 0, 0],
        ["M", 0, 1],
      ],
    },
    options: "auto",
    hint: {
      en: "X is the quantum NOT. What does NOT do to 0?",
      hi: "X quantum NOT hai. NOT 0 ke saath kya karta hai?",
    },
    required: true,
  },
  {
    id: "x-twice",
    topic: "gates",
    title: { en: "Apply X twice", hi: "X do baar apply karo" },
    question: {
      en: "X is applied twice in a row. Predict the final state.",
      hi: "X lagataar do baar apply hota hai. Final state predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["X", 0, 0],
        ["X", 0, 1],
        ["M", 0, 2],
      ],
    },
    options: [
      { id: "zero", label: { en: "|0⟩ — back where it started", hi: "|0⟩ — wapas wahin jahan se start hua" } },
      { id: "one", label: { en: "|1⟩ — flipped", hi: "|1⟩ — flipped" } },
      { id: "super", label: { en: "A superposition of |0⟩ and |1⟩", hi: "|0⟩ aur |1⟩ ka superposition" } },
      UNSURE,
    ],
    correctId: "zero",
    hint: {
      en: "Follow the qubit one gate at a time: |0⟩ → ? → ?",
      hi: "Qubit ko ek-ek gate follow karo: |0⟩ → ? → ?",
    },
    required: true,
  },
  {
    id: "z-on-zero",
    topic: "gates",
    title: { en: "Apply Z to |0⟩", hi: "|0⟩ par Z apply karo" },
    question: {
      en: "Z is applied to |0⟩, then the qubit is measured. Predict the result.",
      hi: "|0⟩ par Z apply hota hai, phir qubit measure hota hai. Result predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["Z", 0, 0],
        ["M", 0, 1],
      ],
    },
    options: "auto",
    hint: {
      en: "Z changes the phase of the |1⟩ part. How much |1⟩ is there in |0⟩?",
      hi: "Z sirf |1⟩ part ka phase change karta hai. |0⟩ mein |1⟩ kitna hai?",
    },
    required: false,
  },
  {
    id: "h-state",
    topic: "superposition",
    title: { en: "Apply H to |0⟩", hi: "|0⟩ par H apply karo" },
    question: {
      en: "H is applied to |0⟩. What state is the qubit in just before it is measured?",
      hi: "|0⟩ par H apply hota hai. Measurement se just pehle qubit kis state mein hai?",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["H", 0, 0],
        ["M", 0, 1],
      ],
    },
    options: [
      { id: "zero", label: { en: "Still a definite |0⟩", hi: "Abhi bhi definite |0⟩" } },
      { id: "one", label: { en: "A definite |1⟩", hi: "Definite |1⟩" } },
      {
        id: "super",
        label: { en: "An equal superposition of |0⟩ and |1⟩", hi: "|0⟩ aur |1⟩ ka equal superposition" },
      },
      UNSURE,
    ],
    correctId: "super",
    hint: {
      en: "H is the gate that creates a blend. Watch the result bars after you run it.",
      hi: "H woh gate hai jo blend banata hai. Run karne ke baad result bars dekho.",
    },
    required: true,
  },
  {
    id: "h-measure",
    topic: "superposition",
    title: { en: "Apply H and measure", hi: "H apply karo aur measure karo" },
    question: {
      en: "H is applied, then the qubit is measured many times. Predict the probability distribution.",
      hi: "H apply hota hai, phir qubit ko kai baar measure kiya jaata hai. Probability distribution predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["H", 0, 0],
        ["M", 0, 1],
      ],
    },
    options: "auto",
    hint: {
      en: "An equal superposition gives each answer the same chance.",
      hi: "Equal superposition mein dono answers ka chance same hota hai.",
    },
    required: true,
  },
  {
    id: "h-twice",
    topic: "superposition",
    title: { en: "Apply H twice", hi: "H do baar apply karo" },
    question: {
      en: "H is applied twice, then the qubit is measured. Predict the result.",
      hi: "H do baar apply hota hai, phir qubit measure hota hai. Result predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["H", 0, 0],
        ["H", 0, 1],
        ["M", 0, 2],
      ],
    },
    options: "auto",
    hint: {
      en: "Superposition is not a coin flip. A second H can undo the first.",
      hi: "Superposition coin flip nahi hai. Doosra H pehle wale ko undo kar sakta hai.",
    },
    required: false,
  },
  {
    id: "bell-pair",
    topic: "entanglement",
    title: { en: "Make a Bell pair", hi: "Bell pair banao" },
    question: {
      en: "H goes on q0, then CX with q0 as control and q1 as target. Both qubits are measured. Predict the results.",
      hi: "q0 par H lagta hai, phir CX jisme q0 control aur q1 target hai. Dono qubits measure hote hain. Results predict karo.",
    },
    circuit: {
      qubits: 2,
      gates: [
        ["H", 0, 0],
        ["CX", 0, 1, 1],
        ["M", 0, 2],
        ["M", 1, 2],
      ],
    },
    options: "auto",
    hint: {
      en: "CX copies q0's 0-or-1 onto q1. So what can q1 be when q0 is 0? When q0 is 1?",
      hi: "CX q0 ka 0-ya-1 q1 par copy karta hai. To q0 jab 0 hai tab q1 kya hoga? Aur jab 1 hai?",
    },
    required: true,
  },
  {
    id: "x-then-cx",
    topic: "entanglement",
    title: { en: "CX without superposition", hi: "Bina superposition ke CX" },
    question: {
      en: "X goes on q0, then CX with q0 as control and q1 as target. Predict the results.",
      hi: "q0 par X lagta hai, phir CX jisme q0 control aur q1 target hai. Results predict karo.",
    },
    circuit: {
      qubits: 2,
      gates: [
        ["X", 0, 0],
        ["CX", 0, 1, 1],
        ["M", 0, 2],
        ["M", 1, 2],
      ],
    },
    options: "auto",
    hint: {
      en: "After X, the control is a definite |1⟩. What does CX do when the control is |1⟩?",
      hi: "X ke baad control definite |1⟩ hai. Control |1⟩ ho to CX kya karta hai?",
    },
    required: false,
  },
];

export function challengesFor(topic: TopicId): Challenge[] {
  return CHALLENGES.filter((c) => c.topic === topic);
}

export function requiredChallenges(topic: TopicId): Challenge[] {
  return CHALLENGES.filter((c) => c.topic === topic && c.required);
}

export function findChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}
