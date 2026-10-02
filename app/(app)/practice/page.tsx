"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Lightbulb, Lock, RotateCcw } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ExperimentFlow } from "@/components/ExperimentFlow";
import { QuickReview } from "@/components/QuickReview";
import { PageHeader } from "@/components/ui";
import { CHALLENGES, challengesFor, findChallenge, type Challenge } from "@/data/challenges";
import { INTERACTIVE_TOPICS, topicTitle } from "@/data/topics";
import { canOpenStage, currentTopic } from "@/lib/mastery";
import { buildCircuit } from "@/lib/quantumSimulator";
import { dueReviews } from "@/lib/review";
import type { TopicId } from "@/lib/types";

const DIFFICULTY: Record<Challenge["difficulty"], string> = { 1: "Warm-up", 2: "Standard", 3: "Stretch" };

function Practice() {
  const { state, insights, t, actions } = useApp();
  const params = useSearchParams();
  const requested = params.get("topic") as TopicId | null;
  const requestedChallenge = params.get("challenge");
  const requestedReview = params.get("review") as TopicId | null;
  const threshold = state.settings.masteryThreshold;

  // A concept's challenges open once the learner has reached its Predict stage
  // (they use the same predict → run → observe rhythm), and stay open after mastery.
  const isOpen = (topic: TopicId) => !!state.concepts[topic]?.masteredAt || canOpenStage(state, topic, "predict");

  // Start on the requested challenge, or the first unsolved one of the requested (or current) topic.
  const [selectedId, setSelectedId] = useState<string>(() => {
    const asked = requestedChallenge ? findChallenge(requestedChallenge) : undefined;
    if (asked && isOpen(asked.topic)) return asked.id;
    const wanted =
      requested && INTERACTIVE_TOPICS.includes(requested) && isOpen(requested) ? requested : currentTopic(state);
    const topic = isOpen(wanted) ? wanted : (INTERACTIVE_TOPICS.find(isOpen) ?? wanted);
    const list = challengesFor(topic);
    return (list.find((c) => !state.practice[c.id]?.solved) ?? list[0] ?? CHALLENGES[0]).id;
  });
  const [reviewOpen, setReviewOpen] = useState(
    () => (!!requestedReview && !!state.concepts[requestedReview]?.masteredAt) || dueReviews(state).length > 0
  );
  /** Bumped by "Try again" so the same challenge restarts cleanly. */
  const [attempt, setAttempt] = useState(0);
  const [hintShown, setHintShown] = useState(false);

  const challenge = CHALLENGES.find((c) => c.id === selectedId) ?? CHALLENGES[0];
  const circuit = useMemo(
    () => buildCircuit(challenge.circuit.qubits, challenge.circuit.gates),
    [challenge]
  );

  const select = (id: string) => {
    setSelectedId(id);
    setAttempt(0);
    setHintShown(false);
  };

  const openChallenges = CHALLENGES.filter((c) => isOpen(c.topic));
  const nextUp = openChallenges.find((c) => c.id !== challenge.id && !state.practice[c.id]?.solved);
  const record = state.practice[challenge.id];
  const challengeOpen = isOpen(challenge.topic);

  const showHint = () => {
    setHintShown(true);
    actions.track("hintRequested", { topic: challenge.topic, detail: challenge.id });
  };

  return (
    <>
      <PageHeader
        title="Practice"
        lead={t({
          en: "Short challenges. Each one follows the same rhythm: question, prediction, run, result, explanation.",
          hi: "Chhote challenges. Har ek ka same rhythm hai: question, prediction, run, result, explanation.",
        })}
      >
        <dl className="flex gap-2 text-sm">
          <div className="well px-3 py-2 text-center">
            <dd className="font-semibold tabular-nums">
              {insights.challengesSolved} / {insights.challengesTotal}
            </dd>
            <dt className="text-xs text-mute">solved</dt>
          </div>
          <div className="well px-3 py-2 text-center">
            <dd className="font-semibold tabular-nums">
              {insights.practice.accuracy === null ? "—" : `${insights.practice.accuracy}%`}
            </dd>
            <dt className="text-xs text-mute">accuracy</dt>
          </div>
        </dl>
      </PageHeader>

      {reviewOpen && (
        <div className="mb-5">
          <QuickReview topic={requestedReview ?? undefined} onDone={() => setReviewOpen(false)} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
        {/* Challenge list */}
        <nav aria-label="Challenges" className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {INTERACTIVE_TOPICS.map((topic) => {
            const open = isOpen(topic);
            return (
              <div key={topic}>
                <p className="mb-1.5 flex items-center gap-2 px-1 text-sm font-semibold text-mute">
                  {topicTitle(topic)}
                  {!open && <Lock size={13} aria-label="Locked" />}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {challengesFor(topic).map((c) => (
                    <ChallengeRow
                      key={c.id}
                      challenge={c}
                      active={c.id === challenge.id}
                      locked={!open}
                      solved={!!state.practice[c.id]?.solved}
                      attempts={state.practice[c.id]?.attempts ?? 0}
                      title={t(c.title)}
                      onSelect={() => select(c.id)}
                    />
                  ))}
                </ul>
                {!open && (
                  <p className="mt-1.5 px-1 text-xs text-dim">
                    Opens when you reach the Predict stage of {topicTitle(topic)}.
                  </p>
                )}
              </div>
            );
          })}
        </nav>

        {/* Challenge runner */}
        <section aria-labelledby="challenge-title" className="panel min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="tag text-mute">{topicTitle(challenge.topic)}</span>
            <span className="tag border-signal/40 text-signal">{DIFFICULTY[challenge.difficulty]}</span>
            {record?.solved && (
              <span className="tag border-ok/40 bg-ok/10 text-ok">
                <Check size={12} aria-hidden />
                {record.firstTry ? "Solved first try" : "Solved"}
              </span>
            )}
          </div>
          <h2 id="challenge-title" className="mt-3 text-2xl font-semibold tracking-tight">
            {t(challenge.title)}
          </h2>

          {!challengeOpen ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-void/50 p-4">
              <Lock size={18} className="mt-0.5 shrink-0 text-mute" aria-hidden />
              <div>
                <p className="font-semibold">
                  {t({ en: "This challenge is locked for now.", hi: "Yeh challenge abhi locked hai." })}
                </p>
                <p className="mt-1 text-sm text-mute">
                  {t({
                    en: `Reach the Predict stage of ${topicTitle(challenge.topic)} first: complete its earlier stages with at least ${threshold}% each.`,
                    hi: `Pehle ${topicTitle(challenge.topic)} ke Predict stage tak pahuncho: uske pehle ke stages kam se kam ${threshold}% ke saath complete karo.`,
                  })}
                </p>
                <Link href={`/learn/${currentTopic(state)}`} className="btn btn-primary mt-3 text-sm">
                  {t({ en: "Continue learning", hi: "Learning continue karo" })}
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </div>
            </div>
          ) : (
          <>
          <div className="mt-4">
            <ExperimentFlow
              key={`${challenge.id}-${attempt}`}
              circuit={circuit}
              source="practice"
              topic={challenge.topic}
              question={t(challenge.question)}
              options={challenge.options === "auto" ? undefined : challenge.options}
              correctId={challenge.correctId}
              challengeId={challenge.id}
              after={(outcome) => (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-void/50 px-4 py-3">
                  <p className="text-sm">
                    <span className="font-semibold">
                      Score: {outcome === "correct" ? "1 / 1" : "0 / 1"}
                    </span>
                    <span className="ml-2 text-mute">
                      {outcome === "correct"
                        ? t({ en: "Challenge solved.", hi: "Challenge solved." })
                        : t({ en: "You're getting closer.", hi: "Aap close aa rahe ho." })}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {outcome !== "correct" && (
                      <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-primary text-sm">
                        <RotateCcw size={15} aria-hidden />
                        {t({ en: "Try again", hi: "Dobara try karo" })}
                      </button>
                    )}
                    {nextUp ? (
                      <button
                        type="button"
                        onClick={() => select(nextUp.id)}
                        className={`btn text-sm ${outcome === "correct" ? "btn-primary" : "btn-secondary"}`}
                      >
                        {t({ en: "Next challenge", hi: "Next challenge" })}
                        <ArrowRight size={15} aria-hidden />
                      </button>
                    ) : (
                      <Link href={`/learn/${currentTopic(state)}`} className="btn btn-primary text-sm">
                        {t({ en: "Back to your concept", hi: "Apne concept par wapas" })}
                        <ArrowRight size={15} aria-hidden />
                      </Link>
                    )}
                    <Link href="/lab" className="btn btn-ghost text-sm">
                      {t({ en: "Build your own in the Lab", hi: "Lab mein apna banao" })}
                    </Link>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Hint */}
          <div className="mt-4">
            {hintShown ? (
              <p className="flex gap-2.5 rounded-xl border border-warn/30 bg-warn/[0.07] px-4 py-3 text-[0.9375rem] leading-relaxed">
                <Lightbulb size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                <span>
                  <span className="font-semibold">{t({ en: "Hint: ", hi: "Hint: " })}</span>
                  {t(challenge.hint)}
                </span>
              </p>
            ) : (
              <button type="button" onClick={showHint} className="btn btn-ghost text-sm">
                <Lightbulb size={16} aria-hidden />
                {t({ en: "Show a hint", hi: "Hint dikhao" })}
              </button>
            )}
          </div>
          </>
          )}
        </section>
      </div>
    </>
  );
}

function ChallengeRow({
  challenge,
  active,
  locked,
  solved,
  attempts,
  title,
  onSelect,
}: {
  challenge: Challenge;
  active: boolean;
  locked: boolean;
  solved: boolean;
  attempts: number;
  title: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={locked}
        aria-current={active ? "true" : undefined}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          active ? "border-ket/60 bg-ket/10" : "border-line bg-white/[0.02] enabled:hover:border-ink/30"
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            solved ? "border-ok/50 bg-ok/15 text-ok" : "border-line text-dim"
          }`}
        >
          {solved ? <Check size={13} aria-label="Solved" /> : locked ? <Lock size={11} aria-hidden /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          <span className="block text-xs text-dim">
            {DIFFICULTY[challenge.difficulty]}
            {attempts > 0 && ` · ${attempts} attempt${attempts === 1 ? "" : "s"}`}
          </span>
        </span>
      </button>
    </li>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <Practice />
    </Suspense>
  );
}
