/**
 * Execution Abstraction Layer
 * ---------------------------
 *
 *     Quantum Nexus UI
 *            ↓
 *     executeCircuit()            ← every "Run" button calls this
 *            ↓
 *   ┌────────┴─────────┐
 *   browser simulator   Qiskit service (optional)      … a cloud QPU could plug in here later
 *
 * The browser simulator (lib/quantumSimulator.ts) is always available and is
 * the default. If a Qiskit service address is configured AND the learner chose
 * it AND it answers, the measurement counts come from Qiskit Aer instead.
 * If that service is missing or fails, we fall back to the browser simulator
 * and say so — the learning experience never depends on a server.
 */

import { toPayload } from "./circuitExport";
import {
  DEFAULT_SHOTS,
  simulateCircuit,
  validateCircuit,
  type Circuit,
  type SimulationResult,
} from "./quantumSimulator";
import type { L } from "./types";

export type BackendId = "browser" | "qiskit";

export const BACKEND_LABEL: Record<BackendId, string> = {
  browser: "Browser simulator (local TypeScript)",
  qiskit: "Qiskit Aer service",
};

export interface ExecutionOutcome {
  result: SimulationResult;
  /** The backend that actually produced the counts. */
  backend: BackendId;
  /** The backend the learner asked for. */
  requested: BackendId;
  /** Set when we had to fall back, so the UI can explain what happened. */
  notice?: L;
  durationMs: number;
  /** Qiskit's own text drawing of the circuit, when the service ran it. */
  diagram?: string;
  /** Version string reported by the service, e.g. "qiskit 1.2 / aer 0.15". */
  engine?: string;
}

/** Address of the optional Qiskit service, from NEXT_PUBLIC_QISKIT_API_URL. Null when not configured. */
export function qiskitApiUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_QISKIT_API_URL;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(trimmed) ? trimmed : null;
}

/** Structured error shape returned by the service (and by our own API routes). */
export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

interface RemoteSuccess {
  success: true;
  data: {
    counts: Record<string, number>;
    shots: number;
    backend: string;
    engine?: string;
    diagram?: string;
  };
}

async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export interface ServiceStatus {
  configured: boolean;
  available: boolean;
  detail: string;
  engine?: string;
}

/** A real health check of the optional Qiskit service. Never throws. */
export async function checkQiskitService(timeoutMs = 4000): Promise<ServiceStatus> {
  const base = qiskitApiUrl();
  if (!base) {
    return { configured: false, available: false, detail: "Not configured. Circuits run in the browser simulator." };
  }
  try {
    const body = (await fetchJson(`${base}/api/health`, { method: "GET" }, timeoutMs)) as {
      success?: boolean;
      data?: { quantum_simulator?: string; engine?: string };
    };
    if (body?.success && body.data?.quantum_simulator === "online") {
      return { configured: true, available: true, detail: "Reachable and Qiskit Aer answered.", engine: body.data.engine };
    }
    return {
      configured: true,
      available: false,
      detail: "The service answered, but Qiskit is not available on it.",
    };
  } catch {
    return { configured: true, available: false, detail: "Configured, but it did not answer." };
  }
}

const UNAVAILABLE: L = {
  en: "Quantum simulation service is currently unavailable. This run used the browser simulator instead.",
  hi: "Quantum simulation service abhi available nahi hai. Yeh run browser simulator par hua.",
};

const NOT_CONFIGURED: L = {
  en: "No Qiskit service is connected, so this run used the browser simulator.",
  hi: "Koi Qiskit service connected nahi hai, isliye yeh run browser simulator par hua.",
};

/**
 * Run a circuit. Always resolves — errors come back inside `result`
 * (as a SimulationError with a learner-friendly message), never as a throw.
 */
export async function executeCircuit(
  circuit: Circuit,
  options: { shots?: number; backend?: BackendId } = {}
): Promise<ExecutionOutcome> {
  const shots = options.shots ?? DEFAULT_SHOTS;
  const requested: BackendId = options.backend ?? "browser";
  const started = Date.now();

  // Validate first, whatever the backend: a broken request never leaves the browser.
  const problem = validateCircuit(circuit, shots);
  if (problem) {
    return { result: problem, backend: "browser", requested, durationMs: Date.now() - started };
  }

  // The local run gives exact probabilities, Bloch vectors and the trace used
  // for the explanation. With the Qiskit backend, only the sampled counts are replaced.
  const local = simulateCircuit(circuit, { shots });
  const finish = (extra: Partial<ExecutionOutcome> = {}): ExecutionOutcome => ({
    result: local,
    backend: "browser",
    requested,
    durationMs: Date.now() - started,
    ...extra,
  });

  if (requested !== "qiskit" || !local.ok) return finish();

  const base = qiskitApiUrl();
  if (!base) return finish({ notice: NOT_CONFIGURED });

  try {
    const body = (await fetchJson(
      `${base}/api/simulate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(circuit, shots)),
      },
      10000
    )) as RemoteSuccess | ApiError;

    if (!body || body.success !== true) return finish({ notice: UNAVAILABLE });

    // Trust, but verify: the counts must cover the same results and add up to `shots`.
    const expected = Object.keys(local.probabilities);
    const counts: Record<string, number> = {};
    expected.forEach((label) => (counts[label] = 0));
    let total = 0;
    for (const [label, value] of Object.entries(body.data.counts ?? {})) {
      if (!(label in counts) || !Number.isInteger(value) || value < 0) return finish({ notice: UNAVAILABLE });
      counts[label] = value;
      total += value;
    }
    if (total !== shots) return finish({ notice: UNAVAILABLE });

    return {
      result: { ...local, counts },
      backend: "qiskit",
      requested,
      durationMs: Date.now() - started,
      diagram: typeof body.data.diagram === "string" ? body.data.diagram : undefined,
      engine: typeof body.data.engine === "string" ? body.data.engine : undefined,
    };
  } catch {
    return finish({ notice: UNAVAILABLE });
  }
}
