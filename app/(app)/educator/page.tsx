"use client";

import { useMemo, useRef, useState } from "react";
import { BookOpenCheck, FileUp, Lightbulb, SlidersHorizontal, Trash2, UserPlus, Users } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { DemoBadge, Meter, PageHeader } from "@/components/ui";
import { CURRICULUM } from "@/data/curriculum";
import { sampleCohort } from "@/data/educatorDemo";
import { misconceptionById } from "@/data/misconceptions";
import { INTERACTIVE_TOPICS, topicMeta, topicTitle } from "@/data/topics";
import { timeAgo } from "@/lib/analytics";
import {
  buildReport,
  classInsights,
  decodeReport,
  hasLearnerActivity,
  loadClass,
  saveClass,
  summarizeReport,
  upsertReport,
  type LearnerReport,
} from "@/lib/classroom";
import { knowledgeStats } from "@/lib/knowledgeBase";
import { LEVEL_LABEL } from "@/lib/learnerLevel";
import { passes } from "@/lib/stages";
import { DEFAULT_MASTERY_THRESHOLD, MAX_MASTERY_THRESHOLD, MIN_MASTERY_THRESHOLD } from "@/lib/storage";
import { STAGES, STAGE_IDS, stageMeta } from "@/lib/types";

type Source = "device" | "imported" | "sample";
interface Row {
  report: LearnerReport;
  source: Source;
}

const SOURCE_LABEL: Record<Source, string> = { device: "This device", imported: "Shared report", sample: "Sample" };
const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

export default function EducatorPage() {
  const { state, t, actions } = useApp();
  const threshold = state.settings.masteryThreshold;
  const kb = knowledgeStats();

  const [imported, setImported] = useState<LearnerReport[]>(() => loadClass());
  const [showSample, setShowSample] = useState(() => loadClass().length === 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // The class: the learner on this device, every shared report, and (optionally) the sample cohort.
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    // The learner on this device is shown live; a shared copy of the same learner would be a duplicate.
    const onDevice = hasLearnerActivity(state);
    if (onDevice) list.push({ report: buildReport(state), source: "device" });
    imported
      .filter((report) => !(onDevice && report.id === state.profile?.id))
      .forEach((report) => list.push({ report, source: "imported" }));
    if (showSample) sampleCohort().forEach((report) => list.push({ report, source: "sample" }));
    return list;
  }, [state, imported, showSample]);

  const reports = useMemo(() => rows.map((row) => row.report), [rows]);
  const insights = useMemo(() => classInsights(reports, threshold), [reports, threshold]);
  const selected = rows.find((row) => row.report.id === selectedId) ?? rows[0] ?? null;
  const realCount = rows.filter((row) => row.source !== "sample").length;

  const add = (text: string) => {
    const report = decodeReport(text);
    if (!report) {
      setNotice({
        ok: false,
        text: "That is not a Quantum Nexus progress report. Ask the learner to open Progress, choose Share with your instructor, and send the code or file again.",
      });
      return;
    }
    const next = upsertReport(imported, report);
    setImported(next);
    setSelectedId(report.id);
    setCode("");
    setNotice(
      saveClass(next)
        ? { ok: true, text: `Added ${report.name}'s report. It is saved on this device.` }
        : { ok: false, text: `Added ${report.name}'s report, but this browser could not save it. It will be gone after a refresh.` }
    );
  };

  const remove = (id: string) => {
    const next = imported.filter((report) => report.id !== id);
    setImported(next);
    saveClass(next);
    setNotice({ ok: true, text: "Report removed." });
  };

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 200_000) {
      setNotice({ ok: false, text: "That file is too large to be a progress report." });
      return;
    }
    add(await file.text());
    if (fileInput.current) fileInput.current.value = "";
  };

  const tiles = [
    { label: "Learners", value: String(insights.learners), detail: `${realCount} real, ${insights.learners - realCount} sample` },
    { label: "Average progress", value: `${insights.averageProgress}%`, detail: "Share of all stages complete" },
    { label: "Prediction accuracy", value: pct(insights.averagePrediction), detail: "Class average" },
    { label: "Explanation mastery", value: pct(insights.averageExplanation), detail: "Class average of own-words scores" },
    { label: "Need attention", value: String(insights.needAttention), detail: "Learners with at least one flag" },
  ];

  return (
    <>
      <PageHeader
        title="Instructor dashboard"
        lead="Monitor each learner's progress, performance and weak areas. Learners share a progress report from their Progress page; add it here to see them in your class."
      >
        {state.mode === "demo" && <DemoBadge />}
      </PageHeader>

      {/* Class summary */}
      <section aria-label="Class summary" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="panel p-4">
            <p className="text-sm text-mute">{tile.label}</p>
            <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight">{tile.value}</p>
            <p className="mt-1 text-xs leading-snug text-dim">{tile.detail}</p>
          </div>
        ))}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        {/* Roster */}
        <section aria-labelledby="roster-title" className="panel min-w-0 p-5 sm:p-6 xl:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="roster-title" className="flex items-center gap-2 text-lg font-semibold">
              <Users size={18} className="text-ket" aria-hidden />
              Learners
            </h2>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-mute">
              <input
                type="checkbox"
                checked={showSample}
                onChange={(event) => setShowSample(event.target.checked)}
                className="h-4 w-4 accent-[#5ad7f0]"
              />
              Show the sample cohort
            </label>
          </div>

          {rows.length === 0 ? (
            <p className="well px-4 py-6 text-mute">
              No learners yet. Add a shared report on the right, or switch on the sample cohort to see how the dashboard
              reads.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="text-mute">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">Learner</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Working on</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Progress</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Predict</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Explain</th>
                    <th scope="col" className="py-2 font-medium">Attention</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ report, source }) => {
                    const summary = summarizeReport(report, threshold);
                    const active = selected?.report.id === report.id;
                    return (
                      <tr key={report.id} className={`border-t border-line ${active ? "bg-ket/[0.06]" : ""}`}>
                        <th scope="row" className="py-2.5 pr-3 font-medium">
                          <button
                            type="button"
                            onClick={() => setSelectedId(report.id)}
                            aria-pressed={active}
                            className="rounded text-left hover:text-ket"
                          >
                            {report.name}
                          </button>
                          <span
                            className={`tag ml-2 align-middle ${
                              source === "sample" ? "border-warn/40 text-warn" : source === "device" ? "border-ket/40 text-ket" : "border-ok/40 text-ok"
                            }`}
                          >
                            {source === "device" && state.mode === "demo" ? "Demo learner" : SOURCE_LABEL[source]}
                          </span>
                        </th>
                        <td className="py-2.5 pr-3 text-mute">
                          {summary.topic ? (
                            <>
                              {topicMeta(summary.topic).title}
                              <span className="block text-xs text-dim">
                                {summary.stage ? `${stageMeta(summary.stage).number} ${stageMeta(summary.stage).label}` : ""}
                              </span>
                            </>
                          ) : (
                            "All concepts mastered"
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20">
                              <Meter value={summary.progress} label={`${report.name} progress`} tone="signal" />
                            </div>
                            <span className="tabular-nums text-mute">{summary.progress}%</span>
                          </div>
                        </td>
                        <td
                          className={`py-2.5 pr-3 text-right tabular-nums ${
                            summary.predictionAccuracy !== null && summary.predictionAccuracy < 60 ? "text-warn" : ""
                          }`}
                        >
                          {pct(summary.predictionAccuracy)}
                        </td>
                        <td
                          className={`py-2.5 pr-3 text-right tabular-nums ${
                            report.explanationMastery !== null && report.explanationMastery < threshold ? "text-warn" : ""
                          }`}
                        >
                          {pct(report.explanationMastery)}
                        </td>
                        <td className="py-2.5">
                          {summary.flags.length === 0 ? (
                            <span className="text-ok">On track</span>
                          ) : (
                            <span className="text-warn">{summary.flags[0]}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-dim">
            Select a learner to see every stage. Sample learners are illustrative and always labelled; everything else
            is computed from real reports.
          </p>
        </section>

        {/* Add a learner */}
        <section aria-labelledby="add-title" className="panel p-5 sm:p-6 xl:col-span-4">
          <h2 id="add-title" className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus size={18} className="text-ket" aria-hidden />
            Add a learner report
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            A learner opens <span className="text-ink">Progress</span>, chooses{" "}
            <span className="text-ink">Share with your instructor</span>, and sends you a code or a file. A report holds
            scores and counts only, never their written answers.
          </p>
          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault();
              add(code);
            }}
          >
            <label htmlFor="report-code" className="sr-only">
              Progress report code
            </label>
            <textarea
              id="report-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              rows={3}
              placeholder="Paste a report code (starts with QN1.)"
              className="ket w-full rounded-xl border border-line bg-void/70 px-3 py-2.5 text-xs placeholder:text-dim"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="submit" disabled={!code.trim()} className="btn btn-primary text-sm">
                Add to class
              </button>
              <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-secondary text-sm">
                <FileUp size={15} aria-hidden />
                Open a report file
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json,.txt"
                className="sr-only"
                aria-label="Open a progress report file"
                onChange={(event) => openFile(event.target.files?.[0])}
              />
            </div>
          </form>
          {notice && (
            <p role="status" className={`mt-3 text-sm leading-relaxed ${notice.ok ? "text-ok" : "text-warn"}`}>
              {notice.text}
            </p>
          )}
          {imported.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
              {imported.map((report) => (
                <li key={report.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {report.name} <span className="text-dim">· shared {timeAgo(report.at)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(report.id)}
                    className="rounded p-1 text-dim hover:text-warn"
                    aria-label={`Remove ${report.name}'s report`}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* One learner in detail */}
        {selected && <LearnerDetail row={selected} threshold={threshold} demo={state.mode === "demo"} />}

        {/* Weak areas */}
        <section aria-labelledby="weak-title" className="panel p-5 sm:p-6 xl:col-span-4">
          <h2 id="weak-title" className="mb-4 text-lg font-semibold">
            Class weak areas
          </h2>
          {insights.weakAreas.length === 0 ? (
            <p className="text-mute">None recorded. Weak areas appear after learners take a mastery check.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {insights.weakAreas.map((area) => (
                <li key={`${area.topic}-${area.concept}`}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span>
                      {area.concept} <span className="text-dim">· {topicTitle(area.topic)}</span>
                    </span>
                    <span className="tabular-nums text-mute">
                      {area.learners} of {insights.learners}
                    </span>
                  </div>
                  <Meter value={(area.learners / insights.learners) * 100} label={`${area.concept}: learners affected`} tone="warn" />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Misconceptions */}
        <section aria-labelledby="misconceptions-title" className="panel p-5 sm:p-6 xl:col-span-4">
          <h2 id="misconceptions-title" className="mb-4 text-lg font-semibold">
            Possible misconceptions
          </h2>
          {insights.misconceptions.length === 0 ? (
            <p className="text-mute">None flagged in this class.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {insights.misconceptions.map((item) => {
                const info = misconceptionById(item.id);
                if (!info) return null;
                return (
                  <li key={item.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span>{t(info.title)}</span>
                      <span className="whitespace-nowrap tabular-nums text-mute">
                        {item.open} open, {item.resolved} resolved
                      </span>
                    </div>
                    <Meter value={(item.open / insights.learners) * 100} label={`${info.title.en}: learners with it open`} tone="warn" />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Stage friction */}
        <section aria-labelledby="friction-title" className="panel p-5 sm:p-6 xl:col-span-4">
          <h2 id="friction-title" className="mb-4 text-lg font-semibold">
            Stages that take the most attempts
          </h2>
          {insights.stageFriction.length === 0 ? (
            <p className="text-mute">No stage has needed more than one attempt so far.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {insights.stageFriction.map((item) => (
                <li key={item.stage}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span>{stageMeta(item.stage).label}</span>
                    <span className="tabular-nums text-mute">{item.averageAttempts.toFixed(1)} attempts on average</span>
                  </div>
                  <Meter
                    value={(item.averageAttempts / insights.stageFriction[0].averageAttempts) * 100}
                    label={`${stageMeta(item.stage).label}: average attempts`}
                    tone="phase"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Interventions */}
        <section aria-labelledby="intervention-title" className="xl:col-span-7">
          <div className="h-full rounded-2xl border border-phase/35 bg-phase/[0.06] p-5 sm:p-6">
            <h2 id="intervention-title" className="flex items-center gap-2 text-lg font-semibold">
              <Lightbulb size={18} className="text-phase" aria-hidden />
              Suggested next steps for the class
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {insights.interventions.map((item) => (
                <li key={item.action} className="rounded-xl border border-line bg-void/50 px-4 py-3">
                  <p className="font-semibold">{item.action}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-mute">{item.rule}</p>
                </li>
              ))}
              {insights.interventions.length === 0 && <li className="text-mute">Add learners to see suggestions.</li>}
            </ul>
            <p className="mt-3 text-xs text-dim">These come from plain IF → THEN rules, not from a predictive model.</p>
          </div>
        </section>

        {/* Mastery threshold */}
        <section aria-labelledby="threshold-title" className="panel p-5 sm:p-6 xl:col-span-5">
          <h2 id="threshold-title" className="flex items-center gap-2 text-lg font-semibold">
            <SlidersHorizontal size={18} className="text-ket" aria-hidden />
            Mastery threshold
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            The score a learner needs in a stage before the next stage unlocks. It can be raised, never lowered below{" "}
            {MIN_MASTERY_THRESHOLD}%. Concepts already mastered stay mastered.
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
            Curriculum: {CURRICULUM.title}, version {CURRICULUM.version}
          </h2>
          <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-mute">
            The curriculum is stored as data: modules, concepts, the {STAGE_IDS.length} stages, question bank,
            challenges, rubrics and the tutor&apos;s knowledge base ({kb.verified} verified entries). A university can
            replace or extend it by editing the files in <code className="ket">data/</code>; no interface code changes.
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CURRICULUM.modules.map((module) => (
              <li key={module.number} className="well px-3.5 py-2.5 text-sm">
                <span className="ket mr-2 text-xs text-dim">{module.number}</span>
                <span className="font-medium">{module.title}</span>
                <span className="block text-xs text-mute">{module.concepts.length > 0 ? "Built and interactive" : "Planned"}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

/** Everything about one learner: every stage of every concept, flags, weak areas and misconceptions. */
function LearnerDetail({ row, threshold, demo }: { row: Row; threshold: number; demo: boolean }) {
  const { t } = useApp();
  const { report, source } = row;
  const summary = summarizeReport(report, threshold);

  const facts = [
    { label: "Level (inferred)", value: LEVEL_LABEL[report.level] },
    { label: "Concepts mastered", value: `${summary.conceptsMastered} of ${INTERACTIVE_TOPICS.length}` },
    { label: "Stages complete", value: `${summary.stagesDone} of ${summary.stagesTotal}` },
    { label: "Prediction accuracy", value: `${pct(summary.predictionAccuracy)} (${report.prediction.correct}/${report.prediction.total})` },
    { label: "Explanation mastery", value: pct(report.explanationMastery) },
    { label: "Mastery check, first try", value: pct(report.firstTry) },
    { label: "Practice accuracy", value: pct(summary.practiceAccuracy) },
    { label: "Time in stages", value: `${report.minutes} min` },
    { label: "Tutor questions", value: String(report.tutorQuestions) },
    { label: "Last active", value: timeAgo(report.lastActiveAt) },
  ];

  return (
    <section aria-labelledby="detail-title" className="panel min-w-0 p-5 sm:p-6 xl:col-span-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="detail-title" className="text-lg font-semibold">
          {report.name}
        </h2>
        <span className="text-sm text-mute">
          {source === "sample" ? "Sample learner" : source === "device" ? (demo ? "Demo learner on this device" : "Live, from this device") : `Report shared ${timeAgo(report.at)}`}
        </span>
      </div>

      {/* Every stage of every concept */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-separate border-spacing-y-1.5 text-sm">
          <caption className="sr-only">Stage scores for {report.name}, one row per concept</caption>
          <thead>
            <tr className="text-xs text-dim">
              <th scope="col" className="pr-3 text-left font-medium">Concept</th>
              {STAGES.map((stage) => (
                <th key={stage.id} scope="col" className="px-0.5 text-center font-medium" title={stage.label}>
                  <span className="ket">{stage.number}</span>
                  <span className="sr-only"> {stage.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INTERACTIVE_TOPICS.map((topic) => {
              const concept = report.concepts[topic];
              return (
                <tr key={topic}>
                  <th scope="row" className="whitespace-nowrap pr-3 text-left font-medium">
                    {topicTitle(topic)}
                    {concept?.mastered && <span className="ml-2 text-xs font-normal text-ok">mastered</span>}
                  </th>
                  {STAGES.map((stage, index) => {
                    const score = concept?.scores[index] ?? 0;
                    const attempts = concept?.attempts[index] ?? 0;
                    const done = passes(score, threshold);
                    return (
                      <td key={stage.id} className="px-0.5">
                        <span
                          title={`${stage.label}: ${score}%${attempts > 1 ? `, ${attempts} attempts` : ""}`}
                          className={`ket flex h-8 items-center justify-center rounded-md border text-[0.7rem] tabular-nums ${
                            done
                              ? "border-ok/40 bg-ok/15 text-ok"
                              : score > 0
                                ? "border-warn/45 bg-warn/10 text-warn"
                                : "border-line text-dim"
                          }`}
                        >
                          {score > 0 ? score : "·"}
                          <span className="sr-only">
                            {done ? " complete" : score > 0 ? " in progress" : " not started"}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-dim">
        Each cell is the best score in that stage. A stage is complete at {threshold}% or more. Stages 00 to 12: {STAGES.map((s) => s.label).join(", ")}.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-2 xl:grid-cols-5">
          {facts.map((fact) => (
            <div key={fact.label} className="well px-3 py-2.5">
              <dd className="font-semibold tabular-nums">{fact.value}</dd>
              <dt className="text-xs leading-tight text-mute">{fact.label}</dt>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-semibold">Needs attention</p>
            {summary.flags.length === 0 ? (
              <p className="text-ok">Nothing flagged. This learner is on track.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {summary.flags.map((flag) => (
                  <li key={flag} className="text-warn">
                    {flag}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-semibold">Weak areas</p>
            <p className="text-mute">
              {report.weak.length === 0
                ? "None recorded."
                : report.weak.map((weak) => `${weak.concept} (${topicTitle(weak.topic)})`).join(", ")}
            </p>
          </div>
          <div>
            <p className="font-semibold">Possible misconceptions</p>
            {report.misconceptionsOpen.length === 0 && report.misconceptionsResolved.length === 0 ? (
              <p className="text-mute">None detected.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1.5">
                {report.misconceptionsOpen.map((id) => {
                  const info = misconceptionById(id);
                  return info ? (
                    <li key={id}>
                      <span className="text-warn">{t(info.title)}</span>
                      <span className="block text-mute">{t(info.evidence)}</span>
                    </li>
                  ) : null;
                })}
                {report.misconceptionsResolved.map((id) => {
                  const info = misconceptionById(id);
                  return info ? (
                    <li key={id} className="text-mute">
                      {t(info.title)} <span className="text-ok">resolved</span>
                    </li>
                  ) : null;
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
