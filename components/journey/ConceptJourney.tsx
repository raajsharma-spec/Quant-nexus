"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Lock, Trophy } from "lucide-react";
import { conceptContent } from "@/data/curriculum";
import { INTERACTIVE_TOPICS, topicMeta, topicTitle } from "@/data/topics";
import { isConceptUnlocked, nextTopic, topicStatus } from "@/lib/mastery";
import { stageAction } from "@/lib/recommendationEngine";
import {
  completedStageCount,
  conceptMasteryScore,
  currentStage,
  isStageUnlocked,
  lockMessage,
  passes,
  progressOf,
  stageScore,
} from "@/lib/stages";
import { STAGE_IDS, stageMeta, type StageId, type TopicId } from "@/lib/types";
import { useApp } from "../AppProvider";
import { Meter, StatusBadge } from "../ui";
import { AssessStage } from "./AdaptiveAssessment";
import { ObserveStage, PredictStage, RunStage } from "./CoreExperiment";
import { AskStage, DiscoverStage, ExperimentStage, InteractStage, LearnStage, WatchStage } from "./EarlyStages";
import { ExplainStage } from "./ExplainPanel";
import { ChallengeStage, ReviewStage } from "./ReviewAndChallenge";
import { StageRail } from "./StageRail";

const isStage = (value: string | null): value is StageId => !!value && (STAGE_IDS as string[]).includes(value);

/** Counts the time a stage is on screen (only while the tab is visible). */
function useStageTimer(topic: TopicId, stage: StageId, enabled: boolean, save: (topic: TopicId, stage: StageId, ms: number) => void) {
  useEffect(() => {
    if (!enabled) return;
    let since: number | null = document.visibilityState === "visible" ? Date.now() : null;
    let total = 0;
    const flush = () => {
      if (since !== null) {
        total += Date.now() - since;
        since = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") since = Date.now();
      else flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
      if (total >= 1000) save(topic, stage, total);
    };
  }, [topic, stage, enabled, save]);
}

/**
 * One concept, as a guided journey of 13 stages.
 *
 * The stage on screen is whatever the learner opened — but only stages whose
 * gate is open can be opened. The gate itself lives in lib/stages.ts and is
 * enforced again by every action in lib/actions.ts, so nothing here can be
 * used to skip ahead.
 */
export function ConceptJourney({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const params = useSearchParams();
  const requested = params.get("stage");
  const content = conceptContent(topic);
  const meta = topicMeta(topic);
  const threshold = state.settings.masteryThreshold;
  const unlocked = isConceptUnlocked(state, topic);
  const progress = progressOf(state, topic);
  const top = useRef<HTMLDivElement>(null);

  const [viewing, setViewing] = useState<StageId>(() => {
    if (isStage(requested) && isStageUnlocked(progress, requested, threshold)) return requested;
    return currentStage(progress, threshold) ?? progress.lastStage ?? "discover";
  });
  /** A locked stage the learner tried to open: explains what unlocks it. */
  const [lockedTry, setLockedTry] = useState<StageId | null>(() =>
    isStage(requested) && !isStageUnlocked(progress, requested, threshold) ? requested : null
  );

  // Remember the open stage (and record the first visit to it).
  useEffect(() => {
    if (unlocked) actions.openStage(topic, viewing);
  }, [actions, topic, viewing, unlocked]);

  useStageTimer(topic, viewing, unlocked, actions.addStageTime);

  const open = useCallback(
    (stage: StageId) => {
      setLockedTry(null);
      setViewing(stage);
      top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    },
    []
  );

  if (!content) return null;

  // --- A concept that is still locked ------------------------------------------
  if (!unlocked) {
    const index = INTERACTIVE_TOPICS.indexOf(topic);
    const previous = INTERACTIVE_TOPICS[Math.max(0, index - 1)];
    return (
      <div className="panel mx-auto max-w-2xl p-6 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white/[0.04] text-mute">
          <Lock size={24} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {t({ en: `${meta.title} is locked for now`, hi: `${meta.title} abhi locked hai` })}
        </h1>
        <p className="mx-auto mt-2 max-w-[50ch] text-mute">
          {t({
            en: `It opens when you master ${topicTitle(previous)}: every stage of that concept at ${threshold}% or more. You can retry any stage as often as you like.`,
            hi: `Yeh tab open hoga jab aap ${topicTitle(previous)} master karoge: us concept ka har stage ${threshold}% ya zyada par. Koi bhi stage jitni baar chaho retry kar sakte ho.`,
          })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/learn/${previous}`} className="btn btn-primary">
            {t({ en: `Continue ${topicTitle(previous)}`, hi: `${topicTitle(previous)} continue karo` })}
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link href="/learn" className="btn btn-secondary">
            {t({ en: "All concepts", hi: "Saare concepts" })}
          </Link>
        </div>
      </div>
    );
  }

  const stage = stageMeta(viewing);
  const index = STAGE_IDS.indexOf(viewing);
  const score = stageScore(progress, viewing);
  const passed = passes(score, threshold);
  const nextStage = STAGE_IDS[index + 1] as StageId | undefined;
  const previousStage = index > 0 ? STAGE_IDS[index - 1] : undefined;
  const done = completedStageCount(progress, threshold);
  const mastered = !!progress.masteredAt;
  const following = nextTopic(topic);

  const body = () => {
    switch (viewing) {
      case "discover":
        return (
          <DiscoverStage
            topic={topic}
            onBegin={() => {
              actions.completeDiscover(topic);
              open("learn");
            }}
          />
        );
      case "learn":
        return <LearnStage topic={topic} />;
      case "watch":
        return <WatchStage topic={topic} />;
      case "interact":
        return <InteractStage topic={topic} />;
      case "experiment":
        return <ExperimentStage topic={topic} />;
      case "ask":
        return <AskStage topic={topic} />;
      case "predict":
        return <PredictStage topic={topic} />;
      case "run":
        return <RunStage topic={topic} />;
      case "observe":
        return <ObserveStage topic={topic} />;
      case "explain":
        return <ExplainStage topic={topic} />;
      case "assess":
        return <AssessStage topic={topic} />;
      case "review":
        return <ReviewStage topic={topic} />;
      case "challenge":
        return <ChallengeStage topic={topic} />;
    }
  };

  return (
    <div ref={top} className="scroll-mt-24">
      <header className="mb-5">
        <Link href="/learn" className="mb-3 inline-flex items-center gap-1.5 rounded text-sm text-mute hover:text-ink">
          <ArrowLeft size={15} aria-hidden />
          {t({ en: "All concepts", hi: "Saare concepts" })}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="ket rounded-lg border border-line px-2 py-1 text-sm text-mute">{meta.number}</span>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{meta.title}</h1>
          <StatusBadge status={topicStatus(state, topic)} />
        </div>
        <div className="mt-3 grid max-w-xl gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm text-mute">
            <span>
              {t({
                en: `${done} of ${STAGE_IDS.length} stages complete`,
                hi: `${STAGE_IDS.length} mein se ${done} stages complete`,
              })}
            </span>
            <span>
              {t({ en: "Concept mastery", hi: "Concept mastery" })}{" "}
              <span className="font-semibold tabular-nums text-ink">{conceptMasteryScore(progress)}%</span>
            </span>
          </div>
          <Meter value={(done / STAGE_IDS.length) * 100} label={`${meta.title} stages complete`} tone="ket" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[14.5rem_1fr]">
        <nav aria-label="Stages of this concept" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <StageRail
            progress={progress}
            threshold={threshold}
            viewing={viewing}
            onOpen={open}
            onLocked={(locked) => setLockedTry(locked)}
            t={t}
          />
        </nav>

        <div className="min-w-0">
          {lockedTry && (
            <div role="alert" className="mb-4 flex animate-rise items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3">
              <Lock size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-warn">
                  {stageMeta(lockedTry).number} · {stageMeta(lockedTry).label} {t({ en: "is locked", hi: "locked hai" })}
                </p>
                <p className="mt-0.5 text-sm text-ink/90">{t(lockMessage(lockedTry, threshold))}</p>
              </div>
              <button type="button" onClick={() => setLockedTry(null)} className="btn btn-ghost px-2 py-1 text-sm">
                {t({ en: "OK", hi: "OK" })}
              </button>
            </div>
          )}

          <section aria-labelledby="stage-title" className="panel p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="ket text-sm text-ket">
                  {t({ en: "Stage", hi: "Stage" })} {stage.number} · {t(stage.hint)}
                </p>
                <h2 id="stage-title" className="mt-0.5 text-2xl font-semibold tracking-tight">
                  {stage.label}
                </h2>
              </div>
              <p
                className={`tag ${passed ? "border-ok/40 bg-ok/10 text-ok" : "border-line text-mute"}`}
                aria-label={`Stage score ${score}%, ${threshold}% needed`}
              >
                {passed ? <Check size={12} aria-hidden /> : null}
                {score}% <span className="font-normal opacity-80">/ {threshold}%</span>
              </p>
            </div>
            <div key={viewing} className="animate-rise">
              {body()}
            </div>
          </section>

          {/* The gate */}
          <div
            aria-live="polite"
            className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${
              passed ? "border-ok/40 bg-ok/[0.07]" : "border-line bg-void/50"
            }`}
          >
            <div className="min-w-0 flex-1">
              {passed ? (
                <p className="flex items-center gap-2 font-semibold text-ok">
                  <Check size={18} aria-hidden />
                  {nextStage
                    ? t({ en: "Stage complete. Next stage unlocked.", hi: "Stage complete. Next stage unlock ho gaya." })
                    : t({ en: "Stage complete. Every stage of this concept is done.", hi: "Stage complete. Is concept ka har stage ho gaya." })}
                </p>
              ) : (
                <>
                  <p className="flex items-center gap-2 font-semibold">
                    <Lock size={17} className="text-mute" aria-hidden />
                    {t({ en: "Complete this stage to continue", hi: "Continue karne ke liye yeh stage complete karo" })}
                  </p>
                  <p className="mt-0.5 text-sm text-mute">
                    {t(stageAction(state, topic, viewing))}{" "}
                    {t({
                      en: `This stage is at ${score}%; the next one opens at ${threshold}%.`,
                      hi: `Yeh stage ${score}% par hai; next stage ${threshold}% par open hota hai.`,
                    })}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {previousStage && (
                <button type="button" onClick={() => open(previousStage)} className="btn btn-ghost text-sm">
                  <ArrowLeft size={15} aria-hidden />
                  {stageMeta(previousStage).label}
                </button>
              )}
              {nextStage && (
                <button
                  type="button"
                  onClick={() => (passed ? open(nextStage) : setLockedTry(nextStage))}
                  aria-disabled={!passed}
                  className={`btn text-sm ${passed ? "btn-primary" : "btn-secondary cursor-not-allowed opacity-60"}`}
                >
                  {passed ? null : <Lock size={14} aria-hidden />}
                  {stageMeta(nextStage).label}
                  <ArrowRight size={15} aria-hidden />
                </button>
              )}
            </div>
          </div>

          {/* Mastery */}
          {mastered && (
            <div className="panel-lead mt-4 animate-rise p-5 sm:p-6">
              <p className="flex items-center gap-2 text-sm font-semibold text-ok">
                <Trophy size={17} aria-hidden />
                {t({ en: "Concept mastered", hi: "Concept mastered" })}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {t({
                  en: `You have mastered ${meta.title}.`,
                  hi: `Aapne ${meta.title} master kar liya.`,
                })}
              </h2>
              <p className="mt-1.5 max-w-[62ch] text-ink/85">
                {following
                  ? t({
                      en: `All ${STAGE_IDS.length} stages reached ${threshold}% or more, so ${topicTitle(following)} is now unlocked. A one-question Quick Review of ${meta.title} will come back later to keep it fresh.`,
                      hi: `Saare ${STAGE_IDS.length} stages ${threshold}% ya zyada par pahunche, isliye ${topicTitle(following)} ab unlock ho gaya. ${meta.title} ka ek-question Quick Review baad mein aayega taaki yeh fresh rahe.`,
                    })
                  : t({
                      en: `All ${STAGE_IDS.length} stages reached ${threshold}% or more. This was the last concept available in this build — keep experimenting in the Quantum Lab.`,
                      hi: `Saare ${STAGE_IDS.length} stages ${threshold}% ya zyada par pahunche. Yeh is build ka last available concept tha — Quantum Lab mein experiment karte raho.`,
                    })}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {following ? (
                  <Link href={`/learn/${following}`} className="btn btn-primary">
                    {t({ en: `Start ${topicTitle(following)}`, hi: `${topicTitle(following)} start karo` })}
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                ) : (
                  <Link href="/lab" className="btn btn-primary">
                    {t({ en: "Open the Quantum Lab", hi: "Quantum Lab kholo" })}
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                )}
                <Link href="/dashboard" className="btn btn-secondary">
                  {t({ en: "Back to dashboard", hi: "Dashboard par wapas" })}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
