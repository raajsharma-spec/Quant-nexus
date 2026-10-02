/**
 * The verified knowledge base.
 *
 * Every tutor answer about a concept is built from one of these entries, and
 * the answer shows which entry it used. Retrieval (lib/knowledgeBase.ts) picks
 * the entries that best match the learner's question.
 *
 * Each entry is Quantum Nexus's own teaching content, reviewed for accuracy.
 * `meta` records its version and review state so content can be updated
 * without touching the interface. External resources are listed separately in
 * data/references.ts and are never presented as our own content.
 */

import type { GateSpec } from "@/lib/quantumSimulator";
import type { L, TopicId } from "@/lib/types";

export interface ContentMeta {
  version: string;
  status: "published" | "draft";
  /** Where the content comes from. */
  source: string;
  verified: boolean;
  updatedAt: string;
}

export const VERIFIED: ContentMeta = {
  version: "1.1",
  status: "published",
  source: "Quantum Nexus verified content",
  verified: true,
  updatedAt: "2026-10-02",
};

export interface KnowledgeEntry {
  id: string;
  topic: TopicId;
  /** The assessment concept it supports, when there is one. */
  concept?: string;
  title: string;
  /** Extra words a learner might use for this idea (English and Hinglish). */
  keywords: string[];
  /** The beginner explanation. */
  simple: L;
  /** The cause-and-effect explanation, used for "Why?". */
  why?: L;
  /** One level deeper, for learners who are ready. */
  deeper?: L;
  /** State-vector / matrix form, for "Show the math". */
  math?: L;
  /** A nudge that does not give the answer away. */
  hint?: L;
  /** A state the tutor can draw: the Bloch sphere and probabilities after these gates. */
  visual?: { qubits: number; gates: GateSpec[]; caption: L };
  link?: { label: string; href: string };
  /** Where in the product this content is taught. */
  ref: string;
  meta: ContentMeta;
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  // ---------------------------------------------------------------- qubit --
  {
    id: "qubit-basics",
    topic: "qubit",
    concept: "Bit vs qubit",
    title: "What a qubit is",
    keywords: ["qubit", "quantum bit", "what is a qubit", "qubit kya hai", "quantum state", "state"],
    simple: {
      en: "A qubit is the quantum version of a bit. Before you measure it, it holds a quantum state — a description of how likely each answer is. When you measure it, you always get a plain 0 or 1.",
      hi: "Qubit bit ka quantum version hai. Measure karne se pehle yeh ek quantum state hold karta hai — yaani har answer kitna likely hai. Measure karne par hamesha plain 0 ya 1 milta hai.",
    },
    why: {
      en: "A qubit is useful because its state can be a combination of |0⟩ and |1⟩, and gates can make the parts of that combination add up or cancel. That is what a classical bit cannot do.",
      hi: "Qubit isliye useful hai kyunki uska state |0⟩ aur |1⟩ ka combination ho sakta hai, aur gates us combination ke parts ko add ya cancel kara sakte hain. Classical bit yeh nahi kar sakta.",
    },
    deeper: {
      en: "The state is written α|0⟩ + β|1⟩. The numbers α and β are amplitudes, and the probability of each answer is the amplitude's size squared.",
      hi: "State ko α|0⟩ + β|1⟩ likhte hain. α aur β amplitudes hain, aur har answer ki probability us amplitude ke size ka square hoti hai.",
    },
    math: {
      en: "|ψ⟩ = α|0⟩ + β|1⟩ with |α|² + |β|² = 1. P(0) = |α|² and P(1) = |β|². On the Bloch sphere: |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}·sin(θ/2)|1⟩.",
      hi: "|ψ⟩ = α|0⟩ + β|1⟩, jahan |α|² + |β|² = 1. P(0) = |α|² aur P(1) = |β|². Bloch sphere par: |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}·sin(θ/2)|1⟩.",
    },
    hint: {
      en: "Ask yourself two things: what does the qubit hold BEFORE you look, and what do you get WHEN you look?",
      hi: "Khud se do cheezein poochho: dekhne se PEHLE qubit kya hold karta hai, aur dekhne PAR kya milta hai?",
    },
    visual: {
      qubits: 1,
      gates: [],
      caption: { en: "A fresh qubit: the arrow points up, at |0⟩.", hi: "Fresh qubit: arrow upar |0⟩ par point karta hai." },
    },
    link: { label: "Qubit Fundamentals", href: "/learn/qubit" },
    ref: "Qubit Fundamentals › What is a qubit?",
    meta: VERIFIED,
  },
  {
    id: "bit-vs-qubit",
    topic: "qubit",
    concept: "Bit vs qubit",
    title: "Classical bit vs qubit",
    keywords: ["bit", "classical", "difference", "compare", "versus", "vs", "fark", "antar", "switch"],
    simple: {
      en: "A bit is always a definite 0 or 1 — like a switch. A qubit holds a quantum state, which can be a combination of |0⟩ and |1⟩. The state gives a probability for each answer, and measurement turns it into one definite 0 or 1.",
      hi: "Bit hamesha definite 0 ya 1 hota hai — switch ki tarah. Qubit ek quantum state hold karta hai, jo |0⟩ aur |1⟩ ka combination ho sakta hai. State har answer ki probability deta hai, aur measurement use ek definite 0 ya 1 mein badal deta hai.",
    },
    why: {
      en: "The real difference is not 'two values at once'. It is that gates can make the paths of a superposition interfere — you see this when two H gates cancel and return |0⟩.",
      hi: "Real difference 'ek saath do values' nahi hai. Difference yeh hai ki gates superposition ke paths ko interfere kara sakte hain — yeh tab dikhta hai jab do H gates cancel hokar |0⟩ return karte hain.",
    },
    hint: {
      en: "Think about what each one has: a bit has a value, a qubit has a state.",
      hi: "Socho har ek ke paas kya hai: bit ke paas value hai, qubit ke paas state hai.",
    },
    link: { label: "Qubit Fundamentals", href: "/learn/qubit" },
    ref: "Qubit Fundamentals › Classical bit vs qubit",
    meta: VERIFIED,
  },
  {
    id: "ket-notation",
    topic: "qubit",
    concept: "Ket notation",
    title: "Ket notation: |0⟩ and |1⟩",
    keywords: ["ket", "bra-ket", "braket", "dirac", "notation", "bracket", "|0>", "|1>", "ket zero", "ket one"],
    simple: {
      en: "|0⟩ is read “ket zero”. The |…⟩ brackets are a label that means “this is a quantum state”. |0⟩ always measures 0 and |1⟩ always measures 1. For two qubits we write |q0 q1⟩, so |10⟩ means q0 = 1 and q1 = 0.",
      hi: "|0⟩ ko “ket zero” padhte hain. |…⟩ brackets ek label hain jiska matlab hai “yeh quantum state hai”. |0⟩ hamesha 0 measure hota hai aur |1⟩ hamesha 1. Do qubits ke liye |q0 q1⟩ likhte hain, yaani |10⟩ ka matlab q0 = 1 aur q1 = 0.",
    },
    math: {
      en: "As column vectors: |0⟩ = (1, 0)ᵀ and |1⟩ = (0, 1)ᵀ. Two qubits use the tensor product: |10⟩ = |1⟩ ⊗ |0⟩ = (0, 0, 1, 0)ᵀ.",
      hi: "Column vectors ki tarah: |0⟩ = (1, 0)ᵀ aur |1⟩ = (0, 1)ᵀ. Do qubits tensor product use karte hain: |10⟩ = |1⟩ ⊗ |0⟩ = (0, 0, 1, 0)ᵀ.",
    },
    link: { label: "Qubit Fundamentals", href: "/learn/qubit" },
    ref: "Qubit Fundamentals › What is a qubit?",
    meta: VERIFIED,
  },
  {
    id: "measurement-basics",
    topic: "qubit",
    concept: "Measurement",
    title: "What measurement returns",
    keywords: ["measure", "measurement", "m gate", "read", "result", "outcome", "measure karna"],
    simple: {
      en: "Measurement reads a qubit and always returns one plain 0 or 1. The probabilities come from the state: |0⟩ gives 0 every time, |1⟩ gives 1 every time, and only a superposition gives a random result.",
      hi: "Measurement qubit ko read karta hai aur hamesha ek plain 0 ya 1 return karta hai. Probabilities state se aati hain: |0⟩ har baar 0 deta hai, |1⟩ har baar 1, aur sirf superposition random result deta hai.",
    },
    why: {
      en: "One measurement can only give one answer, so a single run tells you very little. Repeating the run many times — each repeat is a shot — is how the probabilities become visible.",
      hi: "Ek measurement sirf ek answer de sakta hai, isliye single run se bahut kam pata chalta hai. Run ko kai baar repeat karne par — har repeat ek shot hai — probabilities dikhne lagti hain.",
    },
    hint: {
      en: "Before predicting, ask: is the state just before M definite, or a superposition?",
      hi: "Predict karne se pehle poochho: M se just pehle state definite hai ya superposition?",
    },
    link: { label: "Qubit Fundamentals", href: "/learn/qubit" },
    ref: "Qubit Fundamentals › State, probability, measurement",
    meta: VERIFIED,
  },
  {
    id: "probability-basics",
    topic: "qubit",
    concept: "Probability",
    title: "Probability, shots and counts",
    keywords: ["probability", "what is probability", "probability kya hai", "chance", "percent", "shots", "shot", "counts", "runs", "likely", "odds"],
    simple: {
      en: "A quantum state gives each result a probability. One run gives one result. Repeating the run many times (each repeat is a shot) gives counts, and counts divided by shots is the observed percentage. That is why you see ≈50% and not exactly 50%.",
      hi: "Quantum state har result ko ek probability deta hai. Ek run ek result deta hai. Run ko kai baar repeat karne par (har repeat ek shot hai) counts milte hain, aur counts ÷ shots observed percentage hai. Isliye ≈50% dikhta hai, exactly 50% nahi.",
    },
    deeper: {
      en: "Keep three things apart: the amplitude (a number in the state), the probability (amplitude size squared) and the count (how often a result actually showed up).",
      hi: "Teen cheezon ko alag rakho: amplitude (state ka ek number), probability (amplitude size ka square) aur count (result actually kitni baar aaya).",
    },
    math: {
      en: "P(x) = |amplitude of x|². Expected count = shots × P(x). For 1,024 shots at P = 0.5 the expected count is 512, give or take about 16.",
      hi: "P(x) = |x ka amplitude|². Expected count = shots × P(x). 1,024 shots aur P = 0.5 par expected count 512 hai, lagbhag 16 upar-neeche.",
    },
    ref: "Qubit Fundamentals › State, probability, measurement",
    meta: VERIFIED,
  },
  {
    id: "amplitude-vs-probability",
    topic: "qubit",
    concept: "Probability",
    title: "Amplitude is not probability",
    keywords: ["amplitude", "amplitudes", "square", "squared", "magnitude", "alpha", "beta", "1/√2", "sqrt"],
    simple: {
      en: "An amplitude is the number attached to a result inside the quantum state. It is not the probability. The probability is the squared size of the amplitude: an amplitude of 1/√2 gives a probability of 50%.",
      hi: "Amplitude woh number hai jo quantum state ke andar kisi result ke saath juda hota hai. Yeh probability nahi hai. Probability amplitude ke size ka square hoti hai: 1/√2 amplitude se 50% probability milti hai.",
    },
    why: {
      en: "Amplitudes can be negative or complex, so two of them can cancel each other. Probabilities can never cancel. That is why quantum mechanics needs amplitudes and not just probabilities.",
      hi: "Amplitudes negative ya complex ho sakte hain, isliye do amplitudes ek doosre ko cancel kar sakte hain. Probabilities kabhi cancel nahi hotin. Isiliye quantum mechanics ko sirf probabilities nahi, amplitudes chahiye.",
    },
    math: {
      en: "H|0⟩ = (1/√2)|0⟩ + (1/√2)|1⟩. P(0) = (1/√2)² = 1/2. If amplitudes were probabilities they would add up to 1.41, which is impossible.",
      hi: "H|0⟩ = (1/√2)|0⟩ + (1/√2)|1⟩. P(0) = (1/√2)² = 1/2. Agar amplitudes hi probabilities hote to total 1.41 ho jaata, jo impossible hai.",
    },
    ref: "Qubit Fundamentals › Go deeper",
    meta: VERIFIED,
  },

  // ---------------------------------------------------------------- gates --
  {
    id: "x-gate",
    topic: "gates",
    concept: "X gate",
    title: "The X gate (quantum NOT)",
    keywords: ["x gate", "pauli x", "pauli-x", "not gate", "flip", "bit flip", "x kya"],
    simple: {
      en: "X is the quantum NOT gate. It flips the qubit: |0⟩ → |1⟩ and |1⟩ → |0⟩. Apply it twice and you are back where you started.",
      hi: "X quantum NOT gate hai. Yeh qubit ko flip karta hai: |0⟩ → |1⟩ aur |1⟩ → |0⟩. Do baar lagao to wapas wahin aa jaate ho.",
    },
    why: {
      en: "On the Bloch sphere X is a half-turn around the X axis, which swaps the north pole (|0⟩) and the south pole (|1⟩). Two half-turns make a full turn, so the state returns.",
      hi: "Bloch sphere par X, X axis ke around half-turn hai, jo north pole (|0⟩) aur south pole (|1⟩) ko swap karta hai. Do half-turns ek full turn banate hain, isliye state wapas aa jaata hai.",
    },
    math: {
      en: "X = [[0, 1], [1, 0]]. X|0⟩ = |1⟩, X|1⟩ = |0⟩, and X·X = I.",
      hi: "X = [[0, 1], [1, 0]]. X|0⟩ = |1⟩, X|1⟩ = |0⟩, aur X·X = I.",
    },
    hint: { en: "X is the quantum NOT. What does NOT do to 0?", hi: "X quantum NOT hai. NOT 0 ke saath kya karta hai?" },
    visual: {
      qubits: 1,
      gates: [["X", 0, 0]],
      caption: { en: "After X the arrow points down, at |1⟩.", hi: "X ke baad arrow neeche |1⟩ par point karta hai." },
    },
    link: { label: "Quantum Gates", href: "/learn/gates" },
    ref: "Quantum Gates › The five building blocks",
    meta: VERIFIED,
  },
  {
    id: "h-gate",
    topic: "gates",
    concept: "H gate",
    title: "The Hadamard (H) gate",
    keywords: ["hadamard", "h gate", "h kya", "superposition gate", "h|0>", "h on 0"],
    simple: {
      en: "The Hadamard gate creates a superposition of |0⟩ and |1⟩. Apply H to |0⟩ and measurement gives 0 or 1 with equal probability. Apply H a second time and the qubit returns to |0⟩.",
      hi: "Hadamard gate ek qubit ko superposition state mein le ja sakta hai, jahan measurement ke time |0⟩ ya |1⟩ milne ki probability hoti hai. |0⟩ par H lagao to 0 ya 1 equal probability se milta hai. H dobara lagao to qubit wapas |0⟩ ban jaata hai.",
    },
    why: {
      en: "H turns the Bloch arrow from the pole to the equator. On the equator the |0⟩ and |1⟩ parts have equal size, so each result has probability 1/2.",
      hi: "H Bloch arrow ko pole se equator par le jaata hai. Equator par |0⟩ aur |1⟩ parts ka size equal hota hai, isliye har result ki probability 1/2 hoti hai.",
    },
    deeper: {
      en: "H|1⟩ is also an equal superposition, but with a minus sign on the |1⟩ part. Both measure 50/50, yet they are different states — a second H tells them apart.",
      hi: "H|1⟩ bhi equal superposition hai, lekin |1⟩ part par minus sign ke saath. Dono 50/50 measure hote hain, phir bhi yeh alag states hain — doosra H inhe alag kar deta hai.",
    },
    math: {
      en: "H = (1/√2)·[[1, 1], [1, −1]]. H|0⟩ = (|0⟩ + |1⟩)/√2 and H|1⟩ = (|0⟩ − |1⟩)/√2. Each amplitude is 1/√2, and (1/√2)² = 50%. H·H = I.",
      hi: "H = (1/√2)·[[1, 1], [1, −1]]. H|0⟩ = (|0⟩ + |1⟩)/√2 aur H|1⟩ = (|0⟩ − |1⟩)/√2. Har amplitude 1/√2 hai, aur (1/√2)² = 50%. H·H = I.",
    },
    hint: {
      en: "H does not pick an answer. Think about what it does to the chances of 0 and 1.",
      hi: "H koi answer pick nahi karta. Socho yeh 0 aur 1 ke chances ke saath kya karta hai.",
    },
    visual: {
      qubits: 1,
      gates: [["H", 0, 0]],
      caption: {
        en: "After H the arrow lies on the equator: an equal superposition.",
        hi: "H ke baad arrow equator par hai: equal superposition.",
      },
    },
    link: { label: "Try it in the Quantum Lab", href: "/lab" },
    ref: "Superposition & Measurement › A blend, not a secret",
    meta: VERIFIED,
  },
  {
    id: "y-gate",
    topic: "gates",
    concept: "Y gate",
    title: "The Y gate",
    keywords: ["y gate", "pauli y", "pauli-y", "y kya"],
    simple: {
      en: "Y flips the qubit like X does and also changes its phase. Apply Y to |0⟩ and measure: you get 1 every time — the phase is not visible in that measurement.",
      hi: "Y qubit ko X ki tarah flip karta hai aur saath mein phase bhi change karta hai. |0⟩ par Y lagakar measure karo: har baar 1 milta hai — phase us measurement mein dikhta nahi.",
    },
    math: {
      en: "Y = [[0, −i], [i, 0]]. Y|0⟩ = i|1⟩ and Y|1⟩ = −i|0⟩. The factor i has size 1, so it does not change any probability.",
      hi: "Y = [[0, −i], [i, 0]]. Y|0⟩ = i|1⟩ aur Y|1⟩ = −i|0⟩. Factor i ka size 1 hai, isliye yeh koi probability change nahi karta.",
    },
    link: { label: "Quantum Gates", href: "/learn/gates" },
    ref: "Quantum Gates › The five building blocks",
    meta: VERIFIED,
  },
  {
    id: "z-gate",
    topic: "gates",
    concept: "Z gate",
    title: "The Z gate",
    keywords: ["z gate", "pauli z", "pauli-z", "phase flip", "z kya"],
    simple: {
      en: "Z leaves |0⟩ alone and puts a minus sign on |1⟩. That is a phase change, so on its own it does not change what you measure. Its effect shows up when you combine it with H: H, then Z, then H turns |0⟩ into |1⟩.",
      hi: "Z |0⟩ ko waise hi chhod deta hai aur |1⟩ par minus sign lagata hai. Yeh phase change hai, isliye akele measurement ka result change nahi hota. Iska effect H ke saath dikhta hai: H, phir Z, phir H se |0⟩ ban jaata hai |1⟩.",
    },
    why: {
      en: "Measurement probabilities depend only on the size of each amplitude. A minus sign changes the sign, not the size, so the probabilities stay the same.",
      hi: "Measurement probabilities sirf har amplitude ke size par depend karti hain. Minus sign sign change karta hai, size nahi, isliye probabilities same rehti hain.",
    },
    math: {
      en: "Z = [[1, 0], [0, −1]]. Z|0⟩ = |0⟩ and Z|1⟩ = −|1⟩. Z turns |+⟩ into |−⟩, and H|−⟩ = |1⟩.",
      hi: "Z = [[1, 0], [0, −1]]. Z|0⟩ = |0⟩ aur Z|1⟩ = −|1⟩. Z |+⟩ ko |−⟩ banata hai, aur H|−⟩ = |1⟩.",
    },
    hint: {
      en: "Does |0⟩ have a |1⟩ part for Z to act on?",
      hi: "Kya |0⟩ mein koi |1⟩ part hai jis par Z act kare?",
    },
    link: { label: "Try H → Z → H in the Lab", href: "/lab" },
    ref: "Quantum Gates › Test your intuition",
    meta: VERIFIED,
  },
  {
    id: "s-t-gates",
    topic: "gates",
    concept: "Z gate",
    title: "The S and T phase gates",
    keywords: ["s gate", "t gate", "phase gate", "pi/8", "quarter turn", "s aur t"],
    simple: {
      en: "S and T are smaller versions of Z. Z turns the phase of |1⟩ by a half-turn, S by a quarter-turn and T by an eighth-turn. Like Z, they change the phase and not the measurement probabilities.",
      hi: "S aur T, Z ke chhote versions hain. Z |1⟩ ka phase half-turn se ghumata hai, S quarter-turn se aur T eighth-turn se. Z ki tarah yeh phase change karte hain, measurement probabilities nahi.",
    },
    math: {
      en: "S = [[1, 0], [0, i]] and T = [[1, 0], [0, e^{iπ/4}]]. T·T = S and S·S = Z.",
      hi: "S = [[1, 0], [0, i]] aur T = [[1, 0], [0, e^{iπ/4}]]. T·T = S aur S·S = Z.",
    },
    visual: {
      qubits: 1,
      gates: [
        ["H", 0, 0],
        ["S", 0, 1],
      ],
      caption: {
        en: "H then S: the arrow stays on the equator but has turned a quarter of the way round.",
        hi: "H phir S: arrow equator par hi hai, lekin quarter turn ghoom gaya hai.",
      },
    },
    link: { label: "Open Quantum Lab", href: "/lab" },
    ref: "Quantum Lab › Gate palette",
    meta: VERIFIED,
  },
  {
    id: "phase-basics",
    topic: "gates",
    concept: "Z gate",
    title: "Phase",
    keywords: ["phase", "relative phase", "minus sign", "sign", "hidden"],
    simple: {
      en: "Phase is a part of the quantum state that does not show up directly in a measurement — think of it as the sign (or angle) attached to the |1⟩ part. It matters because it changes how later gates combine. Z changes the phase; a following H makes the change visible.",
      hi: "Phase quantum state ka woh part hai jo measurement mein directly nahi dikhta — ise |1⟩ part ke saath lage sign (ya angle) ki tarah socho. Yeh matter karta hai kyunki isse baad ke gates kaise combine honge yeh change hota hai. Z phase change karta hai; uske baad H lagao to change dikhne lagta hai.",
    },
    why: {
      en: "Probabilities use the size of an amplitude, so a phase is invisible at first. But when a gate adds amplitudes together, their phases decide whether they add up or cancel.",
      hi: "Probabilities amplitude ka size use karti hain, isliye phase pehle invisible hota hai. Lekin jab koi gate amplitudes ko add karta hai, to unke phases decide karte hain ki woh add honge ya cancel.",
    },
    math: {
      en: "(|0⟩ + |1⟩)/√2 and (|0⟩ − |1⟩)/√2 both give 50/50, but H sends the first to |0⟩ and the second to |1⟩.",
      hi: "(|0⟩ + |1⟩)/√2 aur (|0⟩ − |1⟩)/√2 dono 50/50 dete hain, lekin H pehle ko |0⟩ aur doosre ko |1⟩ bana deta hai.",
    },
    visual: {
      qubits: 1,
      gates: [
        ["H", 0, 0],
        ["Z", 0, 1],
      ],
      caption: {
        en: "H then Z: still 50/50, but the arrow now points to the opposite side of the equator.",
        hi: "H phir Z: abhi bhi 50/50, lekin arrow ab equator ke opposite side par point karta hai.",
      },
    },
    link: { label: "Quantum Gates", href: "/learn/gates" },
    ref: "Quantum Gates › Gates change the state",
    meta: VERIFIED,
  },
  {
    id: "gate-reversibility",
    topic: "gates",
    concept: "X gate",
    title: "Gates can be undone",
    keywords: ["twice", "undo", "reverse", "reversible", "inverse", "unitary", "do baar", "cancel"],
    simple: {
      en: "Every quantum gate can be undone. X, Y, Z and H each undo themselves: apply the same gate twice and the qubit returns to where it started. Measurement is the exception — it cannot be undone.",
      hi: "Har quantum gate undo ho sakta hai. X, Y, Z aur H khud ko hi undo karte hain: same gate do baar lagao to qubit wapas wahin aa jaata hai. Measurement exception hai — woh undo nahi hota.",
    },
    math: {
      en: "Gates are unitary matrices: U†U = I. For X, Y, Z and H the gate is its own inverse, so U·U = I.",
      hi: "Gates unitary matrices hote hain: U†U = I. X, Y, Z aur H apna hi inverse hain, isliye U·U = I.",
    },
    link: { label: "Quantum Gates", href: "/learn/gates" },
    ref: "Quantum Gates › X twice",
    meta: VERIFIED,
  },
  {
    id: "rotation-gates",
    topic: "gates",
    title: "Rotation gates RX, RY, RZ",
    keywords: ["rx", "ry", "rz", "rotation", "rotate", "angle", "theta"],
    simple: {
      en: "RX, RY and RZ turn the Bloch arrow by an angle you choose, around the X, Y or Z axis. X, Y and Z are the special case of a half-turn (π). RY(π/2) on |0⟩ gives an equal superposition, like H.",
      hi: "RX, RY aur RZ Bloch arrow ko aapke chosen angle se X, Y ya Z axis ke around ghumate hain. X, Y aur Z half-turn (π) ka special case hain. |0⟩ par RY(π/2) equal superposition deta hai, H ki tarah.",
    },
    math: {
      en: "RY(θ)|0⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩, so P(1) = sin²(θ/2). For θ = π/2 that is 50%; for θ = π/4 it is about 15%.",
      hi: "RY(θ)|0⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩, isliye P(1) = sin²(θ/2). θ = π/2 par yeh 50% hai; θ = π/4 par lagbhag 15%.",
    },
    link: { label: "Open Quantum Lab", href: "/lab" },
    ref: "Quantum Lab › Advanced gates",
    meta: VERIFIED,
  },

  // -------------------------------------------------------- superposition --
  {
    id: "superposition-basics",
    topic: "superposition",
    concept: "Superposition",
    title: "Superposition",
    keywords: ["superposition", "blend", "combination", "superposition kya"],
    simple: {
      en: "Superposition means a qubit's state is a combination of |0⟩ and |1⟩. It is not secretly one of them. The amplitudes of the combination decide the probability of each result, and measurement gives one definite answer.",
      hi: "Superposition ka matlab hai ki qubit ka state |0⟩ aur |1⟩ ka combination hai. Yeh secretly kisi ek mein nahi hai. Combination ke amplitudes har result ki probability decide karte hain, aur measurement ek definite answer deta hai.",
    },
    why: {
      en: "The H gate creates it: H moves the state from the pole of the Bloch sphere to the equator, where the |0⟩ and |1⟩ parts are equally large.",
      hi: "H gate ise banata hai: H state ko Bloch sphere ke pole se equator par le jaata hai, jahan |0⟩ aur |1⟩ parts equally large hote hain.",
    },
    deeper: {
      en: "Proof that it is more than a coin flip: two H gates in a row give |0⟩ every time, because the two paths interfere.",
      hi: "Proof ki yeh sirf coin flip nahi hai: do H gates lagataar lagao to har baar |0⟩ milta hai, kyunki dono paths interfere karte hain.",
    },
    math: {
      en: "|+⟩ = H|0⟩ = (|0⟩ + |1⟩)/√2. P(0) = P(1) = (1/√2)² = 1/2.",
      hi: "|+⟩ = H|0⟩ = (|0⟩ + |1⟩)/√2. P(0) = P(1) = (1/√2)² = 1/2.",
    },
    hint: {
      en: "Superposition is about the state BEFORE measurement. What does the state give each result?",
      hi: "Superposition measurement se PEHLE ke state ke baare mein hai. State har result ko kya deta hai?",
    },
    visual: {
      qubits: 1,
      gates: [["H", 0, 0]],
      caption: {
        en: "An equal superposition: the arrow is on the equator and both results have 50%.",
        hi: "Equal superposition: arrow equator par hai aur dono results ka chance 50% hai.",
      },
    },
    link: { label: "Superposition & Measurement", href: "/learn/superposition" },
    ref: "Superposition & Measurement › A blend, not a secret",
    meta: VERIFIED,
  },
  {
    id: "superposition-not-coin",
    topic: "superposition",
    concept: "Superposition",
    title: "Superposition is not a hidden coin flip",
    keywords: ["coin", "coin flip", "random", "randomly", "secretly", "hidden", "classical randomness", "sikka"],
    simple: {
      en: "A coin under a cup is already heads or tails; you simply do not know which. A qubit in superposition is different: it has no hidden value. Its state is a combination of |0⟩ and |1⟩ whose parts can interfere.",
      hi: "Cup ke neeche rakha coin pehle se heads ya tails hota hai; bas aapko pata nahi. Superposition wala qubit alag hai: iski koi hidden value nahi hoti. Iska state |0⟩ aur |1⟩ ka combination hai jiske parts interfere kar sakte hain.",
    },
    why: {
      en: "The test is H twice. If H only shuffled a hidden coin, a second H would shuffle it again and you would still see 50/50. Instead you get 0 every time — the two ways of reaching |1⟩ cancel.",
      hi: "Test hai H do baar. Agar H sirf hidden coin shuffle karta, to doosra H phir shuffle karta aur 50/50 hi dikhta. Lekin har baar 0 milta hai — |1⟩ tak pahunchne ke dono raaste cancel ho jaate hain.",
    },
    visual: {
      qubits: 1,
      gates: [
        ["H", 0, 0],
        ["H", 0, 1],
      ],
      caption: {
        en: "H then H: the arrow is back at |0⟩. A coin flip could not do that.",
        hi: "H phir H: arrow wapas |0⟩ par hai. Coin flip aisa nahi kar sakta.",
      },
    },
    link: { label: "Try H → H in the Lab", href: "/lab" },
    ref: "Superposition & Measurement › H twice — the surprise",
    meta: VERIFIED,
  },
  {
    id: "measurement-collapse",
    topic: "superposition",
    concept: "Measurement",
    title: "Measurement ends a superposition",
    keywords: ["collapse", "after measurement", "measure superposition", "ends", "khatam", "definite"],
    simple: {
      en: "Measuring a qubit in superposition forces one definite answer and ends the superposition. If you see 1, the qubit is now a definite |1⟩, and measuring it again gives 1 again.",
      hi: "Superposition wale qubit ko measure karne par ek definite answer milta hai aur superposition khatam ho jaata hai. Agar 1 dikha, to qubit ab definite |1⟩ hai, aur dobara measure karne par phir 1 hi milega.",
    },
    why: {
      en: "Measurement is not a passive look. It is an interaction that changes the state, which is why it cannot be undone and why the lab ends a wire at M.",
      hi: "Measurement passive look nahi hai. Yeh ek interaction hai jo state ko change karta hai, isiliye yeh undo nahi hota aur lab wire ko M par end kar deta hai.",
    },
    link: { label: "Superposition & Measurement", href: "/learn/superposition" },
    ref: "Superposition & Measurement › A blend, not a secret",
    meta: VERIFIED,
  },
  {
    id: "interference",
    topic: "superposition",
    concept: "Interference",
    title: "Interference",
    keywords: ["interference", "interfere", "cancel", "h twice", "two h", "paths", "do baar h"],
    simple: {
      en: "Interference is when the parts of a superposition add up or cancel. With two H gates, the two ways of reaching |1⟩ cancel and the two ways of reaching |0⟩ add up, so you measure 0 every time.",
      hi: "Interference tab hota hai jab superposition ke parts add ya cancel hote hain. Do H gates mein |1⟩ tak pahunchne ke dono raaste cancel ho jaate hain aur |0⟩ wale add ho jaate hain, isliye har baar 0 measure hota hai.",
    },
    why: {
      en: "Amplitudes carry signs. The second H gives the |1⟩ result one contribution of +1/2 and one of −1/2, which sum to zero.",
      hi: "Amplitudes ke signs hote hain. Doosra H |1⟩ result ko ek +1/2 aur ek −1/2 contribution deta hai, jinka sum zero hai.",
    },
    math: {
      en: "H·H|0⟩ = H(|0⟩ + |1⟩)/√2 = ½(|0⟩ + |1⟩) + ½(|0⟩ − |1⟩) = |0⟩.",
      hi: "H·H|0⟩ = H(|0⟩ + |1⟩)/√2 = ½(|0⟩ + |1⟩) + ½(|0⟩ − |1⟩) = |0⟩.",
    },
    hint: {
      en: "What does the second H do to a state the first H created?",
      hi: "Pehle H ke banaye state ke saath doosra H kya karta hai?",
    },
    link: { label: "Try H → H in the Lab", href: "/lab" },
    ref: "Superposition & Measurement › H twice — the surprise",
    meta: VERIFIED,
  },
  {
    id: "sampling-variation",
    topic: "superposition",
    concept: "Probability",
    title: "Why results are ≈50%, not exactly 50%",
    keywords: ["exactly", "approximately", "variation", "sampling", "statistics", "noise", "wobble", "512", "not exact", "error", "bug"],
    simple: {
      en: "A finite number of shots is a sample, and samples vary. With 1,024 shots of an exact 50/50 circuit you will usually see something like 498 and 526, not 512 and 512. That is normal sampling variation, not a simulation error.",
      hi: "Finite shots ek sample hota hai, aur samples vary karte hain. Exact 50/50 circuit ke 1,024 shots mein aapko usually 498 aur 526 jaisa kuch dikhega, 512 aur 512 nahi. Yeh normal sampling variation hai, simulation error nahi.",
    },
    why: {
      en: "Each shot is an independent random draw. Probability describes the long run; any finite run lands near it, and more shots land closer.",
      hi: "Har shot ek independent random draw hai. Probability long run ko describe karti hai; koi bhi finite run uske paas land karta hai, aur zyada shots aur paas land karte hain.",
    },
    math: {
      en: "The typical spread of the observed fraction is √(p(1−p)/N). For p = 0.5: about 5% at N = 100, 1.6% at N = 1,024 and 0.5% at N = 10,000.",
      hi: "Observed fraction ka typical spread √(p(1−p)/N) hota hai. p = 0.5 ke liye: N = 100 par lagbhag 5%, N = 1,024 par 1.6% aur N = 10,000 par 0.5%.",
    },
    link: { label: "Superposition & Measurement", href: "/learn/superposition" },
    ref: "Superposition & Measurement › One run vs many runs",
    meta: VERIFIED,
  },

  // --------------------------------------------------------- entanglement --
  {
    id: "cx-gate",
    topic: "entanglement",
    concept: "CX gate",
    title: "The CX (CNOT) gate",
    keywords: ["cx", "cnot", "controlled", "control", "target", "controlled-x", "controlled not"],
    simple: {
      en: "CX (controlled-X) works on two qubits. It flips the target qubit only when the control qubit is |1⟩. With the control in superposition, CX entangles the two qubits.",
      hi: "CX (controlled-X) do qubits par kaam karta hai. Yeh target qubit ko tabhi flip karta hai jab control qubit |1⟩ ho. Control superposition mein ho to CX dono qubits ko entangle kar deta hai.",
    },
    why: {
      en: "CX acts on each part of the state separately. If the control is a combination of |0⟩ and |1⟩, the target is left alone in one part and flipped in the other — and the two qubits end up linked.",
      hi: "CX state ke har part par alag act karta hai. Agar control |0⟩ aur |1⟩ ka combination hai, to target ek part mein same rehta hai aur doosre mein flip hota hai — aur dono qubits linked ho jaate hain.",
    },
    math: {
      en: "CX = |0⟩⟨0| ⊗ I + |1⟩⟨1| ⊗ X. It maps |00⟩→|00⟩, |01⟩→|01⟩, |10⟩→|11⟩, |11⟩→|10⟩.",
      hi: "CX = |0⟩⟨0| ⊗ I + |1⟩⟨1| ⊗ X. Yeh |00⟩→|00⟩, |01⟩→|01⟩, |10⟩→|11⟩, |11⟩→|10⟩ map karta hai.",
    },
    hint: {
      en: "First decide what state the control is in. Then ask what CX does for that control.",
      hi: "Pehle decide karo control kis state mein hai. Phir poochho us control ke liye CX kya karta hai.",
    },
    link: { label: "Entanglement", href: "/learn/entanglement" },
    ref: "Entanglement › What CX does",
    meta: VERIFIED,
  },
  {
    id: "entanglement-basics",
    topic: "entanglement",
    concept: "Bell pair",
    title: "Entanglement and the Bell pair",
    keywords: ["entanglement", "entangle", "entangled", "bell", "bell pair", "bell state", "linked", "correlated"],
    simple: {
      en: "Entanglement links qubits so their results are connected. In a Bell pair (H on q0, then CX), each run gives 00 or 11 at random — the two qubits always agree, although neither result can be predicted on its own.",
      hi: "Entanglement qubits ko aise link karta hai ki unke results connected rehte hain. Bell pair mein (q0 par H, phir CX) har run randomly 00 ya 11 deta hai — dono qubits hamesha agree karte hain, halanki kisi ek ka result akele predict nahi ho sakta.",
    },
    why: {
      en: "H puts q0 into superposition. CX then flips q1 only in the part where q0 is 1. The state becomes |00⟩ + |11⟩: there is no part where the qubits differ, so |01⟩ and |10⟩ never appear.",
      hi: "H q0 ko superposition mein daalta hai. Phir CX q1 ko sirf us part mein flip karta hai jahan q0 1 hai. State |00⟩ + |11⟩ ban jaata hai: aisa koi part nahi jahan qubits differ karein, isliye |01⟩ aur |10⟩ kabhi nahi aate.",
    },
    math: {
      en: "|Φ⁺⟩ = (|00⟩ + |11⟩)/√2. It cannot be written as (a state of q0) ⊗ (a state of q1) — that is exactly what “entangled” means. Each qubit alone has a Bloch vector of length 0.",
      hi: "|Φ⁺⟩ = (|00⟩ + |11⟩)/√2. Ise (q0 ka state) ⊗ (q1 ka state) ki tarah nahi likha ja sakta — “entangled” ka exactly yahi matlab hai. Har qubit akele Bloch vector length 0 rakhta hai.",
    },
    hint: {
      en: "Follow the two parts of the superposition separately through the CX gate.",
      hi: "Superposition ke dono parts ko CX gate ke through alag-alag follow karo.",
    },
    visual: {
      qubits: 2,
      gates: [
        ["H", 0, 0],
        ["CX", 0, 1, 1],
      ],
      caption: {
        en: "A Bell pair: only |00⟩ and |11⟩ are possible. Each qubit alone has no arrow of its own.",
        hi: "Bell pair: sirf |00⟩ aur |11⟩ possible hain. Har qubit ka akele apna koi arrow nahi hota.",
      },
    },
    link: { label: "Entanglement", href: "/learn/entanglement" },
    ref: "Entanglement › Linked results",
    meta: VERIFIED,
  },
  {
    id: "entanglement-no-signalling",
    topic: "entanglement",
    concept: "No signalling",
    title: "Entanglement cannot send a message",
    keywords: ["faster than light", "ftl", "instant", "instantly", "communicate", "communication", "message", "signal", "teleport"],
    simple: {
      en: "Entanglement cannot be used to send a message faster than light. Each side sees random results on its own, and nobody can choose which result appears. The link only becomes visible when the two sides compare their results over an ordinary channel.",
      hi: "Entanglement se light se faster message nahi bheja ja sakta. Har side ko akele random results dikhte hain, aur koi choose nahi kar sakta ki kaunsa result aayega. Link tabhi dikhta hai jab dono sides ordinary channel par apne results compare karein.",
    },
    why: {
      en: "To send a message you must control what the other side sees. In a Bell pair the other qubit's own statistics are 50/50 whatever you do, so there is nothing for them to read.",
      hi: "Message bhejne ke liye aapko control karna hoga ki doosri side kya dekhe. Bell pair mein doosre qubit ki apni statistics 50/50 hi rehti hain, aap kuch bhi karo, isliye unke paas padhne ko kuch nahi hota.",
    },
    link: { label: "Entanglement", href: "/learn/entanglement" },
    ref: "Entanglement › Linked results",
    meta: VERIFIED,
  },
  {
    id: "linked-results",
    topic: "entanglement",
    concept: "Linked results",
    title: "Random one by one, linked together",
    keywords: ["correlation", "correlated", "agree", "match", "same result", "always same", "linked results"],
    simple: {
      en: "In a Bell pair, look at q0 alone and you see about half 0 and half 1. Look at q1 alone and you see the same. Compare them run by run and they always match. The order is in the pair, not in either qubit.",
      hi: "Bell pair mein q0 ko akele dekho to lagbhag aadha 0 aur aadha 1 dikhta hai. q1 ko akele dekho to wahi dikhta hai. Run by run compare karo to hamesha match karte hain. Order pair mein hai, kisi ek qubit mein nahi.",
    },
    link: { label: "Entanglement", href: "/learn/entanglement" },
    ref: "Entanglement › Run a Bell pair",
    meta: VERIFIED,
  },
  {
    id: "probability-structure",
    topic: "entanglement",
    concept: "Bell pair",
    title: "Quantum randomness follows exact rules",
    keywords: ["completely random", "no pattern", "no rule", "structure", "unpredictable", "calculate", "predict"],
    simple: {
      en: "A single quantum result is random, but the probabilities are fixed exactly by the state. You can calculate them before running anything — that is what the prediction step asks you to do. Some results have probability 0 and never appear.",
      hi: "Ek single quantum result random hota hai, lekin probabilities state se exactly fix hoti hain. Aap kuch bhi run karne se pehle unhe calculate kar sakte ho — prediction step aapse yahi karwata hai. Kuch results ki probability 0 hoti hai aur woh kabhi nahi aate.",
    },
    ref: "Entanglement › Predict the Bell pair",
    meta: VERIFIED,
  },
  {
    id: "multi-qubit-gates",
    topic: "entanglement",
    title: "CZ, SWAP and Toffoli",
    keywords: ["cz", "swap", "toffoli", "ccx", "controlled z", "three qubit"],
    simple: {
      en: "CZ flips the phase when both qubits are |1⟩. SWAP exchanges two qubits. Toffoli (CCX) flips its target only when both of its two controls are |1⟩. All three are available in the Quantum Lab.",
      hi: "CZ tab phase flip karta hai jab dono qubits |1⟩ hon. SWAP do qubits ko exchange karta hai. Toffoli (CCX) target ko tabhi flip karta hai jab uske dono controls |1⟩ hon. Teeno Quantum Lab mein available hain.",
    },
    math: {
      en: "CZ = diag(1, 1, 1, −1). H on the target, then CZ, then H on the target equals CX.",
      hi: "CZ = diag(1, 1, 1, −1). Target par H, phir CZ, phir target par H — yeh CX ke equal hai.",
    },
    link: { label: "Open Quantum Lab", href: "/lab" },
    ref: "Quantum Lab › Gate palette",
    meta: VERIFIED,
  },

  // --------------------------------------------------------------- general --
  {
    id: "bloch-sphere",
    topic: "qubit",
    title: "The Bloch sphere",
    keywords: ["bloch", "sphere", "arrow", "north pole", "equator", "visualize", "visualise", "picture"],
    simple: {
      en: "The Bloch sphere is a picture of one qubit's state as an arrow. Pointing up is |0⟩, pointing down is |1⟩, and the equator holds the equal superpositions. Gates rotate the arrow. An entangled qubit has no arrow of its own, so the lab shows a dot at the centre.",
      hi: "Bloch sphere ek qubit ke state ko arrow ki tarah dikhata hai. Upar matlab |0⟩, neeche matlab |1⟩, aur equator par equal superpositions hote hain. Gates arrow ko rotate karte hain. Entangled qubit ka apna arrow nahi hota, isliye lab centre mein ek dot dikhata hai.",
    },
    math: {
      en: "The arrow is (x, y, z) = (sin θ·cos φ, sin θ·sin φ, cos θ), and P(0) = (1 + z)/2.",
      hi: "Arrow (x, y, z) = (sin θ·cos φ, sin θ·sin φ, cos θ) hai, aur P(0) = (1 + z)/2.",
    },
    link: { label: "Open Quantum Lab", href: "/lab" },
    ref: "Quantum Lab › Bloch sphere",
    meta: VERIFIED,
  },
  {
    id: "quantum-computing-basics",
    topic: "qubit",
    title: "Quantum computing",
    keywords: ["quantum computing", "quantum computer", "what is quantum computing", "quantum computing kya hai", "quantum algorithm", "algorithm", "why quantum"],
    simple: {
      en: "Quantum computing stores information in qubits instead of bits. Gates change the qubits' state, and a measurement at the end reads out ordinary 0s and 1s. A quantum algorithm arranges the gates so that wrong answers cancel and right answers become likely.",
      hi: "Quantum computing information ko bits ki jagah qubits mein store karta hai. Gates qubits ka state change karte hain, aur end mein measurement ordinary 0 aur 1 read karta hai. Quantum algorithm gates ko aise arrange karta hai ki wrong answers cancel ho jayein aur right answers likely ban jayein.",
    },
    why: {
      en: "The power comes from three ideas you learn in this course: superposition (a state that combines |0⟩ and |1⟩), interference (parts of a state adding up or cancelling) and entanglement (qubits whose results are linked).",
      hi: "Power teen ideas se aati hai jo aap is course mein seekhte ho: superposition (state jo |0⟩ aur |1⟩ ko combine karta hai), interference (state ke parts ka add ya cancel hona) aur entanglement (qubits jinke results linked hote hain).",
    },
    deeper: {
      en: "A quantum computer is not simply a faster computer. It helps only for problems where an algorithm can use interference to raise the probability of the right answer. For everyday tasks a classical computer is still the right tool.",
      hi: "Quantum computer simply ek faster computer nahi hai. Yeh sirf un problems mein help karta hai jahan algorithm interference use karke right answer ki probability badha sake. Everyday tasks ke liye classical computer hi sahi tool hai.",
    },
    link: { label: "Start with Qubit Fundamentals", href: "/learn/qubit" },
    ref: "Qubit Fundamentals › Discover",
    meta: VERIFIED,
  },
  {
    id: "gate-basics",
    topic: "gates",
    title: "What a gate is",
    keywords: ["gate", "gates", "quantum gate", "what is a gate", "gate kya hai", "operation"],
    simple: {
      en: "A gate is an operation that changes a qubit's state. X flips |0⟩ and |1⟩, H creates an equal superposition, Z changes the phase. Gates never measure: the result only appears when an M gate reads the qubit.",
      hi: "Gate ek operation hai jo qubit ka state change karta hai. X |0⟩ aur |1⟩ ko flip karta hai, H equal superposition banata hai, Z phase change karta hai. Gates kabhi measure nahi karte: result tabhi dikhta hai jab M gate qubit read karta hai.",
    },
    why: {
      en: "A gate turns the state on the Bloch sphere without losing any information, so every gate can be undone by another gate. Measurement is the only step that cannot be undone.",
      hi: "Gate Bloch sphere par state ko ghumata hai, koi information lose kiye bina, isliye har gate ko doosre gate se undo kiya ja sakta hai. Measurement hi ek aisa step hai jo undo nahi hota.",
    },
    math: {
      en: "A single-qubit gate is a 2×2 unitary matrix U acting on the state: |ψ'⟩ = U|ψ⟩, with U†U = I. For example X = [[0,1],[1,0]] and H = (1/√2)·[[1,1],[1,−1]].",
      hi: "Single-qubit gate ek 2×2 unitary matrix U hai jo state par act karta hai: |ψ'⟩ = U|ψ⟩, jahan U†U = I. Jaise X = [[0,1],[1,0]] aur H = (1/√2)·[[1,1],[1,−1]].",
    },
    link: { label: "Quantum Gates", href: "/learn/gates" },
    ref: "Quantum Gates › Gates change the state",
    meta: VERIFIED,
  },
  {
    id: "circuit-basics",
    topic: "gates",
    title: "Reading a quantum circuit",
    keywords: ["circuit", "wire", "wires", "left to right", "diagram", "read a circuit"],
    simple: {
      en: "A quantum circuit is a set of wires — one per qubit — with gates placed on them. Gates run from left to right, and an M gate at the end reads the result. In the lab, measurement must be the last thing on a wire.",
      hi: "Quantum circuit wires ka set hai — har qubit ke liye ek — jin par gates lage hote hain. Gates left se right run hote hain, aur end mein M gate result read karta hai. Lab mein measurement wire par last cheez honi chahiye.",
    },
    link: { label: "Open Quantum Lab", href: "/lab" },
    ref: "Quantum Gates › Gates change the state",
    meta: VERIFIED,
  },
  {
    id: "simulator-hardware",
    topic: "qubit",
    title: "Simulator, Qiskit and real hardware",
    keywords: ["hardware", "real quantum", "quantum computer", "ibm", "qiskit", "simulator", "simulation", "openqasm", "qasm", "qpu", "cloud"],
    simple: {
      en: "Quantum Nexus runs every circuit in a local educational simulator inside your browser. The lab also shows the same circuit as Qiskit code and OpenQASM, and can send it to an optional Qiskit Aer service when one is connected. It does not use real quantum hardware; a cloud quantum processor is a future option, not a requirement.",
      hi: "Quantum Nexus har circuit ko aapke browser ke andar local educational simulator mein run karta hai. Lab wahi circuit Qiskit code aur OpenQASM mein bhi dikhata hai, aur connected ho to optional Qiskit Aer service ko bhej sakta hai. Yeh real quantum hardware use nahi karta; cloud quantum processor future option hai, requirement nahi.",
    },
    why: {
      en: "A simulator calculates the exact state, so its only randomness is sampling. Real hardware also has noise from imperfect gates and measurement, so results there differ a little more.",
      hi: "Simulator exact state calculate karta hai, isliye isme sirf sampling ki randomness hoti hai. Real hardware mein imperfect gates aur measurement ka noise bhi hota hai, isliye wahan results thoda aur differ karte hain.",
    },
    link: { label: "See the architecture", href: "/architecture" },
    ref: "Architecture › Implemented now",
    meta: VERIFIED,
  },
  {
    id: "tutor-identity",
    topic: "qubit",
    title: "What this tutor is",
    keywords: ["who are you", "what are you", "are you ai", "chatgpt", "llm", "trained", "model", "tum kaun", "aap kaun", "gpt"],
    simple: {
      en: "I am the Contextual AI Tutor for this build. I run locally in your browser: I retrieve the best-matching entries from a verified knowledge base and combine them with your own learning context. I am not a trained language model and I do not call any AI service, so I can only answer what the knowledge base covers.",
      hi: "Main is build ka Contextual AI Tutor hoon. Main aapke browser mein locally chalta hoon: verified knowledge base se best-matching entries retrieve karke unhe aapke learning context ke saath combine karta hoon. Main koi trained language model nahi hoon aur kisi AI service ko call nahi karta, isliye main wahi answer kar sakta hoon jo knowledge base mein hai.",
    },
    link: { label: "See the architecture", href: "/architecture" },
    ref: "Architecture › What we do not claim",
    meta: VERIFIED,
  },
  {
    id: "python-basics",
    topic: "python",
    title: "Python for quantum code",
    keywords: ["python", "variable", "variables", "loop", "loops", "function", "functions", "list", "lists", "code"],
    simple: {
      en: "You only need a little Python to read quantum code: variables, if/else, for loops, functions and lists. Python Foundations covers those in a few minutes, and it is optional — the quantum modules never depend on it.",
      hi: "Quantum code padhne ke liye thoda sa Python kaafi hai: variables, if/else, for loops, functions aur lists. Python Foundations inhe kuch minutes mein cover karta hai, aur yeh optional hai — quantum modules is par kabhi depend nahi karte.",
    },
    link: { label: "Python Foundations", href: "/learn/python" },
    ref: "Python Foundations",
    meta: VERIFIED,
  },
];

export function knowledgeById(id: string): KnowledgeEntry | undefined {
  return KNOWLEDGE.find((entry) => entry.id === id);
}
