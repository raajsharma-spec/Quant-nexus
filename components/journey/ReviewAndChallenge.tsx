"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, CircleAlert, Lightbulb, RotateCcw, Shuffle, Sparkles, Target } from "lucide-react";
import { findChallenge } from "@/data/challenges";
import { topicTitle } from "@/data/topics";
import { buildCircuit } from "@/lib/quantumSimulator";
import { buildReview, challengePool, chooseChallenge, type ReviewPoint } from "@/lib/review";
import { passes, progressOf, stageScore } from "@/lib/stages";
import type { L, TopicId } from "@/lib/types";
import { useApp } from "../AppProvider";
import { ExperimentFlow } from "../ExperimentFlow";

// ---------------------------------------------------------------------------
// 11 · Review
// ---------------------------------------------------------------------------

function PointList({
  title,
  icon,
  tone,
  points,
  empty,
}: {
  title: L;
  icon: React.ReactNode;
  tone: string;
  points: ReviewPoint[];
  empty: L;
}) {
  const { t } = useApp();
  return (
    <section className="well p-4">
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${tone}`}>
        {icon}
        {t(title)}
      </h3>
      {points.length === 0 ? (
        <p className="mt-2 text-sm text-mute">{t(empty)}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2.5">
          {points.map((point, index) => (
            <li key={`${point.title}-${index}`} className="text-[0.9375rem] leading-relaxed">
              <span className="font-semibold">{point.title}</span>
              <span className="text-mute"> — </span>
              <span className="text-ink/90">{t(point.detail)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReviewStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const review = useMemo(() => buildReview(state, topic), [state, topic]);
  const done = passes(stageScore(progressOf(state, topic), "review"), state.settings.masteryThreshold);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || done) return;
    started.current = true;
    actions.startReview(topic);
  }, [actions, topic, done]);

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[68ch] text-[1.0625rem] leading-relaxed text-ink/90">
        {review.clean
          ? t({
              en: "This review is built from what you actually did in this concept. Nothing was missed, so it is short.",
              hi: "Yeh review is concept mein aapke actual kaam se bana hai. Kuch miss nahi hua, isliye yeh short hai.",
            })
          : t({
              en: "This review is built from what you actually did in this concept: your prediction, your explanation, your mastery check and anything the tutor noticed.",
              hi: "Yeh review is concept mein aapke actual kaam se bana hai: aapki prediction, explanation, mastery check aur jo bhi tutor ne notice kiya.",
            })}
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        <PointList
          title={{ en: "What you understood", hi: "Aapne kya samjha" }}
          icon={<Check size={16} aria-hidden />}
          tone="text-ok"
          points={review.understood}
          empty={{ en: "Nothing recorded yet.", hi: "Abhi kuch recorded nahi." }}
        />
        <PointList
          title={{ en: "What needs more work", hi: "Kis par aur kaam chahiye" }}
          icon={<CircleAlert size={16} aria-hidden />}
          tone="text-warn"
          points={review.needsWork}
          empty={{ en: "Nothing — you did not miss anything in this concept.", hi: "Kuch nahi — is concept mein aapne kuch miss nahi kiya." }}
        />
      </div>

      {review.whyMissed.length > 0 && (
        <PointList
          title={{ en: "Why it went wrong", hi: "Galti kyun hui" }}
          icon={<Lightbulb size={16} aria-hidden />}
          tone="text-phase"
          points={review.whyMissed}
          empty={{ en: "", hi: "" }}
        />
      )}

      {review.keyConcept && (
        <section className="well p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ket">
            <BookOpen size={16} aria-hidden />
            {t({ en: "Key concept to revisit", hi: "Revisit karne ka key concept" })}: {review.keyConcept.title}
          </h3>
          <p className="mt-2 max-w-[70ch] leading-relaxed">{t(review.keyConcept.simple)}</p>
          {review.keyConcept.why && <p className="mt-2 max-w-[70ch] leading-relaxed text-ink/85">{t(review.keyConcept.why)}</p>}
          <p className="mt-2 text-xs text-dim">
            {t({ en: "Source", hi: "Source" })}: {review.keyConcept.ref} · v{review.keyConcept.meta.version}
          </p>
        </section>
      )}

      <section className="well p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-signal">
          <Target size={16} aria-hidden />
          {t({ en: "Recommended practice and next step", hi: "Recommended practice aur next step" })}
        </h3>
        {review.practice && (
          <p className="mt-2 leading-relaxed">
            <span className="font-semibold">{t(review.practice.challenge.title)}</span>
            <span className="text-mute"> — </span>
            {t(review.practice.reason)}
          </p>
        )}
        <p className="mt-2 leading-relaxed text-ink/90">{t(review.nextStep)}</p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {done ? (
          <p className="flex items-center gap-2 font-medium text-ok">
            <Check size={18} aria-hidden />
            {t({ en: "Review read.", hi: "Review padh liya." })}
          </p>
        ) : (
          <button type="button" onClick={() => actions.completeReview(topic)} className="btn btn-primary px-5">
            <Check size={17} aria-hidden />
            {t({ en: "I have read my review", hi: "Maine apna review padh liya" })}
          </button>
        )}
        <Link href="/ai-tutor?ask=mistake" className="btn btn-ghost">
          {t({ en: "Talk it through with the tutor", hi: "Tutor ke saath discuss karo" })}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12 · Next Challenge
// ---------------------------------------------------------------------------

export function ChallengeStage({ topic }: { topic: TopicId }) {
  const { state, t, actions } = useApp();
  const progress = progressOf(state, topic);
  const solved = passes(stageScore(progress, "challenge"), state.settings.masteryThreshold);
  const [attempt, setAttempt] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  /** The engine's pick when this stage was opened, with the reason for it. */
  const [initial] = useState(() => chooseChallenge(state, topic));
  /** A different challenge the learner asked for, with its reason. */
  const [swapped, setSwapped] = useState<{ id: string; reason: L } | null>(null);

  // Assign the challenge once and remember it, so a refresh does not swap it.
  const initialId = initial?.challenge.id;
  useEffect(() => {
    if (!progress.challengeId && initialId) actions.setStageChallenge(topic, initialId);
  }, [actions, progress.challengeId, initialId, topic]);

  const challenge = progress.challengeId ? findChallenge(progress.challengeId) : undefined;
  const circuit = useMemo(
    () => (challenge ? buildCircuit(challenge.circuit.qubits, challenge.circuit.gates) : null),
    [challenge]
  );

  if (!challenge || !circuit) {
    return (
      <p className="text-mute" role="status">
        {t({ en: "Choosing a challenge for you…", hi: "Aapke liye challenge choose ho raha hai…" })}
      </p>
    );
  }

  const others = challengePool(topic).filter((c) => c.id !== challenge.id);
  const swap = () => {
    const choice = chooseChallenge(state, topic, [challenge.id]);
    if (!choice || choice.challenge.id === challenge.id) return;
    setSwapped({ id: choice.challenge.id, reason: choice.reason });
    setHintShown(false);
    setAttempt(0);
    actions.setStageChallenge(topic, choice.challenge.id);
  };
  const why =
    swapped?.id === challenge.id ? swapped.reason : initial?.challenge.id === challenge.id ? initial.reason : null;
  const attempts = progress.attempts.challenge ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-signal/35 bg-signal/[0.06] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-signal">
          <Sparkles size={16} aria-hidden />
          {t({ en: "Chosen for you", hi: "Aapke liye chosen" })}
          <span className="tag text-mute">
            {t({ en: "Difficulty", hi: "Difficulty" })} {challenge.difficulty}/3
          </span>
        </p>
        <h3 className="mt-1.5 text-xl font-semibold tracking-tight">{t(challenge.title)}</h3>
        {why && <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink/85">{t(why)}</p>}
      </div>

      {solved && (
        <p className="flex items-center gap-2 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 font-medium text-ok">
          <Check size={18} aria-hidden />
          {t({ en: "Challenge solved. You can replay it below for practice.", hi: "Challenge solved. Practice ke liye neeche replay kar sakte ho." })}
        </p>
      )}

      <ExperimentFlow
        key={`${challenge.id}-${attempt}`}
        circuit={circuit}
        source="challenge"
        topic={challenge.topic}
        question={t(challenge.question)}
        options={challenge.options === "auto" ? undefined : challenge.options}
        correctId={challenge.correctId}
        challengeId={challenge.id}
        record={(input) => actions.recordStageChallenge(topic, input)}
        after={(outcome) => (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-void/50 px-4 py-3">
            <p className="text-sm">
              {outcome === "correct" ? (
                <span className="font-semibold text-ok">
                  {t({ en: `Solved. ${topicTitle(topic)} challenge complete.`, hi: `Solved. ${topicTitle(topic)} challenge complete.` })}
                </span>
              ) : (
                <span className="text-ink/90">
                  {t({
                    en: "Not solved yet. Read why it happened above, then try again — or take a different challenge.",
                    hi: "Abhi solve nahi hua. Upar padho yeh kyun hua, phir dobara try karo — ya doosra challenge lo.",
                  })}
                </span>
              )}
            </p>
            {outcome !== "correct" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAttempt((n) => n + 1);
                    setHintShown(false);
                  }}
                  className="btn btn-primary text-sm"
                >
                  <RotateCcw size={15} aria-hidden />
                  {t({ en: "Try again", hi: "Dobara try karo" })}
                </button>
                {others.length > 0 && (
                  <button type="button" onClick={swap} className="btn btn-secondary text-sm">
                    <Shuffle size={15} aria-hidden />
                    {t({ en: "Different challenge", hi: "Doosra challenge" })}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      />

      <div className="flex flex-wrap items-center gap-3">
        {hintShown ? (
          <p className="flex gap-2.5 rounded-xl border border-warn/30 bg-warn/[0.07] px-4 py-3 text-[0.9375rem] leading-relaxed">
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
            <span>
              <span className="font-semibold">{t({ en: "Hint: ", hi: "Hint: " })}</span>
              {t(challenge.hint)}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => {
              setHintShown(true);
              actions.track("hintRequested", { topic, detail: challenge.id });
            }}
            className="btn btn-ghost text-sm"
          >
            <Lightbulb size={16} aria-hidden />
            {t({ en: "Show a hint", hi: "Hint dikhao" })}
          </button>
        )}
        {attempts > 0 && !solved && (
          <p className="text-sm text-mute">
            {t({ en: `Attempts so far: ${attempts}`, hi: `Ab tak attempts: ${attempts}` })}
          </p>
        )}
        {solved && (
          <Link href={`/practice?topic=${topic}`} className="btn btn-ghost text-sm">
            {t({ en: "More practice challenges", hi: "Aur practice challenges" })}
            <ArrowRight size={15} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
