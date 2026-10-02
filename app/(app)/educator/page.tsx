"use client";

import { BookOpenCheck, ClipboardList, Lightbulb, SlidersHorizontal } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { DemoBadge, Meter, PageHeader } from "@/components/ui";
import { CURRICULUM } from "@/data/curriculum";
import { SAMPLE_COHORT, SAMPLE_ENGAGEMENT, SAMPLE_MISCONCEPTIONS, SAMPLE_STAGE_FRICTION } from "@/data/educatorDemo";
import { misconceptionById } from "@/data/misconceptions";
import { topicTitle } from "@/data/topics";
import { knowledgeStats } from "@/lib/knowledgeBase";
import { LEVEL_LABEL } from "@/lib/learnerLevel";
import { currentStageOf, currentTopic } from "@/lib/mastery";
import { activeMisconceptions } from "@/lib/misconceptions";
import { getRecommendation } from "@/lib/recommendationEngine";
import { DEFAULT_MASTERY_THRESHOLD, MAX_MASTERY_THRESHOLD, MIN_MASTERY_THRESHOLD } from "@/lib/storage";
import { STAGE_IDS, stageMeta } from "@/lib/types";

const average = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) / values.length);

export default function EducatorPage() {
  const { state, insights, t, actions } = useApp();
  const threshold = state.settings.masteryThreshold;

  // Aggregates over the sample cohort.
  const progress = average(SAMPLE_COHORT.map((l) => l.progress));
  const prediction = average(SAMPLE_COHORT.map((l) => l.predictionAccuracy));
  const assessment = average(SAMPLE_COHORT.map((l) => l.assessmentAverage));

  const weakCounts = new Map<string, number>();
  SAMPLE_COHORT.forEach((l) => {
    if (l.weakTopic) weakCounts.set(l.weakTopic, (weakCounts.get(l.weakTopic) ?? 0) + 1);
  });
  const weakTopics = Array.from(weakCounts.entries()).sort((a, b) => b[1] - a[1]);
  const [topWeak, topWeakCount] = weakTopics[0];
  const maxEngagement = Math.max(...SAMPLE_ENGAGEMENT.map((e) => e.count));

  // The same kind of transparent rule the learner-side engine uses.
  const intervention =
    prediction < 60
      ? {
          action: "Review the Predict-Before-Run activity",
          rule: `IF cohort prediction accuracy (${prediction}%) is below 60% → revisit predict-before-run on the most common weak topic (${topWeak}).`,
        }
      : {
          action: `Run a short recap on ${topWeak}`,
          rule: `IF cohort prediction accuracy is 60% or more → recap the most common weak topic (${topWeak}).`,
        };

  const learner = state.profile?.role === "learner" || state.predictions.length > 0 || state.events.length > 0;
  const rec = getRecommendation(state);
  const topic = currentTopic(state);
  const stage = currentStageOf(state, topic);
  const open = activeMisconceptions(state);
  const kb = knowledgeStats();
  const maxFriction = Math.max(...SAMPLE_STAGE_FRICTION.map((item) => item.averageAttempts));

  return (
    <>
      <PageHeader
        title="Educator Insights"
        lead="A demonstration of the class view. The cohort panels are sample data — no real students are connected to this build. The panel for the learner on this device and the mastery threshold are real."
      >
        <DemoBadge>DEMO ANALYTICS</DemoBadge>
      </PageHeader>

      {/* Cohort summary */}
      <section aria-label="Cohort summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Learner Progress", value: `${progress}%`, detail: "Average share of concepts mastered" },
          { label: "Prediction Accuracy", value: `${prediction}%`, detail: "Average across the sample cohort" },
          { label: "Assessment Performance", value: `${assessment}%`, detail: "Average mastery-check score" },
          { label: "Weak Topic", value: topWeak, detail: `${topWeakCount} of ${SAMPLE_COHORT.length} sample learners` },
        ].map((card) => (
          <div key={card.label} className="panel p-4 sm:p-5">
            <p className="text-sm text-mute">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm text-dim">{card.detail}</p>
          </div>
        ))}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        {/* Learner table */}
        <section aria-labelledby="cohort-title" className="panel p-5 sm:p-6 xl:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="cohort-title" className="text-lg font-semibold">
              Learner progress
            </h2>
            <DemoBadge>Sample cohort</DemoBadge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-left text-sm">
              <thead className="text-mute">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Learner</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Current topic</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Progress</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Prediction</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Assessment</th>
                  <th scope="col" className="py-2 font-medium">Weak topic</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_COHORT.map((l) => (
                  <tr key={l.label} className="border-t border-line">
                    <th scope="row" className="py-3 pr-4 font-medium">{l.label}</th>
                    <td className="py-3 pr-4 text-mute">{l.currentTopic}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <Meter value={l.progress} label={`${l.label} progress`} tone="signal" />
                        </div>
                        <span className="tabular-nums text-mute">{l.progress}%</span>
                      </div>
                    </td>
                    <td className={`py-3 pr-4 text-right tabular-nums ${l.predictionAccuracy < 60 ? "text-warn" : ""}`}>
                      {l.predictionAccuracy}%
                      {l.predictionAccuracy < 60 && <span className="sr-only"> (below 60%)</span>}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{l.assessmentAverage}%</td>
                    <td className="py-3">{l.weakTopic ?? <span className="text-dim">None</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Intervention */}
        <section aria-labelledby="intervention-title" className="xl:col-span-4">
          <div className="rounded-2xl border border-phase/35 bg-phase/[0.06] p-5 sm:p-6">
            <h2 id="intervention-title" className="flex items-center gap-2 text-sm font-semibold text-phase">
              <Lightbulb size={17} aria-hidden />
              Recommended intervention
            </h2>
            <dl className="mt-3 flex flex-col gap-3">
              <div>
                <dt className="text-sm text-mute">Weak topic</dt>
                <dd className="text-lg font-semibold">{topWeak}</dd>
              </div>
              <div>
                <dt className="text-sm text-mute">Prediction accuracy</dt>
                <dd className="text-lg font-semibold tabular-nums">{prediction}%</dd>
              </div>
              <div>
                <dt className="text-sm text-mute">Suggested intervention</dt>
                <dd className="text-lg font-semibold">{intervention.action}.</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg border border-line bg-void/50 p-3 text-sm leading-relaxed text-mute">
              Rule-based, not predicted by a model: {intervention.rule}
            </p>
          </div>
        </section>

        {/* Weak topics */}
        <section aria-labelledby="weak-title" className="panel p-5 sm:p-6 xl:col-span-6">
          <h2 id="weak-title" className="mb-4 text-lg font-semibold">
            Weak topics
          </h2>
          <ul className="flex flex-col gap-3">
            {weakTopics.map(([topic, count]) => (
              <li key={topic}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span>{topic}</span>
                  <span className="tabular-nums text-mute">
                    {count} sample learner{count === 1 ? "" : "s"}
                  </span>
                </div>
                <Meter value={(count / SAMPLE_COHORT.length) * 100} label={`${topic}: learners affected`} tone="warn" />
              </li>
            ))}
          </ul>
        </section>

        {/* Engagement */}
        <section aria-labelledby="engagement-title" className="panel p-5 sm:p-6 xl:col-span-6">
          <h2 id="engagement-title" className="mb-4 text-lg font-semibold">
            Engagement events
          </h2>
          <ul className="flex flex-col gap-3">
            {SAMPLE_ENGAGEMENT.map((e) => (
              <li key={e.event}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span>
                    {e.label} <span className="ket text-xs text-dim">{e.event}</span>
                  </span>
                  <span className="tabular-nums text-mute">{e.count}</span>
                </div>
                <Meter value={(e.count / maxEngagement) * 100} label={e.label} tone="ket" />
              </li>
            ))}
          </ul>
        </section>

        {/* Misconceptions across the cohort */}
        <section aria-labelledby="cohort-misconceptions" className="panel p-5 sm:p-6 xl:col-span-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="cohort-misconceptions" className="text-lg font-semibold">
              Common misconceptions
            </h2>
            <DemoBadge>Sample cohort</DemoBadge>
          </div>
          <ul className="flex flex-col gap-3">
            {SAMPLE_MISCONCEPTIONS.map((item) => {
              const info = misconceptionById(item.id);
              if (!info) return null;
              return (
                <li key={item.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span>{t(info.title)}</span>
                    <span className="tabular-nums text-mute">
                      {item.learners} flagged · {item.resolved} resolved
                    </span>
                  </div>
                  <Meter value={(item.learners / SAMPLE_COHORT.length) * 100} label={`${info.title.en}: learners flagged`} tone="warn" />
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-dim">
            A flag is a rule-based possibility raised from a learner&apos;s prediction, explanation, tutor question or
            mastery-check answer. It is resolved when the learner later gets the targeted challenge or question right.
          </p>
        </section>

        {/* Where learners need the most attempts */}
        <section aria-labelledby="friction-title" className="panel p-5 sm:p-6 xl:col-span-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="friction-title" className="text-lg font-semibold">
              Stages that take the most attempts
            </h2>
            <DemoBadge>Sample cohort</DemoBadge>
          </div>
          <ul className="flex flex-col gap-3">
            {SAMPLE_STAGE_FRICTION.map((item) => (
              <li key={item.stage}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span>{item.stage}</span>
                  <span className="tabular-nums text-mute">{item.averageAttempts.toFixed(1)} attempts on average</span>
                </div>
                <Meter value={(item.averageAttempts / maxFriction) * 100} label={`${item.stage}: average attempts`} tone="phase" />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-dim">
            Attempts to reach the {threshold}% threshold in a stage. High numbers point at where a class may need a
            worked example before continuing.
          </p>
        </section>

        {/* Real data from this device */}
        <section aria-labelledby="device-title" className="panel p-5 sm:p-6 xl:col-span-7">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="device-title" className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList size={18} className="text-ket" aria-hidden />
              The learner on this device
            </h2>
            {state.mode === "demo" ? (
              <DemoBadge />
            ) : (
              <span className="tag border-ket/40 bg-ket/10 text-ket">Live local records</span>
            )}
          </div>
          {learner ? (
            <>
              <p className="text-mute">
                {state.profile?.name} is on {topicTitle(topic)}
                {stage ? `, stage ${stageMeta(stage).number} (${stageMeta(stage).label})` : ""}. Inferred level:{" "}
                {LEVEL_LABEL[insights.learner.level]}. These numbers come from this browser&apos;s saved learning state.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Stages complete", value: `${insights.stagesCompleted} / ${insights.stagesTotal}` },
                  { label: "Concept mastery", value: `${insights.conceptMastery}%` },
                  { label: "Prediction accuracy", value: insights.prediction.accuracy === null ? "—" : `${insights.prediction.accuracy}%` },
                  { label: "Explanation mastery", value: insights.explanationMastery === null ? "—" : `${insights.explanationMastery}%` },
                  { label: "Mastery check, first try", value: insights.assessmentFirstTry === null ? "—" : `${insights.assessmentFirstTry}%` },
                  { label: "Tutor questions", value: String(insights.tutorQuestions) },
                  { label: "Time in stages", value: `${insights.minutesSpent} min` },
                  { label: "Events recorded", value: String(state.events.length) },
                ].map((item) => (
                  <div key={item.label} className="well px-3 py-2.5">
                    <dd className="text-xl font-semibold tabular-nums">{item.value}</dd>
                    <dt className="text-xs text-mute">{item.label}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm">
                <span className="text-mute">Weak concepts: </span>
                {insights.weakConcepts.length === 0 ? "none recorded" : insights.weakConcepts.map((w) => w.concept).join(", ")}
              </p>
              <p className="mt-1 text-sm">
                <span className="text-mute">Possible misconceptions: </span>
                {open.length === 0
                  ? "none open"
                  : open.map((m) => `${t(m.info.title)} (${Math.round(m.confidence * 100)}%)`).join(", ")}
              </p>
              <p className="mt-1 text-sm">
                <span className="text-mute">Suggested next step: </span>
                {t(rec.title)}
              </p>
            </>
          ) : (
            <p className="text-mute">
              No learner activity on this device yet. Choose Switch learner or role from the profile
              menu, continue as a learner, and this panel fills with real records.
            </p>
          )}
        </section>

        {/* Mastery threshold */}
        <section aria-labelledby="threshold-title" className="panel p-5 sm:p-6 xl:col-span-5">
          <h2 id="threshold-title" className="flex items-center gap-2 text-lg font-semibold">
            <SlidersHorizontal size={18} className="text-ket" aria-hidden />
            Mastery threshold
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            The score a learner needs in a stage before the next stage unlocks. It can be raised, never lowered
            below {MIN_MASTERY_THRESHOLD}%. This setting is real and applies on this device straight away; concepts
            already mastered stay mastered.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <label htmlFor="threshold" className="sr-only">
              Mastery threshold in percent
            </label>
            <input
              id="threshold"
              type="range"
              min={MIN_MASTERY_THRESHOLD}
              max={MAX_MASTERY_THRESHOLD}
              step={1}
              value={threshold}
              onChange={(event) => actions.setThreshold(Number(event.target.value))}
              className="flex-1 accent-[#5ad7f0]"
            />
            <output htmlFor="threshold" className="w-16 text-right text-2xl font-semibold tabular-nums">
              {threshold}%
            </output>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-dim">
            <span>{MIN_MASTERY_THRESHOLD}%</span>
            <button
              type="button"
              onClick={() => actions.setThreshold(DEFAULT_MASTERY_THRESHOLD)}
              disabled={threshold === DEFAULT_MASTERY_THRESHOLD}
              className="rounded px-2 py-1 text-mute hover:text-ink disabled:opacity-50"
            >
              Reset to the default ({DEFAULT_MASTERY_THRESHOLD}%)
            </button>
            <span>{MAX_MASTERY_THRESHOLD}%</span>
          </div>
        </section>

        {/* Curriculum */}
        <section aria-labelledby="curriculum-title" className="panel p-5 sm:p-6 xl:col-span-12">
          <h2 id="curriculum-title" className="flex items-center gap-2 text-lg font-semibold">
            <BookOpenCheck size={18} className="text-ket" aria-hidden />
            Curriculum: {CURRICULUM.title} · v{CURRICULUM.version}
          </h2>
          <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-mute">
            The curriculum is stored as data — modules, concepts, the {STAGE_IDS.length} stages, question bank,
            challenges, rubrics and the tutor&apos;s knowledge base ({kb.verified} verified entries, content v{kb.version},
            updated {kb.updatedAt}). A university can replace or extend it by editing the files in <code className="ket">data/</code>;
            no interface code changes.
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CURRICULUM.modules.map((module) => (
              <li key={module.number} className="well px-3.5 py-2.5 text-sm">
                <span className="ket mr-2 text-xs text-dim">{module.number}</span>
                <span className="font-medium">{module.title}</span>
                <span className="block text-xs text-mute">
                  {module.concepts.length > 0 ? "Built and interactive" : "Planned — not in this build"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
