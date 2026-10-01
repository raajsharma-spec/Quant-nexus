"use client";

import Link from "next/link";
import { ArrowRight, Crosshair, Flame, Gauge, Target } from "lucide-react";
import { ACHIEVEMENTS, PREVIEW_ACHIEVEMENTS } from "@/data/achievements";
import { topicMeta } from "@/data/topics";
import { AchievementBadge } from "@/components/AchievementBadge";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useApp } from "@/components/AppProvider";
import { JourneyLoop } from "@/components/JourneyLoop";
import { LearningRoadmap } from "@/components/LearningRoadmap";
import { NextMoveCard } from "@/components/NextMoveCard";
import { PredictionInsight } from "@/components/PredictionInsight";
import { ProgressCard } from "@/components/ProgressCard";
import { DemoBadge, Meter, Ring } from "@/components/ui";
import { allMastered, currentTopic, loopPosition, topicMastery } from "@/lib/mastery";
import type { L, LoopStep } from "@/lib/types";

/** What the learner's current loop step asks of them. */
const LOOP_NOTE: Record<LoopStep, L> = {
  Learn: { en: "finish the lesson for your current topic.", hi: "apne current topic ka lesson finish karo." },
  Predict: { en: "make your first prediction in this topic.", hi: "is topic mein apni pehli prediction karo." },
  Practice: { en: "solve the required challenges for this topic.", hi: "is topic ke required challenges solve karo." },
  Run: { en: "run the experiment.", hi: "experiment run karo." },
  Observe: { en: "see what actually happened.", hi: "dekho actually kya hua." },
  Explain: { en: "understand why.", hi: "samjho kyun." },
  Assess: { en: "take the mastery check to unlock what's next.", hi: "aage ka unlock karne ke liye mastery check lo." },
  Unlock: { en: "every MVP module is mastered. Keep experimenting.", hi: "har MVP module master ho gaya. Experiment karte raho." },
};

export default function DashboardPage() {
  const { state, insights, t } = useApp();
  const name = state.profile?.name ?? "";
  const returning = state.events.length > 0;

  const topic = currentTopic(state);
  const meta = topicMeta(topic);
  const m = topicMastery(state, topic);
  const done = allMastered(state);

  // How far through this topic's steps: the lesson, each required challenge, the mastery check.
  const stepsTotal = 2 + m.practiceTotal;
  const stepsDone = (m.lessonCompleted ? 1 : 0) + m.practiceSolved + (m.assessmentPassed ? 1 : 0);
  const completion = Math.round((stepsDone / stepsTotal) * 100);

  const position = loopPosition(state);
  const preview = PREVIEW_ACHIEVEMENTS.map((id) => ACHIEVEMENTS.find((a) => a.id === id)!);
  const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {returning ? "Welcome back" : "Welcome"}, {name} <span aria-hidden>👋</span>
          </h1>
          {state.mode === "demo" && <DemoBadge>DEMO DATA · illustrative learner</DemoBadge>}
        </div>
        <p className="mt-1.5 text-mute">
          {t({
            en: "From confusion to quantum clarity — one experiment at a time.",
            hi: "Confusion se quantum clarity tak — ek experiment at a time.",
          })}
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-12">
        {/* 1. Where am I? */}
        <section aria-labelledby="journey-title" className="panel-lead p-5 sm:p-7 xl:col-span-7">
          <h2 id="journey-title" className="text-sm font-semibold text-ket">
            Your quantum journey
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <Ring value={m.mastery} label="Mastery of the current topic" caption="mastery" size={124} />
            <div className="min-w-[14rem] flex-1">
              <p className="text-sm text-mute">
                {done ? "All MVP modules mastered" : `Current topic · module ${meta.number}`}
              </p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {meta.title}
              </p>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-mute">Progress</span>
                  <span className="font-semibold tabular-nums">{completion}% complete</span>
                </div>
                <Meter value={completion} label="Topic progress" tone="signal" />
                <p className="mt-1.5 text-xs text-dim">
                  {stepsDone} of {stepsTotal} steps: lesson, required practice, mastery check
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-mute">Current level</dt>
                <dd className="text-xl font-semibold">Level {insights.level}</dd>
              </div>
              <div>
                <dt className="text-mute">XP</dt>
                <dd className="text-xl font-semibold tabular-nums">{insights.xp} XP</dd>
              </div>
            </dl>
            <Link href={`/learn/${topic}`} className="btn btn-primary px-5 py-3 text-base">
              {returning ? "Continue Learning" : "Start Learning"}
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </section>

        {/* 3. What should I do next? */}
        <div className="xl:col-span-5">
          <NextMoveCard />
        </div>

        {/* 2. How am I doing? */}
        <section aria-label="Learning snapshot" className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:col-span-12">
          <ProgressCard
            label="Concept Mastery"
            value={`${insights.conceptMastery}%`}
            detail="Across the four MVP modules"
            href="/progress"
            icon={Gauge}
          />
          <ProgressCard
            label="Prediction Accuracy"
            value={pct(insights.prediction.accuracy)}
            detail={
              insights.prediction.total === 0
                ? "No predictions yet"
                : `${insights.prediction.correct} of ${insights.prediction.total} predictions`
            }
            href="/lab"
            icon={Crosshair}
            iconClassName="text-phase"
          />
          <ProgressCard
            label="Practice Accuracy"
            value={pct(insights.practice.accuracy)}
            detail={
              insights.practice.total === 0
                ? "No challenges tried yet"
                : `${insights.challengesSolved} of ${insights.challengesTotal} challenges solved`
            }
            href="/practice"
            icon={Target}
            iconClassName="text-signal"
          />
          <ProgressCard
            label="Current Streak"
            value={`${insights.streak} ${insights.streak === 1 ? "Day" : "Days"}`}
            detail={insights.streak === 0 ? "Learn today to start one" : "Days in a row with activity"}
            href="/progress"
            icon={Flame}
            iconClassName="text-warn"
          />
        </section>

        {/* 5. What makes Quantum Nexus different? */}
        <section aria-labelledby="loop-title" className="panel flex flex-col p-5 sm:p-6 xl:col-span-7">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="loop-title" className="text-lg font-semibold">
              Your learning loop
            </h2>
            <p className="text-sm text-mute">
              You are here: <span className="font-semibold text-ket">{position.toUpperCase()}</span>
            </p>
          </div>
          <JourneyLoop current={position} dense />
          <div className="mt-auto pt-5">
            <p className="rounded-xl border border-line bg-void/50 px-4 py-3 text-sm leading-relaxed text-mute">
              <span className="font-semibold text-ink">{position}: </span>
              {t(LOOP_NOTE[position])}{" "}
              {t({
                en: "Run, Observe and Explain happen inside every practice challenge and lab experiment.",
                hi: "Run, Observe aur Explain har practice challenge aur lab experiment ke andar hote hain.",
              })}
            </p>
          </div>
        </section>

        <div className="xl:col-span-5">
          <PredictionInsight />
        </div>

        {/* 1. Where am I? (roadmap) */}
        <section aria-labelledby="roadmap-title" className="panel p-5 sm:p-6 xl:col-span-7">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="roadmap-title" className="text-lg font-semibold">
              Learning roadmap
            </h2>
            <Link href="/learn" className="text-sm font-medium text-ket hover:underline">
              Open Learn
            </Link>
          </div>
          <LearningRoadmap />
        </section>

        <div className="flex flex-col gap-4 xl:col-span-5">
          {/* 4. What did I recently accomplish? */}
          <section aria-labelledby="activity-title" className="panel p-5 sm:p-6">
            <h2 id="activity-title" className="mb-4 text-lg font-semibold">
              Recent activity
            </h2>
            <ActivityFeed limit={6} />
          </section>

          <section aria-labelledby="achievements-title" className="panel p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="achievements-title" className="text-lg font-semibold">
                Achievements
              </h2>
              <span className="text-sm text-mute">
                {Object.keys(state.achievements).length} of {ACHIEVEMENTS.length} earned
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {preview.map((achievement) => (
                <AchievementBadge key={achievement.id} achievement={achievement} compact />
              ))}
            </div>
            <Link href="/achievements" className="btn btn-secondary mt-4 text-sm">
              View All Achievements
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
