import Link from "next/link";
import { BadgeCheck, Cpu, Eye, Languages, ShieldCheck, Target, WifiOff } from "lucide-react";
import { HeroDemo } from "@/components/HeroDemo";
import { JourneyLoop } from "@/components/JourneyLoop";
import { Wordmark } from "@/components/Logo";
import { RESEARCH_GAP } from "@/data/references";

const DIFFERENCE = [
  {
    icon: Target,
    title: "Predict before you run",
    body: "Every experiment starts with a question: what do you think will happen? Run stays locked until you commit to an answer.",
  },
  {
    icon: Eye,
    title: "Your prediction vs what actually happened",
    body: "The circuit runs in a simulator and the real counts are set beside your guess, so the gap is impossible to miss.",
  },
  {
    icon: BadgeCheck,
    title: "Explain it yourself, then unlock",
    body: "After every core experiment you say why it happened, in your own words. Each stage opens only when the one before it reaches 90% mastery.",
  },
];

const HONEST = [
  {
    icon: Cpu,
    title: "An educational quantum simulator",
    body: "Circuits run in your browser, or on an optional Qiskit Aer service. No real quantum hardware is used or claimed.",
  },
  {
    icon: ShieldCheck,
    title: "A tutor grounded in verified content",
    body: "The AI Tutor retrieves from a verified knowledge base and names its sources. It follows transparent rules; no LLM or trained model is connected.",
  },
  {
    icon: WifiOff,
    title: "No accounts, keys or payments",
    body: "Progress is saved in this browser only. Nothing you type is sent anywhere, and nothing costs money to run.",
  },
  {
    icon: Languages,
    title: "English and Hinglish",
    body: "Switch explanations at any time. Quantum terms such as qubit and superposition stay unchanged.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
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
        <section className="grid items-center gap-10 pb-16 pt-8 lg:grid-cols-[1fr_1.05fr] lg:pt-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-ket">QUANTUM NEXUS</p>
            <h1 className="mt-4 text-[2.6rem] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-6xl">
              <span className="collapse-title" data-text="From Confusion to Quantum Clarity">
                From Confusion to Quantum Clarity
              </span>
            </h1>
            <p className="mt-5 text-lg font-medium text-ink/90">
              AI-Assisted Interactive Quantum Learning Platform
            </p>
            <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-relaxed text-mute">
              Learn quantum computing by predicting outcomes, building circuits, running
              simulations, and understanding why they work.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary px-5 py-3 text-base">
                Start Learning
              </Link>
              <Link href="/login?next=/lab" className="btn btn-secondary px-5 py-3 text-base">
                Explore Quantum Lab
              </Link>
            </div>
            <p className="mt-6 text-sm text-dim">
              Built for Smart India Hackathon 2026. Problem statement 26140, AI-Based Interactive
              Quantum Algorithm Learning Platform. Theme: Smart Education.
            </p>
          </div>

          <HeroDemo />
        </section>

        {/* The loop */}
        <section aria-labelledby="loop-title" className="panel p-5 sm:p-8">
          <h2 id="loop-title" className="text-2xl font-semibold tracking-tight">
            One loop, thirteen stages
          </h2>
          <p className="mt-2 max-w-[68ch] text-mute">
            Every concept follows the same loop, drawn here the way you will soon read a circuit: one wire, left to
            right. A stage opens when the one before it reaches 90% mastery; finishing all thirteen masters the
            concept and unlocks the next.
          </p>
          <div className="mt-7">
            <JourneyLoop />
          </div>
        </section>

        {/* What makes it different */}
        <section aria-labelledby="difference-title" className="py-16">
          <h2 id="difference-title" className="max-w-[24ch] text-3xl font-semibold tracking-tight">
            Don&apos;t just read the answer. Predict it, test it, understand it.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {DIFFERENCE.map((item) => (
              <article key={item.title} className="panel p-5">
                <item.icon size={22} className="text-ket" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-mute">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Where it sits among existing resources */}
        <section aria-labelledby="gap-title" className="panel mb-16 p-5 sm:p-8">
          <h2 id="gap-title" className="text-2xl font-semibold tracking-tight">
            Where Quantum Nexus fits
          </h2>
          <p className="mt-2 max-w-[72ch] leading-relaxed text-mute">{RESEARCH_GAP.existing}</p>
          <p className="mt-2 max-w-[72ch] leading-relaxed text-ink/90">{RESEARCH_GAP.contribution}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {RESEARCH_GAP.parts.map((part) => (
              <li key={part} className="tag text-mute">
                {part}
              </li>
            ))}
          </ul>
          <Link href="/login?next=/references" className="btn btn-ghost mt-4 px-0 text-ket">
            See the resources we compared against
          </Link>
        </section>

        {/* Honest positioning */}
        <section aria-labelledby="honest-title" className="pb-16">
          <h2 id="honest-title" className="text-2xl font-semibold tracking-tight">
            What this build is, exactly
          </h2>
          <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {HONEST.map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="mt-0.5 h-fit rounded-xl border border-line bg-white/[0.04] p-2.5 text-phase">
                  <item.icon size={18} aria-hidden />
                </span>
                <div>
                  <dt className="font-semibold">{item.title}</dt>
                  <dd className="mt-1 leading-relaxed text-mute">{item.body}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn btn-primary px-5 py-3 text-base">
              Start Learning
            </Link>
            <Link href="/login?next=/architecture" className="btn btn-ghost">
              See how it is built
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-sm text-dim">
        Quantum Nexus. Smart India Hackathon 2026, PS 26140, Software category.
      </footer>
    </div>
  );
}
