/**
 * External learning and research resources.
 *
 * These belong to other organisations. Quantum Nexus links to them for further
 * study and as the landscape our project was compared against — they are NOT
 * Quantum Nexus content, and the tutor never quotes them as a source.
 * (The tutor's sources are the verified entries in data/knowledge.ts.)
 *
 * Links were checked on 2 October 2026.
 */

export interface Reference {
  id: string;
  name: string;
  owner: string;
  url: string;
  /** What the resource is. */
  kind: "Course" | "Interactive tool" | "Coding exercises" | "Classroom material" | "Source code" | "Documentation";
  /** What it offers a learner. */
  offers: string;
  /** What it leaves to the learner or the teacher — the gap Quantum Nexus works on. */
  gap: string;
}

export const REFERENCES: Reference[] = [
  {
    id: "ibm-learning",
    name: "IBM Quantum Learning",
    owner: "IBM",
    url: "https://quantum.cloud.ibm.com/learning",
    kind: "Course",
    offers: "Structured courses on quantum information, algorithms and Qiskit, written by IBM researchers.",
    gap: "Lessons combine text, video and code. They are not organised around predicting a result before each run or around tracking one learner's misconceptions.",
  },
  {
    id: "ibm-composer",
    name: "IBM Quantum Composer",
    owner: "IBM",
    url: "https://quantum.cloud.ibm.com/docs/en/guides/composer",
    kind: "Interactive tool",
    offers: "A drag-and-drop circuit builder with live state visualisations and access to IBM hardware.",
    gap: "An open sandbox for building circuits, rather than a guided lesson with prediction and assessment for a first-time learner.",
  },
  {
    id: "ms-katas",
    name: "Microsoft Quantum Katas",
    owner: "Microsoft",
    url: "https://learn.microsoft.com/en-us/azure/quantum/katas-qdk-learning",
    kind: "Coding exercises",
    offers: "A self-paced course of explanations and Q# coding exercises, checked automatically inside the Quantum Development Kit for VS Code.",
    gap: "Exercises are written in Q# and run in a code editor, so they suit learners who are comfortable programming. They check code rather than a prediction or a written explanation.",
  },
  {
    id: "ms-katas-repo",
    name: "Microsoft Quantum Katas repository",
    owner: "Microsoft",
    url: "https://github.com/microsoft/QuantumKatas",
    kind: "Source code",
    offers: "The open-source notebooks and exercises behind the original Quantum Katas. Archived by Microsoft in 2024 and kept as a read-only reference.",
    gap: "Source material for self-study and teaching, without a learner model that adapts the path.",
  },
  {
    id: "pennylane-codebook",
    name: "PennyLane Codebook",
    owner: "Xanadu",
    url: "https://pennylane.ai/codebook",
    kind: "Coding exercises",
    offers: "Learning paths with short theory sections and auto-graded PennyLane coding exercises.",
    gap: "Code-first: exercises are solved in Python with PennyLane, so it suits learners who already program.",
  },
  {
    id: "ibm-classroom",
    name: "IBM Quantum classroom modules",
    owner: "IBM",
    url: "https://quantum.cloud.ibm.com/learning/en/modules/computer-science",
    kind: "Classroom material",
    offers: "Ready-made modules that educators can drop into existing computer-science and physics courses.",
    gap: "Designed for an instructor to deliver within a course; adapting to each student is the instructor's job.",
  },
  {
    id: "openqasm",
    name: "OpenQASM specification",
    owner: "OpenQASM community",
    url: "https://openqasm.com/",
    kind: "Documentation",
    offers: "The open standard for describing quantum circuits as text, supported by Qiskit and other frameworks.",
    gap: "A specification, not a learning resource. Quantum Nexus generates OpenQASM 2.0 from the learner's own circuit.",
  },
];

/** How the project positions itself against the resources above — stated without overclaiming. */
export const RESEARCH_GAP = {
  existing:
    "Existing resources already provide quantum courses, coding exercises, circuit simulators and interactive material — several of them excellent.",
  contribution:
    "Quantum Nexus does not claim to be the first quantum-learning platform. Its contribution is combining, in one guided workflow for complete beginners: tutor guidance, prediction before every run, simulation, misconception detection, personalised remediation and mastery-gated progression.",
  parts: [
    "Tutor guidance grounded in verified content",
    "Prediction-first learning",
    "Circuit simulation",
    "Misconception detection",
    "Personalised remediation",
    "Mastery progression",
  ],
};
