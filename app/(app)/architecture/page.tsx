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
  { name: "Browser", detail: "Everything a learner needs runs on their own device." },
  { name: "Next.js / React", detail: "App Router pages, TypeScript and Tailwind CSS.", file: "app/ · components/" },
  {
    name: "Curriculum as data",
    detail: "Modules, concepts, 13 stages, question bank, challenges, rubrics and misconceptions — versioned, in English and Hinglish.",
    file: "data/",
  },
  {
    name: "Stage engine and 90% mastery gate",
    detail: "One rule decides every unlock, and every action re-checks it, so a locked stage cannot be written to.",
    file: "lib/stages.ts · lib/actions.ts · lib/mastery.ts",
  },
  {
    name: "Quantum simulator",
    detail: "State-vector simulator: H, X, Y, Z, S, T, RX, RY, RZ, CX, CZ, SWAP, Toffoli and measurement, with shots and counts.",
    file: "lib/quantumSimulator.ts",
  },
  {
    name: "Execution abstraction layer",
    detail: "One call runs a circuit on the browser simulator or on the optional Qiskit Aer service, and falls back honestly if that service is down.",
    file: "lib/execution.ts · lib/circuitExport.ts",
  },
  {
    name: "Retrieval-grounded AI Tutor",
    detail: "Searches a verified knowledge base, answers from what it retrieves plus the learner's context, and cites its sources. No LLM.",
    file: "lib/aiTutor.ts · lib/knowledgeBase.ts · data/knowledge.ts",
  },
  {
    name: "Explanation, misconception and assessment engines",
    detail: "Rubric-based scoring of the learner's own words, rule-based misconception detection, and an adaptive mastery check with targeted retries.",
    file: "lib/explanationEvaluator.ts · lib/misconceptions.ts · lib/adaptiveAssessment.ts",
  },
  {
    name: "Review, recommendations and inferred level",
    detail: "Personalised review, targeted next challenge, spaced Quick Review, transparent IF → THEN rules, and a learner level inferred from behaviour.",
    file: "lib/review.ts · lib/recommendationEngine.ts · lib/learnerLevel.ts",
  },
  { name: "Learning analytics", detail: "Events, stage scores, time, predictions, explanations and misconceptions for one learner.", file: "lib/analytics.ts · lib/events.ts" },
  { name: "Health checks", detail: "GET /api/health runs real self-tests. The interface never shows a service as online without checking it.", file: "app/api/health · lib/health.ts" },
  { name: "Persistent learning state", detail: "Saved in the browser's localStorage; survives refresh and return visits.", file: "lib/storage.ts · lib/store.ts" },
];

const OPTIONAL_LAYERS: Layer[] = [
  {
    name: "Qiskit Aer service (FastAPI)",
    detail: "Runs the same circuits on Qiskit Aer. Start it locally and set NEXT_PUBLIC_QISKIT_API_URL; without it the browser simulator is used.",
    file: "backend/",
  },
  {
    name: "Database schema (planned)",
    detail: "PostgreSQL + pgvector tables that mirror the saved learning state. Written, not deployed.",
    file: "backend/database/schema.sql",
  },
];

const PRODUCTION_LAYERS: Layer[] = [
  { name: "Next.js", detail: "The same front end, talking to an API instead of local modules." },
  { name: "FastAPI", detail: "API gateway for learners, educators and content — the Qiskit service is its first route." },
  { name: "PostgreSQL + pgvector", detail: "Accounts, learning state and embeddings, replacing localStorage." },
  { name: "RAG + LLM tutor", detail: "An LLM behind the same retrieval step and the same verified knowledge base." },
  { name: "Quantum execution service", detail: "Server-side Qiskit Aer for larger registers; cloud backends through the same abstraction layer." },
  { name: "Cohort analytics", detail: "The same events, aggregated across real learners for educators." },
  { name: "Authentication and roles", detail: "Real accounts for students, educators and administrators." },
  { name: "Optional quantum hardware", detail: "An opt-in execution target, never a requirement." },
];

const COMPARISON: Array<{ area: string; mvp: string; production: string }> = [
  { area: "Learning flow", mvp: "13 stages per concept, 90% gate, enforced in code", production: "Same engine, enforced on the server as well" },
  { area: "Circuit execution", mvp: "Browser simulator; optional local Qiskit Aer service", production: "Hosted Qiskit Aer, then cloud backends" },
  { area: "Circuit formats", mvp: "Visual circuit, Qiskit code, OpenQASM 2.0", production: "Plus import, and other frameworks" },
  { area: "Tutor", mvp: "Local retrieval over a verified knowledge base, with sources", production: "RAG + LLM over the same knowledge base" },
  { area: "Explanation scoring", mvp: "Rule-based rubric matching", production: "Rubrics plus LLM-assisted evaluation" },
  { area: "Misconceptions", mvp: "Rule-based detection, 9 catalogued", production: "Larger catalogue, tuned on real learner data" },
  { area: "Assessment", mvp: "Adaptive by difficulty; questions, build and written items", production: "Calibrated item bank" },
  { area: "Learner level", mvp: "Inferred by rules from behaviour", production: "Inferred from far more data" },
  { area: "Storage", mvp: "localStorage on one device", production: "PostgreSQL + pgvector" },
  { area: "Analytics", mvp: "One learner; educator cohort is sample data", production: "Real cohorts" },
  { area: "Authentication", mvp: "None — a name on this device", production: "Real authentication and roles" },
  { area: "Hardware", mvp: "None", production: "Optional real quantum hardware" },
];

const FUTURE_TECH = ["Qiskit Runtime", "PennyLane", "Cirq", "OpenQASM 3", "Real quantum backends"];

/** How the build answers problem statement 26140. */
const ALIGNMENT: Array<{ need: string; answer: string }> = [
  { need: "Interactive learning of quantum concepts", answer: "Each concept is a 13-stage journey with widgets, a state sandbox and a visual lesson." },
  { need: "Visualisation of quantum states", answer: "A 3D Bloch sphere, probability bars, histograms and state-vector tables, all computed from the real circuit." },
  { need: "Hands-on circuit building and simulation", answer: "Quantum Lab: 1–3 qubits, 14 gate types, shots, counts, Qiskit and OpenQASM views." },
  { need: "AI-based guidance", answer: "A retrieval-grounded tutor with quick actions, sources and awareness of the learner's stage, level and last result." },
  { need: "Personalised, adaptive learning", answer: "Inferred level, adaptive mastery check, misconception detection, personalised review and targeted challenges." },
  { need: "Assessment and progress tracking", answer: "Stage scores, a 90% mastery gate, explanation scoring, analytics and an educator view." },
  { need: "Accessible to beginners", answer: "No sign-up, no questionnaire, English and Hinglish, optional mathematics, free to run." },
];

const HONEST = [
  "The tutor retrieves from a verified knowledge base and builds answers by rules. It is not a trained AI model and no LLM is connected.",
  "Explanations are scored by rule-based concept matching against a rubric, not by a language model.",
  "Misconception detection, the learner level and recommendations are transparent rules. No machine learning predicts learner behaviour.",
  "Circuits run in a simulator: in the browser by default, or on Qiskit Aer when that optional service is running. No real quantum hardware is used.",
  "Progress is stored in the browser. There is no database, no accounts and no real authentication in this build.",
  "The Bloch sphere is a dependency-free SVG projection you can rotate. It is not a WebGL/Three.js scene.",
  "The Watch stage is an animated visual lesson computed by the simulator. No recorded videos ship with this build.",
  "Educator Insights shows a hand-written sample cohort, labelled DEMO ANALYTICS. Only the panel for this device is real.",
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
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-3 text-sm font-semibold">Included in the repository, optional to run</p>
            <Stack layers={OPTIONAL_LAYERS} tone="future" />
          </div>
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
            A plan, not a claim. Apart from the optional Qiskit service, none of these are running in this build.
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

      {/* Problem statement alignment */}
      <section aria-labelledby="alignment-title" className="panel mt-5 p-5 sm:p-6">
        <h2 id="alignment-title" className="text-xl font-semibold">
          How this answers the problem statement
        </h2>
        <p className="mt-1 text-sm text-mute">
          SIH 2026 · PS 26140 · AI-Based Interactive Quantum Algorithm Learning Platform · Smart Education
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-[0.9375rem]">
            <thead>
              <tr className="text-sm">
                <th scope="col" className="w-1/3 py-2 pr-4 font-medium text-mute">What is asked for</th>
                <th scope="col" className="py-2 font-semibold text-ok">What is built</th>
              </tr>
            </thead>
            <tbody>
              {ALIGNMENT.map((row) => (
                <tr key={row.need} className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-4 font-medium">{row.need}</th>
                  <td className="py-2.5 text-ink/85">{row.answer}</td>
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
