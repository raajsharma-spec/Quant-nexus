import type { L, TopicId } from "@/lib/types";

export interface TopicMeta {
  id: TopicId;
  number: string;
  title: string;
  blurb: L;
  /** True when the module has a real lesson, practice and mastery check in this MVP. */
  interactive: boolean;
}

/** The learning roadmap, in order. */
export const ROADMAP: TopicMeta[] = [
  {
    id: "qubit",
    number: "01",
    title: "Qubit Fundamentals",
    blurb: {
      en: "What a qubit is, how it differs from a bit, and what |0⟩ and |1⟩ mean.",
      hi: "Qubit kya hai, bit se kaise alag hai, aur |0⟩ aur |1⟩ ka matlab kya hai.",
    },
    interactive: true,
  },
  {
    id: "gates",
    number: "02",
    title: "Quantum Gates",
    blurb: {
      en: "H, X, Y, Z and M — the building blocks that change and read a qubit.",
      hi: "H, X, Y, Z aur M — woh building blocks jo qubit ko change aur read karte hain.",
    },
    interactive: true,
  },
  {
    id: "superposition",
    number: "03",
    title: "Superposition & Measurement",
    blurb: {
      en: "How H creates a blend of |0⟩ and |1⟩, and what measurement does to it.",
      hi: "H gate |0⟩ aur |1⟩ ka blend kaise banata hai, aur measurement us par kya karta hai.",
    },
    interactive: true,
  },
  {
    id: "entanglement",
    number: "04",
    title: "Entanglement",
    blurb: {
      en: "Link two qubits with CX so their results always agree.",
      hi: "CX se do qubits ko link karo taaki unke results hamesha match karein.",
    },
    interactive: true,
  },
  {
    id: "circuits",
    number: "05",
    title: "Quantum Circuits",
    blurb: {
      en: "Reading and designing larger circuits.",
      hi: "Bade circuits ko read aur design karna.",
    },
    interactive: false,
  },
  {
    id: "deutsch-jozsa",
    number: "06",
    title: "Deutsch-Jozsa",
    blurb: {
      en: "The first algorithm that shows a quantum advantage.",
      hi: "Pehla algorithm jo quantum advantage dikhata hai.",
    },
    interactive: false,
  },
  {
    id: "grover",
    number: "07",
    title: "Grover's Algorithm",
    blurb: {
      en: "Searching faster with amplitude amplification.",
      hi: "Amplitude amplification se faster search.",
    },
    interactive: false,
  },
  {
    id: "qft",
    number: "08",
    title: "Quantum Fourier Transform",
    blurb: {
      en: "The engine behind many famous quantum algorithms.",
      hi: "Kai famous quantum algorithms ke peeche ka engine.",
    },
    interactive: false,
  },
];

export const PYTHON_TOPIC: TopicMeta = {
  id: "python",
  number: "00",
  title: "Python Foundations",
  blurb: {
    en: "A short warm-up: variables, conditions, loops, functions and lists.",
    hi: "Ek chhota warm-up: variables, conditions, loops, functions aur lists.",
  },
  interactive: true,
};

/** Topics with real content in this MVP, in unlock order. */
export const INTERACTIVE_TOPICS: TopicId[] = ROADMAP.filter((t) => t.interactive).map((t) => t.id);

export function topicMeta(id: TopicId): TopicMeta {
  if (id === "python") return PYTHON_TOPIC;
  return ROADMAP.find((t) => t.id === id) ?? ROADMAP[0];
}

export function topicTitle(id: TopicId): string {
  return topicMeta(id).title;
}
