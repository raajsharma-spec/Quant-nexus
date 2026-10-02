/**
 * The question bank for mastery checks, quick reviews and the review step.
 *
 * Each concept has several "slots" (the `concept` field), and each slot has
 * questions at different difficulty levels. The adaptive mastery check
 * (lib/adaptiveAssessment.ts) picks ONE question per slot, harder after a right
 * answer and easier after a wrong one. A targeted retry asks a different
 * question for each slot that was missed.
 */

import type { L, TopicId } from "@/lib/types";
import type { CircuitSpec } from "./challenges";

export type QuestionType = "mcq" | "prediction" | "conceptual" | "interpretation";

/** 1 = beginner · 2 = developing · 3 = proficient · 4 = advanced. */
export type Difficulty = 1 | 2 | 3 | 4;

export interface QuizQuestion {
  id: string;
  topic: TopicId;
  type: QuestionType;
  /** The idea this question tests. Wrong answers mark it as a weak concept. */
  concept: string;
  /** How hard the question is. The adaptive mastery check picks by this. */
  difficulty: Difficulty;
  /** Wrong options that reveal a known misconception: option index → misconception id. */
  misconceptions?: Record<number, string>;
  prompt: L;
  circuit?: CircuitSpec;
  code?: string;
  options: L[];
  answer: number;
  explanation: L;
}

const same = (text: string): L => ({ en: text, hi: text });

export const QUIZZES: Partial<Record<TopicId, QuizQuestion[]>> = {
  // -------------------------------------------------------------------------
  qubit: [
    {
      id: "qubit-1",
      topic: "qubit",
      type: "conceptual",
      concept: "Bit vs qubit",
      difficulty: 1,
      misconceptions: { 2: "qubit_extra_states" },
      prompt: {
        en: "What is the key difference between a classical bit and a qubit?",
        hi: "Classical bit aur qubit ke beech main difference kya hai?",
      },
      options: [
        { en: "A qubit is simply a faster bit", hi: "Qubit bas ek faster bit hai" },
        {
          en: "A bit is always 0 or 1; a qubit holds a quantum state that gives each answer a probability",
          hi: "Bit hamesha 0 ya 1 hota hai; qubit ek quantum state hold karta hai jo har answer ki probability deta hai",
        },
        {
          en: "A qubit shows many values at once when you measure it",
          hi: "Qubit measure karne par ek saath kai values dikhata hai",
        },
        { en: "A qubit is a physically smaller bit", hi: "Qubit physically chhota bit hai" },
      ],
      answer: 1,
      explanation: {
        en: "A bit is a definite 0 or 1. A qubit holds a quantum state, and that state sets the probability of measuring 0 or 1.",
        hi: "Bit definite 0 ya 1 hota hai. Qubit ek quantum state hold karta hai, aur wahi state 0 ya 1 measure hone ki probability decide karta hai.",
      },
    },
    {
      id: "qubit-2",
      topic: "qubit",
      type: "mcq",
      concept: "Ket notation",
      difficulty: 1,
      prompt: { en: "What does |0⟩ mean?", hi: "|0⟩ ka matlab kya hai?" },
      options: [
        { en: "The number zero", hi: "Number zero" },
        { en: "An empty qubit with no state", hi: "Ek empty qubit jiska koi state nahi" },
        { en: "The qubit state that always measures 0", hi: "Woh qubit state jo hamesha 0 measure hota hai" },
        { en: "A qubit that has been deleted", hi: "Ek qubit jo delete ho chuka hai" },
      ],
      answer: 2,
      explanation: {
        en: "|0⟩ is a quantum state. The brackets are a label for 'this is a quantum state'; measuring |0⟩ always gives 0.",
        hi: "|0⟩ ek quantum state hai. Brackets bas ek label hain ki 'yeh quantum state hai'; |0⟩ ko measure karo to hamesha 0 milta hai.",
      },
    },
    {
      id: "qubit-3",
      topic: "qubit",
      type: "prediction",
      concept: "Measurement",
      difficulty: 1,
      misconceptions: { 0: "always_fifty_fifty" },
      prompt: {
        en: "A fresh qubit is measured straight away. What do you see?",
        hi: "Ek fresh qubit ko seedha measure kiya jaata hai. Kya dikhta hai?",
      },
      circuit: { qubits: 1, gates: [["M", 0, 1]] },
      options: [
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 every time", hi: "Har baar 0" },
        { en: "Nothing — it cannot be measured", hi: "Kuch nahi — measure nahi ho sakta" },
      ],
      answer: 2,
      explanation: {
        en: "Qubits start in |0⟩. With no gate to change it, measurement gives 0 every time.",
        hi: "Qubits |0⟩ se start hote hain. Koi gate change nahi karta, isliye measurement har baar 0 deta hai.",
      },
    },
    {
      id: "qubit-4",
      topic: "qubit",
      type: "mcq",
      concept: "Probability",
      difficulty: 2,
      misconceptions: { 2: "qubit_extra_states" },
      prompt: {
        en: "A qubit's state gives a 30% chance of 0 and a 70% chance of 1. You measure it once. What can you get?",
        hi: "Ek qubit ke state mein 0 ka chance 30% aur 1 ka chance 70% hai. Aap ek baar measure karte ho. Kya mil sakta hai?",
      },
      options: [
        { en: "0.7", hi: "0.7" },
        { en: "Either 0 or 1 — one definite answer", hi: "0 ya 1 — ek definite answer" },
        { en: "Both 0 and 1 at once", hi: "0 aur 1 dono ek saath" },
        { en: "30", hi: "30" },
      ],
      answer: 1,
      explanation: {
        en: "One measurement gives one answer: 0 or 1. The probabilities only show up when you repeat the experiment many times.",
        hi: "Ek measurement ek hi answer deta hai: 0 ya 1. Probabilities tab dikhti hain jab experiment kai baar repeat karo.",
      },
    },
    {
      id: "qubit-5",
      topic: "qubit",
      type: "conceptual",
      concept: "Measurement",
      difficulty: 2,
      misconceptions: { 2: "measurement_passive" },
      prompt: {
        en: "What does measurement do to a qubit?",
        hi: "Measurement qubit ke saath kya karta hai?",
      },
      options: [
        {
          en: "It forces the qubit to give one definite answer, 0 or 1",
          hi: "Yeh qubit se ek definite answer nikalwata hai, 0 ya 1",
        },
        { en: "It copies the full quantum state for you to read", hi: "Yeh poora quantum state copy karke dikha deta hai" },
        { en: "Nothing — it only looks", hi: "Kuch nahi — bas dekhta hai" },
        { en: "It always resets the qubit to |0⟩", hi: "Yeh qubit ko hamesha |0⟩ par reset kar deta hai" },
      ],
      answer: 0,
      explanation: {
        en: "Measurement returns a plain 0 or 1. You never read the whole quantum state in one go.",
        hi: "Measurement plain 0 ya 1 return karta hai. Poora quantum state ek baar mein kabhi read nahi hota.",
      },
    },
    {
      id: "qubit-6",
      topic: "qubit",
      type: "conceptual",
      concept: "Bit vs qubit",
      difficulty: 2,
      misconceptions: { 0: "qubit_extra_states", 2: "classical_randomness", 3: "qubit_extra_states" },
      prompt: {
        en: "Which statement about a qubit is the most accurate?",
        hi: "Qubit ke baare mein kaunsa statement sabse accurate hai?",
      },
      options: [
        {
          en: "It stores 0 and 1 at the same time, and reading it shows both",
          hi: "Yeh 0 aur 1 ek saath store karta hai, aur read karne par dono dikhte hain",
        },
        {
          en: "It holds a quantum state whose amplitudes for |0⟩ and |1⟩ set the measurement probabilities",
          hi: "Yeh ek quantum state hold karta hai jiske |0⟩ aur |1⟩ ke amplitudes measurement probabilities set karte hain",
        },
        {
          en: "It is a bit whose value changes randomly on its own",
          hi: "Yeh ek bit hai jiski value apne aap randomly change hoti hai",
        },
        { en: "It is an ordinary bit with a third value, 2", hi: "Yeh ordinary bit hai jisme teesri value 2 bhi hai" },
      ],
      answer: 1,
      explanation: {
        en: "A qubit holds a quantum state. The amplitudes in that state decide how likely 0 and 1 are, and a measurement always returns just one of them.",
        hi: "Qubit ek quantum state hold karta hai. Us state ke amplitudes decide karte hain ki 0 aur 1 kitne likely hain, aur measurement hamesha un mein se sirf ek return karta hai.",
      },
    },
    {
      id: "qubit-7",
      topic: "qubit",
      type: "mcq",
      concept: "Ket notation",
      difficulty: 2,
      prompt: {
        en: "A two-qubit result is written |10⟩. In Quantum Nexus, what does it mean?",
        hi: "Ek two-qubit result |10⟩ likha hai. Quantum Nexus mein iska matlab kya hai?",
      },
      options: [
        { en: "The number ten", hi: "Number ten" },
        { en: "q0 = 0 and q1 = 1", hi: "q0 = 0 aur q1 = 1" },
        { en: "q0 = 1 and q1 = 0", hi: "q0 = 1 aur q1 = 0" },
        { en: "Both qubits are in superposition", hi: "Dono qubits superposition mein hain" },
      ],
      answer: 2,
      explanation: {
        en: "Results are written |q0 q1⟩ with q0 on the left, so |10⟩ means q0 measured 1 and q1 measured 0.",
        hi: "Results |q0 q1⟩ ki tarah likhe jaate hain, q0 left par, isliye |10⟩ ka matlab q0 ne 1 measure kiya aur q1 ne 0.",
      },
    },
    {
      id: "qubit-8",
      topic: "qubit",
      type: "mcq",
      concept: "Probability",
      difficulty: 3,
      misconceptions: { 0: "amplitude_is_probability" },
      prompt: {
        en: "A state has an amplitude of 1/√2 on |0⟩. What is the probability of measuring 0?",
        hi: "Ek state mein |0⟩ ka amplitude 1/√2 hai. 0 measure hone ki probability kya hai?",
      },
      options: [
        { en: "1/√2, which is about 71%", hi: "1/√2, yaani lagbhag 71%" },
        { en: "50% — the probability is the amplitude's size squared", hi: "50% — probability amplitude ke size ka square hai" },
        { en: "100%", hi: "100%" },
        { en: "It cannot be worked out", hi: "Yeh nikala nahi ja sakta" },
      ],
      answer: 1,
      explanation: {
        en: "An amplitude is not a probability. Square its size: (1/√2)² = 1/2 = 50%.",
        hi: "Amplitude probability nahi hai. Uske size ka square karo: (1/√2)² = 1/2 = 50%.",
      },
    },
    {
      id: "qubit-9",
      topic: "qubit",
      type: "interpretation",
      concept: "Measurement",
      difficulty: 3,
      misconceptions: { 3: "always_fifty_fifty" },
      prompt: {
        en: "A circuit is run 1,000 times and gives 0 every single time. What is the most reasonable conclusion?",
        hi: "Ek circuit 1,000 baar run hota hai aur har baar 0 deta hai. Sabse reasonable conclusion kya hai?",
      },
      options: [
        { en: "Measurement always gives 0", hi: "Measurement hamesha 0 deta hai" },
        { en: "The qubit was in an equal superposition", hi: "Qubit equal superposition mein tha" },
        {
          en: "Just before measurement, the state was |0⟩ (or extremely close to it)",
          hi: "Measurement se just pehle state |0⟩ tha (ya uske bahut close)",
        },
        {
          en: "The simulator is broken, because quantum results should be random",
          hi: "Simulator broken hai, kyunki quantum results random hone chahiye",
        },
      ],
      answer: 2,
      explanation: {
        en: "The probabilities come from the state. A definite |0⟩ gives 0 every time — quantum results are only random when the state is a superposition.",
        hi: "Probabilities state se aati hain. Definite |0⟩ har baar 0 deta hai — quantum results tabhi random hote hain jab state superposition ho.",
      },
    },
    {
      id: "qubit-10",
      topic: "qubit",
      type: "mcq",
      concept: "Probability",
      difficulty: 4,
      misconceptions: { 1: "amplitude_is_probability" },
      prompt: {
        en: "A qubit is in the state (√3/2)|0⟩ + (1/2)|1⟩. What is the probability of measuring 1?",
        hi: "Ek qubit (√3/2)|0⟩ + (1/2)|1⟩ state mein hai. 1 measure hone ki probability kya hai?",
      },
      options: [same("25%"), same("50%"), same("75%"), same("87%")],
      answer: 0,
      explanation: {
        en: "P(1) = (1/2)² = 1/4 = 25%, and P(0) = (√3/2)² = 3/4. The two add up to 1, as they must.",
        hi: "P(1) = (1/2)² = 1/4 = 25%, aur P(0) = (√3/2)² = 3/4. Dono ka sum 1 hai, jaisa hona chahiye.",
      },
    },
    {
      id: "qubit-11",
      topic: "qubit",
      type: "mcq",
      concept: "Ket notation",
      difficulty: 3,
      prompt: {
        en: "Which statement about |0⟩ and 0 is correct?",
        hi: "|0⟩ aur 0 ke baare mein kaunsa statement sahi hai?",
      },
      options: [
        {
          en: "|0⟩ is a quantum state; 0 is the result you read when you measure it",
          hi: "|0⟩ ek quantum state hai; 0 woh result hai jo measure karne par milta hai",
        },
        { en: "They are two ways of writing the same number", hi: "Yeh same number likhne ke do tareeke hain" },
        { en: "|0⟩ means the qubit is empty", hi: "|0⟩ ka matlab qubit empty hai" },
        { en: "|0⟩ means zero probability", hi: "|0⟩ ka matlab zero probability" },
      ],
      answer: 0,
      explanation: {
        en: "The ket |0⟩ names a state of the qubit. The plain 0 is a measurement result. Measuring the state |0⟩ gives the result 0 every time.",
        hi: "Ket |0⟩ qubit ke ek state ka naam hai. Plain 0 measurement result hai. State |0⟩ ko measure karne par har baar result 0 milta hai.",
      },
    },
    {
      id: "qubit-12",
      topic: "qubit",
      type: "conceptual",
      concept: "Measurement",
      difficulty: 2,
      misconceptions: { 1: "qubit_extra_states" },
      prompt: {
        en: "A qubit's state gives a 50% chance of 0 and a 50% chance of 1. You measure it once. What do you read?",
        hi: "Ek qubit ke state mein 0 ka chance 50% aur 1 ka chance 50% hai. Aap ek baar measure karte ho. Kya read hota hai?",
      },
      options: [
        { en: "One result: either 0 or 1", hi: "Ek result: 0 ya 1" },
        { en: "Both 0 and 1", hi: "0 aur 1 dono" },
        { en: "The number 0.5", hi: "Number 0.5" },
        { en: "The two amplitudes", hi: "Dono amplitudes" },
      ],
      answer: 0,
      explanation: {
        en: "A measurement returns one plain 0 or 1. The 50% only shows up when you repeat the experiment many times.",
        hi: "Measurement ek plain 0 ya 1 return karta hai. 50% tabhi dikhta hai jab experiment kai baar repeat karo.",
      },
    },
    {
      id: "qubit-13",
      topic: "qubit",
      type: "conceptual",
      concept: "Bit vs qubit",
      difficulty: 3,
      misconceptions: { 0: "qubit_extra_states" },
      prompt: {
        en: "Why can a qubit do something a classical bit cannot?",
        hi: "Qubit aisa kya kar sakta hai jo classical bit nahi kar sakta?",
      },
      options: [
        {
          en: "Because one measurement of a qubit returns many values",
          hi: "Kyunki qubit ka ek measurement kai values return karta hai",
        },
        { en: "Because a qubit is physically faster than a bit", hi: "Kyunki qubit physically bit se faster hai" },
        {
          en: "Because its state is a combination of |0⟩ and |1⟩ whose parts can add up or cancel",
          hi: "Kyunki uska state |0⟩ aur |1⟩ ka combination hai jiske parts add ya cancel ho sakte hain",
        },
        { en: "Because a qubit never needs to be measured", hi: "Kyunki qubit ko kabhi measure nahi karna padta" },
      ],
      answer: 2,
      explanation: {
        en: "The advantage comes from interference between the parts of a quantum state — not from reading many values at once, which never happens.",
        hi: "Advantage quantum state ke parts ke beech interference se aata hai — ek saath kai values read karne se nahi, jo kabhi hota hi nahi.",
      },
    },
  ],

  // -------------------------------------------------------------------------
  gates: [
    {
      id: "gates-1",
      topic: "gates",
      type: "mcq",
      concept: "X gate",
      difficulty: 1,
      prompt: { en: "What does the X gate do to |0⟩?", hi: "X gate |0⟩ ke saath kya karta hai?" },
      options: [
        { en: "Leaves it as |0⟩", hi: "|0⟩ hi rehne deta hai" },
        { en: "Turns it into |1⟩", hi: "Use |1⟩ bana deta hai" },
        { en: "Creates a superposition", hi: "Superposition banata hai" },
        { en: "Measures it", hi: "Use measure karta hai" },
      ],
      answer: 1,
      explanation: {
        en: "X is the quantum NOT: |0⟩ → |1⟩ and |1⟩ → |0⟩.",
        hi: "X quantum NOT hai: |0⟩ → |1⟩ aur |1⟩ → |0⟩.",
      },
    },
    {
      id: "gates-2",
      topic: "gates",
      type: "prediction",
      concept: "X gate",
      difficulty: 1,
      misconceptions: { 1: "always_fifty_fifty", 3: "randomness_no_structure" },
      prompt: {
        en: "This circuit applies X twice, then measures. What will you see?",
        hi: "Yeh circuit X do baar apply karta hai, phir measure karta hai. Kya dikhega?",
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
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "0 every time", hi: "Har baar 0" },
        { en: "It changes from run to run with no pattern", hi: "Har run mein bina pattern ke change hota hai" },
      ],
      answer: 2,
      explanation: {
        en: "Two flips cancel: |0⟩ → |1⟩ → |0⟩. You measure 0 every time.",
        hi: "Do flips cancel ho jaate hain: |0⟩ → |1⟩ → |0⟩. Har baar 0 measure hota hai.",
      },
    },
    {
      id: "gates-3",
      topic: "gates",
      type: "mcq",
      concept: "H gate",
      difficulty: 1,
      prompt: {
        en: "Which gate turns |0⟩ into an equal superposition?",
        hi: "Kaunsa gate |0⟩ ko equal superposition mein le jaata hai?",
      },
      options: [same("X"), same("Z"), same("M"), same("H")],
      answer: 3,
      explanation: {
        en: "H (the Hadamard gate) turns |0⟩ into an equal blend of |0⟩ and |1⟩.",
        hi: "H (Hadamard gate) |0⟩ ko |0⟩ aur |1⟩ ke equal blend mein le jaata hai.",
      },
    },
    {
      id: "gates-4",
      topic: "gates",
      type: "conceptual",
      concept: "Z gate",
      difficulty: 2,
      misconceptions: { 0: "phase_confusion", 2: "always_fifty_fifty" },
      prompt: {
        en: "You apply Z to |0⟩ and measure. What happens?",
        hi: "Aap |0⟩ par Z apply karke measure karte ho. Kya hota hai?",
      },
      options: [
        { en: "You measure 1 every time", hi: "Har baar 1 measure hota hai" },
        {
          en: "You measure 0 every time — Z only changes the phase",
          hi: "Har baar 0 measure hota hai — Z sirf phase change karta hai",
        },
        { en: "You measure 0 or 1 at random", hi: "Randomly 0 ya 1 measure hota hai" },
        { en: "The qubit can no longer be measured", hi: "Qubit ab measure nahi ho sakta" },
      ],
      answer: 1,
      explanation: {
        en: "Z puts a minus sign on the |1⟩ part. |0⟩ has no |1⟩ part, so nothing you can measure changes.",
        hi: "Z |1⟩ part par minus sign lagata hai. |0⟩ mein |1⟩ part hai hi nahi, isliye measurement mein kuch change nahi hota.",
      },
    },
    {
      id: "gates-5",
      topic: "gates",
      type: "prediction",
      concept: "Y gate",
      difficulty: 2,
      misconceptions: { 2: "always_fifty_fifty" },
      prompt: {
        en: "This circuit applies Y to |0⟩, then measures. What will you see?",
        hi: "Yeh circuit |0⟩ par Y apply karta hai, phir measure karta hai. Kya dikhega?",
      },
      circuit: {
        qubits: 1,
        gates: [
          ["Y", 0, 0],
          ["M", 0, 1],
        ],
      },
      options: [
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 every time", hi: "Har baar 0" },
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "No result — Y cancels the measurement", hi: "Koi result nahi — Y measurement cancel kar deta hai" },
      ],
      answer: 0,
      explanation: {
        en: "Y flips the qubit like X does and also adds a phase. The phase is invisible here, so you measure 1 every time.",
        hi: "Y qubit ko X ki tarah flip karta hai aur ek phase add karta hai. Phase yahan dikhta nahi, isliye har baar 1 measure hota hai.",
      },
    },
    {
      id: "gates-6",
      topic: "gates",
      type: "prediction",
      concept: "H gate",
      difficulty: 2,
      prompt: {
        en: "This circuit applies X, then H, then measures. What will you see?",
        hi: "Yeh circuit X, phir H apply karta hai, phir measure karta hai. Kya dikhega?",
      },
      circuit: {
        qubits: 1,
        gates: [
          ["X", 0, 0],
          ["H", 0, 1],
          ["M", 0, 2],
        ],
      },
      options: [
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 every time", hi: "Har baar 0" },
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "0 about 25% of the time", hi: "0 lagbhag 25% baar" },
      ],
      answer: 2,
      explanation: {
        en: "H turns |1⟩ into an equal superposition too. It carries a minus sign on the |1⟩ part, but that phase does not change these probabilities.",
        hi: "H |1⟩ ko bhi equal superposition mein le jaata hai. Isme |1⟩ part par minus sign hota hai, lekin woh phase in probabilities ko change nahi karta.",
      },
    },
    {
      id: "gates-7",
      topic: "gates",
      type: "prediction",
      concept: "Z gate",
      difficulty: 3,
      misconceptions: { 0: "phase_confusion", 2: "always_fifty_fifty" },
      prompt: {
        en: "This circuit applies H, then Z, then H, then measures. What will you see?",
        hi: "Yeh circuit H, phir Z, phir H apply karta hai, phir measure karta hai. Kya dikhega?",
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
      options: [
        {
          en: "0 every time, because Z never changes a measurement",
          hi: "Har baar 0, kyunki Z kabhi measurement change nahi karta",
        },
        {
          en: "1 every time — the second H turns the phase flip into a visible result",
          hi: "Har baar 1 — doosra H phase flip ko visible result mein badal deta hai",
        },
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "No result", hi: "Koi result nahi" },
      ],
      answer: 1,
      explanation: {
        en: "After H the qubit is in superposition. Z flips the sign of the |1⟩ part. The second H then makes the paths interfere the other way round, and the qubit ends in |1⟩.",
        hi: "H ke baad qubit superposition mein hai. Z |1⟩ part ka sign flip karta hai. Phir doosra H paths ko ulta interfere karata hai, aur qubit |1⟩ par end hota hai.",
      },
    },
    {
      id: "gates-8",
      topic: "gates",
      type: "conceptual",
      concept: "Y gate",
      difficulty: 3,
      prompt: {
        en: "X and Y both turn |0⟩ into a state that measures 1. What is different about Y?",
        hi: "X aur Y dono |0⟩ ko aise state mein le jaate hain jo 1 measure hota hai. Y mein alag kya hai?",
      },
      options: [
        { en: "Y flips the qubit twice", hi: "Y qubit ko do baar flip karta hai" },
        { en: "Y also measures the qubit", hi: "Y qubit ko measure bhi karta hai" },
        { en: "Nothing — they are the same gate", hi: "Kuch nahi — dono same gate hain" },
        {
          en: "Y also adds a phase, which matters only when gates are combined",
          hi: "Y ek phase bhi add karta hai, jo tabhi matter karta hai jab gates combine hon",
        },
      ],
      answer: 3,
      explanation: {
        en: "Y|0⟩ = i|1⟩. The factor i is a phase: invisible in this measurement, but real when more gates follow.",
        hi: "Y|0⟩ = i|1⟩. Factor i ek phase hai: is measurement mein invisible, lekin aur gates aane par real.",
      },
    },
    {
      id: "gates-9",
      topic: "gates",
      type: "prediction",
      concept: "X gate",
      difficulty: 3,
      misconceptions: { 2: "always_fifty_fifty" },
      prompt: {
        en: "This circuit applies X three times, then measures. What will you see?",
        hi: "Yeh circuit X teen baar apply karta hai, phir measure karta hai. Kya dikhega?",
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
      options: [
        { en: "0 every time", hi: "Har baar 0" },
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "1 about a third of the time", hi: "1 lagbhag one-third baar" },
      ],
      answer: 1,
      explanation: {
        en: "Each X is one flip: |0⟩ → |1⟩ → |0⟩ → |1⟩. An odd number of flips ends on |1⟩.",
        hi: "Har X ek flip hai: |0⟩ → |1⟩ → |0⟩ → |1⟩. Odd number of flips |1⟩ par end hote hain.",
      },
    },
    {
      id: "gates-10",
      topic: "gates",
      type: "mcq",
      concept: "H gate",
      difficulty: 4,
      prompt: {
        en: "In state-vector notation, what is H|1⟩?",
        hi: "State-vector notation mein H|1⟩ kya hai?",
      },
      options: [same("(|0⟩ + |1⟩)/√2"), same("(|0⟩ − |1⟩)/√2"), same("|0⟩"), same("−|1⟩")],
      answer: 1,
      explanation: {
        en: "H|1⟩ = (|0⟩ − |1⟩)/√2. The minus sign is the only difference from H|0⟩ — a relative phase.",
        hi: "H|1⟩ = (|0⟩ − |1⟩)/√2. H|0⟩ se sirf minus sign ka difference hai — relative phase.",
      },
    },
    {
      id: "gates-11",
      topic: "gates",
      type: "conceptual",
      concept: "Z gate",
      difficulty: 2,
      misconceptions: { 1: "phase_confusion" },
      prompt: {
        en: "S and T are phase gates, like Z. You apply S to |0⟩ and measure. What do you see?",
        hi: "S aur T, Z ki tarah phase gates hain. Aap |0⟩ par S lagakar measure karte ho. Kya dikhta hai?",
      },
      options: [
        { en: "0 every time", hi: "Har baar 0" },
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "0 about 75% of the time", hi: "0 lagbhag 75% baar" },
      ],
      answer: 0,
      explanation: {
        en: "A phase gate acts on the |1⟩ part of a state. |0⟩ has none, so nothing you can measure changes.",
        hi: "Phase gate state ke |1⟩ part par act karta hai. |0⟩ mein woh hai hi nahi, isliye measurement mein kuch change nahi hota.",
      },
    },
    {
      id: "gates-12",
      topic: "gates",
      type: "prediction",
      concept: "Y gate",
      difficulty: 3,
      prompt: {
        en: "This circuit applies Y twice, then measures. What will you see?",
        hi: "Yeh circuit Y do baar apply karta hai, phir measure karta hai. Kya dikhega?",
      },
      circuit: {
        qubits: 1,
        gates: [
          ["Y", 0, 0],
          ["Y", 0, 1],
          ["M", 0, 2],
        ],
      },
      options: [
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "0 every time", hi: "Har baar 0" },
        { en: "Nothing — Y cannot be applied twice", hi: "Kuch nahi — Y do baar apply nahi ho sakta" },
      ],
      answer: 2,
      explanation: {
        en: "Like X, the Y gate undoes itself: two Y gates return the qubit to |0⟩.",
        hi: "X ki tarah Y gate bhi khud ko undo karta hai: do Y gates qubit ko wapas |0⟩ bana dete hain.",
      },
    },
    {
      id: "gates-13",
      topic: "gates",
      type: "conceptual",
      concept: "X gate",
      difficulty: 2,
      prompt: {
        en: "What does it mean that quantum gates are reversible?",
        hi: "Quantum gates reversible hain — iska matlab kya hai?",
      },
      options: [
        { en: "A circuit can be read from right to left", hi: "Circuit ko right se left read kiya ja sakta hai" },
        {
          en: "Every gate can be undone by another gate — X, for example, undoes itself",
          hi: "Har gate kisi doosre gate se undo ho sakta hai — jaise X khud ko undo karta hai",
        },
        { en: "Measurement can be undone", hi: "Measurement undo ho sakta hai" },
        { en: "Gates work only once", hi: "Gates sirf ek baar kaam karte hain" },
      ],
      answer: 1,
      explanation: {
        en: "Gates never lose information, so each one has an inverse. Measurement is different: it cannot be undone.",
        hi: "Gates kabhi information lose nahi karte, isliye har ek ka inverse hota hai. Measurement alag hai: woh undo nahi hota.",
      },
    },
  ],

  // -------------------------------------------------------------------------
  superposition: [
    {
      id: "super-1",
      topic: "superposition",
      type: "conceptual",
      concept: "Superposition",
      difficulty: 1,
      misconceptions: { 0: "classical_randomness", 3: "qubit_extra_states" },
      prompt: {
        en: "A qubit is in an equal superposition. Which statement is correct?",
        hi: "Ek qubit equal superposition mein hai. Kaunsa statement sahi hai?",
      },
      options: [
        {
          en: "It is secretly 0 — we just have not looked yet",
          hi: "Yeh secretly 0 hai — bas humne abhi dekha nahi",
        },
        { en: "Its value is 0.5", hi: "Iski value 0.5 hai" },
        {
          en: "It has a 50% chance to measure 0 and a 50% chance to measure 1",
          hi: "Iske 0 measure hone ka chance 50% aur 1 measure hone ka chance 50% hai",
        },
        { en: "A single measurement shows 0 and 1 together", hi: "Ek measurement mein 0 aur 1 dono saath dikhte hain" },
      ],
      answer: 2,
      explanation: {
        en: "Superposition is a real blend of |0⟩ and |1⟩, not a hidden answer. Each measurement still gives just one result.",
        hi: "Superposition |0⟩ aur |1⟩ ka real blend hai, koi hidden answer nahi. Har measurement phir bhi ek hi result deta hai.",
      },
    },
    {
      id: "super-2",
      topic: "superposition",
      type: "prediction",
      concept: "Probability",
      difficulty: 1,
      prompt: {
        en: "You run this circuit 1,000 times. What do you expect?",
        hi: "Aap yeh circuit 1,000 baar run karte ho. Kya expect karte ho?",
      },
      circuit: {
        qubits: 1,
        gates: [
          ["H", 0, 0],
          ["M", 0, 1],
        ],
      },
      options: [
        { en: "1,000 zeros", hi: "1,000 zeros" },
        { en: "About 500 zeros and about 500 ones", hi: "Lagbhag 500 zeros aur lagbhag 500 ones" },
        { en: "1,000 ones", hi: "1,000 ones" },
        { en: "Exactly 500 and 500, every single time", hi: "Exactly 500 aur 500, har baar" },
      ],
      answer: 1,
      explanation: {
        en: "H gives each answer a 50% chance, so the counts land near 500 each — close, but rarely exact.",
        hi: "H dono answers ko 50% chance deta hai, isliye counts 500 ke aas-paas aate hain — close, lekin exact kam hi.",
      },
    },
    {
      id: "super-3",
      topic: "superposition",
      type: "mcq",
      concept: "Measurement",
      difficulty: 2,
      misconceptions: { 0: "measurement_passive" },
      prompt: {
        en: "You measure a qubit in superposition and get 1. What state is the qubit in now?",
        hi: "Aap superposition wale qubit ko measure karte ho aur 1 milta hai. Ab qubit kis state mein hai?",
      },
      options: [
        { en: "Still in the same superposition", hi: "Abhi bhi usi superposition mein" },
        { en: "|0⟩", hi: "|0⟩" },
        { en: "|1⟩ — the superposition is gone", hi: "|1⟩ — superposition khatam ho gaya" },
        { en: "Half |0⟩ and half |1⟩", hi: "Aadha |0⟩ aur aadha |1⟩" },
      ],
      answer: 2,
      explanation: {
        en: "Measurement ends the superposition. After you see 1, the qubit is a definite |1⟩.",
        hi: "Measurement superposition ko khatam kar deta hai. 1 dikhne ke baad qubit definite |1⟩ hai.",
      },
    },
    {
      id: "super-4",
      topic: "superposition",
      type: "prediction",
      concept: "Interference",
      difficulty: 2,
      misconceptions: { 1: "classical_randomness" },
      prompt: {
        en: "This circuit applies H twice, then measures. What will you see?",
        hi: "Yeh circuit H do baar apply karta hai, phir measure karta hai. Kya dikhega?",
      },
      circuit: {
        qubits: 1,
        gates: [
          ["H", 0, 0],
          ["H", 0, 1],
          ["M", 0, 2],
        ],
      },
      options: [
        { en: "0 every time", hi: "Har baar 0" },
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 about 25% of the time", hi: "0 lagbhag 25% baar" },
      ],
      answer: 0,
      explanation: {
        en: "The second H undoes the first. The two paths interfere and the qubit returns to |0⟩ — proof that superposition is more than a coin flip.",
        hi: "Doosra H pehle wale ko undo kar deta hai. Dono paths interfere karte hain aur qubit wapas |0⟩ ban jaata hai — proof ki superposition sirf coin flip nahi hai.",
      },
    },
    {
      id: "super-5",
      topic: "superposition",
      type: "mcq",
      concept: "Probability",
      difficulty: 2,
      misconceptions: { 0: "variation_is_error", 1: "variation_is_error" },
      prompt: {
        en: "Why do results show ≈50% instead of exactly 50%?",
        hi: "Results mein exactly 50% ki jagah ≈50% kyun dikhta hai?",
      },
      options: [
        { en: "The simulator has a bug", hi: "Simulator mein bug hai" },
        { en: "The H gate is slightly inaccurate", hi: "H gate thoda inaccurate hai" },
        {
          en: "Each run is random, so counts land near the probability, not exactly on it",
          hi: "Har run random hai, isliye counts probability ke paas aate hain, exactly us par nahi",
        },
        { en: "Measurement changes the H gate", hi: "Measurement H gate ko change kar deta hai" },
      ],
      answer: 2,
      explanation: {
        en: "Probability describes the long run. Any finite number of runs wobbles a little around it.",
        hi: "Probability long run ko describe karti hai. Finite runs mein result uske aas-paas thoda upar-neeche hota hai.",
      },
    },
    {
      id: "super-6",
      topic: "superposition",
      type: "mcq",
      concept: "Superposition",
      difficulty: 1,
      prompt: {
        en: "What happens when H is applied to |0⟩?",
        hi: "|0⟩ par H apply karne se kya hota hai?",
      },
      options: [
        { en: "The qubit becomes |1⟩", hi: "Qubit |1⟩ ban jaata hai" },
        { en: "Nothing changes", hi: "Kuch change nahi hota" },
        { en: "The qubit is measured", hi: "Qubit measure ho jaata hai" },
        {
          en: "The qubit enters an equal superposition of |0⟩ and |1⟩",
          hi: "Qubit |0⟩ aur |1⟩ ke equal superposition mein chala jaata hai",
        },
      ],
      answer: 3,
      explanation: {
        en: "H turns |0⟩ into an equal superposition: each result then has a 50% probability.",
        hi: "H |0⟩ ko equal superposition mein le jaata hai: phir har result ki probability 50% hoti hai.",
      },
    },
    {
      id: "super-7",
      topic: "superposition",
      type: "prediction",
      concept: "Superposition",
      difficulty: 3,
      prompt: {
        en: "The qubit is first flipped to |1⟩, then H is applied. Predict the measurement distribution.",
        hi: "Qubit pehle |1⟩ par flip hota hai, phir H apply hota hai. Measurement distribution predict karo.",
      },
      circuit: {
        qubits: 1,
        gates: [
          ["X", 0, 0],
          ["H", 0, 1],
          ["M", 0, 2],
        ],
      },
      options: [
        { en: "1 every time", hi: "Har baar 1" },
        { en: "About half 0 and half 1", hi: "Lagbhag aadha 0 aur aadha 1" },
        { en: "0 every time", hi: "Har baar 0" },
        { en: "About 75% 1 and 25% 0", hi: "Lagbhag 75% 1 aur 25% 0" },
      ],
      answer: 1,
      explanation: {
        en: "H|1⟩ is also an equal superposition. It differs from H|0⟩ only by a phase, which this measurement cannot see.",
        hi: "H|1⟩ bhi equal superposition hai. Yeh H|0⟩ se sirf ek phase se differ karta hai, jo is measurement mein dikhta nahi.",
      },
    },
    {
      id: "super-8",
      topic: "superposition",
      type: "mcq",
      concept: "Superposition",
      difficulty: 4,
      misconceptions: { 2: "amplitude_is_probability" },
      prompt: {
        en: "Using state-vector notation, which expression is H|0⟩?",
        hi: "State-vector notation mein H|0⟩ kaunsa expression hai?",
      },
      options: [same("(|0⟩ + |1⟩)/√2"), same("|0⟩ + |1⟩"), same("½|0⟩ + ½|1⟩"), same("(|0⟩ − |1⟩)/√2")],
      answer: 0,
      explanation: {
        en: "Each amplitude is 1/√2, so each probability is (1/√2)² = 1/2. Amplitudes of ½ would give probabilities of only ¼ each.",
        hi: "Har amplitude 1/√2 hai, isliye har probability (1/√2)² = 1/2 hai. ½ amplitudes se probabilities sirf ¼ each milti.",
      },
    },
    {
      id: "super-9",
      topic: "superposition",
      type: "conceptual",
      concept: "Measurement",
      difficulty: 3,
      misconceptions: { 1: "always_fifty_fifty", 3: "qubit_extra_states" },
      prompt: {
        en: "Why can you not learn a superposition's probabilities from a single measurement?",
        hi: "Ek single measurement se superposition ki probabilities kyun nahi pata chal sakti?",
      },
      options: [
        {
          en: "One measurement returns a single 0 or 1; probabilities only appear over many runs",
          hi: "Ek measurement single 0 ya 1 return karta hai; probabilities kai runs mein hi dikhti hain",
        },
        { en: "Because every measurement is 50/50 anyway", hi: "Kyunki har measurement waise bhi 50/50 hota hai" },
        { en: "Because the simulator hides them", hi: "Kyunki simulator unhe hide karta hai" },
        { en: "You can: one result shows both amplitudes", hi: "Pata chal sakti hai: ek result dono amplitudes dikhata hai" },
      ],
      answer: 0,
      explanation: {
        en: "A measurement gives one answer and ends the superposition. Repeating the whole experiment many times is the only way to estimate the probabilities.",
        hi: "Measurement ek answer deta hai aur superposition khatam kar deta hai. Probabilities estimate karne ka ek hi tareeka hai: poora experiment kai baar repeat karna.",
      },
    },
    {
      id: "super-10",
      topic: "superposition",
      type: "prediction",
      concept: "Interference",
      difficulty: 3,
      misconceptions: { 0: "classical_randomness" },
      prompt: {
        en: "This circuit applies H, then Z, then H, then measures. What will you see?",
        hi: "Yeh circuit H, phir Z, phir H apply karta hai, phir measure karta hai. Kya dikhega?",
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
      options: [
        { en: "0 or 1, about half the time each", hi: "0 ya 1, lagbhag aadha-aadha" },
        { en: "0 every time", hi: "Har baar 0" },
        { en: "1 every time", hi: "Har baar 1" },
        { en: "0 about 25% of the time", hi: "0 lagbhag 25% baar" },
      ],
      answer: 2,
      explanation: {
        en: "Z flips the sign of the |1⟩ part. The second H then makes the |0⟩ parts cancel and the |1⟩ parts add, so you measure 1 every time.",
        hi: "Z |1⟩ part ka sign flip karta hai. Phir doosra H |0⟩ parts ko cancel aur |1⟩ parts ko add karata hai, isliye har baar 1 measure hota hai.",
      },
    },
    {
      id: "super-11",
      topic: "superposition",
      type: "interpretation",
      concept: "Probability",
      difficulty: 3,
      misconceptions: { 0: "variation_is_error", 3: "variation_is_error" },
      prompt: {
        en: "1,024 shots of H then M gave 489 zeros and 535 ones. What is the best interpretation?",
        hi: "H phir M ke 1,024 shots mein 489 zeros aur 535 ones aaye. Best interpretation kya hai?",
      },
      options: [
        { en: "A simulation error", hi: "Simulation error" },
        { en: "The qubit prefers 1", hi: "Qubit 1 prefer karta hai" },
        {
          en: "Normal sampling variation around an exact 50% probability",
          hi: "Exact 50% probability ke aas-paas normal sampling variation",
        },
        { en: "The H gate is biased toward 1", hi: "H gate 1 ki taraf biased hai" },
      ],
      answer: 2,
      explanation: {
        en: "With 1,024 shots the typical spread is about ±16 counts around 512. 489 and 535 are well inside what chance alone produces.",
        hi: "1,024 shots mein typical spread 512 ke aas-paas lagbhag ±16 counts hota hai. 489 aur 535 us range ke andar hain jo sirf chance se aata hai.",
      },
    },
    {
      id: "super-12",
      topic: "superposition",
      type: "mcq",
      concept: "Probability",
      difficulty: 4,
      prompt: {
        en: "For a 50/50 circuit, the typical spread of the observed fraction is about √(p(1−p)/N). How does it compare for N = 100 and N = 10,000 shots?",
        hi: "50/50 circuit ke liye observed fraction ka typical spread lagbhag √(p(1−p)/N) hota hai. N = 100 aur N = 10,000 shots ke liye yeh kaise compare hota hai?",
      },
      options: [
        { en: "About 5% and about 0.5% — more shots, less wobble", hi: "Lagbhag 5% aur lagbhag 0.5% — zyada shots, kam wobble" },
        { en: "The same for both", hi: "Dono ke liye same" },
        { en: "About 0.5% and about 5% — more shots, more wobble", hi: "Lagbhag 0.5% aur lagbhag 5% — zyada shots, zyada wobble" },
        { en: "Exactly zero for both", hi: "Dono ke liye exactly zero" },
      ],
      answer: 0,
      explanation: {
        en: "√(0.25/100) = 0.05 and √(0.25/10000) = 0.005. A hundred times more shots gives ten times less spread.",
        hi: "√(0.25/100) = 0.05 aur √(0.25/10000) = 0.005. Sau guna zyada shots se spread das guna kam hota hai.",
      },
    },
    {
      id: "super-13",
      topic: "superposition",
      type: "conceptual",
      concept: "Interference",
      difficulty: 4,
      misconceptions: { 2: "classical_randomness" },
      prompt: {
        en: "Why do two H gates in a row return the qubit to |0⟩?",
        hi: "Do H gates lagataar lagane par qubit wapas |0⟩ kyun ban jaata hai?",
      },
      options: [
        { en: "The second H measures the qubit", hi: "Doosra H qubit ko measure karta hai" },
        {
          en: "The amplitudes for |1⟩ have opposite signs and cancel, while those for |0⟩ add",
          hi: "|1⟩ ke amplitudes ke signs opposite hote hain aur cancel ho jaate hain, jabki |0⟩ wale add hote hain",
        },
        { en: "By chance — it is 0 only half the time", hi: "By chance — yeh sirf aadhi baar 0 hota hai" },
        { en: "H works only the first time", hi: "H sirf pehli baar kaam karta hai" },
      ],
      answer: 1,
      explanation: {
        en: "H·H|0⟩ = ½(|0⟩ + |1⟩) + ½(|0⟩ − |1⟩) = |0⟩. That cancellation is interference.",
        hi: "H·H|0⟩ = ½(|0⟩ + |1⟩) + ½(|0⟩ − |1⟩) = |0⟩. Yahi cancellation interference hai.",
      },
    },
    {
      id: "super-14",
      topic: "superposition",
      type: "conceptual",
      concept: "Measurement",
      difficulty: 1,
      prompt: {
        en: "You run H then M exactly once. What do you get?",
        hi: "Aap H phir M ko exactly ek baar run karte ho. Kya milta hai?",
      },
      options: [
        { en: "50%", hi: "50%" },
        { en: "A single 0 or a single 1", hi: "Ek single 0 ya ek single 1" },
        { en: "Both 0 and 1", hi: "0 aur 1 dono" },
        { en: "Nothing until you run it again", hi: "Dobara run karne tak kuch nahi" },
      ],
      answer: 1,
      explanation: {
        en: "One run, one result. You cannot tell which it will be in advance — only that each has a 50% chance.",
        hi: "Ek run, ek result. Pehle se nahi bata sakte ki kaunsa aayega — bas itna ki dono ka chance 50% hai.",
      },
    },
    {
      id: "super-15",
      topic: "superposition",
      type: "prediction",
      concept: "Interference",
      difficulty: 1,
      misconceptions: { 2: "classical_randomness" },
      prompt: {
        en: "H turns |0⟩ into a superposition. What does a second H, applied straight after, do?",
        hi: "H |0⟩ ko superposition mein le jaata hai. Uske turant baad laga doosra H kya karta hai?",
      },
      options: [
        { en: "It returns the qubit to |0⟩", hi: "Yeh qubit ko wapas |0⟩ bana deta hai" },
        { en: "It turns the qubit into |1⟩", hi: "Yeh qubit ko |1⟩ bana deta hai" },
        { en: "It keeps the results at 50/50", hi: "Yeh results ko 50/50 hi rakhta hai" },
        { en: "It measures the qubit", hi: "Yeh qubit ko measure karta hai" },
      ],
      answer: 0,
      explanation: {
        en: "H undoes itself. The two paths interfere and only |0⟩ survives.",
        hi: "H khud ko undo karta hai. Dono paths interfere karte hain aur sirf |0⟩ bachta hai.",
      },
    },
  ],

  // -------------------------------------------------------------------------
  entanglement: [
    {
      id: "ent-1",
      topic: "entanglement",
      type: "mcq",
      concept: "CX gate",
      difficulty: 1,
      prompt: { en: "What does the CX gate do?", hi: "CX gate kya karta hai?" },
      options: [
        { en: "Flips both qubits every time", hi: "Har baar dono qubits flip karta hai" },
        {
          en: "Flips the target qubit only when the control qubit is |1⟩",
          hi: "Target qubit ko tabhi flip karta hai jab control qubit |1⟩ ho",
        },
        { en: "Measures the control qubit", hi: "Control qubit ko measure karta hai" },
        { en: "Swaps the two qubits", hi: "Dono qubits ko swap karta hai" },
      ],
      answer: 1,
      explanation: {
        en: "CX is a controlled NOT: the target flips only if the control is |1⟩.",
        hi: "CX ek controlled NOT hai: target tabhi flip hota hai jab control |1⟩ ho.",
      },
    },
    {
      id: "ent-2",
      topic: "entanglement",
      type: "prediction",
      concept: "CX gate",
      difficulty: 2,
      prompt: {
        en: "X on q0, then CX (q0 controls q1), then measure both. What will you see?",
        hi: "q0 par X, phir CX (q0 control, q1 target), phir dono measure. Kya dikhega?",
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
      options: [
        { en: "|10⟩ every time", hi: "Har baar |10⟩" },
        { en: "|00⟩ or |11⟩, about half each", hi: "|00⟩ ya |11⟩, lagbhag aadha-aadha" },
        { en: "|11⟩ every time", hi: "Har baar |11⟩" },
        { en: "|01⟩ every time", hi: "Har baar |01⟩" },
      ],
      answer: 2,
      explanation: {
        en: "X makes q0 a definite |1⟩, so CX flips q1. Both qubits measure 1 every time.",
        hi: "X q0 ko definite |1⟩ banata hai, isliye CX q1 ko flip karta hai. Dono qubits har baar 1 measure hote hain.",
      },
    },
    {
      id: "ent-3",
      topic: "entanglement",
      type: "prediction",
      concept: "Bell pair",
      difficulty: 2,
      misconceptions: { 0: "randomness_no_structure" },
      prompt: {
        en: "H on q0, then CX (q0 controls q1), then measure both. What will you see?",
        hi: "q0 par H, phir CX (q0 control, q1 target), phir dono measure. Kya dikhega?",
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
      options: [
        { en: "All four results, about 25% each", hi: "Chaaron results, lagbhag 25% each" },
        { en: "|00⟩ every time", hi: "Har baar |00⟩" },
        { en: "|01⟩ or |10⟩, about half each", hi: "|01⟩ ya |10⟩, lagbhag aadha-aadha" },
        { en: "|00⟩ or |11⟩, about half each", hi: "|00⟩ ya |11⟩, lagbhag aadha-aadha" },
      ],
      answer: 3,
      explanation: {
        en: "This is a Bell pair. Each run is random, but the two qubits always agree: 00 or 11.",
        hi: "Yeh Bell pair hai. Har run random hai, lekin dono qubits hamesha agree karte hain: 00 ya 11.",
      },
    },
    {
      id: "ent-4",
      topic: "entanglement",
      type: "conceptual",
      concept: "Linked results",
      difficulty: 1,
      prompt: {
        en: "In a Bell pair you measure q0 and get 1. What do you know about q1?",
        hi: "Bell pair mein aap q0 measure karte ho aur 1 milta hai. q1 ke baare mein kya pata chalta hai?",
      },
      options: [
        { en: "It will also measure 1", hi: "Woh bhi 1 measure hoga" },
        { en: "It is still 50/50", hi: "Woh abhi bhi 50/50 hai" },
        { en: "It will measure 0", hi: "Woh 0 measure hoga" },
        { en: "Nothing at all", hi: "Kuch bhi nahi" },
      ],
      answer: 0,
      explanation: {
        en: "The results of a Bell pair are linked. Seeing q0 = 1 tells you q1 = 1.",
        hi: "Bell pair ke results linked hote hain. q0 = 1 dikhne ka matlab q1 = 1.",
      },
    },
    {
      id: "ent-5",
      topic: "entanglement",
      type: "conceptual",
      concept: "No signalling",
      difficulty: 2,
      misconceptions: { 0: "ftl_communication" },
      prompt: {
        en: "Which statement about entanglement is accurate?",
        hi: "Entanglement ke baare mein kaunsa statement accurate hai?",
      },
      options: [
        { en: "It lets you send messages faster than light", hi: "Isse light se faster messages bheje ja sakte hain" },
        { en: "It means the qubits are physically touching", hi: "Iska matlab qubits physically touch kar rahe hain" },
        {
          en: "Each qubit's result is random, but the two results are linked",
          hi: "Har qubit ka result random hai, lekin dono results linked hain",
        },
        { en: "It removes all randomness from measurement", hi: "Yeh measurement se saari randomness hata deta hai" },
      ],
      answer: 2,
      explanation: {
        en: "Entanglement links results without making either one predictable on its own — and it cannot be used to send a message faster than light.",
        hi: "Entanglement results ko link karta hai, par kisi ek ko akele predictable nahi banata — aur isse light se faster message nahi bheja ja sakta.",
      },
    },
    {
      id: "ent-6",
      topic: "entanglement",
      type: "prediction",
      concept: "CX gate",
      difficulty: 1,
      prompt: {
        en: "Both qubits start in |0⟩. A CX is applied (q0 controls q1), then both are measured. What will you see?",
        hi: "Dono qubits |0⟩ se start hote hain. CX apply hota hai (q0 control, q1 target), phir dono measure. Kya dikhega?",
      },
      circuit: {
        qubits: 2,
        gates: [
          ["CX", 0, 0, 1],
          ["M", 0, 1],
          ["M", 1, 1],
        ],
      },
      options: [
        { en: "|11⟩ every time", hi: "Har baar |11⟩" },
        { en: "|00⟩ every time", hi: "Har baar |00⟩" },
        { en: "|00⟩ or |11⟩, about half each", hi: "|00⟩ ya |11⟩, lagbhag aadha-aadha" },
        { en: "|01⟩ every time", hi: "Har baar |01⟩" },
      ],
      answer: 1,
      explanation: {
        en: "The control q0 is |0⟩, so CX leaves the target alone. Nothing changes.",
        hi: "Control q0 |0⟩ hai, isliye CX target ko kuch nahi karta. Kuch change nahi hota.",
      },
    },
    {
      id: "ent-7",
      topic: "entanglement",
      type: "prediction",
      concept: "CX gate",
      difficulty: 3,
      prompt: {
        en: "X on q1, then CX (q0 controls q1), then measure both. What will you see?",
        hi: "q1 par X, phir CX (q0 control, q1 target), phir dono measure. Kya dikhega?",
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
      options: [
        { en: "|00⟩ every time", hi: "Har baar |00⟩" },
        { en: "|11⟩ every time", hi: "Har baar |11⟩" },
        { en: "|01⟩ every time", hi: "Har baar |01⟩" },
        { en: "|10⟩ every time", hi: "Har baar |10⟩" },
      ],
      answer: 2,
      explanation: {
        en: "X makes q1 a definite |1⟩. The control q0 is still |0⟩, so CX does nothing. The result is |01⟩: q0 = 0, q1 = 1.",
        hi: "X q1 ko definite |1⟩ banata hai. Control q0 abhi bhi |0⟩ hai, isliye CX kuch nahi karta. Result |01⟩ hai: q0 = 0, q1 = 1.",
      },
    },
    {
      id: "ent-8",
      topic: "entanglement",
      type: "prediction",
      concept: "Bell pair",
      difficulty: 3,
      misconceptions: { 3: "randomness_no_structure" },
      prompt: {
        en: "H on q0, CX (q0 controls q1), then X on q1, then measure both. What will you see?",
        hi: "q0 par H, CX (q0 control, q1 target), phir q1 par X, phir dono measure. Kya dikhega?",
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
      options: [
        { en: "|00⟩ or |11⟩, about half each", hi: "|00⟩ ya |11⟩, lagbhag aadha-aadha" },
        { en: "|01⟩ or |10⟩, about half each", hi: "|01⟩ ya |10⟩, lagbhag aadha-aadha" },
        { en: "|11⟩ every time", hi: "Har baar |11⟩" },
        { en: "All four results, about 25% each", hi: "Chaaron results, lagbhag 25% each" },
      ],
      answer: 1,
      explanation: {
        en: "The Bell pair gives 00 or 11. Flipping q1 turns those into 01 and 10: the qubits are still linked, but now they always disagree.",
        hi: "Bell pair 00 ya 11 deta hai. q1 ko flip karne se woh 01 aur 10 ban jaate hain: qubits abhi bhi linked hain, lekin ab hamesha disagree karte hain.",
      },
    },
    {
      id: "ent-9",
      topic: "entanglement",
      type: "mcq",
      concept: "Bell pair",
      difficulty: 4,
      misconceptions: { 1: "randomness_no_structure" },
      prompt: {
        en: "Which state does H on q0 followed by CX (q0 controls q1) produce from |00⟩?",
        hi: "|00⟩ se q0 par H aur phir CX (q0 control, q1 target) lagane par kaunsa state banta hai?",
      },
      options: [
        same("(|00⟩ + |11⟩)/√2"),
        same("(|00⟩ + |01⟩ + |10⟩ + |11⟩)/2"),
        same("|11⟩"),
        same("(|01⟩ + |10⟩)/√2"),
      ],
      answer: 0,
      explanation: {
        en: "H gives (|00⟩ + |10⟩)/√2, and CX flips q1 in the |10⟩ part, giving (|00⟩ + |11⟩)/√2. The amplitudes of |01⟩ and |10⟩ are exactly 0.",
        hi: "H se (|00⟩ + |10⟩)/√2 milta hai, aur CX |10⟩ part mein q1 flip karta hai, jisse (|00⟩ + |11⟩)/√2 banta hai. |01⟩ aur |10⟩ ke amplitudes exactly 0 hain.",
      },
    },
    {
      id: "ent-10",
      topic: "entanglement",
      type: "interpretation",
      concept: "Linked results",
      difficulty: 2,
      prompt: {
        en: "You run a Bell pair many times but look only at q1's results. What do you see?",
        hi: "Aap Bell pair ko kai baar run karte ho lekin sirf q1 ke results dekhte ho. Kya dikhta hai?",
      },
      options: [
        { en: "1 every time", hi: "Har baar 1" },
        { en: "About half 0 and half 1 — random on its own", hi: "Lagbhag aadha 0 aur aadha 1 — akele random" },
        { en: "The same as the previous run every time", hi: "Har baar pichhle run jaisa" },
        { en: "A pattern that spells a message", hi: "Ek pattern jo message spell karta hai" },
      ],
      answer: 1,
      explanation: {
        en: "Each qubit of a Bell pair looks completely random by itself. The order only appears when you compare the two qubits run by run.",
        hi: "Bell pair ka har qubit akele completely random lagta hai. Order tabhi dikhta hai jab dono qubits ko run by run compare karo.",
      },
    },
    {
      id: "ent-11",
      topic: "entanglement",
      type: "conceptual",
      concept: "Linked results",
      difficulty: 3,
      prompt: {
        en: "Using only measurement counts, how would you check that two qubits form a Bell pair?",
        hi: "Sirf measurement counts use karke aap kaise check karoge ki do qubits Bell pair hain?",
      },
      options: [
        { en: "Look at q0 alone", hi: "Sirf q0 ko dekho" },
        { en: "Run the circuit once", hi: "Circuit ek baar run karo" },
        { en: "Count the number of gates", hi: "Gates count karo" },
        {
          en: "Compare the two results run by run: only 00 and 11 appear, about half each",
          hi: "Dono results ko run by run compare karo: sirf 00 aur 11 aate hain, lagbhag aadha-aadha",
        },
      ],
      answer: 3,
      explanation: {
        en: "One qubit alone, or one run alone, cannot show a link. The joint counts can: 01 and 10 never appear.",
        hi: "Akela ek qubit, ya akela ek run, link nahi dikha sakta. Joint counts dikha sakte hain: 01 aur 10 kabhi nahi aate.",
      },
    },
    {
      id: "ent-12",
      topic: "entanglement",
      type: "conceptual",
      concept: "No signalling",
      difficulty: 3,
      misconceptions: { 1: "ftl_communication" },
      prompt: {
        en: "Alice and Bob share a Bell pair. Alice measures her qubit. What can Bob notice by looking only at his own qubit?",
        hi: "Alice aur Bob ek Bell pair share karte hain. Alice apna qubit measure karti hai. Bob sirf apna qubit dekhkar kya notice kar sakta hai?",
      },
      options: [
        {
          en: "Nothing new — his results still look 50/50 until they compare notes",
          hi: "Kuch naya nahi — jab tak woh results compare na karein, uske results 50/50 hi lagte hain",
        },
        {
          en: "His qubit flips instantly, which he can read as a message",
          hi: "Uska qubit instantly flip hota hai, jise woh message ki tarah read kar sakta hai",
        },
        { en: "His qubit can no longer be measured", hi: "Uska qubit ab measure nahi ho sakta" },
        { en: "He always sees 1", hi: "Use hamesha 1 dikhta hai" },
      ],
      answer: 0,
      explanation: {
        en: "Bob's own statistics do not change. The link shows up only when Alice and Bob compare results over an ordinary channel, which is no faster than light.",
        hi: "Bob ki apni statistics change nahi hotin. Link tabhi dikhta hai jab Alice aur Bob ordinary channel par results compare karein, jo light se faster nahi hota.",
      },
    },
    {
      id: "ent-13",
      topic: "entanglement",
      type: "conceptual",
      concept: "No signalling",
      difficulty: 1,
      misconceptions: { 1: "ftl_communication" },
      prompt: {
        en: "Can entanglement be used to send a message faster than light?",
        hi: "Kya entanglement se light se faster message bheja ja sakta hai?",
      },
      options: [
        {
          en: "No. Each result is random, and comparing results needs an ordinary channel",
          hi: "Nahi. Har result random hai, aur results compare karne ke liye ordinary channel chahiye",
        },
        { en: "Yes, instantly", hi: "Haan, instantly" },
        { en: "Yes, but only with a CX gate", hi: "Haan, lekin sirf CX gate ke saath" },
        { en: "Only when there are exactly two qubits", hi: "Sirf tab jab exactly do qubits hon" },
      ],
      answer: 0,
      explanation: {
        en: "Nobody can choose which result appears, so no information travels through the link itself.",
        hi: "Koi choose nahi kar sakta ki kaunsa result aayega, isliye link ke through koi information travel nahi karti.",
      },
    },
    {
      id: "ent-14",
      topic: "entanglement",
      type: "conceptual",
      concept: "CX gate",
      difficulty: 2,
      prompt: {
        en: "When does a CX gate create entanglement?",
        hi: "CX gate entanglement kab banata hai?",
      },
      options: [
        { en: "Always", hi: "Hamesha" },
        { en: "When its control qubit is in a superposition", hi: "Jab uska control qubit superposition mein ho" },
        { en: "Only when both qubits are |1⟩", hi: "Sirf jab dono qubits |1⟩ hon" },
        { en: "Never — entanglement needs three qubits", hi: "Kabhi nahi — entanglement ko teen qubits chahiye" },
      ],
      answer: 1,
      explanation: {
        en: "With a definite control, CX just flips or does not flip. With the control in superposition, the target is flipped in one part of the state and not the other — that is the link.",
        hi: "Definite control ho to CX bas flip karta hai ya nahi karta. Control superposition mein ho to target state ke ek part mein flip hota hai aur doosre mein nahi — yahi link hai.",
      },
    },
    {
      id: "ent-15",
      topic: "entanglement",
      type: "prediction",
      concept: "Bell pair",
      difficulty: 1,
      misconceptions: { 2: "randomness_no_structure" },
      prompt: {
        en: "In a Bell pair, which results never appear?",
        hi: "Bell pair mein kaunse results kabhi nahi aate?",
      },
      options: [
        { en: "|00⟩ and |11⟩", hi: "|00⟩ aur |11⟩" },
        { en: "|01⟩ and |10⟩", hi: "|01⟩ aur |10⟩" },
        { en: "None — all four appear equally often", hi: "Koi nahi — chaaron equally aate hain" },
        { en: "Only |00⟩", hi: "Sirf |00⟩" },
      ],
      answer: 1,
      explanation: {
        en: "The Bell state contains only |00⟩ and |11⟩. The results where the qubits differ have probability 0.",
        hi: "Bell state mein sirf |00⟩ aur |11⟩ hote hain. Jin results mein qubits differ karte hain unki probability 0 hai.",
      },
    },
    {
      id: "ent-16",
      topic: "entanglement",
      type: "conceptual",
      concept: "Linked results",
      difficulty: 4,
      prompt: {
        en: "In a Bell pair the lab shows each qubit's Bloch arrow as a dot at the centre. Why?",
        hi: "Bell pair mein lab har qubit ka Bloch arrow centre mein dot ki tarah dikhata hai. Kyun?",
      },
      options: [
        { en: "The qubits have been measured", hi: "Qubits measure ho chuke hain" },
        { en: "The simulator cannot draw two arrows", hi: "Simulator do arrows draw nahi kar sakta" },
        {
          en: "Each qubit alone has no definite state of its own — only the pair has one",
          hi: "Har qubit ka akele apna koi definite state nahi hai — sirf pair ka hai",
        },
        { en: "The qubits are both |0⟩", hi: "Dono qubits |0⟩ hain" },
      ],
      answer: 2,
      explanation: {
        en: "An entangled state cannot be split into one state per qubit. Looked at alone, each qubit is maximally mixed, which is the centre of the Bloch sphere.",
        hi: "Entangled state ko har qubit ke alag state mein split nahi kiya ja sakta. Akele dekhne par har qubit maximally mixed hota hai, jo Bloch sphere ka centre hai.",
      },
    },
  ],

  // -------------------------------------------------------------------------
  python: [
    {
      id: "py-1",
      topic: "python",
      type: "mcq",
      concept: "Variables",
      difficulty: 1,
      prompt: { en: "What does this code print?", hi: "Yeh code kya print karta hai?" },
      code: "x = 5\nx = x + 2\nprint(x)",
      options: [same("5"), same("7"), same("52"), same("x + 2")],
      answer: 1,
      explanation: {
        en: "x starts at 5, then becomes 5 + 2. The variable now holds 7.",
        hi: "x pehle 5 hai, phir 5 + 2 ban jaata hai. Ab variable mein 7 hai.",
      },
    },
    {
      id: "py-2",
      topic: "python",
      type: "mcq",
      concept: "Conditions",
      difficulty: 1,
      prompt: { en: "What does this code print?", hi: "Yeh code kya print karta hai?" },
      code: 'n = 3\nif n > 5:\n    print("big")\nelse:\n    print("small")',
      options: [same("big"), same("small"), same("3"), same("big small")],
      answer: 1,
      explanation: {
        en: "3 is not greater than 5, so Python skips the if block and runs the else block.",
        hi: "3, 5 se bada nahi hai, isliye Python if block skip karke else block run karta hai.",
      },
    },
    {
      id: "py-3",
      topic: "python",
      type: "mcq",
      concept: "Loops",
      difficulty: 1,
      prompt: { en: "What does this code print?", hi: "Yeh code kya print karta hai?" },
      code: "for i in range(3):\n    print(i)",
      options: [same("1 2 3"), same("0 1 2"), same("3"), same("0 1 2 3")],
      answer: 1,
      explanation: {
        en: "range(3) counts 0, 1, 2 — it starts at 0 and stops before 3.",
        hi: "range(3) 0, 1, 2 count karta hai — 0 se start hota hai aur 3 se pehle ruk jaata hai.",
      },
    },
    {
      id: "py-4",
      topic: "python",
      type: "mcq",
      concept: "Functions",
      difficulty: 1,
      prompt: { en: "What does this code print?", hi: "Yeh code kya print karta hai?" },
      code: "def double(n):\n    return n * 2\n\nprint(double(4))",
      options: [same("4"), same("44"), same("8"), same("double")],
      answer: 2,
      explanation: {
        en: "double(4) runs the function with n = 4 and returns 4 * 2 = 8.",
        hi: "double(4) function ko n = 4 ke saath run karta hai aur 4 * 2 = 8 return karta hai.",
      },
    },
    {
      id: "py-5",
      topic: "python",
      type: "mcq",
      concept: "Lists",
      difficulty: 1,
      prompt: { en: "What does this code print?", hi: "Yeh code kya print karta hai?" },
      code: "bits = [0, 1, 1]\nprint(len(bits))\nprint(bits[0])",
      options: [same("3 then 0"), same("2 then 1"), same("3 then 1"), same("0 then 3")],
      answer: 0,
      explanation: {
        en: "The list has 3 items, and positions start at 0, so bits[0] is the first item: 0.",
        hi: "List mein 3 items hain, aur positions 0 se start hoti hain, isliye bits[0] pehla item hai: 0.",
      },
    },
  ],
};

/** Every question written for a topic. */
export function questionBank(topic: TopicId): QuizQuestion[] {
  return QUIZZES[topic] ?? [];
}

/**
 * The fixed five-question check. Used only for Python Foundations, the
 * optional warm-up; the quantum concepts use the adaptive mastery check.
 */
export function quizFor(topic: TopicId): QuizQuestion[] {
  return (QUIZZES[topic] ?? []).slice(0, 5);
}

export function questionById(id: string): QuizQuestion | undefined {
  for (const list of Object.values(QUIZZES)) {
    const found = list?.find((q) => q.id === id);
    if (found) return found;
  }
  return undefined;
}
