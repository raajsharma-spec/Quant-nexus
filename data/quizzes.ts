import type { L, TopicId } from "@/lib/types";
import type { CircuitSpec } from "./challenges";

export type QuestionType = "mcq" | "prediction" | "conceptual";

export interface QuizQuestion {
  id: string;
  topic: TopicId;
  type: QuestionType;
  /** The idea this question tests. Wrong answers mark it as a weak concept. */
  concept: string;
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
  ],

  // -------------------------------------------------------------------------
  gates: [
    {
      id: "gates-1",
      topic: "gates",
      type: "mcq",
      concept: "X gate",
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
  ],

  // -------------------------------------------------------------------------
  superposition: [
    {
      id: "super-1",
      topic: "superposition",
      type: "conceptual",
      concept: "Superposition",
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
      concept: "H gate",
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
  ],

  // -------------------------------------------------------------------------
  entanglement: [
    {
      id: "ent-1",
      topic: "entanglement",
      type: "mcq",
      concept: "CX gate",
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
      concept: "Entanglement",
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
      concept: "Entanglement",
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
      concept: "Entanglement",
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
  ],

  // -------------------------------------------------------------------------
  python: [
    {
      id: "py-1",
      topic: "python",
      type: "mcq",
      concept: "Variables",
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

export function quizFor(topic: TopicId): QuizQuestion[] {
  return QUIZZES[topic] ?? [];
}
