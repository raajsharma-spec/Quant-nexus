/**
 * Shared pieces of the Predict → Run → Observe → Explain cycle, used by the
 * concept journey, the lab, practice challenges and the demo learner.
 */

import type { ExperimentInput } from "./actions";
import type { BackendId } from "./execution";
import { explainCircuit, type Explanation } from "./explain";
import { countsLabel, ket } from "./prediction";
import { describeCircuit, orderedGates, type Circuit, type SimulationSuccess } from "./quantumSimulator";
import type { Confidence, L, TopicId } from "./types";

export interface ExperimentArgs {
  circuit: Circuit;
  result: SimulationSuccess;
  source: ExperimentInput["source"];
  topic: TopicId;
  /** The learner's prediction, as shown to them. */
  predictionLabel: string;
  /** The predicted probabilities, when the prediction was a distribution. */
  predicted: Record<string, number> | null;
  correct: boolean;
  confidence?: Confidence;
  challengeId?: string;
  backend?: BackendId;
  explanation?: Explanation;
}

/** Everything the learning state needs to remember about one executed experiment. */
export function experimentInput(args: ExperimentArgs): ExperimentInput {
  const explanation = args.explanation ?? explainCircuit(args.result);
  return {
    source: args.source,
    topic: args.topic,
    circuit: describeCircuit(args.circuit),
    gates: Array.from(new Set(args.circuit.gates.map((g) => g.type))).join(","),
    sequence: orderedGates(args.circuit)
      .map((g) => g.type)
      .join(","),
    prediction: args.predictionLabel,
    predicted: args.predicted,
    actual: countsLabel(args.result.counts, args.result.shots),
    correct: args.correct,
    steps: explanation.steps,
    summary: explanation.summary,
    challengeId: args.challengeId,
    confidence: args.confidence,
    counts: args.result.counts,
    shots: args.result.shots,
    probabilities: args.result.probabilities,
    backend: args.backend ?? "browser",
  };
}

export interface ObservationCheck {
  id: string;
  prompt: L;
  options: L[];
  answer: number;
  /** Shown after a correct answer. */
  insight: L;
}

/**
 * Two short checks that make the learner actually read the result before it
 * is explained to them. The right answers are computed from THIS run's data.
 */
export function observationChecks(result: SimulationSuccess): ObservationCheck[] {
  const labels = Object.keys(result.probabilities).sort();
  const likely = labels.filter((label) => result.probabilities[label] > 0.0005);
  const top = Math.max(...labels.map((label) => result.probabilities[label]));
  const leaders = labels.filter((label) => Math.abs(result.probabilities[label] - top) < 1e-6);
  const random = likely.length > 1;

  // Check 1 — read the histogram.
  const options: L[] = labels.map((label) => ({ en: `${ket(label)} clearly most often`, hi: `${ket(label)} clearly sabse zyada` }));
  options.push({
    en: leaders.length > 1 ? `${leaders.map(ket).join(" and ")} about equally often` : "All results about equally often",
    hi: leaders.length > 1 ? `${leaders.map(ket).join(" aur ")} lagbhag equally` : "Saare results lagbhag equally",
  });
  const mostAnswer = leaders.length > 1 ? labels.length : labels.indexOf(leaders[0]);

  const counts = labels.map((label) => `${ket(label)} = ${result.counts[label]}`).join(", ");
  const most: ObservationCheck = {
    id: "most",
    prompt: {
      en: "Look at the counts. Which result did the measurement give most often?",
      hi: "Counts dekho. Measurement ne kaunsa result sabse zyada diya?",
    },
    options,
    answer: mostAnswer,
    insight: {
      en: `The counts were ${counts} out of ${result.shots.toLocaleString()} shots.`,
      hi: `${result.shots.toLocaleString()} shots mein counts the: ${counts}.`,
    },
  };

  // Check 2 — interpret it statistically.
  const why: ObservationCheck = random
    ? {
        id: "why",
        prompt: {
          en: "The measured percentages are close to the exact probabilities, but not identical. What does that tell you?",
          hi: "Measured percentages exact probabilities ke close hain, lekin identical nahi. Isse kya pata chalta hai?",
        },
        options: [
          { en: "The simulator made an error", hi: "Simulator ne error kiya" },
          {
            en: "Nothing is wrong: a finite number of shots is a sample, and samples vary a little",
            hi: "Kuch galat nahi: finite shots ek sample hai, aur samples thoda vary karte hain",
          },
          { en: "One of the gates is biased", hi: "Koi gate biased hai" },
        ],
        answer: 1,
        insight: {
          en: "That small difference is sampling variation. More shots make it smaller; it is never a simulation error.",
          hi: "Yeh chhota difference sampling variation hai. Zyada shots se yeh kam hota hai; yeh kabhi simulation error nahi hota.",
        },
      }
    : {
        id: "why",
        prompt: {
          en: "Every shot gave the same result. If you ran the circuit again, what would you expect?",
          hi: "Har shot ne same result diya. Circuit dobara run karo to kya expect karoge?",
        },
        options: [
          {
            en: "The same result on every shot — the state before measurement is definite",
            hi: "Har shot par same result — measurement se pehle state definite hai",
          },
          { en: "A different result — quantum measurements are always random", hi: "Alag result — quantum measurements hamesha random hote hain" },
          { en: "About half and half", hi: "Lagbhag aadha-aadha" },
        ],
        answer: 0,
        insight: {
          en: "A definite state gives the same result every time. Quantum results are random only when the state is a superposition.",
          hi: "Definite state har baar same result deta hai. Quantum results tabhi random hote hain jab state superposition ho.",
        },
      };

  return [most, why];
}
