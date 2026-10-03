import Link from "next/link";
import { ArrowRight, BookOpenCheck, Boxes, GraduationCap, Languages, MessageCircleQuestion, ScanSearch } from "lucide-react";
import { OrbitVisual } from "@/components/entry/OrbitVisual";
import { ParticleField } from "@/components/entry/ParticleField";
import { HeroDemo } from "@/components/HeroDemo";
import { JourneyLoop } from "@/components/JourneyLoop";
import { Wordmark } from "@/components/Logo";
import { RESEARCH_GAP } from "@/data/references";

const CAPABILITIES = [
  {
    icon: BookOpenCheck,
    title: "A guided path, gated by mastery",
    body: "Each concept is thirteen short stages. A stage opens only when the one before it reaches 90%.",
  },
  {
    icon: MessageCircleQuestion,
    title: "A tutor that shows its sources",
    body: "Answers come from verified course content and use your own stage, level and last result.",
  },
  {
    icon: Boxes,
    title: "One circuit, four SDKs",
    body: "Build in the lab, then read the same circuit as Qiskit, Cirq, PennyLane or OpenQASM code.",
  },
  {
    icon: ScanSearch,
    title: "Misconceptions caught early",
    body: "Predictions and explanations are checked for common wrong ideas, each paired with a circuit that disproves it.",
  },
  {
    icon: GraduationCap,
    title: "An instructor dashboard",
    body: "Learners share a progress report; instructors see every stage, weak area and suggested next step.",
  },
  {
    icon: Languages,
    title: "English and Hinglish",
    body: "Switch explanations at any time. Quantum terms such as qubit and superposition stay unchanged.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-x-clip">
      <ParticleField />
      <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="flex items-center justify-between py-5">
          <Wordmark compact />
          <nav aria-label="Entry" className="flex items-center gap-2">
            <Link href="/login?next=/architecture" className="btn btn-ghost hidden sm:inline-flex">
              Architecture
            </Link>
            <Link href="/login" className="btn btn-secondary">
              Enter
            </Link>
          </nav>
        </header>

        <main id="main">
          {/* Hero */}
          <section className="grid items-center gap-x-10 gap-y-4 pb-10 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-14 lg:pt-10">
            <div>
              <h1 className="display text-[2.7rem] leading-[1.02] sm:text-6xl lg:text-[4.5rem]">
                <span className="collapse-title" data-text="From confusion">
                  From confusion
                </span>
                <br />
                to quantum clarity
              </h1>
              <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-mute">
                Quantum Nexus is an AI-assisted platform for learning quantum computing by experiment. You predict what
                a circuit will do, run it, and explain why it happened.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login" className="btn btn-primary px-5 py-3 text-base">
                  Start Learning
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <Link href="/login?next=/lab" className="btn btn-secondary px-5 py-3 text-base">
                  Explore Quantum Lab
                </Link>
              </div>
              <p className="ket mt-7 text-sm text-dim" aria-hidden>
                |ψ⟩ = α|confusion⟩ + β|clarity⟩ <span className="text-ket">→ measure → |clarity⟩</span>
              </p>
            </div>
            <OrbitVisual className="mx-auto w-full max-w-[17rem] sm:max-w-[24rem] lg:max-w-[30rem]" />
          </section>

          {/* The core idea, live */}
          <section aria-labelledby="try-title" className="grid items-start gap-8 pb-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="lg:sticky lg:top-8">
              <h2 id="try-title" className="display text-3xl leading-tight sm:text-4xl">
                Predict first. Then run.
              </h2>
              <p className="mt-3 max-w-[44ch] leading-relaxed text-mute">
                Every experiment starts with a question: what do you think will happen? The circuit stays locked until
                you commit to an answer, and the real counts are then set beside your prediction.
              </p>
              <p className="mt-3 max-w-[44ch] leading-relaxed text-mute">
                This one is live. Try it before you sign in.
              </p>
            </div>
            <HeroDemo />
          </section>

          {/* The loop */}
          <section aria-labelledby="loop-title" className="panel p-5 sm:p-8">
            <h2 id="loop-title" className="display text-3xl sm:text-4xl">
              One loop, thirteen stages
            </h2>
            <p className="mt-2 max-w-[68ch] text-mute">
              Every concept follows the same loop, drawn here the way you will soon read a circuit: one wire, left to
              right. Finishing all thirteen masters the concept and unlocks the next.
            </p>
            <div className="mt-7">
              <JourneyLoop />
            </div>
          </section>

          {/* What is inside */}
          <section aria-labelledby="inside-title" className="py-14">
            <h2 id="inside-title" className="display max-w-[22ch] text-3xl leading-tight sm:text-4xl">
              Built for learners, and for the people who teach them
            </h2>
            <dl className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map((item) => (
                <div key={item.title} className="border-t border-line pt-4">
                  <dt className="flex items-center gap-2.5 font-semibold">
                    <item.icon size={18} className="shrink-0 text-ket" aria-hidden />
                    {item.title}
                  </dt>
                  <dd className="mt-1.5 leading-relaxed text-mute">{item.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Where it sits among existing resources */}
          <section aria-labelledby="gap-title" className="panel mb-14 p-5 sm:p-8">
            <h2 id="gap-title" className="display text-3xl sm:text-4xl">
              Where Quantum Nexus fits
            </h2>
            <p className="mt-3 max-w-[72ch] leading-relaxed text-mute">{RESEARCH_GAP.existing}</p>
            <p className="mt-2 max-w-[72ch] leading-relaxed text-ink/90">{RESEARCH_GAP.contribution}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn btn-primary px-5 py-3 text-base">
                Start Learning
              </Link>
              <Link href="/login?next=/references" className="btn btn-ghost">
                See the resources we compared against
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-line py-6 text-sm text-dim">
          Quantum Nexus. Smart India Hackathon 2026, problem statement 26140, Smart Education. Circuits run in an
          educational simulator; no real quantum hardware is used.
        </footer>
      </div>
    </div>
  );
}
