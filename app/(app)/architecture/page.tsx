import type { Metadata } from "next";
import { ArrowDown, Check, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Architecture" };

interface Layer {
  name: string;
  detail: string;
  file?: string;
}

const MVP_LAYERS: Layer[] = [
  { name: "Browser", detail: "Everything runs on the learner's device." },
  { name: "Next.js / React", detail: "App Router pages, TypeScript and Tailwind CSS.", file: "app/ · components/" },
  { name: "Local Learning Content", detail: "Lessons, mastery checks, challenges and achievements as TypeScript objects, in English and Hinglish.", file: "data/" },
  { name: "Local Quantum Simulator", detail: "State-vector simulator for H, X, Y, Z, CX and measurement on two qubits.", file: "lib/quantumSimulator.ts" },
  { name: "Contextual AI Tutor", detail: "Rule-based answers built from the learner's language, topic and last experiment.", file: "lib/aiTutor.ts · lib/explain.ts" },
  { name: "Local Analytics", detail: "Learning telemetry: lessons, predictions, runs, errors, hints and mastery checks.", file: "lib/analytics.ts" },
  { name: "Rule-Based Recommendation Engine", detail: "Transparent IF → THEN rules that explain every recommendation.", file: "lib/recommendationEngine.ts · lib/mastery.ts" },
  { name: "localStorage", detail: "The only storage. Nothing leaves the device.", file: "lib/storage.ts" },
];

const PRODUCTION_LAYERS: Layer[] = [
  { name: "Next.js", detail: "The same front end, talking to an API instead of local modules." },
  { name: "FastAPI", detail: "API gateway for learners, educators and content." },
  { name: "Course Service", detail: "Versioned course content and authoring for educators." },
  { name: "RAG + LLM", detail: "A tutor grounded in the course material, replacing the rule-based tutor." },
  { name: "Quantum Execution Service", detail: "Server-side circuit execution with larger registers." },
  { name: "PostgreSQL + pgvector", detail: "Accounts, progress and embeddings for retrieval." },
  { name: "Learning Analytics", detail: "Cohort-level analytics across real learners." },
  { name: "Recommendation Engine", detail: "The same rules first, later informed by real learner data." },
  { name: "Optional Quantum Backends", detail: "Real hardware as an opt-in target, not a requirement." },
];

const COMPARISON: Array<{ area: string; mvp: string; production: string }> = [
  { area: "Circuit execution", mvp: "Local simulator", production: "Qiskit / Aer" },
  { area: "Learning content", mvp: "Local learning content", production: "Course service behind FastAPI" },
  { area: "Storage", mvp: "localStorage", production: "PostgreSQL" },
  { area: "Tutor", mvp: "Contextual / rule-based tutor", production: "RAG + LLM, with pgvector" },
  { area: "Personalization", mvp: "Rule-based personalization", production: "Rules plus advanced analytics" },
  { area: "Analytics", mvp: "Local analytics", production: "Advanced analytics across learners" },
  { area: "External services", mvp: "No external API", production: "Managed APIs where needed" },
  { area: "Database", mvp: "No database", production: "PostgreSQL + pgvector" },
  { area: "Authentication", mvp: "No real authentication", production: "Real authentication" },
  { area: "Users", mvp: "One learner per browser", production: "Multi-user roles" },
  { area: "Hardware", mvp: "None", production: "Optional real quantum hardware" },
  { area: "Frameworks", mvp: "Own TypeScript simulator", production: "Multi-framework support" },
];

const FUTURE_TECH = ["Qiskit / Aer", "PennyLane", "Cirq", "OpenQASM-compatible circuits", "Real quantum backends"];

const HONEST = [
  "The tutor is a Contextual AI Tutor: rule-based, local, and not a trained AI model.",
  "Personalization is Rule-Based Personalization. No machine learning predicts learner behaviour.",
  "Analytics are Local Learning Telemetry from one browser. There is no real learner dataset.",
  "Circuits run in a Local Educational Quantum Simulator. No real quantum hardware is used.",
  "Educator Insights shows a hand-written sample cohort, labelled DEMO ANALYTICS.",
];

function Stack({ layers, tone }: { layers: Layer[]; tone: "now" | "future" }) {
  const border = tone === "now" ? "border-ok/35" : "border-line border-dashed";
  return (
    <ol className="flex flex-col items-stretch">
      {layers.map((layer, index) => (
        <li key={layer.name} className="flex flex-col items-center">
          <div className={`w-full rounded-xl border bg-void/50 px-4 py-3 ${border}`}>
            <p className={`font-semibold ${tone === "future" ? "text-ink/90" : ""}`}>{layer.name}</p>
            <p className="mt-0.5 text-sm leading-snug text-mute">{layer.detail}</p>
            {layer.file && <p className="ket mt-1 text-xs text-dim">{layer.file}</p>}
          </div>
          {index < layers.length - 1 && (
            <ArrowDown size={16} className={`my-1.5 ${tone === "now" ? "text-ok" : "text-dim"}`} aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}

export default function ArchitecturePage() {
  return (
    <>
      <PageHeader
        title="Architecture"
        lead="What is built today, and what a production version would add. The two are kept strictly apart."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="mvp-title" className="panel border-ok/30 p-5 sm:p-6">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="mvp-title" className="text-xl font-semibold">
              Implemented MVP
            </h2>
            <span className="tag border-ok/50 bg-ok/10 tracking-wide text-ok">
              <Check size={12} aria-hidden />
              IMPLEMENTED NOW
            </span>
          </div>
          <p className="mb-5 text-sm text-mute">
            Runs after <span className="ket text-ink">npm install</span> and{" "}
            <span className="ket text-ink">npm run dev</span>. No API keys, no database, no paid services.
          </p>
          <Stack layers={MVP_LAYERS} tone="now" />
        </section>

        <section aria-labelledby="production-title" className="panel p-5 sm:p-6">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="production-title" className="text-xl font-semibold">
              Production architecture
            </h2>
            <span className="tag border-warn/50 bg-warn/10 tracking-wide text-warn">
              <Clock3 size={12} aria-hidden />
              PRODUCTION / FUTURE ARCHITECTURE
            </span>
          </div>
          <p className="mb-5 text-sm text-mute">
            A plan, not a claim. None of these services exist in this MVP.
          </p>
          <Stack layers={PRODUCTION_LAYERS} tone="future" />
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-sm font-semibold">Possible production technologies</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {FUTURE_TECH.map((tech) => (
                <li key={tech} className="tag border-dashed text-mute">
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* MVP vs Production */}
      <section aria-labelledby="comparison-title" className="panel mt-5 p-5 sm:p-6">
        <h2 id="comparison-title" className="text-xl font-semibold">
          MVP vs Production
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-[0.9375rem]">
            <thead>
              <tr className="text-sm">
                <th scope="col" className="w-1/4 py-2 pr-4 font-medium text-mute">Area</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-ok">MVP — implemented</th>
                <th scope="col" className="py-2 font-semibold text-warn">Production — future</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.area} className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-4 font-medium text-mute">{row.area}</th>
                  <td className="py-2.5 pr-4">{row.mvp}</td>
                  <td className="py-2.5 text-ink/80">{row.production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Honest positioning */}
      <section aria-labelledby="honest-title" className="panel mt-5 p-5 sm:p-6">
        <h2 id="honest-title" className="text-xl font-semibold">
          What we do not claim
        </h2>
        <ul className="mt-3 flex max-w-[76ch] flex-col gap-2.5">
          {HONEST.map((line) => (
            <li key={line} className="flex gap-3 leading-relaxed">
              <Check size={18} className="mt-1 shrink-0 text-ok" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
