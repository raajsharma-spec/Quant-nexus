import Link from "next/link";
import { BadgeCheck, Cpu, Eye, Languages, ShieldCheck, Target, WifiOff } from "lucide-react";
import { HeroDemo } from "@/components/HeroDemo";
import { JourneyLoop } from "@/components/JourneyLoop";
import { Wordmark } from "@/components/Logo";

const DIFFERENCE = [
  {
    icon: Target,
    title: "Predict before you run",
    body: "Every experiment starts with a question: what do you think will happen? Run stays locked until you commit to an answer.",
  },
  {
    icon: Eye,
    title: "Your prediction vs what actually happened",
    body: "The circuit runs in a local simulator and the result is set beside your guess, so the gap is impossible to miss.",
  },
  {
    icon: BadgeCheck,
    title: "Understand why, then unlock",
    body: "A step-by-step explanation follows every run. Mastery checks and practice unlock the next concept when you are ready.",
  },
];

const HONEST = [
  {
    icon: Cpu,
    title: "Local Educational Quantum Simulator",
    body: "Circuits run in TypeScript inside your browser. No real quantum hardware is used or claimed.",
  },
  {
    icon: ShieldCheck,
    title: "Contextual, rule-based tutor",
    body: "The AI Tutor and recommendations follow transparent rules. This MVP does not use a trained AI model.",
  },
  {
    icon: WifiOff,
    title: "No accounts, keys or servers",
    body: "Progress is saved in this browser only. Nothing is sent anywhere, and nothing costs money to run.",
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
            One loop, eight steps
          </h2>
          <p className="mt-2 max-w-[64ch] text-mute">
            Quantum Nexus is built around a single learning loop, drawn here the way you will soon
            read a circuit: one wire, left to right.
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

        {/* Honest positioning */}
        <section aria-labelledby="honest-title" className="pb-16">
          <h2 id="honest-title" className="text-2xl font-semibold tracking-tight">
            What this MVP is, exactly
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
        Quantum Nexus MVP. Smart India Hackathon 2026, PS 26140, Software category.
      </footer>
    </div>
  );
}
