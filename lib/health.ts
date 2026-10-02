/**
 * Real health checks.
 *
 * The interface never shows "Online" for something that has not just been
 * verified. Each check below actually exercises the subsystem:
 *   - Quantum Engine : runs three circuits and compares with known results
 *   - AI Tutor       : asks the tutor a question and checks the answer is grounded
 *   - Knowledge Base : counts verified entries and runs a retrieval
 * Services that this build does not include (a database, an LLM) are reported
 * as "not configured" — never as online.
 *
 * The same checks run on the server (GET /api/health) and in the browser.
 */

import { answerQuestion } from "./aiTutor";
import { knowledgeStats, retrieve } from "./knowledgeBase";
import { buildCircuit, simulateCircuit } from "./quantumSimulator";
import { createInitialState } from "./storage";

export type ServiceState = "online" | "offline" | "not_configured";

export interface ServiceCheck {
  status: ServiceState;
  detail: string;
}

export interface HealthReport {
  checkedAt: string;
  /** Where these checks ran. */
  where: "server" | "browser";
  services: {
    quantumEngine: ServiceCheck;
    aiTutor: ServiceCheck;
    knowledgeBase: ServiceCheck;
    database: ServiceCheck;
    llm: ServiceCheck;
  };
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export function checkQuantumEngine(): ServiceCheck {
  try {
    const x = simulateCircuit(buildCircuit(1, [["X", 0, 0], ["M", 0, 1]]), { shots: 64 });
    const h = simulateCircuit(buildCircuit(1, [["H", 0, 0], ["M", 0, 1]]), { shots: 256 });
    const bell = simulateCircuit(
      buildCircuit(2, [["H", 0, 0], ["CX", 0, 1, 1], ["M", 0, 2], ["M", 1, 2]]),
      { shots: 64 }
    );
    if (!x.ok || !h.ok || !bell.ok) return { status: "offline", detail: "A self-test circuit failed to run." };
    const shotsAddUp = Object.values(h.counts).reduce((a, b) => a + b, 0) === 256;
    const correct =
      near(x.probabilities["1"], 1) &&
      near(h.probabilities["0"], 0.5) &&
      near(bell.probabilities["00"], 0.5) &&
      near(bell.probabilities["11"], 0.5) &&
      shotsAddUp;
    return correct
      ? { status: "online", detail: "Local state-vector simulator. Self-test passed: X, H and a Bell pair gave the expected results." }
      : { status: "offline", detail: "The simulator ran but a self-test result was wrong." };
  } catch {
    return { status: "offline", detail: "The simulator could not be started." };
  }
}

export function checkKnowledgeBase(): ServiceCheck {
  try {
    const stats = knowledgeStats();
    const hit = retrieve("What does the Hadamard gate do?")[0];
    if (stats.verified === 0 || hit?.entry.id !== "h-gate") {
      return { status: "offline", detail: "Retrieval self-test failed." };
    }
    return {
      status: "online",
      detail: `${stats.verified} verified entries (content v${stats.version}). Retrieval self-test passed.`,
    };
  } catch {
    return { status: "offline", detail: "The knowledge base could not be read." };
  }
}

export function checkTutor(): ServiceCheck {
  try {
    const reply = answerQuestion("What is superposition?", createInitialState(), "en");
    const grounded = reply.text.length > 0 && reply.sources.some((s) => s.id === "superposition-basics");
    return grounded
      ? { status: "online", detail: "Local retrieval-grounded tutor. Test question answered with a cited source. No LLM is used." }
      : { status: "offline", detail: "The tutor answered without a verified source." };
  } catch {
    return { status: "offline", detail: "The tutor could not build an answer." };
  }
}

/** Run every check that does not need the network. */
export function buildHealthReport(where: HealthReport["where"]): HealthReport {
  return {
    checkedAt: new Date().toISOString(),
    where,
    services: {
      quantumEngine: checkQuantumEngine(),
      aiTutor: checkTutor(),
      knowledgeBase: checkKnowledgeBase(),
      database: {
        status: "not_configured",
        detail: "No database in this build. Progress is stored in the learner's browser.",
      },
      llm: {
        status: "not_configured",
        detail: "No LLM is connected. The tutor answers from the verified knowledge base.",
      },
    },
  };
}
