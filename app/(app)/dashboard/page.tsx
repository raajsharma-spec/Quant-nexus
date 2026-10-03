"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ClipboardCheck,
  Crosshair,
  FlaskConical,
  Flame,
  Gauge,
  Lock,
  MessageCircleQuestion,
  PenLine,
  Target,
  TriangleAlert,
} from "lucide-react";
import { ACHIEVEMENTS, PREVIEW_ACHIEVEMENTS } from "@/data/achievements";
import { INTERACTIVE_TOPICS, topicMeta, topicTitle } from "@/data/topics";
import { AchievementBadge } from "@/components/AchievementBadge";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useApp } from "@/components/AppProvider";
import { StageRail } from "@/components/journey/StageRail";
import { LearningRoadmap } from "@/components/LearningRoadmap";
import { NextMoveCard } from "@/components/NextMoveCard";
import { PredictionInsight } from "@/components/PredictionInsight";
import { ProgressCard } from "@/components/ProgressCard";
import { QuickReview } from "@/components/QuickReview";
import { DemoBadge, Meter, Ring } from "@/components/ui";
import { LEVEL_LABEL } from "@/lib/learnerLevel";
import { allMastered, topicMastery } from "@/lib/mastery";
import { activeMisconceptions } from "@/lib/misconceptions";
import { nextAction } from "@/lib/recommendationEngine";
import { dueReviews } from "@/lib/review";
import { lockMessage, progressOf } from "@/lib/stages";
import { STAGE_IDS, stageMeta, type StageId } from "@/lib/types";

export default function DashboardPage() {
  const { state, insights, t } = useApp();
  const router = useRouter();
  const name = state.profile?.name ?? "";
  const returning = state.events.length > 0;
  const threshold = state.settings.masteryThreshold;

  // Where the learner is, and the one thing to do next — all read from the saved learning state.
  const next = nextAction(state);
  const topic = next.topic;
  const meta = topicMeta(topic);
  const m = topicMastery(state, topic);
  const progress = progressOf(state, topic);
  const done = allMastered(state);
  const stage = next.stage ? stageMeta(next.stage) : null;

  const [lockedStage, setLockedStage] = useState<StageId | null>(null);
  const misconceptions = activeMisconceptions(state);
  const reviewDue = dueReviews(state).length > 0;
  const preview = PREVIEW_ACHIEVEMENTS.map((id) => ACHIEVEMENTS.find((a) => a.id === id)!);
  const pct = (value: number | null) => (value === null ? "—" : `${value}%`);
  const level = insights.learner;

  const quick = [
    { href: "/ai-tutor", label: "AI Tutor", detail: t({ en: "Ask, get a hint, see the math", hi: "Poochho, hint lo, math dekho" }), icon: MessageCircleQuestion, tone: "text-phase" },
    { href: "/lab", label: "Quantum Lab", detail: t({ en: "Build and run any circuit", hi: "Koi bhi circuit banao aur run karo" }), icon: FlaskConical, tone: "text-ket" },
    { href: "/assessment", label: "Assessment", detail: t({ en: "Mastery checks by concept", hi: "Har concept ke mastery checks" }), icon: ClipboardCheck, tone: "text-signal" },
    { href: "/practice", label: "Practice", detail: t({ en: "Predict-and-run challenges", hi: "Predict-and-run challenges" }), icon: Target, tone: "text-ok" },
  ];

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {returning ? "Welcome back" : "Welcome"}, {name}
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
        {/* Where am I, and what do I do next? */}
        <section aria-labelledby="journey-title" className="panel-lead p-5 sm:p-7 xl:col-span-7">
          <h2 id="journey-title" className="text-sm font-semibold text-ket">
            {t({ en: "Your learning journey", hi: "Aapki learning journey" })}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <Ring value={insights.overallProgress} label="Overall progress" caption="overall" size={124} />
            <div className="min-w-[14rem] flex-1">
              <p className="text-sm text-mute">
                {done
                  ? t({ en: "Every available concept is mastered", hi: "Har available concept master ho gaya" })
                  : t({ en: `Current concept · module ${meta.number}`, hi: `Current concept · module ${meta.number}` })}
              </p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{meta.title}</p>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-mute">{t({ en: "Current stage", hi: "Current stage" })}</dt>
                  <dd className="text-base font-semibold">
                    {stage ? (
                      <>
                        <span className="ket mr-1.5 text-sm font-normal text-dim">{stage.number}</span>
                        {stage.label}
                        <span className="ml-2 text-sm font-normal text-mute">
                          {next.score}% / {threshold}%
                        </span>
                      </>
                    ) : (
                      t({ en: "All stages complete", hi: "Saare stages complete" })
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-mute">{t({ en: "Level (inferred from your work)", hi: "Level (aapke kaam se inferred)" })}</dt>
                  <dd className="text-base font-semibold" title={level.evidence.join(" · ")}>
                    {LEVEL_LABEL[level.level]}
                    {level.provisional && (
                      <span className="ml-2 text-sm font-normal text-mute">{t({ en: "provisional", hi: "provisional" })}</span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-mute">{t({ en: `${meta.title} progress`, hi: `${meta.title} progress` })}</span>
                  <span className="font-semibold tabular-nums">
                    {m.completedStages} / {m.totalStages} {t({ en: "stages", hi: "stages" })}
                  </span>
                </div>
                <Meter value={m.completion} label="Concept progress" tone="signal" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-mute">{t({ en: "Next action", hi: "Next action" })}</p>
              <p className="mt-0.5 font-medium leading-snug">{t(next.action)}</p>
            </div>
            <Link href={next.href} className="btn btn-primary px-5 py-3 text-base">
              {done
                ? t({ en: "Open the Quantum Lab", hi: "Quantum Lab kholo" })
                : returning
                  ? t({ en: "Continue Learning", hi: "Continue Learning" })
                  : t({ en: "Start Learning", hi: "Start Learning" })}
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </section>

        <div className="xl:col-span-5">
          <NextMoveCard />
        </div>

        {/* The stages of the current concept */}
        {!done && (
          <section aria-labelledby="stages-title" className="panel p-5 sm:p-6 xl:col-span-12">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="stages-title" className="text-lg font-semibold">
                {t({ en: `${meta.title}: the 13 stages`, hi: `${meta.title}: 13 stages` })}
              </h2>
              <p className="text-sm text-mute">
                {t({
                  en: `A stage opens when the one before it reaches ${threshold}%.`,
                  hi: `Stage tab open hota hai jab usse pehle wala ${threshold}% par pahunche.`,
                })}
              </p>
            </div>
            <StageRail
              compact
              progress={progress}
              threshold={threshold}
              viewing={next.stage ?? STAGE_IDS[STAGE_IDS.length - 1]}
              onOpen={(id) => router.push(`/learn/${topic}?stage=${id}`)}
              onLocked={setLockedStage}
              t={t}
            />
            {lockedStage && (
              <p role="alert" className="mt-3 flex items-start gap-2.5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
                <Lock size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                <span>
                  <span className="font-semibold text-warn">
                    {stageMeta(lockedStage).label} {t({ en: "is locked.", hi: "locked hai." })}
                  </span>{" "}
                  {t(lockMessage(lockedStage, threshold))}
                </span>
              </p>
            )}
          </section>
        )}

        {/* How am I doing? */}
        <section aria-label="Learning snapshot" className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:col-span-12">
          <ProgressCard
            label="Concept Mastery"
            value={`${insights.conceptMastery}%`}
            detail={`${insights.conceptsMastered} of ${INTERACTIVE_TOPICS.length} concepts mastered`}
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
            href="/progress"
            icon={Crosshair}
            iconClassName="text-phase"
          />
          <ProgressCard
            label="Explanation Mastery"
            value={pct(insights.explanationMastery)}
            detail={
              insights.explanations === 0
                ? "No explanations written yet"
                : `Average of ${insights.explanations} explanation${insights.explanations === 1 ? "" : "s"}`
            }
            href="/progress"
            icon={PenLine}
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

        {/* Spaced review, when one is due */}
        {reviewDue && (
          <div className="xl:col-span-12">
            <QuickReview />
          </div>
        )}

        {/* What needs attention */}
        <section aria-labelledby="focus-title" className="panel flex flex-col p-5 sm:p-6 xl:col-span-7">
          <h2 id="focus-title" className="text-lg font-semibold">
            {t({ en: "What needs your attention", hi: "Kis par dhyan chahiye" })}
          </h2>
          {misconceptions.length === 0 && insights.weakConcepts.length === 0 ? (
            <p className="mt-3 leading-relaxed text-mute">
              {returning
                ? t({
                    en: "Nothing flagged. No possible misconception is open and no concept looks weak in your results so far.",
                    hi: "Kuch flagged nahi. Koi possible misconception open nahi aur ab tak ke results mein koi concept weak nahi dikha.",
                  })
                : t({
                    en: "Nothing yet. As you predict, explain and take mastery checks, weak areas and possible misconceptions will appear here with a way to fix each one.",
                    hi: "Abhi kuch nahi. Jaise aap predict, explain aur mastery checks karoge, weak areas aur possible misconceptions yahan dikhenge, har ek ko fix karne ke tareeke ke saath.",
                  })}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {misconceptions.slice(0, 3).map((item) => (
                <li key={item.info.id} className="rounded-xl border border-warn/35 bg-warn/[0.06] p-3.5">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <TriangleAlert size={16} className="text-warn" aria-hidden />
                    {t({ en: "Possible misconception", hi: "Possible misconception" })}: {t(item.info.title)}
                    <span className="tag text-mute">{Math.round(item.confidence * 100)}% {t({ en: "confidence", hi: "confidence" })}</span>
                  </p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink/90">{t(item.info.correction)}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Link href={`/practice?challenge=${item.info.challengeId}`} className="btn btn-secondary px-3 py-1.5 text-sm">
                      {t({ en: "Test it with a circuit", hi: "Circuit se test karo" })}
                    </Link>
                    <Link href="/ai-tutor?ask=mistake" className="btn btn-ghost px-3 py-1.5 text-sm">
                      {t({ en: "Review it with the tutor", hi: "Tutor ke saath review karo" })}
                    </Link>
                  </div>
                </li>
              ))}
              {insights.weakConcepts.slice(0, 3).map((weak) => (
                <li key={`${weak.topic}-${weak.concept}`} className="well flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block font-medium">{weak.concept}</span>
                    <span className="block text-sm text-mute">
                      {topicTitle(weak.topic)} ·{" "}
                      {weak.reason === "mastery-check"
                        ? t({ en: "missed in the mastery check", hi: "mastery check mein miss hua" })
                        : t({ en: `${weak.correct} of ${weak.total} predictions right`, hi: `${weak.total} mein se ${weak.correct} predictions sahi` })}
                    </span>
                  </span>
                  <Link
                    href={weak.reason === "mastery-check" ? `/learn/${weak.topic}?stage=assess` : `/practice?topic=${weak.topic}`}
                    className="btn btn-secondary px-3 py-1.5 text-sm"
                  >
                    {weak.reason === "mastery-check" ? t({ en: "Targeted retry", hi: "Targeted retry" }) : t({ en: "Practise", hi: "Practise" })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="xl:col-span-5">
          <PredictionInsight />
        </div>

        {/* Quick access */}
        <nav aria-label="Quick access" className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:col-span-12">
          {quick.map((item) => (
            <Link key={item.href} href={item.href} className="panel group flex items-start gap-3 p-4 transition-colors hover:border-ink/30">
              <span className={`mt-0.5 rounded-lg bg-white/[0.05] p-2 ${item.tone}`}>
                <item.icon size={18} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{item.label}</span>
                <span className="block text-sm leading-snug text-mute">{item.detail}</span>
              </span>
            </Link>
          ))}
        </nav>

        {/* The road ahead */}
        <section aria-labelledby="roadmap-title" className="panel p-5 sm:p-6 xl:col-span-7">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="roadmap-title" className="text-lg font-semibold">
              {t({ en: "Learning roadmap", hi: "Learning roadmap" })}
            </h2>
            <Link href="/learn" className="text-sm font-medium text-ket hover:underline">
              Open Learn
            </Link>
          </div>
          <LearningRoadmap />
        </section>

        <div className="flex flex-col gap-4 xl:col-span-5">
          <section aria-labelledby="activity-title" className="panel p-5 sm:p-6">
            <h2 id="activity-title" className="mb-4 text-lg font-semibold">
              {t({ en: "Recent activity", hi: "Recent activity" })}
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
