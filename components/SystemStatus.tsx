"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleDashed, CircleX, Loader, RefreshCw } from "lucide-react";
import { checkQiskitService } from "@/lib/execution";
import { checkKnowledgeBase, checkQuantumEngine, checkTutor, type ServiceState } from "@/lib/health";
import { storageCheck } from "@/lib/storage";

type RowState = ServiceState | "checking";

interface Row {
  id: string;
  name: string;
  state: RowState;
  detail: string;
}

const LABEL: Record<RowState, string> = {
  online: "Online",
  offline: "Unavailable",
  not_configured: "Not connected",
  checking: "Checking…",
};

const TONE: Record<RowState, string> = {
  online: "text-ok",
  offline: "text-warn",
  not_configured: "text-dim",
  checking: "text-mute",
};

function StateIcon({ state }: { state: RowState }) {
  if (state === "online") return <CircleCheck size={16} aria-hidden />;
  if (state === "offline") return <CircleX size={16} aria-hidden />;
  if (state === "checking") return <Loader size={16} className="animate-pulse-wire" aria-hidden />;
  return <CircleDashed size={16} aria-hidden />;
}

const CHECKING = (id: string, name: string): Row => ({ id, name, state: "checking", detail: "" });

const INITIAL: Row[] = [
  CHECKING("engine", "Quantum simulator"),
  CHECKING("tutor", "AI Tutor"),
  CHECKING("knowledge", "Knowledge base"),
  CHECKING("storage", "Progress storage"),
  CHECKING("api", "Application server"),
  CHECKING("qiskit", "Qiskit Aer service"),
  { id: "database", name: "Database", state: "not_configured", detail: "No database in this build. Progress is stored in this browser." },
  { id: "llm", name: "LLM", state: "not_configured", detail: "No LLM is connected. The tutor answers from the verified knowledge base." },
];

/**
 * Real service checks — nothing here is hard-coded as "online".
 * Each row is the result of actually exercising that service just now:
 *   simulator / tutor / knowledge base : self-tests run in this browser
 *   progress storage                   : a real write, read and delete
 *   application server                 : GET /api/health
 *   Qiskit Aer service                 : GET <service>/api/health (only if configured)
 */
export function SystemStatus({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    const set = (id: string, state: RowState, detail: string) =>
      setRows((list) => list.map((row) => (row.id === id ? { ...row, state, detail } : row)));

    // Checks that run right here in the browser.
    const engine = checkQuantumEngine();
    set("engine", engine.status, engine.detail);
    const tutor = checkTutor();
    set("tutor", tutor.status, tutor.detail);
    const knowledge = checkKnowledgeBase();
    set("knowledge", knowledge.status, knowledge.detail);
    const storage = storageCheck();
    set("storage", storage.ok ? "online" : "offline", storage.detail);

    // Checks that need the network.
    const api = fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { success?: boolean; data?: { backend?: string } }) => {
        if (body?.success && body.data?.backend === "online") set("api", "online", "GET /api/health answered and its self-tests passed.");
        else set("api", "offline", "GET /api/health answered with an error.");
      })
      .catch(() =>
        set("api", "offline", "GET /api/health did not answer. Lessons, the lab and the tutor run in the browser and keep working.")
      );
    const qiskit = checkQiskitService().then((status) =>
      set(
        "qiskit",
        !status.configured ? "not_configured" : status.available ? "online" : "offline",
        status.engine ? `${status.detail} (${status.engine})` : status.detail
      )
    );
    await Promise.all([api, qiskit]);
    setCheckedAt(new Date().toLocaleTimeString());
    setBusy(false);
  }, []);

  useEffect(() => {
    // Run the checks once the component is on screen.
    const timer = window.setTimeout(run, 0);
    return () => window.clearTimeout(timer);
  }, [run]);

  return (
    <div>
      <ul className={compact ? "grid gap-x-5 gap-y-2 sm:grid-cols-2" : "flex flex-col gap-2"}>
        {rows.map((row) => (
          <li key={row.id} className={compact ? "flex items-start gap-2 text-sm" : "well flex items-start gap-3 px-4 py-3"}>
            <span className={`mt-0.5 shrink-0 ${TONE[row.state]}`}>
              <StateIcon state={row.state} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">{row.name}</span>
                <span className={`text-sm font-semibold ${TONE[row.state]}`}>{LABEL[row.state]}</span>
              </span>
              {!compact && row.detail && <span className="mt-0.5 block text-sm leading-snug text-mute">{row.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-dim">
        <button type="button" onClick={run} disabled={busy} className="btn btn-ghost px-2 py-1 text-xs">
          <RefreshCw size={13} aria-hidden />
          Check again
        </button>
        <span aria-live="polite">{checkedAt ? `Last checked at ${checkedAt}` : "Running checks…"}</span>
      </div>
    </div>
  );
}
