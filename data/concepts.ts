import type { L, TopicId } from "@/lib/types";
import type { CircuitSpec } from "./challenges";

/** Interactive pieces a lesson section can embed. */
export type WidgetId =
  | "bit-vs-qubit"
  | "probability-dial"
  | "gate-table"
  | "gate-explorer"
  | "h-flow"
  | "shots-experiment"
  | "cx-table"
  | "bell-demo";

export type SectionKind = "concept" | "visual" | "interaction" | "example" | "predict";

export interface LessonSection {
  id: string;
  kind: SectionKind;
  title: L;
  body: L[];
  points?: L[];
  widget?: WidgetId;
  /** A circuit the learner can run (example) or predict (predict). */
  circuit?: CircuitSpec;
  question?: L;
  code?: { source: string; output: string };
  note?: L;
}

export interface Lesson {
  id: TopicId;
  minutes: number;
  intro: L;
  sections: LessonSection[];
  takeaways: L[];
}

export const SECTION_LABEL: Record<SectionKind, string> = {
  concept: "Concept",
  visual: "Visual",
  interaction: "Try it",
  example: "Example",
  predict: "Predict",
};

export const LESSONS: Partial<Record<TopicId, Lesson>> = {
  // -------------------------------------------------------------------------
  qubit: {
    id: "qubit",
    minutes: 6,
    intro: {
      en: "Start where you are. No physics background needed.",
      hi: "Jahan ho wahin se start karo. Physics background ki zaroorat nahi.",
    },
    sections: [
      {
        id: "what-is-a-qubit",
        kind: "concept",
        title: { en: "What is a qubit?", hi: "Qubit kya hai?" },
        body: [
          {
            en: "A classical bit is a switch. It is 0, or it is 1.",
            hi: "Classical bit ek switch hai. Ya to 0, ya 1.",
          },
          {
            en: "A qubit is the quantum version. Before you look, it holds a quantum state — a description of how likely each answer is. When you measure it, you always get a plain 0 or 1.",
            hi: "Qubit uska quantum version hai. Dekhne se pehle yeh ek quantum state hold karta hai — yaani har answer kitna likely hai. Jab measure karte ho, to hamesha plain 0 ya 1 milta hai.",
          },
        ],
        points: [
          {
            en: "|0⟩ (read “ket zero”) is the state that always measures 0.",
            hi: "|0⟩ (“ket zero”) woh state hai jo hamesha 0 measure hota hai.",
          },
          {
            en: "|1⟩ (“ket one”) is the state that always measures 1.",
            hi: "|1⟩ (“ket one”) woh state hai jo hamesha 1 measure hota hai.",
          },
          {
            en: "The |…⟩ brackets are only a label. They mean “this is a quantum state”.",
            hi: "|…⟩ brackets sirf ek label hain. Matlab “yeh ek quantum state hai”.",
          },
        ],
      },
      {
        id: "bit-vs-qubit",
        kind: "visual",
        title: { en: "Classical bit vs qubit", hi: "Classical bit vs qubit" },
        body: [
          {
            en: "A bit has a value. A qubit has a state, the state gives probabilities, and measurement turns those probabilities into one answer.",
            hi: "Bit ki ek value hoti hai. Qubit ka ek state hota hai, state se probability milti hai, aur measurement us probability ko ek answer mein badal deta hai.",
          },
        ],
        widget: "bit-vs-qubit",
      },
      {
        id: "probability",
        kind: "interaction",
        title: { en: "State, probability, measurement", hi: "State, probability, measurement" },
        body: [
          {
            en: "Set the qubit's state with the dial, then measure. One measurement gives one answer. Many measurements reveal the probability.",
            hi: "Dial se qubit ka state set karo, phir measure karo. Ek measurement ek answer deta hai. Kai measurements se probability dikhti hai.",
          },
        ],
        widget: "probability-dial",
        note: {
          en: "A full quantum state also carries a phase. You will meet it in Quantum Gates.",
          hi: "Poore quantum state mein ek phase bhi hota hai. Usse aap Quantum Gates mein miloge.",
        },
      },
      {
        id: "fresh-qubit",
        kind: "example",
        title: { en: "A fresh qubit", hi: "Ek fresh qubit" },
        body: [
          {
            en: "Every qubit in Quantum Nexus starts in |0⟩. The M box below is a measurement. Run it and see what a fresh qubit gives.",
            hi: "Quantum Nexus mein har qubit |0⟩ se start hota hai. Neeche M box measurement hai. Run karke dekho fresh qubit kya deta hai.",
          },
        ],
        circuit: { qubits: 1, gates: [["M", 0, 1]] },
      },
      {
        id: "predict-x",
        kind: "predict",
        title: { en: "Your first prediction", hi: "Aapki pehli prediction" },
        body: [
          {
            en: "Here is one new piece: the X box flips a qubit, like NOT flips a bit. Think before you run.",
            hi: "Yahan ek nayi cheez hai: X box qubit ko flip karta hai, jaise NOT bit ko flip karta hai. Run karne se pehle socho.",
          },
        ],
        circuit: {
          qubits: 1,
          gates: [
            ["X", 0, 0],
            ["M", 0, 1],
          ],
        },
        question: {
          en: "The qubit starts in |0⟩, gets flipped by X, then is measured. What do you predict?",
          hi: "Qubit |0⟩ se start hota hai, X use flip karta hai, phir measure hota hai. Aap kya predict karte ho?",
        },
      },
    ],
    takeaways: [
      { en: "A bit is 0 or 1. A qubit holds a quantum state.", hi: "Bit 0 ya 1 hota hai. Qubit ek quantum state hold karta hai." },
      {
        en: "The state sets the probability of each answer.",
        hi: "State har answer ki probability set karta hai.",
      },
      {
        en: "Measurement always returns one definite answer: 0 or 1.",
        hi: "Measurement hamesha ek definite answer deta hai: 0 ya 1.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  gates: {
    id: "gates",
    minutes: 7,
    intro: {
      en: "Gates are how you change a qubit. Five of them cover everything in this MVP.",
      hi: "Gates se qubit ko change kiya jaata hai. Is MVP ke liye paanch gates kaafi hain.",
    },
    sections: [
      {
        id: "what-is-a-gate",
        kind: "concept",
        title: { en: "Gates change the state", hi: "Gates state ko change karte hain" },
        body: [
          {
            en: "A gate is an operation that changes a qubit's state. A quantum circuit is a row of gates on a wire, applied from left to right.",
            hi: "Gate ek operation hai jo qubit ka state change karta hai. Quantum circuit ek wire par gates ki row hai, jo left se right apply hoti hai.",
          },
          {
            en: "Some gates change what you will measure. Others change only the phase — a hidden part of the state that matters once gates are combined.",
            hi: "Kuch gates measurement ka result change karte hain. Kuch sirf phase change karte hain — state ka ek hidden part jo gates combine hone par matter karta hai.",
          },
        ],
      },
      {
        id: "gate-table",
        kind: "visual",
        title: { en: "The five building blocks", hi: "Paanch building blocks" },
        body: [
          {
            en: "Read each card as “what goes in → what comes out”.",
            hi: "Har card ko “kya andar gaya → kya bahar aaya” ki tarah padho.",
          },
        ],
        widget: "gate-table",
      },
      {
        id: "gate-explorer",
        kind: "interaction",
        title: { en: "Try each gate", hi: "Har gate try karo" },
        body: [
          {
            en: "Pick a starting state and a gate. The arrow shows where the qubit points afterwards; the bars show what you would measure.",
            hi: "Ek starting state aur ek gate choose karo. Arrow dikhata hai ki qubit ab kahan point kar raha hai; bars dikhate hain ki measure karne par kya milega.",
          },
        ],
        widget: "gate-explorer",
      },
      {
        id: "x-twice",
        kind: "example",
        title: { en: "X twice", hi: "X do baar" },
        body: [
          {
            en: "One X flips |0⟩ to |1⟩. A second X flips it back. Run the circuit to confirm.",
            hi: "Ek X |0⟩ ko |1⟩ mein flip karta hai. Doosra X use wapas flip kar deta hai. Circuit run karke confirm karo.",
          },
        ],
        circuit: {
          qubits: 1,
          gates: [
            ["X", 0, 0],
            ["X", 0, 1],
            ["M", 0, 2],
          ],
        },
      },
      {
        id: "predict-z",
        kind: "predict",
        title: { en: "Test your intuition", hi: "Apni intuition test karo" },
        body: [
          {
            en: "Z is the tricky one. Remember what it changes — and what it leaves alone.",
            hi: "Z thoda tricky hai. Yaad rakho yeh kya change karta hai — aur kya nahi.",
          },
        ],
        circuit: {
          qubits: 1,
          gates: [
            ["Z", 0, 0],
            ["M", 0, 1],
          ],
        },
        question: {
          en: "Z is applied to |0⟩, then the qubit is measured. What do you predict?",
          hi: "|0⟩ par Z apply hota hai, phir qubit measure hota hai. Aap kya predict karte ho?",
        },
      },
    ],
    takeaways: [
      { en: "X flips: |0⟩ ↔ |1⟩.", hi: "X flip karta hai: |0⟩ ↔ |1⟩." },
      { en: "H turns |0⟩ into an equal superposition.", hi: "H |0⟩ ko equal superposition mein le jaata hai." },
      {
        en: "Z changes only the phase. Y flips and changes the phase.",
        hi: "Z sirf phase change karta hai. Y flip bhi karta hai aur phase bhi change karta hai.",
      },
      { en: "M reads the qubit as 0 or 1.", hi: "M qubit ko 0 ya 1 ki tarah read karta hai." },
    ],
  },

  // -------------------------------------------------------------------------
  superposition: {
    id: "superposition",
    minutes: 8,
    intro: {
      en: "The idea that makes quantum computing different.",
      hi: "Woh idea jo quantum computing ko alag banata hai.",
    },
    sections: [
      {
        id: "what-is-superposition",
        kind: "concept",
        title: { en: "A blend, not a secret", hi: "Blend hai, secret nahi" },
        body: [
          {
            en: "Superposition means a qubit's state is a blend of |0⟩ and |1⟩. It is not secretly one of them. It has a probability for each.",
            hi: "Superposition ka matlab hai ki qubit ka state |0⟩ aur |1⟩ ka blend hai. Yeh secretly kisi ek mein nahi hai. Dono ki apni probability hai.",
          },
          {
            en: "The Hadamard gate creates a superposition of |0⟩ and |1⟩. Measurement ends it: you get one definite answer, and the blend is gone.",
            hi: "Hadamard gate ek qubit ko superposition state mein le ja sakta hai, jahan measurement ke time |0⟩ ya |1⟩ milne ki probability hoti hai. Measurement ke baad ek definite answer milta hai, aur blend khatam ho jaata hai.",
          },
        ],
      },
      {
        id: "h-flow",
        kind: "visual",
        title: { en: "From |0⟩ to a result", hi: "|0⟩ se result tak" },
        body: [
          {
            en: "Follow one qubit through the smallest interesting circuit.",
            hi: "Ek qubit ko sabse chhote interesting circuit mein follow karo.",
          },
        ],
        widget: "h-flow",
      },
      {
        id: "shots",
        kind: "interaction",
        title: { en: "One run vs many runs", hi: "Ek run vs kai runs" },
        body: [
          {
            en: "Run the H circuit a different number of times. One run tells you almost nothing. A thousand runs reveal the probability.",
            hi: "H circuit ko alag-alag number of times run karo. Ek run se almost kuch pata nahi chalta. Hazaar runs se probability dikh jaati hai.",
          },
        ],
        widget: "shots-experiment",
      },
      {
        id: "h-twice",
        kind: "example",
        title: { en: "H twice — the surprise", hi: "H do baar — surprise" },
        body: [
          {
            en: "If superposition were only a hidden coin flip, two H gates would still give 50/50. Run this and look at what you actually get.",
            hi: "Agar superposition sirf hidden coin flip hota, to do H gates ke baad bhi 50/50 milta. Isse run karo aur dekho actually kya milta hai.",
          },
          {
            en: "The two paths interfere and cancel the |1⟩ result. That is the difference between superposition and not knowing.",
            hi: "Dono paths interfere karke |1⟩ result ko cancel kar dete hain. Yahi difference hai superposition aur 'pata nahi' mein.",
          },
        ],
        circuit: {
          qubits: 1,
          gates: [
            ["H", 0, 0],
            ["H", 0, 1],
            ["M", 0, 2],
          ],
        },
      },
      {
        id: "predict-h",
        kind: "predict",
        title: { en: "Predict the classic", hi: "Classic ko predict karo" },
        body: [
          {
            en: "This is the circuit every quantum learner meets first.",
            hi: "Yeh woh circuit hai jisse har quantum learner sabse pehle milta hai.",
          },
        ],
        circuit: {
          qubits: 1,
          gates: [
            ["H", 0, 0],
            ["M", 0, 1],
          ],
        },
        question: {
          en: "H is applied to |0⟩, then the qubit is measured many times. What do you predict?",
          hi: "|0⟩ par H apply hota hai, phir qubit ko kai baar measure kiya jaata hai. Aap kya predict karte ho?",
        },
      },
    ],
    takeaways: [
      {
        en: "H turns |0⟩ into an equal blend of |0⟩ and |1⟩.",
        hi: "H |0⟩ ko |0⟩ aur |1⟩ ke equal blend mein le jaata hai.",
      },
      {
        en: "Measurement gives one answer and ends the superposition.",
        hi: "Measurement ek answer deta hai aur superposition khatam kar deta hai.",
      },
      {
        en: "Probabilities show up over many runs, which is why results say ≈50%.",
        hi: "Probabilities kai runs mein dikhti hain, isliye results mein ≈50% likha hota hai.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  entanglement: {
    id: "entanglement",
    minutes: 7,
    intro: {
      en: "Two qubits, one shared story.",
      hi: "Do qubits, ek shared story.",
    },
    sections: [
      {
        id: "what-is-entanglement",
        kind: "concept",
        title: { en: "Linked results", hi: "Linked results" },
        body: [
          {
            en: "Entanglement links qubits so their results are connected. Each result on its own is random — yet once you see one, you know the other.",
            hi: "Entanglement qubits ko aise link karta hai ki unke results connected rehte hain. Har result akele random hai — phir bhi ek dekhte hi doosra pata chal jaata hai.",
          },
          {
            en: "The recipe uses a new two-qubit gate, CX. It flips the target qubit only when the control qubit is |1⟩.",
            hi: "Recipe mein ek naya two-qubit gate use hota hai, CX. Yeh target qubit ko tabhi flip karta hai jab control qubit |1⟩ ho.",
          },
        ],
      },
      {
        id: "cx-table",
        kind: "visual",
        title: { en: "What CX does", hi: "CX kya karta hai" },
        body: [
          {
            en: "Read each row as |control target⟩. The control never changes. The target flips only when the control is 1.",
            hi: "Har row ko |control target⟩ ki tarah padho. Control kabhi change nahi hota. Target tabhi flip hota hai jab control 1 ho.",
          },
        ],
        widget: "cx-table",
      },
      {
        id: "bell",
        kind: "interaction",
        title: { en: "Run a Bell pair", hi: "Bell pair run karo" },
        body: [
          {
            en: "H puts q0 into superposition, then CX ties q1 to it. Run it a few times and compare the two columns.",
            hi: "H q0 ko superposition mein daalta hai, phir CX q1 ko usse tie kar deta hai. Kuch baar run karo aur dono columns compare karo.",
          },
        ],
        widget: "bell-demo",
      },
      {
        id: "x-then-cx",
        kind: "example",
        title: { en: "CX without superposition", hi: "Bina superposition ke CX" },
        body: [
          {
            en: "Here the control is a definite |1⟩. CX flips the target, and that is all. No randomness and no entanglement — CX needs a superposition to create a link.",
            hi: "Yahan control definite |1⟩ hai. CX target ko flip karta hai, bas. Na randomness, na entanglement — link banane ke liye CX ko superposition chahiye.",
          },
        ],
        circuit: {
          qubits: 2,
          gates: [
            ["X", 0, 0],
            ["CX", 0, 1, 1],
            ["M", 0, 2],
            ["M", 1, 2],
          ],
        },
      },
      {
        id: "predict-bell",
        kind: "predict",
        title: { en: "Predict the Bell pair", hi: "Bell pair predict karo" },
        body: [
          {
            en: "Results are written |q0 q1⟩, so |10⟩ means q0 = 1 and q1 = 0.",
            hi: "Results |q0 q1⟩ ki tarah likhe jaate hain, yaani |10⟩ ka matlab q0 = 1 aur q1 = 0.",
          },
        ],
        circuit: {
          qubits: 2,
          gates: [
            ["H", 0, 0],
            ["CX", 0, 1, 1],
            ["M", 0, 2],
            ["M", 1, 2],
          ],
        },
        question: {
          en: "H on q0, then CX from q0 to q1, then both are measured. What do you predict?",
          hi: "q0 par H, phir q0 se q1 par CX, phir dono measure. Aap kya predict karte ho?",
        },
      },
    ],
    takeaways: [
      {
        en: "CX flips the target only when the control is |1⟩.",
        hi: "CX target ko tabhi flip karta hai jab control |1⟩ ho.",
      },
      {
        en: "H followed by CX makes a Bell pair: only |00⟩ or |11⟩.",
        hi: "H ke baad CX se Bell pair banta hai: sirf |00⟩ ya |11⟩.",
      },
      {
        en: "Entangled results are random one by one, but always linked.",
        hi: "Entangled results ek-ek karke random hote hain, lekin hamesha linked.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  python: {
    id: "python",
    minutes: 8,
    intro: {
      en: "Just enough Python to read quantum code later. This is a warm-up, not a full course.",
      hi: "Bas itna Python ki aage quantum code padh sako. Yeh warm-up hai, poora course nahi.",
    },
    sections: [
      {
        id: "syntax",
        kind: "concept",
        title: { en: "Basic syntax", hi: "Basic syntax" },
        body: [
          {
            en: "Python runs one line at a time, top to bottom. print() shows a value. Anything after # is a comment that Python ignores.",
            hi: "Python ek-ek line upar se neeche run karta hai. print() value dikhata hai. # ke baad jo likha hai woh comment hai, Python use ignore karta hai.",
          },
        ],
        code: {
          source: '# This is a comment\nprint("Hello, qubit")\nprint(2 + 3)',
          output: "Hello, qubit\n5",
        },
      },
      {
        id: "variables",
        kind: "concept",
        title: { en: "Variables", hi: "Variables" },
        body: [
          {
            en: "A variable is a name for a value. Use = to store a value, then use the name anywhere.",
            hi: "Variable ek value ka naam hai. = se value store karo, phir naam kahin bhi use karo.",
          },
        ],
        code: {
          source: 'shots = 100\nname = "q0"\nshots = shots + 50\nprint(name, shots)',
          output: "q0 150",
        },
      },
      {
        id: "conditions",
        kind: "concept",
        title: { en: "Conditions", hi: "Conditions" },
        body: [
          {
            en: "if runs a block only when something is true. else handles the other case. The indented lines belong to the block.",
            hi: "if ek block tabhi run karta hai jab koi cheez true ho. else doosra case handle karta hai. Indented lines us block ka part hoti hain.",
          },
        ],
        code: {
          source: 'result = 1\nif result == 1:\n    print("measured one")\nelse:\n    print("measured zero")',
          output: "measured one",
        },
      },
      {
        id: "loops",
        kind: "concept",
        title: { en: "Loops", hi: "Loops" },
        body: [
          {
            en: "A for loop repeats a block. range(3) counts 0, 1, 2 — it starts at 0 and stops before 3.",
            hi: "for loop ek block ko repeat karta hai. range(3) 0, 1, 2 count karta hai — 0 se start, 3 se pehle stop.",
          },
        ],
        code: {
          source: 'for shot in range(3):\n    print("run", shot)',
          output: "run 0\nrun 1\nrun 2",
        },
      },
      {
        id: "functions",
        kind: "concept",
        title: { en: "Functions", hi: "Functions" },
        body: [
          {
            en: "A function is a reusable recipe. def creates it, the name in brackets is its input, and return hands back the answer.",
            hi: "Function ek reusable recipe hai. def se banta hai, brackets mein uska input hota hai, aur return answer wapas deta hai.",
          },
        ],
        code: {
          source: "def percent(count, shots):\n    return count / shots * 100\n\nprint(percent(512, 1024))",
          output: "50.0",
        },
      },
      {
        id: "lists",
        kind: "concept",
        title: { en: "Lists", hi: "Lists" },
        body: [
          {
            en: "A list holds several values in order. Positions start at 0. len() tells you how many items there are.",
            hi: "List mein kai values order mein hoti hain. Positions 0 se start hoti hain. len() batata hai kitne items hain.",
          },
        ],
        code: {
          source: 'gates = ["H", "X", "M"]\nprint(gates[0])\nprint(len(gates))\ngates.append("Z")\nprint(gates)',
          output: "H\n3\n['H', 'X', 'M', 'Z']",
        },
        note: {
          en: "The outputs shown here are fixed examples. Quantum Nexus does not run Python — its circuits run in a local simulator.",
          hi: "Yahan dikhaye gaye outputs fixed examples hain. Quantum Nexus Python run nahi karta — iske circuits local simulator mein run hote hain.",
        },
      },
    ],
    takeaways: [
      { en: "Variables name values; = stores them.", hi: "Variables values ko naam dete hain; = unhe store karta hai." },
      {
        en: "if/else chooses; for repeats; def builds a reusable recipe.",
        hi: "if/else choose karta hai; for repeat karta hai; def reusable recipe banata hai.",
      },
      { en: "Lists hold values in order, counted from 0.", hi: "Lists values ko order mein rakhti hain, 0 se count hota hai." },
    ],
  },
};

export function lessonFor(topic: TopicId): Lesson | undefined {
  return LESSONS[topic];
}
