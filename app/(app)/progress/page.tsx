"use client";

import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useApp } from "@/components/AppProvider";
import { MasteryCard } from "@/components/MasteryCard";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ShareProgress } from "@/components/ShareProgress";
import { DemoBadge, EmptyState, Meter, PageHeader, Ring } from "@/components/ui";
import { challengesFor } from "@/data/challenges";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { LEVEL_LABEL } from "@/lib/learnerLevel";
import { roadmapProgress, topicStatus } from "@/lib/mastery";
import { activeMisconceptions, resolvedMisconceptions } from "@/lib/misconceptions";
import { RULES } from "@/lib/recommendationEngine";

export default function ProgressPage() {
  const { state, insights, t } = useApp();
  const demo = state.mode === "demo";
  const mastered = INTERACTIVE_TOPICS.filter((topic) => topicStatus(state, topic) === "MASTERED").length;

  const pct = (value: number | null) => (value === null ? "—" : `${value}%`);
  const open = activeMisconceptions(state);
  const resolved = resolvedMisconceptions(state);
  const level = insights.learner;
  const explanations = state.explanations.slice(-5).reverse();

  const profile = [
    { label: "Overall Progress", value: `${insights.overallProgress}%` },
    { label: "Stages Completed", value: `${insights.stagesCompleted} / ${insights.stagesTotal}` },
    { label: "Concept Mastery", value: `${insights.conceptMastery}%` },
    { label: "Prediction Accuracy", value: pct(insights.prediction.accuracy) },
    { label: "Explanation Mastery", value: pct(insights.explanationMastery) },
    { label: "Mastery Check, First Try", value: pct(insights.assessmentFirstTry) },
    { label: "Practice Accuracy", value: pct(insights.practice.accuracy) },
    { label: "Circuits Run", value: String(insights.circuitsRun) },
    { label: "Tutor Questions", value: String(insights.tutorQuestions) },
    { label: "Hints Requested", value: String(insights.hintsRequested) },
    { label: "Misconceptions Resolved", value: `${insights.misconceptionsResolved} / ${insights.misconceptionsResolved + insights.misconceptionsOpen}` },
    { label: "Time in Stages", value: `${insights.minutesSpent} min` },
  ];

  return (
    <>
      <PageHeader
        title="Your Progress"
        lead={t({
          en: "Everything here is calculated from what you have actually done on this device.",
          hi: "Yahan sab kuch us se calculate hota hai jo aapne is device par actually kiya hai.",
        })}
      >
        {demo && <DemoBadge>Illustrative Learner Profile</DemoBadge>}
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-12">
        {/* Learning progress */}
        <section aria-labelledby="learning-title" className="panel-lead p-5 sm:p-6 xl:col-span-7">
          <h2 id="learning-title" className="text-lg font-semibold">
            Learning progress
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <Ring value={insights.overallProgress} label="Overall progress" caption="overall" size={124} />
            <div className="min-w-[14rem] flex-1">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-mute">Roadmap</span>
                <span className="font-semibold">
                  {mastered} of {INTERACTIVE_TOPICS.length} concepts mastered
                </span>
              </div>
              <Meter value={roadmapProgress(state)} label="Roadmap progress" tone="ok" />
              <p className="mt-3 text-sm text-mute">
                XP level {insights.level} · {insights.xp} XP · {insights.streak} day
                {insights.streak === 1 ? "" : "s"} streak
              </p>
              <p className="mt-2 text-sm">
                <span className="text-mute">Learner level (inferred, never asked): </span>
                <span className="font-semibold">{LEVEL_LABEL[level.level]}</span>
                {level.provisional && <span className="text-mute"> · provisional</span>}
              </p>
              {level.evidence.length > 0 && (
                <p className="mt-0.5 text-xs leading-relaxed text-dim">Based on: {level.evidence.join(" · ")}</p>
              )}
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-5 sm:grid-cols-3 lg:grid-cols-4">
            {profile.map((item) => (
              <div key={item.label} className="well px-3 py-2.5">
                <dd className="text-xl font-semibold tabular-nums">{item.value}</dd>
                <dt className="text-xs leading-tight text-mute">{item.label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-dim">
            {demo
              ? "Illustrative Learner Profile: sample records created by Start Demo, plus anything you do in this session."
              : "Learner profile generated from local learning telemetry. Nothing is sent anywhere."}
          </p>
        </section>

        {/* Recommended next step */}
        <section aria-label="Recommended next step" className="flex flex-col gap-4 xl:col-span-5">
          <RecommendationCard />
          <details className="panel p-5 text-sm">
            <summary className="cursor-pointer rounded text-base font-semibold">How recommendations are chosen</summary>
            <p className="mt-2 text-mute">
              Rule-Based Personalization: plain IF → THEN rules, checked top to bottom. The first
              one that matches becomes your next move. No machine learning is involved.
            </p>
            <ol className="mt-3 flex flex-col gap-2">
              {RULES.map((rule, index) => (
                <li key={rule.id} className="well px-3 py-2 leading-snug">
                  <span className="ket text-xs text-dim">{index + 1}. IF</span> {rule.when}{" "}
                  <span className="ket text-xs text-ket">→</span> {rule.then}
                </li>
              ))}
            </ol>
          </details>
        </section>

        {/* Topic mastery */}
        <section aria-labelledby="mastery-title" className="panel p-5 sm:p-6 xl:col-span-12">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="mastery-title" className="text-lg font-semibold">
              Concept mastery
            </h2>
            <p className="text-sm text-mute">Mastery threshold: {state.settings.masteryThreshold}%</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {INTERACTIVE_TOPICS.map((topic) => (
              <MasteryCard key={topic} topic={topic} />
            ))}
          </div>
        </section>

        {/* Prediction accuracy */}
        <section aria-labelledby="prediction-title" className="panel p-5 sm:p-6 xl:col-span-6">
          <h2 id="prediction-title" className="text-lg font-semibold">
            Prediction accuracy
          </h2>
          {insights.prediction.total === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No predictions yet"
                body="Predict what a circuit will do before you run it, and your accuracy appears here."
                action={
                  <Link href="/lab" className="btn btn-secondary mt-1 text-sm">
                    Open Quantum Lab
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <p className="mt-1 text-mute">
                <span className="text-3xl font-semibold tabular-nums text-ink">{insights.prediction.accuracy}%</span>{" "}
                overall · {insights.prediction.correct} of {insights.prediction.total} predictions matched
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {INTERACTIVE_TOPICS.map((topic) => {
                  const acc = insights.predictionByTopic[topic];
                  return (
                    <li key={topic}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span>{topicTitle(topic)}</span>
                        <span className="tabular-nums text-mute">
                          {acc ? `${acc.accuracy}% (${acc.correct}/${acc.total})` : "no predictions yet"}
                        </span>
                      </div>
                      <Meter
                        value={acc?.accuracy ?? 0}
                        label={`${topicTitle(topic)} prediction accuracy`}
                        tone={acc && (acc.accuracy ?? 0) < 60 ? "warn" : "phase"}
                        marker={60}
                      />
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-dim">
                The line marks 60%. Below it, with at least 3 predictions, the next move becomes
                predict-before-run practice.
              </p>
            </>
          )}
        </section>

        {/* Practice accuracy */}
        <section aria-labelledby="practice-title" className="panel p-5 sm:p-6 xl:col-span-6">
          <h2 id="practice-title" className="text-lg font-semibold">
            Practice accuracy
          </h2>
          {insights.practice.total === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No challenges tried yet"
                body="Each challenge you attempt is counted here, right or wrong."
                action={
                  <Link href="/practice" className="btn btn-secondary mt-1 text-sm">
                    Open Practice
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <p className="mt-1 text-mute">
                <span className="text-3xl font-semibold tabular-nums text-ink">{insights.practice.accuracy}%</span>{" "}
                · {insights.practice.correct} correct of {insights.practice.total} attempts
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {INTERACTIVE_TOPICS.map((topic) => {
                  const list = challengesFor(topic);
                  const solved = list.filter((c) => state.practice[c.id]?.solved).length;
                  return (
                    <li key={topic}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span>{topicTitle(topic)}</span>
                        <span className="tabular-nums text-mute">
                          {solved} of {list.length} challenges solved
                        </span>
                      </div>
                      <Meter
                        value={(solved / list.length) * 100}
                        label={`${topicTitle(topic)} challenges solved`}
                        tone="signal"
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* Weak concepts */}
        <section aria-labelledby="weak-title" className="panel p-5 sm:p-6 xl:col-span-6">
          <h2 id="weak-title" className="text-lg font-semibold">
            Weak concepts
          </h2>
          {insights.weakConcepts.length === 0 ? (
            <p className="mt-2 text-mute">
              {state.assessments.length === 0
                ? "None recorded yet. They appear after your first mastery check."
                : "None right now. Your latest mastery checks and predictions look solid."}
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {insights.weakConcepts.map((weak) => (
                <li
                  key={`${weak.topic}-${weak.concept}`}
                  className="well flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{weak.concept}</p>
                    <p className="text-sm text-mute">
                      {weak.reason === "mastery-check"
                        ? `Missed in your latest ${topicTitle(weak.topic)} mastery check (${weak.correct} of ${weak.total} right)`
                        : `${weak.correct} of ${weak.total} predictions matched`}
                    </p>
                  </div>
                  <Link
                    href={weak.reason === "mastery-check" ? `/learn/${weak.topic}?stage=assess` : `/practice?topic=${weak.topic}`}
                    className="btn btn-secondary text-sm"
                  >
                    {weak.reason === "mastery-check" ? "Review" : "Practice"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Misconceptions */}
        <section aria-labelledby="misconception-title" className="panel p-5 sm:p-6 xl:col-span-6">
          <h2 id="misconception-title" className="text-lg font-semibold">
            Possible misconceptions
          </h2>
          <p className="mt-1 text-sm text-mute">
            Detected by rules from your predictions, explanations, tutor questions and mastery-check answers. Each
            one is a possibility with a confidence, not a verdict.
          </p>
          {open.length === 0 && resolved.length === 0 ? (
            <p className="mt-3 text-mute">None detected so far.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {open.map((item) => (
                <li key={item.info.id} className="rounded-xl border border-warn/35 bg-warn/[0.06] px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {t(item.info.title)}
                    <span className="tag text-warn">open · {Math.round(item.confidence * 100)}%</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/90">{t(item.info.correction)}</p>
                  <p className="mt-1 text-xs text-dim">
                    Seen {item.count} time{item.count === 1 ? "" : "s"} · from {item.sources.join(", ")} · “{item.lastEvidence}”
                  </p>
                  <Link href={`/practice?challenge=${item.info.challengeId}`} className="btn btn-secondary mt-2 px-3 py-1.5 text-sm">
                    Test it with a circuit
                  </Link>
                </li>
              ))}
              {resolved.map((item) => (
                <li key={item.info.id} className="well px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {t(item.info.title)}
                    <span className="tag border-ok/40 text-ok">resolved</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Explanations */}
        <section aria-labelledby="explanation-title" className="panel p-5 sm:p-6 xl:col-span-6">
          <h2 id="explanation-title" className="text-lg font-semibold">
            Your explanations
          </h2>
          {explanations.length === 0 ? (
            <p className="mt-2 text-mute">None yet. You write the first one in the Explain stage of a concept.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {explanations.map((item) => (
                <li key={item.id} className="well px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {topicTitle(item.topic)} · {item.mode === "written" ? "written" : "built from sentences"}
                    </span>
                    <span className={`font-semibold tabular-nums ${item.score >= state.settings.masteryThreshold ? "text-ok" : "text-warn"}`}>
                      {item.score}%
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-mute">“{item.text}”</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-dim">Your words are stored only on this device.</p>
        </section>

        {/* Collaboration: hand this progress to an instructor */}
        <div className="xl:col-span-12">
          <ShareProgress />
        </div>

        {/* Recent activity */}
        <section aria-labelledby="activity-title" className="panel p-5 sm:p-6 xl:col-span-12">
          <h2 id="activity-title" className="mb-4 text-lg font-semibold">
            Recent activity
          </h2>
          <ActivityFeed limit={9} />
        </section>
      </div>
    </>
  );
}
