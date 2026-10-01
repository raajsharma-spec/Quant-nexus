/**
 * "Why did this happen?" — builds a step-by-step explanation for ANY circuit
 * the learner runs. It reads the simulator's trace (the state before and after
 * every gate) and picks a sentence that fits what actually happened.
 *
 * This is rule-based and runs locally. No AI model is involved.
 */

import type { BlochVector, SimulationSuccess, TraceStep } from "./quantumSimulator";
import { ket } from "./prediction";
import type { L } from "./types";

export interface Explanation {
  steps: L[];
  summary: L;
}

type QubitKind = "zero" | "one" | "plus" | "minus" | "entangled" | "other";

/** Classify a qubit from its Bloch vector. */
function kindOf(v: BlochVector): QubitKind {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length < 0.99) return "entangled";
  if (v.z > 0.99) return "zero";
  if (v.z < -0.99) return "one";
  if (v.x > 0.99) return "plus";
  if (v.x < -0.99) return "minus";
  return "other";
}

const isBasis = (k: QubitKind) => k === "zero" || k === "one";
const basisKet = (k: QubitKind) => (k === "one" ? "|1⟩" : "|0⟩");
const flippedKet = (k: QubitKind) => (k === "one" ? "|0⟩" : "|1⟩");

function explainStep(step: TraceStep): L {
  const { gate, before, after } = step;
  const q = `q${gate.qubit}`;
  const was = kindOf(before[gate.qubit]);
  const now = kindOf(after[gate.qubit]);

  switch (gate.type) {
    case "H": {
      if (was === "zero") {
        return {
          en: `H on ${q}: |0⟩ becomes an equal superposition — a 50/50 blend of |0⟩ and |1⟩.`,
          hi: `${q} par H gate: |0⟩ ek equal superposition ban jaata hai — |0⟩ aur |1⟩ dono ki probability 50-50.`,
        };
      }
      if (was === "one") {
        return {
          en: `H on ${q}: |1⟩ also becomes an equal superposition. The |1⟩ part carries a minus sign (a phase) that this measurement cannot see.`,
          hi: `${q} par H gate: |1⟩ bhi equal superposition ban jaata hai. |1⟩ wale part par ek minus sign (phase) hota hai jo is measurement mein dikhta nahi.`,
        };
      }
      if (was === "plus" || was === "minus") {
        const back = now === "one" ? "|1⟩" : "|0⟩";
        return {
          en: `H on ${q} again: the second H undoes the superposition. The two paths interfere and ${q} returns to a definite ${back}.`,
          hi: `${q} par dobara H gate: doosra H superposition ko undo kar deta hai. Dono paths interfere karte hain aur ${q} wapas definite ${back} ban jaata hai.`,
        };
      }
      return {
        en: `H on ${q}: ${q} is already linked to another qubit, so H mixes their joint results.`,
        hi: `${q} par H gate: ${q} pehle se doosre qubit se linked hai, isliye H unke joint results ko mix karta hai.`,
      };
    }

    case "X": {
      if (isBasis(was)) {
        return {
          en: `X on ${q} flips it: ${basisKet(was)} → ${flippedKet(was)}.`,
          hi: `${q} par X gate use flip karta hai: ${basisKet(was)} → ${flippedKet(was)}.`,
        };
      }
      return {
        en: `X on ${q} swaps the |0⟩ and |1⟩ parts. In an equal superposition that changes nothing you can measure — the odds stay 50/50.`,
        hi: `${q} par X gate |0⟩ aur |1⟩ parts ko swap karta hai. Equal superposition mein isse measurement par koi farak nahi padta — probability 50-50 hi rehti hai.`,
      };
    }

    case "Y": {
      if (isBasis(was)) {
        return {
          en: `Y on ${q} flips it like X does (${basisKet(was)} → ${flippedKet(was)}) and also adds a phase. The phase does not change what you measure here.`,
          hi: `${q} par Y gate X ki tarah flip karta hai (${basisKet(was)} → ${flippedKet(was)}) aur saath mein ek phase add karta hai. Yeh phase yahan measurement ko change nahi karta.`,
        };
      }
      return {
        en: `Y on ${q} swaps the |0⟩ and |1⟩ parts and changes their phase. The measurement odds stay 50/50.`,
        hi: `${q} par Y gate |0⟩ aur |1⟩ parts ko swap karke unka phase change karta hai. Measurement ki probability 50-50 hi rehti hai.`,
      };
    }

    case "Z": {
      if (isBasis(was)) {
        return {
          en: `Z on ${q} changes only the phase. ${q} stays ${basisKet(was)}, so the measurement odds are untouched.`,
          hi: `${q} par Z gate sirf phase change karta hai. ${q} ${basisKet(was)} hi rehta hai, isliye measurement ki probability same rehti hai.`,
        };
      }
      return {
        en: `Z on ${q} flips the sign of the |1⟩ part. The odds are still 50/50 right now — but a later H gate would turn this hidden phase into a different result.`,
        hi: `${q} par Z gate |1⟩ part ka sign flip karta hai. Abhi probability 50-50 hi hai — lekin baad mein H gate lagao to yeh hidden phase alag result de sakta hai.`,
      };
    }

    case "CX": {
      const t = `q${gate.target}`;
      const targetNow = kindOf(after[gate.target as number]);
      if (was === "zero") {
        return {
          en: `CX: the control ${q} is |0⟩, so the target ${t} is left alone.`,
          hi: `CX: control ${q} |0⟩ hai, isliye target ${t} ko kuch nahi hota.`,
        };
      }
      if (was === "one") {
        return {
          en: `CX: the control ${q} is |1⟩, so the target ${t} is flipped.`,
          hi: `CX: control ${q} |1⟩ hai, isliye target ${t} flip ho jaata hai.`,
        };
      }
      if (targetNow === "entangled" || now === "entangled") {
        return {
          en: `CX: the control ${q} is in superposition, so ${t} flips only in the "${q} is 1" part. The two qubits are now entangled — their results are linked.`,
          hi: `CX: control ${q} superposition mein hai, isliye ${t} sirf "${q} is 1" wale part mein flip hota hai. Ab dono qubits entangled hain — unke results linked hain.`,
        };
      }
      return {
        en: `CX: the control ${q} is in superposition, but with this target state the measured results do not change.`,
        hi: `CX: control ${q} superposition mein hai, lekin is target state ke saath measured results change nahi hote.`,
      };
    }

    case "M":
    default: {
      if (isBasis(was)) {
        return {
          en: `M on ${q}: the qubit is already a definite ${basisKet(was)}, so measurement reports ${basisKet(was)} every time.`,
          hi: `${q} par M: qubit pehle se definite ${basisKet(was)} hai, isliye measurement har baar ${basisKet(was)} deta hai.`,
        };
      }
      return {
        en: `M on ${q}: measurement forces one definite answer. Each run gives |0⟩ or |1⟩ at random.`,
        hi: `${q} par M: measurement ek definite answer deta hai. Har run mein randomly |0⟩ ya |1⟩ milta hai.`,
      };
    }
  }
}

/** Build the full explanation for a finished simulation. */
export function explainCircuit(result: SimulationSuccess): Explanation {
  const steps: L[] = [
    {
      en: "Every qubit starts in |0⟩.",
      hi: "Har qubit |0⟩ se start hota hai.",
    },
    ...result.trace.map(explainStep),
  ];

  const outcomes = Object.entries(result.probabilities)
    .filter(([, p]) => p > 0.0005)
    .sort(([a], [b]) => a.localeCompare(b));

  let summary: L;
  if (outcomes.length === 1) {
    const only = ket(outcomes[0][0]);
    summary = {
      en: `So every run gives ${only}. There is no randomness in this circuit.`,
      hi: `Isliye har run mein ${only} hi milta hai. Is circuit mein koi randomness nahi hai.`,
    };
  } else {
    const names = outcomes.map(([bits]) => ket(bits));
    const list = names.slice(0, -1).join(", ") + " or " + names[names.length - 1];
    const listHi = names.slice(0, -1).join(", ") + " ya " + names[names.length - 1];
    const share = Math.round(outcomes[0][1] * 100);
    const linked =
      result.measuredQubits.length === 2 &&
      outcomes.length === 2 &&
      result.bloch.some((v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) < 0.99);
    summary = linked
      ? {
          en: `So you only ever see ${list}, about ${share}% each. Knowing one qubit's result tells you the other's — that link is entanglement.`,
          hi: `Isliye sirf ${listHi} hi dikhta hai, lagbhag ${share}% each. Ek qubit ka result pata chalte hi doosre ka bhi pata chal jaata hai — yahi link entanglement hai.`,
        }
      : {
          en: `So you see ${list}, about ${share}% each. The counts are close to, but not exactly, ${share}% because every run is a fresh random draw.`,
          hi: `Isliye ${listHi} dikhta hai, lagbhag ${share}% each. Counts exactly ${share}% nahi hote kyunki har run ek naya random draw hai.`,
        };
  }

  return { steps, summary };
}
