import type { GateSpec } from "@/lib/quantumSimulator";
import type { L, TopicId } from "@/lib/types";

/** A circuit written as [gate, qubit, step, target?, extra?] rows. */
export interface CircuitSpec {
  qubits: number;
  gates: GateSpec[];
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
  /** 1 = warm-up · 2 = standard · 3 = stretch. Used to match a challenge to the learner. */
  difficulty: 1 | 2 | 3;
  /**
   * What the challenge exercises: assessment concepts (e.g. "Interference") and
   * misconception ids (e.g. "classical_randomness"). The Next Challenge stage
   * uses these to pick a challenge for the learner's weakest area.
   */
  targets: string[];
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
    difficulty: 1,
    targets: ["Measurement", "Bit vs qubit", "always_fifty_fifty", "qubit_extra_states"],
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
    difficulty: 1,
    targets: ["X gate", "always_fifty_fifty"],
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
    difficulty: 1,
    targets: ["X gate"],
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
    difficulty: 2,
    targets: ["Z gate", "phase_confusion"],
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
    difficulty: 1,
    targets: ["Superposition"],
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
    difficulty: 1,
    targets: ["Probability", "Measurement", "amplitude_is_probability", "variation_is_error", "measurement_passive"],
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
    difficulty: 2,
    targets: ["Interference", "classical_randomness"],
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
    difficulty: 2,
    targets: ["Bell pair", "randomness_no_structure"],
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
    difficulty: 2,
    targets: ["CX gate"],
  },
  {
    id: "x-three",
    topic: "qubit",
    title: { en: "Three flips", hi: "Teen flips" },
    question: {
      en: "X is applied three times in a row, then the qubit is measured. Predict the result.",
      hi: "X lagataar teen baar apply hota hai, phir qubit measure hota hai. Result predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["X", 0, 0],
        ["X", 0, 1],
        ["X", 0, 2],
        ["M", 0, 3],
      ],
    },
    options: "auto",
    hint: {
      en: "Follow the state one flip at a time. Is the final state definite?",
      hi: "State ko ek-ek flip follow karo. Kya final state definite hai?",
    },
    difficulty: 2,
    targets: ["Measurement", "Probability", "always_fifty_fifty"],
  },
  {
    id: "read-two-qubits",
    topic: "qubit",
    title: { en: "Read a two-qubit result", hi: "Two-qubit result read karo" },
    question: {
      en: "Only q1 is flipped with X, then both qubits are measured. Results are written |q0 q1⟩. Predict the result.",
      hi: "Sirf q1 ko X se flip kiya jaata hai, phir dono qubits measure hote hain. Results |q0 q1⟩ ki tarah likhe jaate hain. Result predict karo.",
    },
    circuit: {
      qubits: 2,
      gates: [
        ["X", 1, 0],
        ["M", 0, 1],
        ["M", 1, 1],
      ],
    },
    options: "auto",
    hint: {
      en: "q0 is written on the left. Which qubit was flipped?",
      hi: "q0 left par likha jaata hai. Kaunsa qubit flip hua?",
    },
    difficulty: 2,
    targets: ["Ket notation", "Bit vs qubit"],
  },
  {
    id: "y-on-zero",
    topic: "gates",
    title: { en: "Apply Y to |0⟩", hi: "|0⟩ par Y apply karo" },
    question: {
      en: "Y is applied to |0⟩, then the qubit is measured. Predict the result.",
      hi: "|0⟩ par Y apply hota hai, phir qubit measure hota hai. Result predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["Y", 0, 0],
        ["M", 0, 1],
      ],
    },
    options: "auto",
    hint: {
      en: "Y flips like X and adds a phase. Does a phase change what you measure here?",
      hi: "Y X ki tarah flip karta hai aur phase add karta hai. Kya phase yahan measurement change karta hai?",
    },
    difficulty: 2,
    targets: ["Y gate", "always_fifty_fifty"],
  },
  {
    id: "x-then-h",
    topic: "gates",
    title: { en: "H after X", hi: "X ke baad H" },
    question: {
      en: "X flips the qubit to |1⟩, then H is applied, then it is measured. Predict the result.",
      hi: "X qubit ko |1⟩ par flip karta hai, phir H apply hota hai, phir measure. Result predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["X", 0, 0],
        ["H", 0, 1],
        ["M", 0, 2],
      ],
    },
    options: "auto",
    hint: {
      en: "H creates an equal superposition from |0⟩. What does it do from |1⟩?",
      hi: "H |0⟩ se equal superposition banata hai. |1⟩ se kya karta hai?",
    },
    difficulty: 2,
    targets: ["H gate"],
  },
  {
    id: "h-z-h",
    topic: "gates",
    title: { en: "Reveal a hidden phase", hi: "Hidden phase reveal karo" },
    question: {
      en: "H, then Z, then H, then measure. Predict the result.",
      hi: "H, phir Z, phir H, phir measure. Result predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["H", 0, 0],
        ["Z", 0, 1],
        ["H", 0, 2],
        ["M", 0, 3],
      ],
    },
    options: "auto",
    hint: {
      en: "Without the Z, two H gates return |0⟩. Z flips the sign of the |1⟩ part in between. What does that do to the interference?",
      hi: "Z ke bina do H gates |0⟩ return karte hain. Beech mein Z |1⟩ part ka sign flip karta hai. Isse interference par kya asar hota hai?",
    },
    difficulty: 3,
    targets: ["Z gate", "phase_confusion", "Interference"],
  },
  {
    id: "h-on-one",
    topic: "superposition",
    title: { en: "H starting from |1⟩", hi: "|1⟩ se start karke H" },
    question: {
      en: "Start with |1⟩ (an X gate), apply H, and measure many times. Predict the measurement distribution.",
      hi: "|1⟩ se start karo (X gate), H apply karo, aur kai baar measure karo. Measurement distribution predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["X", 0, 0],
        ["H", 0, 1],
        ["M", 0, 2],
      ],
    },
    options: "auto",
    hint: {
      en: "H|1⟩ differs from H|0⟩ only by a minus sign on the |1⟩ part. Does a sign change a probability?",
      hi: "H|1⟩ aur H|0⟩ mein sirf |1⟩ part par minus sign ka difference hai. Kya sign se probability change hoti hai?",
    },
    difficulty: 2,
    targets: ["Superposition", "Measurement", "amplitude_is_probability"],
  },
  {
    id: "h-then-z",
    topic: "superposition",
    title: { en: "A phase you cannot see", hi: "Phase jo dikhta nahi" },
    question: {
      en: "H, then Z, then measure. Predict the measurement distribution.",
      hi: "H, phir Z, phir measure. Measurement distribution predict karo.",
    },
    circuit: {
      qubits: 1,
      gates: [
        ["H", 0, 0],
        ["Z", 0, 1],
        ["M", 0, 2],
      ],
    },
    options: "auto",
    hint: {
      en: "Z changes the sign of the |1⟩ part, not its size. Probabilities depend on the size.",
      hi: "Z |1⟩ part ka sign change karta hai, size nahi. Probabilities size par depend karti hain.",
    },
    difficulty: 3,
    targets: ["Probability", "Measurement", "variation_is_error", "measurement_passive"],
  },
  {
    id: "cx-control-zero",
    topic: "entanglement",
    title: { en: "CX with the control at |0⟩", hi: "Control |0⟩ par ho to CX" },
    question: {
      en: "X goes on q1, then CX with q0 as control and q1 as target. Both are measured. Predict the result.",
      hi: "q1 par X lagta hai, phir CX jisme q0 control aur q1 target hai. Dono measure hote hain. Result predict karo.",
    },
    circuit: {
      qubits: 2,
      gates: [
        ["X", 1, 0],
        ["CX", 0, 1, 1],
        ["M", 0, 2],
        ["M", 1, 2],
      ],
    },
    options: "auto",
    hint: {
      en: "Look at the control first. Is q0 a 0 or a 1 when the CX runs?",
      hi: "Pehle control dekho. CX run hote time q0 0 hai ya 1?",
    },
    difficulty: 2,
    targets: ["CX gate"],
  },
  {
    id: "bell-flip",
    topic: "entanglement",
    title: { en: "Always disagree", hi: "Hamesha disagree" },
    question: {
      en: "Make a Bell pair (H, then CX), then flip q1 with X and measure both. Predict the results.",
      hi: "Bell pair banao (H, phir CX), phir q1 ko X se flip karo aur dono measure karo. Results predict karo.",
    },
    circuit: {
      qubits: 2,
      gates: [
        ["H", 0, 0],
        ["CX", 0, 1, 1],
        ["X", 1, 2],
        ["M", 0, 3],
        ["M", 1, 3],
      ],
    },
    options: "auto",
    hint: {
      en: "Start from what a Bell pair gives, then flip q1 in each of those results.",
      hi: "Pehle socho Bell pair kya deta hai, phir un results mein q1 ko flip karo.",
    },
    difficulty: 3,
    targets: ["Bell pair", "Linked results", "randomness_no_structure"],
  },
  {
    id: "bell-marginal",
    topic: "entanglement",
    title: { en: "One half of a Bell pair", hi: "Bell pair ka ek half" },
    question: {
      en: "Make a Bell pair, but measure ONLY q1. What does q1 show on its own?",
      hi: "Bell pair banao, lekin SIRF q1 ko measure karo. q1 akele kya dikhata hai?",
    },
    circuit: {
      qubits: 2,
      gates: [
        ["H", 0, 0],
        ["CX", 0, 1, 1],
        ["M", 1, 2],
      ],
    },
    options: "auto",
    hint: {
      en: "The pair gives 00 or 11, half each. Now cover q0 with your hand and read only q1.",
      hi: "Pair 00 ya 11 deta hai, aadha-aadha. Ab q0 ko haath se cover karo aur sirf q1 read karo.",
    },
    difficulty: 3,
    targets: ["No signalling", "Linked results", "ftl_communication"],
  },
];

export function challengesFor(topic: TopicId): Challenge[] {
  return CHALLENGES.filter((c) => c.topic === topic);
}


export function findChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}
